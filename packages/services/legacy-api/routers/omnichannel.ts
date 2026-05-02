import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getRawClient } from "../db";
import { resolveAccessibleEmpresaId } from "../_core/access";

const providerSchema = z.enum(["whatsapp", "telegram", "instagram"]);

async function getProviderConfig(client: any, empresaId: number, provider: string) {
  const rows = await client`
    SELECT * FROM integracoes
    WHERE "empresaId"=${empresaId}
      AND tipo=${provider}
      AND ativo=true
    ORDER BY "createdAt" DESC
    LIMIT 1
  `.catch(() => []);
  const row = rows[0];
  let config: Record<string, any> = {};
  if (row?.config) {
    try {
      config = typeof row.config === "string" ? JSON.parse(row.config) : row.config;
    } catch {
      config = {};
    }
  }
  return { row, config };
}

export const omnichannelRouter = router({
  listConnectedProviders: protectedProcedure
    .input(z.object({ empresaId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);
      const rows = await client`
        SELECT tipo, nome, status, ativo
        FROM integracoes
        WHERE "empresaId"=${empresaId}
          AND tipo IN ('whatsapp','telegram','instagram','evolution_api')
        ORDER BY "createdAt" DESC
      `.catch(() => []);
      return rows;
    }),

  listConversations: protectedProcedure
    .input(z.object({
      empresaId: z.number().optional(),
      provider: providerSchema.optional(),
      onlyUnread: z.boolean().default(false),
    }).optional())
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);
      const providerFilter = input?.provider ? `AND c.provider = '${input.provider.replace(/'/g, "''")}'` : "";
      const unreadFilter = input?.onlyUnread ? `AND EXISTS (SELECT 1 FROM omnichannel_messages m WHERE m."conversationId" = c.id AND m.direction = 'in')` : "";
      const rows = await client.unsafe(`
        SELECT
          c.*,
          (
            SELECT m.content
            FROM omnichannel_messages m
            WHERE m."conversationId" = c.id
            ORDER BY m."createdAt" DESC
            LIMIT 1
          ) AS "lastMessagePreview",
          (
            SELECT count(*)::int
            FROM omnichannel_messages m
            WHERE m."conversationId" = c.id
              AND m.direction = 'in'
          ) AS "inboundCount"
        FROM omnichannel_conversations c
        WHERE c."empresaId" = ${empresaId}
          AND c."deletedAt" IS NULL
          ${providerFilter}
          ${unreadFilter}
        ORDER BY c."lastMessageAt" DESC
      `).catch(() => []);
      return rows;
    }),

  listMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        SELECT c."empresaId"
        FROM omnichannel_conversations c
        WHERE c.id=${input.conversationId}
        LIMIT 1
      `;
      const conv = rows[0];
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada." });
      await resolveAccessibleEmpresaId(ctx, Number(conv.empresaId));
      return client`
        SELECT *
        FROM omnichannel_messages
        WHERE "conversationId"=${input.conversationId}
        ORDER BY "createdAt" ASC
      `.catch(() => []);
    }),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.number(), content: z.string().min(1, "Digite uma mensagem.") }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const convRows = await client`
        SELECT * FROM omnichannel_conversations
        WHERE id=${input.conversationId}
        LIMIT 1
      `;
      const conv = convRows[0];
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada." });
      const empresaId = await resolveAccessibleEmpresaId(ctx, Number(conv.empresaId));

      let success = false;
      let externalMessageId: string | null = null;

      if (conv.provider === "telegram") {
        const { config } = await getProviderConfig(client, empresaId, "telegram");
        if (!config.botToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure o bot do Telegram." });
        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: conv.externalId, text: input.content }),
        });
        const data = await response.json().catch(() => ({}));
        success = response.ok && Boolean(data?.ok);
        externalMessageId = data?.result?.message_id ? String(data.result.message_id) : null;
      } else if (conv.provider === "whatsapp") {
        const providerCfg = await getProviderConfig(client, empresaId, "whatsapp");
        const evoCfg = await getProviderConfig(client, empresaId, "evolution_api");
        const config = Object.keys(providerCfg.config || {}).length ? providerCfg.config : evoCfg.config;
        if (!config?.apiUrl || !config?.apiKey || !config?.instanceName) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure o WhatsApp/Evolution API." });
        }
        const response = await fetch(`${String(config.apiUrl).replace(/\/$/, "")}/message/sendText/${config.instanceName}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: config.apiKey,
          },
          body: JSON.stringify({
            number: conv.phone || conv.externalId,
            text: input.content,
          }),
        });
        const data = await response.json().catch(() => ({}));
        success = response.ok;
        externalMessageId = data?.key?.id || data?.id || null;
      } else if (conv.provider === "instagram") {
        const { config } = await getProviderConfig(client, empresaId, "instagram");
        if (!config?.pageId || !config?.accessToken) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure a integração do Instagram." });
        }
        const response = await fetch(`https://graph.facebook.com/v20.0/${config.pageId}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            recipient: { id: conv.externalId },
            messaging_type: "RESPONSE",
            message: { text: input.content },
            access_token: config.accessToken,
          }),
        });
        const data = await response.json().catch(() => ({}));
        success = response.ok && !data?.error;
        externalMessageId = data?.message_id || null;
      }

      if (!success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Falha ao enviar mensagem para o canal externo." });
      }

      const inserted = await client`
        INSERT INTO omnichannel_messages
          ("conversationId", provider, direction, "externalMessageId", "senderName", content, "messageType", status, payload)
        VALUES
          (${conv.id}, ${conv.provider}, 'out', ${externalMessageId}, ${ctx.user.name || "Equipe Synapse"}, ${input.content}, 'text', 'enviada', ${JSON.stringify({ senderUserId: ctx.user.id })}::jsonb)
        RETURNING *
      `;
      await client`UPDATE omnichannel_conversations SET "lastMessageAt"=NOW(), "updatedAt"=NOW() WHERE id=${conv.id}`;
      return inserted[0];
    }),
});
