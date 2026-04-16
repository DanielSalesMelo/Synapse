import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { requireDb } from "../helpers/errorHandler";
import { z } from "zod";
import { getDb } from "../db";
import { chatConversations, chatMembers, chatMessages, users } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const chatRouter = router({
  // Listar conversas do usuário logado
  listConversations: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Buscar conversas onde o usuário é membro
    const userConversations = await db
      .select({
        id: chatConversations.id,
        name: chatConversations.name,
        isGroup: chatConversations.isGroup,
        lastMessageAt: chatConversations.lastMessageAt,
      })
      .from(chatConversations)
      .innerJoin(chatMembers, eq(chatConversations.id, chatMembers.conversationId))
      .where(eq(chatMembers.userId, ctx.user.id))
      .orderBy(desc(chatConversations.lastMessageAt));

    // Para cada conversa, buscar o outro participante (se não for grupo)
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        if (!conv.isGroup) {
          const otherMembers = await db
            .select({
              name: users.name,
              lastName: users.lastName,
              email: users.email,
            })
            .from(chatMembers)
            .innerJoin(users, eq(chatMembers.userId, users.id))
            .where(
              and(
                eq(chatMembers.conversationId, conv.id),
                sql`${chatMembers.userId} != ${ctx.user!.id}`
              )
            )
            .limit(1);
          
          const otherMember = otherMembers[0];
          return {
            ...conv,
            displayName: otherMember ? `${otherMember.name} ${otherMember.lastName || ""}`.trim() : "Usuário",
          };
        }
        return { ...conv, displayName: conv.name || "Grupo" };
      })
    );

    return conversationsWithDetails;
  }),

  // Listar mensagens de uma conversa (com suporte a arquivos)
  listMessages: publicProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se o usuário é membro da conversa
      const isMemberResult = await db
        .select()
        .from(chatMembers)
        .where(
          and(
            eq(chatMembers.conversationId, input.conversationId),
            eq(chatMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (isMemberResult.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Você não faz parte desta conversa" });

      // Buscar mensagens com campos de arquivo via SQL raw (colunas podem não estar no schema Drizzle)
      const rows = await db.execute(sql`
        SELECT
          m.id,
          m.content,
          m."senderId",
          m."createdAt",
          m.type,
          m."fileUrl",
          m."fileName",
          m."fileSize",
          m."mimeType",
          u.name AS "senderName",
          u."lastName" AS "senderLastName"
        FROM chat_messages m
        INNER JOIN users u ON m."senderId" = u.id
        WHERE m."conversationId" = ${input.conversationId}
          AND m."deletedAt" IS NULL
        ORDER BY m."createdAt" DESC
        LIMIT 100
      `);

      const messages = (rows as unknown as any[]).map((row) => ({
        id: row.id,
        content: row.content || "",
        senderId: row.senderId,
        createdAt: row.createdAt,
        type: row.type || "text",
        senderName: `${row.senderName || ""} ${row.senderLastName || ""}`.trim(),
        // Campos de arquivo
        attachmentUrl: row.fileUrl || null,
        attachmentName: row.fileName || null,
        attachmentSize: row.fileSize ? formatFileSize(Number(row.fileSize)) : null,
        attachmentType: row.fileUrl
          ? (row.mimeType?.startsWith("image/") ? "image"
            : row.mimeType?.startsWith("video/") ? "video"
            : "file")
          : null,
      }));

      return messages.reverse();
    }),

  // Enviar mensagem (texto ou arquivo)
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().optional().default(""),
      fileUrl: z.string().url().optional(),
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      fileType: z.enum(["text", "image", "file", "video"]).optional().default("text"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb(), "chat.sendMessage");

      // Validar: precisa ter content OU fileUrl
      if (!input.content?.trim() && !input.fileUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mensagem precisa ter conteúdo ou arquivo" });
      }

      // Verificar se o usuário é membro da conversa
      const isMember = await db
        .select()
        .from(chatMembers)
        .where(
          and(
            eq(chatMembers.conversationId, input.conversationId),
            eq(chatMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (isMember.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não faz parte desta conversa" });
      }

      // Determinar conteúdo e tipo final
      const finalContent = input.content?.trim() || input.fileName || "Arquivo";
      const finalType = input.fileUrl
        ? (input.mimeType?.startsWith("image/") ? "image" : "file")
        : "text";

      // Inserir mensagem com suporte a arquivos
      await db.execute(sql`
        INSERT INTO chat_messages (
          "conversationId", "senderId", "content", "type",
          "fileUrl", "fileName", "fileSize", "mimeType"
        )
        VALUES (
          ${input.conversationId},
          ${ctx.user.id},
          ${finalContent},
          ${finalType},
          ${input.fileUrl ?? null},
          ${input.fileName ?? null},
          ${input.fileSize ?? null},
          ${input.mimeType ?? null}
        )
      `);

      // Atualizar timestamp da conversa
      await db
        .update(chatConversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(chatConversations.id, input.conversationId));

      return { success: true };
    }),

  // Iniciar ou buscar conversa privada com outro usuário
  getOrCreatePrivateConversation: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb(), "chat.getOrCreatePrivateConversation");

      // Buscar se já existe uma conversa privada entre os dois
      const existingConv = await db.execute(sql`
        SELECT c.id 
        FROM chat_conversations c
        JOIN chat_members m1 ON c.id = m1."conversationId"
        JOIN chat_members m2 ON c.id = m2."conversationId"
        WHERE c."isGroup" = false
        AND m1."userId" = ${ctx.user.id}
        AND m2."userId" = ${input.targetUserId}
        LIMIT 1
      `);

      const rows = existingConv as unknown as any[];
      if (rows.length > 0) {
        return { conversationId: Number(rows[0].id) };
      }

      // Criar nova conversa
      const newConvResult = await db.insert(chatConversations).values({
        empresaId: ctx.user.empresaId || 1,
        isGroup: false,
      }).returning();
      
      const newConv = newConvResult[0];

      // Adicionar membros
      await db.insert(chatMembers).values([
        { conversationId: newConv.id, userId: ctx.user.id },
        { conversationId: newConv.id, userId: input.targetUserId },
      ]);

      return { conversationId: newConv.id };
    }),

  // Criar grupo de conversa
  createGroupConversation: protectedProcedure.input(z.object({
    name: z.string().min(1).max(100),
    memberIds: z.array(z.number()).min(1).max(50),
  })).mutation(async ({ input, ctx }) => {
    const db = requireDb(await getDb(), "chat.createGroupConversation");
    // Criar a conversa como grupo
    const [newConv] = await db.insert(chatConversations).values({
      empresaId: ctx.user.empresaId || 1,
      isGroup: true,
      name: input.name,
    }).returning();
    // Adicionar o criador + membros selecionados
    const allMemberIds = Array.from(new Set([ctx.user.id, ...input.memberIds]));
    await db.insert(chatMembers).values(
      allMemberIds.map((userId) => ({ conversationId: newConv.id, userId }))
    );
    return { conversationId: newConv.id };
  }),

  // Listar todos os usuários para iniciar novo chat
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb(), "chat.listUsers");

    return await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          sql`${users.id} != ${ctx.user.id}`,
          ctx.user.role !== "master_admin" ? eq(users.empresaId, ctx.user.empresaId!) : undefined
        )
      )
      .limit(100);
  }),
});

// Helper para formatar tamanho de arquivo
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
