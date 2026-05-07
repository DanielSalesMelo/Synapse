import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb, getRawClient } from "../db";
import { ticketsTi, ativosTi, certificadosTi } from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { resolveAccessibleEmpresaId } from "../_core/access";
import { invokeLLM } from "../_core/llm";

function gerarOS(): string {
  const ano = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `OS-${ano}-${seq}`;
}
function gerarProtocolo(): string {
  return `TI-${Date.now().toString(36).toUpperCase()}`;
}

const TICKET_STATUS_VALUES = [
  "aberto",
  "triagem_ia",
  "aguardando_usuario",
  "aguardando_ti",
  "em_andamento",
  "acesso_remoto_solicitado",
  "em_acesso_remoto",
  "resolvido",
  "encerrado",
  "cancelado",
  "reaberto",
] as const;

function canManageTi(user: any): boolean {
  const role = String(user?.role || "").toLowerCase();
  return ["master_admin", "admin", "administrador", "ti", "supervisor_geral", "supervisor_ti"].includes(role);
}

function requireTiManager(user: any): void {
  if (!canManageTi(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Este recurso é exclusivo da equipe de TI.",
    });
  }
}

async function resolveTiEmpresaId(ctx: any, requestedEmpresaId?: number | null): Promise<number> {
  return resolveAccessibleEmpresaId(ctx, requestedEmpresaId ?? ctx.user?.empresaId ?? undefined);
}

export const tiRouter = router({

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveTiEmpresaId(ctx);
    const isManager = canManageTi(ctx.user);
    const ticketWhere = isManager
      ? and(eq(ticketsTi.empresaId, empresaId), isNull(ticketsTi.deletedAt))
      : and(
          eq(ticketsTi.empresaId, empresaId),
          eq(ticketsTi.solicitanteId as any, ctx.user.id as any),
          isNull(ticketsTi.deletedAt)
        );

    const [ticketStats] = await db
      .select({
        total: sql<number>`count(*)`,
        abertos: sql<number>`count(*) filter (where status = 'aberto')`,
        emAndamento: sql<number>`count(*) filter (where status = 'em_andamento')`,
        resolvidosHoje: sql<number>`count(*) filter (where status = 'resolvido' AND "resolvidoEm" >= current_date)`,
        ativos: sql<number>`count(*) filter (where status IN ('aberto','triagem_ia','aguardando_usuario','aguardando_ti','em_andamento','acesso_remoto_solicitado','em_acesso_remoto','reaberto'))`,
      })
      .from(ticketsTi)
      .where(ticketWhere);
    const [ativoStats] = await db.select({
      total: sql<number>`count(*)`,
      online: sql<number>`count(*) filter (where status = 'online')`,
      atencao: sql<number>`count(*) filter (where status = 'atencao')`,
      critico: sql<number>`count(*) filter (where status = 'critico')`,
    }).from(ativosTi).where(and(eq(ativosTi.empresaId, empresaId), isNull(ativosTi.deletedAt)));
    const [certStats] = await db.select({
      total: sql<number>`count(*)`,
      expirando: sql<number>`count(*) filter (where vencimento <= (current_date + interval '30 days') AND vencimento >= current_date)`,
      vencidos: sql<number>`count(*) filter (where vencimento < current_date)`,
    }).from(certificadosTi).where(and(eq(certificadosTi.empresaId, empresaId), isNull(certificadosTi.deletedAt)));
    if (!isManager) {
      return {
        tickets: ticketStats,
        ativos: { total: 0, online: 0, atencao: 0, critico: 0 },
        certificados: { total: 0, expirando: 0, vencidos: 0 },
        licencas: { total: 0 },
      };
    }
    return { tickets: ticketStats, ativos: ativoStats, certificados: certStats, licencas: { total: 0 } };
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { tickets: 0, alertas: 0 };
    const empresaId = await resolveTiEmpresaId(ctx);
    const isManager = canManageTi(ctx.user);
    const whereExpr = isManager
      ? and(eq(ticketsTi.empresaId, empresaId), isNull(ticketsTi.deletedAt))
      : and(
          eq(ticketsTi.empresaId, empresaId),
          eq(ticketsTi.solicitanteId as any, ctx.user.id as any),
          isNull(ticketsTi.deletedAt)
        );
    const [r] = await db.select({
      tickets: sql<number>`count(*) filter (where status = 'aberto')`,
    }).from(ticketsTi).where(whereExpr);
    return { tickets: Number(r?.tickets || 0), alertas: 0 };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // TICKETS / CHAMADOS
  // ══════════════════════════════════════════════════════════════════════════
  listTickets: protectedProcedure
    .input(z.object({ status: z.string().optional(), search: z.string().optional(), prioridade: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const params: any[] = [empresaId];
      const conds: string[] = ['t."empresaId" = $1', 't."deletedAt" IS NULL'];
      if (!canManageTi(ctx.user)) {
        params.push(ctx.user.id);
        conds.push(`t."solicitanteId" = $${params.length}`);
      }
      if (input.status && input.status !== "todos") {
        params.push(input.status);
        conds.push(`t.status = $${params.length}`);
      }
      if (input.search) {
        params.push(`%${input.search}%`);
        const searchParam = `$${params.length}`;
        conds.push(`(t.titulo ILIKE ${searchParam} OR t.protocolo ILIKE ${searchParam})`);
      }
      return (client as any).unsafe(`
        SELECT
          t.*,
          t."numeroOS" as "numeroOs",
          solicitante.id as solicitante_id,
          solicitante.name as solicitante_nome,
          solicitante.email as solicitante_email,
          tecnico.name as tecnico_nome
        FROM tickets_ti t
        LEFT JOIN users solicitante ON solicitante.id = t."solicitanteId"
        LEFT JOIN users tecnico ON tecnico.id = COALESCE(t."tecnicoId", t."responsavelId")
        WHERE ${conds.join(" AND ")}
        ORDER BY t."createdAt" DESC
      `, params);
    }),

  getTicket: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        SELECT t.*, 
          u.name as solicitante_nome, u.email as solicitante_email,
          u.departamento as solicitante_departamento, u.cargo as solicitante_cargo,
          u.id as solicitante_id,
          tec.name as tecnico_nome
        FROM tickets_ti t
        LEFT JOIN users u ON u.id = t."solicitanteId"
        LEFT JOIN users tec ON tec.id = t."tecnicoId"
        WHERE t.id = ${input.id} AND t."empresaId" = ${empresaId}
      `;
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      if (!canManageTi(ctx.user) && Number(rows[0]?.solicitante_id || 0) !== Number(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return rows[0];
    }),

  createTicket: protectedProcedure
    .input(z.object({
      titulo: z.string().min(2),
      descricao: z.string().min(5),
      categoria: z.enum(["hardware", "software", "rede", "acesso", "email", "impressora", "outro"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      ativoId: z.number().optional(),
      prazo: z.string().optional(),
      anexos: z.array(z.object({ nome: z.string(), url: z.string(), tipo: z.string(), tamanho: z.number().optional() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const protocolo = gerarProtocolo();
      const numeroOs = gerarOS();
      const rows = await client`
        INSERT INTO tickets_ti (
          "empresaId", "solicitanteId", protocolo, titulo, descricao,
          categoria, prioridade, status, "createdAt", "updatedAt"
        ) VALUES (
          ${empresaId}, ${ctx.user.id}, ${protocolo},
          ${input.titulo}, ${input.descricao},
          ${input.categoria || 'outro'}, ${input.prioridade || 'media'}, 'aberto',
          NOW(), NOW()
        ) RETURNING *
      `;
      const ticket = rows[0];
      if (!ticket) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await client`
        INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
        VALUES (${ticket.id},${empresaId},${ctx.user.id},${null},'aberto',${'Chamado criado'},NOW())
      `.catch(() => {});

      // Mensagem automática
      await client`
        INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
        VALUES (${ticket.id},${empresaId},${ctx.user.id},${'Chamado aberto: ' + input.descricao},'sistema',NOW())
      `.catch(() => {});

      // Anexos
      if (input.anexos) {
        for (const a of input.anexos) {
          await client`
            INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"fileUrl","fileName","fileType","createdAt")
            VALUES (${ticket.id},${empresaId},${ctx.user.id},'','anexo',${a.url},${a.nome},${a.tipo},NOW())
          `.catch(() => {});
        }
      }
      return ticket;
    }),

  aiTriage: protectedProcedure
    .input(
      z.object({
        ticketId: z.number().optional(),
        titulo: z.string().optional(),
        descricao: z.string().min(4),
        contextoTecnico: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);

      let ticket: any = null;
      if (input.ticketId) {
        const rows = await client`
          SELECT id, protocolo, titulo, descricao, categoria, prioridade, status, "solicitanteId"
          FROM tickets_ti
          WHERE id = ${input.ticketId}
            AND "empresaId" = ${empresaId}
            AND "deletedAt" IS NULL
          LIMIT 1
        `;
        ticket = rows?.[0] ?? null;
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Chamado não encontrado." });
        if (!canManageTi(ctx.user) && Number(ticket.solicitanteId || 0) !== Number(ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const descricao = (ticket?.descricao || input.descricao || "").trim();
      const titulo = (ticket?.titulo || input.titulo || "Chamado de TI").trim();
      const contexto = (input.contextoTecnico || "").trim();

      const prompt = [
        "Você é um analista de suporte N1/N2 de TI para empresa brasileira.",
        "Objetivo: reduzir chamados repetitivos com orientação segura e prática.",
        "Regra: se não souber com confiança, marque precisa_escalar=true e não invente.",
        "Retorne JSON com campos:",
        "resumo, causaProvavel, nivelConfianca(0-100), precisaEscalar(boolean), categoriaSugerida, prioridadeSugerida,",
        "passosUsuario(array de strings), passosTI(array de strings), acaoImediata.",
        "",
        `Título: ${titulo}`,
        `Descrição: ${descricao}`,
        contexto ? `Contexto técnico adicional: ${contexto}` : "",
      ].filter(Boolean).join("\n");

      let ai: any = null;
      try {
        const llm = await invokeLLM({
          messages: [
            { role: "system", content: "Responda somente em JSON válido, sem markdown." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });
        const raw = llm.choices?.[0]?.message?.content;
        const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: any) => p?.type === "text" ? p.text : "").join("\n") : "{}";
        ai = JSON.parse(text || "{}");
      } catch (error: any) {
        ai = {
          resumo: "Não foi possível gerar triagem automática neste momento.",
          causaProvavel: "Indeterminada",
          nivelConfianca: 0,
          precisaEscalar: true,
          categoriaSugerida: "outro",
          prioridadeSugerida: "media",
          passosUsuario: ["Encaminhar para equipe de TI para análise manual."],
          passosTI: ["Validar logs, print e contexto técnico do usuário."],
          acaoImediata: "Escalonar para atendimento humano.",
          erro: String(error?.message || "AI_TRIAGE_FAILED"),
        };
      }

      const precisaEscalar = Boolean(ai?.precisaEscalar ?? true);
      const nivelConfianca = Number(ai?.nivelConfianca ?? 0);

      if (ticket?.id) {
        const statusTarget = precisaEscalar ? "aguardando_ti" : "aguardando_usuario";
        await client`
          UPDATE tickets_ti
          SET status = ${statusTarget},
              categoria = COALESCE(${String(ai?.categoriaSugerida || "") || null}, categoria),
              prioridade = COALESCE(${String(ai?.prioridadeSugerida || "") || null}, prioridade),
              "updatedAt" = NOW()
          WHERE id = ${ticket.id} AND "empresaId" = ${empresaId}
        `.catch(() => {});

        const conteudoPublico = [
          `Triagem IA: ${ai?.resumo || "Sem resumo."}`,
          ai?.acaoImediata ? `Ação imediata: ${ai.acaoImediata}` : "",
          Array.isArray(ai?.passosUsuario) && ai.passosUsuario.length
            ? `Passos sugeridos para o usuário:\n- ${ai.passosUsuario.join("\n- ")}`
            : "",
          `Confiança: ${nivelConfianca}%`,
        ].filter(Boolean).join("\n\n");

        await client`
          INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"isInterno","createdAt")
          VALUES (${ticket.id},${empresaId},${ctx.user.id},${conteudoPublico},'sistema',false,NOW())
        `.catch(() => {});

        await client`
          INSERT INTO ticket_internal_notes ("ticketId","empresaId","autorId",conteudo,"createdAt")
          VALUES (${ticket.id},${empresaId},${ctx.user.id},${`Triagem IA (interno): ${JSON.stringify(ai)}`},NOW())
        `.catch(() => {});
      }

      return {
        ok: true,
        triagem: ai,
        precisaEscalar,
        nivelConfianca,
      };
    }),

  updateTicket: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(TICKET_STATUS_VALUES).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      tecnicoId: z.number().optional(),
      prazo: z.string().optional(),
      resolucao: z.string().optional(),
      slaHoras: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const { id, ...data } = input;
      const currentRows = await client`SELECT status FROM tickets_ti WHERE id=${id} AND "empresaId"=${empresaId} LIMIT 1`;
      const currentStatus = currentRows?.[0]?.status ?? null;
      // Monta SET dinamicamente com raw SQL para suportar colunas extras (tecnicoId, slaHoras)
      const sets: string[] = ['"updatedAt"=NOW()'];
      const vals: any[] = [];
      let i = 1;
      if (data.status) { sets.push(`status=$${i++}`); vals.push(data.status); }
      if (data.prioridade) { sets.push(`prioridade=$${i++}`); vals.push(data.prioridade); }
      if (data.tecnicoId) { sets.push(`"tecnicoId"=$${i++}`); vals.push(data.tecnicoId); }
      if (data.resolucao) { sets.push(`resolucao=$${i++}`); vals.push(data.resolucao); }
      if (data.slaHoras) { sets.push(`"slaHoras"=$${i++}`); vals.push(data.slaHoras); }
      if (data.status === 'resolvido' || data.status === 'encerrado') sets.push('"resolvidoEm"=NOW()');
      vals.push(id); vals.push(empresaId);
      await client.unsafe(
        `UPDATE tickets_ti SET ${sets.join(',')} WHERE id=$${i++} AND "empresaId"=$${i}`,
        vals
      ).catch(() => {});
      // Log de status
      if (data.status) {
        await client`
          INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
          VALUES (${id},${empresaId},${ctx.user.id},${'Status alterado para: ' + data.status + (data.resolucao ? ' — ' + data.resolucao : '')},'sistema',NOW())
        `.catch(() => {});
        await client`
          INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
          VALUES (${id},${empresaId},${ctx.user.id},${currentStatus},${data.status},${data.resolucao ?? null},NOW())
        `.catch(() => {});
      }
      return { success: true };
    }),

  updateTicketStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(TICKET_STATUS_VALUES), resolucao: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`SELECT status FROM tickets_ti WHERE id=${input.id} AND "empresaId"=${empresaId} LIMIT 1`;
      const currentStatus = rows?.[0]?.status ?? null;
      const resolvedAt =
        input.status === "resolvido" || input.status === "encerrado" ? new Date() : null;
      await client`
        UPDATE tickets_ti
        SET status=${input.status},
            resolucao=${input.resolucao ?? null},
            "resolvidoEm"=${resolvedAt},
            "updatedAt"=NOW()
        WHERE id=${input.id} AND "empresaId"=${empresaId}
      `.catch(() => {});
      await client`
        INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
        VALUES (${input.id},${empresaId},${ctx.user.id},${currentStatus},${input.status},${input.resolucao ?? null},NOW())
      `.catch(() => {});
      return { success: true };
    }),

  deleteTicket: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageTi(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para excluir chamado." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      await db.update(ticketsTi).set({ deletedAt: new Date() }).where(and(eq(ticketsTi.id, input.id), eq(ticketsTi.empresaId, empresaId)));
      return { success: true };
    }),

  // ── Mensagens do ticket ────────────────────────────────────────────────────
  listMensagens: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) return [];
      const empresaId = await resolveTiEmpresaId(ctx);
      if (!canManageTi(ctx.user)) {
        const own = await client`
          SELECT id FROM tickets_ti
          WHERE id = ${input.ticketId}
            AND "empresaId" = ${empresaId}
            AND "solicitanteId" = ${ctx.user.id}
            AND "deletedAt" IS NULL
          LIMIT 1
        `.catch(() => []);
        if (!own?.[0]) throw new TRPCError({ code: "FORBIDDEN" });
      }
      return client`
        SELECT m.*, u.name as autor_nome, u.email as autor_email
        FROM ticket_mensagens m
        LEFT JOIN users u ON u.id = m."autorId"
        WHERE m."ticketId" = ${input.ticketId} AND m."empresaId" = ${empresaId}
        ORDER BY m."createdAt" ASC
      `.catch(() => []);
    }),

  sendMensagem: protectedProcedure
    .input(z.object({
      ticketId: z.number(),
      conteudo: z.string(),
      tipo: z.enum(["mensagem", "texto", "nota_interna", "anexo", "imagem", "file", "sistema"]).optional(),
      anexoUrl: z.string().optional(),
      anexoNome: z.string().optional(),
      anexoTipo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const tipo = input.anexoUrl
        ? "anexo"
        : input.tipo === "texto"
          ? "mensagem"
          : input.tipo === "imagem" || input.tipo === "file"
            ? "anexo"
            : input.tipo || "mensagem";
      const rows = await client`
        INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"fileUrl","fileName","fileType","createdAt")
        VALUES (${input.ticketId},${empresaId},${ctx.user.id},${input.conteudo},${tipo},${input.anexoUrl||null},${input.anexoNome||null},${input.anexoTipo||null},NOW())
        RETURNING *
      `;
      await client`UPDATE tickets_ti SET "updatedAt"=NOW() WHERE id=${input.ticketId}`.catch(()=>{});
      return rows[0];
    }),

  listStatusHistory: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) return [];
      const empresaId = await resolveTiEmpresaId(ctx);
      return client`
        SELECT h.*, u.name as autor_nome
        FROM ticket_status_history h
        LEFT JOIN users u ON u.id = h."changedBy"
        WHERE h."ticketId" = ${input.ticketId} AND h."empresaId" = ${empresaId}
        ORDER BY h."createdAt" ASC
      `.catch(() => []);
    }),

  listInternalNotes: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) return [];
      const empresaId = await resolveTiEmpresaId(ctx);
      return client`
        SELECT n.*, u.name as autor_nome
        FROM ticket_internal_notes n
        LEFT JOIN users u ON u.id = n."autorId"
        WHERE n."ticketId" = ${input.ticketId}
          AND n."empresaId" = ${empresaId}
          AND n."deletedAt" IS NULL
        ORDER BY n."createdAt" DESC
      `.catch(() => []);
    }),

  addInternalNote: protectedProcedure
    .input(z.object({ ticketId: z.number(), conteudo: z.string().min(2) }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        INSERT INTO ticket_internal_notes ("ticketId","empresaId","autorId",conteudo,"createdAt")
        VALUES (${input.ticketId},${empresaId},${ctx.user.id},${input.conteudo},NOW())
        RETURNING *
      `;
      await client`
        INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
        VALUES (${input.ticketId},${empresaId},${ctx.user.id},${'Nota interna registrada'},'sistema',NOW())
      `.catch(() => {});
      return rows[0];
    }),

  requestRemoteAccess: protectedProcedure
    .input(z.object({ ticketId: z.number(), anydeskId: z.string().optional(), observacoes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      await client`
        INSERT INTO remote_access_requests ("ticketId","empresaId","solicitadoPor",status,"anydeskId",observacoes)
        VALUES (${input.ticketId},${empresaId},${ctx.user.id},'solicitado',${input.anydeskId ?? null},${input.observacoes ?? null})
      `.catch(() => {});
      await client`
        UPDATE tickets_ti SET status='acesso_remoto_solicitado',"updatedAt"=NOW() WHERE id=${input.ticketId} AND "empresaId"=${empresaId}
      `.catch(() => {});
      await client`
        INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
        VALUES (${input.ticketId},${empresaId},${ctx.user.id},${null},'acesso_remoto_solicitado',${input.observacoes ?? 'Acesso remoto solicitado'},NOW())
      `.catch(() => {});
      return { success: true };
    }),

  listRemoteAccessRequests: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) return [];
      const status = input?.status;
      const empresaId = await resolveTiEmpresaId(ctx);
      return client`
        SELECT r.*,
          t.protocolo,
          t.titulo as ticket_titulo,
          solicitante.name as solicitado_por_nome,
          autorizador.name as autorizado_por_nome
        FROM remote_access_requests r
        LEFT JOIN tickets_ti t ON t.id = r."ticketId"
        LEFT JOIN users solicitante ON solicitante.id = r."solicitadoPor"
        LEFT JOIN users autorizador ON autorizador.id = r."autorizadoPor"
        WHERE r."empresaId" = ${empresaId}
          ${status && status !== "todos" ? client`AND r.status = ${status}` : client``}
        ORDER BY COALESCE(r."solicitadoEm", NOW()) DESC, r.id DESC
      `.catch(() => []);
    }),

  updateRemoteAccessRequest: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["solicitado", "autorizado", "negado", "em_acesso", "encerrado"]),
      observacoes: z.string().optional(),
      anydeskId: z.string().optional(),
      consentimento: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        SELECT * FROM remote_access_requests
        WHERE id = ${input.id} AND "empresaId" = ${empresaId}
        LIMIT 1
      `;
      const request = rows[0];
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });

      const autorizadoEm = input.status === "autorizado" ? new Date() : request.autorizadoEm;
      const encerradoEm = input.status === "encerrado" ? new Date() : request.encerradoEm;
      const autorizadoPor = input.status === "autorizado" || input.status === "negado" || input.status === "encerrado"
        ? ctx.user.id
        : request.autorizadoPor;
      const consentimento = input.consentimento ?? request.consentimento ?? null;
      const observacoes = input.observacoes ?? request.observacoes ?? null;
      const anydeskId = input.anydeskId ?? request.anydeskId ?? null;

      await client`
        UPDATE remote_access_requests
        SET status = ${input.status},
            "autorizadoPor" = ${autorizadoPor},
            "autorizadoEm" = ${autorizadoEm},
            "encerradoEm" = ${encerradoEm},
            consentimento = ${consentimento},
            "anydeskId" = ${anydeskId},
            observacoes = ${observacoes}
        WHERE id = ${input.id} AND "empresaId" = ${empresaId}
      `;

      const ticketStatusMap: Record<string, string | null> = {
        solicitado: "acesso_remoto_solicitado",
        autorizado: "acesso_remoto_solicitado",
        negado: "aguardando_ti",
        em_acesso: "em_acesso_remoto",
        encerrado: "resolvido",
      };
      const nextTicketStatus = ticketStatusMap[input.status];
      if (nextTicketStatus) {
        await client`
          UPDATE tickets_ti
          SET status = ${nextTicketStatus},
              "updatedAt" = NOW(),
              "resolvidoEm" = ${input.status === "encerrado" ? new Date() : null}
          WHERE id = ${request.ticketId} AND "empresaId" = ${empresaId}
        `.catch(() => {});
        await client`
          INSERT INTO ticket_status_history ("ticketId","empresaId","changedBy","fromStatus","toStatus",motivo,"createdAt")
          VALUES (${request.ticketId},${empresaId},${ctx.user.id},${null},${nextTicketStatus},${observacoes},NOW())
        `.catch(() => {});
      }
      await client`
        INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
        VALUES (
          ${request.ticketId},
          ${empresaId},
          ${ctx.user.id},
          ${'Acesso remoto atualizado para: ' + input.status.replaceAll('_', ' ') + (observacoes ? ' — ' + observacoes : '')},
          'sistema',
          NOW()
        )
      `.catch(() => {});
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // ATIVOS / INVENTÁRIO
  // ══════════════════════════════════════════════════════════════════════════
  listAtivos: protectedProcedure
    .input(z.object({ search: z.string().optional(), tipo: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const params: any[] = [empresaId];
      const conds: string[] = ['a."empresaId" = $1', 'a."deletedAt" IS NULL'];
      if (input.tipo) {
        params.push(input.tipo);
        conds.push(`a.tipo = $${params.length}`);
      }
      if (input.search) {
        params.push(`%${input.search}%`);
        const searchParam = `$${params.length}`;
        conds.push(`(a.tipo ILIKE ${searchParam} OR a.patrimonio ILIKE ${searchParam} OR a.marca ILIKE ${searchParam} OR a.modelo ILIKE ${searchParam} OR a.hostname ILIKE ${searchParam})`);
      }
      return (client as any).unsafe(`
        SELECT
          a.id,
          a."empresaId",
          a.tipo,
          a.marca,
          a.modelo,
          a.patrimonio,
          a.serial,
          a."responsavelId",
          a.setor,
          a.status,
          a."dataAquisicao",
          a."garantiaAte",
          a.observacoes,
          a.anydesk,
          a.anydesk as "anydeskId",
          a."sistemaOperacional",
          a.processador,
          a."memoriaRam",
          a.armazenamento,
          a.hostname,
          a.ip,
          a.so,
          a.teamviewer,
          a."cpuUso",
          a."ramUso",
          a."discoSaude",
          a.temperatura,
          a."ultimoPing",
          a."valorAquisicao",
          a."createdAt",
          a."updatedAt",
          a."deletedAt"
        FROM ativos_ti a
        WHERE ${conds.join(" AND ")}
        ORDER BY a."createdAt" DESC
      `, params);
    }),

  createAtivo: protectedProcedure
    .input(z.object({
      tipo: z.string().min(2), marca: z.string().optional(), modelo: z.string().optional(),
      patrimonio: z.string().optional(), serial: z.string().optional(),
      setor: z.string().optional(), hostname: z.string().optional(),
      ip: z.string().optional(), so: z.string().optional(),
      anydesk: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const [a] = await db.insert(ativosTi).values({ ...input, empresaId }).returning();
      return a;
    }),

  updateAtivo: protectedProcedure
    .input(z.object({
      id: z.number(), tipo: z.string().optional(), marca: z.string().optional(),
      modelo: z.string().optional(), patrimonio: z.string().optional(),
      serial: z.string().optional(), setor: z.string().optional(),
      hostname: z.string().optional(), ip: z.string().optional(),
      so: z.string().optional(), anydesk: z.string().optional(),
      status: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const empresaId = await resolveTiEmpresaId(ctx);
      await db.update(ativosTi).set({ ...data, updatedAt: new Date() }).where(and(eq(ativosTi.id, id), eq(ativosTi.empresaId, empresaId)));
      return { success: true };
    }),

  deleteAtivo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      await db.update(ativosTi).set({ deletedAt: new Date() }).where(and(eq(ativosTi.id, input.id), eq(ativosTi.empresaId, empresaId)));
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // LICENÇAS
  // ══════════════════════════════════════════════════════════════════════════
  listLicencas: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) return [];
      const empresaId = await resolveTiEmpresaId(ctx);
      return client`
        SELECT * FROM licencas_ti
        WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL
        ${input.search ? client`AND (software ILIKE ${'%'+input.search+'%'} OR fornecedor ILIKE ${'%'+input.search+'%'})` : client``}
        ORDER BY "createdAt" DESC
      `.catch(() => []);
    }),

  createLicenca: protectedProcedure
    .input(z.object({
      software: z.string().min(2), fornecedor: z.string().optional(),
      tipo: z.enum(["perpetua","assinatura","oem","freeware","opensource"]).optional(),
      quantidadeTotal: z.number().optional(), quantidadeUsada: z.number().optional(),
      chave: z.string().optional(), vencimento: z.string().optional(),
      valor: z.number().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        INSERT INTO licencas_ti ("empresaId",software,fornecedor,tipo,"quantidadeTotal","quantidadeUsada",chave,vencimento,valor,observacoes,"createdAt","updatedAt")
        VALUES (${empresaId},${input.software},${input.fornecedor||null},${input.tipo||'perpetua'},${input.quantidadeTotal||1},${input.quantidadeUsada||0},${input.chave||null},${input.vencimento?new Date(input.vencimento):null},${input.valor||null},${input.observacoes||null},NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  updateLicenca: protectedProcedure
    .input(z.object({
      id: z.number(), software: z.string().optional(), fornecedor: z.string().optional(),
      quantidadeTotal: z.number().optional(), quantidadeUsada: z.number().optional(),
      chave: z.string().optional(), vencimento: z.string().optional(),
      valor: z.number().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const { id, vencimento, ...rest } = input;
      const sets: string[] = ['"updatedAt"=NOW()'];
      const vals: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) { sets.push(`"${k}"=$${i++}`); vals.push(v); }
      }
      if (vencimento) { sets.push(`vencimento=$${i++}`); vals.push(new Date(vencimento)); }
      vals.push(id, empresaId);
      await client.unsafe(`UPDATE licencas_ti SET ${sets.join(',')} WHERE id=$${i++} AND "empresaId"=$${i++}`, vals);
      return { success: true };
    }),

  deleteLicenca: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      await client`UPDATE licencas_ti SET "deletedAt"=NOW() WHERE id=${input.id} AND "empresaId"=${empresaId}`;
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // SERVIDORES
  // ══════════════════════════════════════════════════════════════════════════
  listServidores: protectedProcedure.query(async ({ ctx }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return [];
    const empresaId = await resolveTiEmpresaId(ctx);
    return client`SELECT * FROM servidores_ti WHERE "empresaId"=${empresaId} AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`.catch(()=>[]);
  }),

  createServidor: protectedProcedure
    .input(z.object({
      nome: z.string().min(2), tipo: z.enum(["fisico","virtual","cloud","container"]).optional(),
      ip: z.string().optional(), so: z.string().optional(), cpu: z.string().optional(),
      ram: z.string().optional(), disco: z.string().optional(),
      localizacao: z.string().optional(), funcao: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        INSERT INTO servidores_ti ("empresaId",nome,tipo,ip,so,cpu,ram,disco,localizacao,funcao,observacoes,status,"createdAt","updatedAt")
        VALUES (${empresaId},${input.nome},${input.tipo||'fisico'},${input.ip||null},${input.so||null},${input.cpu||null},${input.ram||null},${input.disco||null},${input.localizacao||null},${input.funcao||null},${input.observacoes||null},'online',NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  updateServidor: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["online","offline","manutencao"]).optional(), observacoes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      if (input.status) await client`UPDATE servidores_ti SET status=${input.status},"updatedAt"=NOW() WHERE id=${input.id} AND "empresaId"=${empresaId}`;
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // ACESSOS REMOTOS
  // ══════════════════════════════════════════════════════════════════════════
  listAcessos: protectedProcedure.query(async ({ ctx }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return [];
    const empresaId = await resolveTiEmpresaId(ctx);
    return client`
      SELECT a.*, u.name as usuario_nome FROM acessos_ti a
      LEFT JOIN users u ON u.id = a."usuarioId"
      WHERE a."empresaId"=${empresaId} AND a."deletedAt" IS NULL
      ORDER BY a."createdAt" DESC
    `.catch(()=>[]);
  }),

  createAcesso: protectedProcedure
    .input(z.object({
      nome: z.string().min(2), tipo: z.enum(["anydesk","rdp","ssh","vpn","outro"]).optional(),
      host: z.string().optional(), porta: z.number().optional(),
      usuario: z.string().optional(), anydesk_id: z.string().optional(),
      setor: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        INSERT INTO acessos_ti ("empresaId","usuarioId",nome,tipo,host,porta,usuario,anydesk_id,setor,observacoes,"createdAt","updatedAt")
        VALUES (${empresaId},${ctx.user.id},${input.nome},${input.tipo||'outro'},${input.host||null},${input.porta||null},${input.usuario||null},${input.anydesk_id||null},${input.setor||null},${input.observacoes||null},NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // COMPRAS DE TI
  // ══════════════════════════════════════════════════════════════════════════
  listCompras: protectedProcedure.query(async ({ ctx }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return [];
    const empresaId = await resolveTiEmpresaId(ctx);
    return client`
      SELECT c.*,
        solicitante.name as solicitante_nome,
        aprovador.name as aprovador_nome
      FROM compras_ti c
      LEFT JOIN users solicitante ON solicitante.id = c."solicitanteId"
      LEFT JOIN users aprovador ON aprovador.id = c."aprovadorId"
      WHERE c."empresaId"=${empresaId} AND c."deletedAt" IS NULL
      ORDER BY c."createdAt" DESC
    `.catch(()=>[]);
  }),

  listComprasHistorico: protectedProcedure
    .input(z.object({ compraId: z.number() }))
    .query(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) return [];
      const empresaId = await resolveTiEmpresaId(ctx);
      return client`
        SELECT h.*, u.name as autor_nome
        FROM compras_ti_historico h
        LEFT JOIN users u ON u.id = h."userId"
        WHERE h."compraId"=${input.compraId}
          AND h."empresaId"=${empresaId}
        ORDER BY h."createdAt" DESC, h.id DESC
      `.catch(() => []);
    }),

  createCompra: protectedProcedure
    .input(z.object({
      item: z.string().min(2), fornecedor: z.string().optional(),
      quantidade: z.number().optional(), valorUnitario: z.number().optional(),
      status: z.enum(["solicitado","em_aprovacao","aprovado","rejeitado","comprado","entregue","cancelado"]).optional(),
      justificativa: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const quantidade = input.quantidade || 1;
      const valorUnitario = input.valorUnitario || 0;
      const valorTotal = quantidade * valorUnitario;
      const nivelAlcada = valorTotal >= 10000 ? 3 : valorTotal >= 3000 ? 2 : 1;
      const needsApproval = valorTotal >= 1000;
      const statusInicial = input.status || (needsApproval ? "em_aprovacao" : "solicitado");
      const rows = await client`
        INSERT INTO compras_ti ("empresaId","solicitanteId",item,fornecedor,quantidade,"valorUnitario","valorTotal",status,justificativa,observacoes,"nivelAlcada","createdAt","updatedAt")
        VALUES (${empresaId},${ctx.user.id},${input.item},${input.fornecedor||null},${quantidade},${input.valorUnitario||null},${valorTotal},${statusInicial},${input.justificativa||null},${input.observacoes||null},${nivelAlcada},NOW(),NOW())
        RETURNING *
      `;
      const compra = rows[0];
      await client`
        INSERT INTO compras_ti_historico ("compraId","empresaId","userId",acao,"statusAnterior","statusNovo",observacao,"createdAt")
        VALUES (${compra.id},${empresaId},${ctx.user.id},'criada',${null},${statusInicial},${needsApproval ? 'Compra entrou em fluxo de alçada.' : 'Compra criada sem necessidade de alçada.'},NOW())
      `.catch(() => {});
      return compra;
    }),

  updateCompra: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["solicitado","em_aprovacao","aprovado","rejeitado","comprado","entregue","cancelado"]),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        SELECT * FROM compras_ti
        WHERE id=${input.id} AND "empresaId"=${empresaId}
        LIMIT 1
      `;
      const compra = rows[0];
      if (!compra) throw new TRPCError({ code: "NOT_FOUND", message: "Compra não encontrada." });

      const isApproving = input.status === "aprovado" || input.status === "rejeitado";
      if (isApproving && !["master_admin", "admin", "ti_master"].includes(String(ctx.user.role))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas perfis de gestão podem aprovar ou rejeitar compras." });
      }

      await client`
        UPDATE compras_ti
        SET status=${input.status},
            "aprovadorId"=${isApproving ? ctx.user.id : compra.aprovadorId},
            "aprovadoEm"=${isApproving ? new Date() : compra.aprovadoEm},
            "observacaoAprovacao"=${input.observacao ?? compra.observacaoAprovacao ?? null},
            "updatedAt"=NOW()
        WHERE id=${input.id} AND "empresaId"=${empresaId}
      `;
      await client`
        INSERT INTO compras_ti_historico ("compraId","empresaId","userId",acao,"statusAnterior","statusNovo",observacao,"createdAt")
        VALUES (${input.id},${empresaId},${ctx.user.id},'status_alterado',${compra.status ?? null},${input.status},${input.observacao ?? null},NOW())
      `.catch(() => {});
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CMDB
  // ══════════════════════════════════════════════════════════════════════════
  listCmdb: protectedProcedure.query(async ({ ctx }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return [];
    const empresaId = await resolveTiEmpresaId(ctx);
    return client`SELECT * FROM cmdb_ti WHERE "empresaId"=${empresaId} AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`.catch(()=>[]);
  }),

  createCmdb: protectedProcedure
    .input(z.object({
      nome: z.string().min(2), tipo: z.string().optional(), versao: z.string().optional(),
      ambiente: z.enum(["producao","homologacao","desenvolvimento","teste"]).optional(),
      responsavel: z.string().optional(), dependencias: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        INSERT INTO cmdb_ti ("empresaId",nome,tipo,versao,ambiente,responsavel,dependencias,observacoes,"createdAt","updatedAt")
        VALUES (${empresaId},${input.nome},${input.tipo||null},${input.versao||null},${input.ambiente||'producao'},${input.responsavel||null},${input.dependencias||null},${input.observacoes||null},NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // MANUTENÇÕES
  // ══════════════════════════════════════════════════════════════════════════
  listManutencoes: protectedProcedure.query(async ({ ctx }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return [];
    const empresaId = await resolveTiEmpresaId(ctx);
    return client`
      SELECT m.*, u.name as tecnico_nome FROM manutencoes_ti m
      LEFT JOIN users u ON u.id = m."tecnicoId"
      WHERE m."empresaId"=${empresaId} AND m."deletedAt" IS NULL
      ORDER BY m."createdAt" DESC
    `.catch(()=>[]);
  }),

  createManutencao: protectedProcedure
    .input(z.object({
      ativoId: z.number().optional(),
      tipo: z.enum(["preventiva","corretiva","preditiva"]).optional(),
      descricao: z.string().min(5),
      tecnicoId: z.number().optional(),
      agendadoPara: z.string().optional(),
      pecasUtilizadas: z.string().optional(),
      custo: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const rows = await client`
        INSERT INTO manutencoes_ti ("empresaId","ativoId",tipo,descricao,"tecnicoId","agendadoPara","pecasUtilizadas",custo,observacoes,status,"createdAt","updatedAt")
        VALUES (${empresaId},${input.ativoId||null},${input.tipo||'corretiva'},${input.descricao},${input.tecnicoId||ctx.user.id},${input.agendadoPara?new Date(input.agendadoPara):null},${input.pecasUtilizadas||null},${input.custo||null},${input.observacoes||null},'agendada',NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // MONITORAMENTO — Agentes
  // ══════════════════════════════════════════════════════════════════════════
  listAgentes: protectedProcedure.input(z.object({ empresaId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return [];
    const empresaId = await resolveTiEmpresaId(ctx, input?.empresaId);
    const fullRows = await client`
      SELECT a.*,
        CASE
          WHEN COALESCE(a."updatedAt", a."ultimoContato", NOW() - INTERVAL '365 days') >= NOW() - INTERVAL '10 minutes'
            THEN 'online'
          ELSE 'offline'
        END as status_resolvido,
        (SELECT "coletadoEm" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ultima_coleta,
        (SELECT "cpuUso" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as cpu_atual,
        (SELECT "ramUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ram_atual,
        (SELECT "discoUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as disco_atual,
        (SELECT "anydeskId" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as anydesk_id_atual,
        (SELECT "placaMaeModelo" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as placa_mae_modelo,
        (SELECT "placaMaeFabricante" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as placa_mae_fabricante,
        (SELECT "socketCpu" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as socket_cpu,
        (SELECT "biosVersao" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as bios_versao,
        (SELECT gpus FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as gpus,
        (SELECT sensores FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as sensores,
        (SELECT "memoriaSlots" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as memoria_slots
      FROM monitor_agentes a
      WHERE a."empresaId"=${empresaId}
        AND a."deletedAt" IS NULL
        AND COALESCE(a.ativo, true) = true
      ORDER BY a.hostname ASC
    `.catch(()=>[]);
    if (fullRows.length > 0) return fullRows;
    // Fallback resiliente para schemas parciais: não zera a listagem de agentes.
    return client`
      SELECT a.*,
        CASE
          WHEN COALESCE(a."updatedAt", a."ultimoContato", NOW() - INTERVAL '365 days') >= NOW() - INTERVAL '10 minutes'
            THEN 'online'
          ELSE 'offline'
        END as status_resolvido
      FROM monitor_agentes a
      WHERE a."empresaId"=${empresaId}
        AND a."deletedAt" IS NULL
        AND COALESCE(a.ativo, true) = true
      ORDER BY a.hostname ASC
    `.catch(()=>[]);
  }),

  getAgenteMetricas: protectedProcedure
    .input(z.object({ agenteId: z.number(), periodo: z.enum(["1h","24h","7d","30d","90d"]).optional(), empresaId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) return { metricas: [], ultima: null, picos: {} };
      const empresaId = await resolveTiEmpresaId(ctx, input.empresaId);
      const periodoMap: Record<string,string> = { "1h":"1 hour","24h":"24 hours","7d":"7 days","30d":"30 days","90d":"90 days" };
      const intervalo = periodoMap[input.periodo||"24h"]||"24 hours";
      const metricas = await client`
        SELECT date_trunc('hour',"coletadoEm") as hora,
          round(avg("cpuUso")::numeric,1) as cpu_medio, round(max("cpuUso")::numeric,1) as cpu_pico,
          round(avg("ramUsoPct")::numeric,1) as ram_medio, round(max("ramUsoPct")::numeric,1) as ram_pico,
          round(avg("discoUsoPct")::numeric,1) as disco_medio,
          round(avg("latenciaMs")::numeric,0) as latencia_media, count(*) as amostras
        FROM monitor_metricas
        WHERE "agenteId"=${input.agenteId} AND "empresaId"=${empresaId}
          AND "coletadoEm" >= NOW() - ${intervalo}::interval
        GROUP BY date_trunc('hour',"coletadoEm") ORDER BY hora ASC
      `.catch(()=>[]);
      const ultima = await client`SELECT * FROM monitor_metricas WHERE "agenteId"=${input.agenteId} AND "empresaId"=${empresaId} ORDER BY "coletadoEm" DESC LIMIT 1`.catch(()=>[null]).then(r=>r[0]||null);
      const picos = await client`SELECT max("cpuUso") as cpu_max,max("ramUsoPct") as ram_max,max("discoUsoPct") as disco_max FROM monitor_metricas WHERE "agenteId"=${input.agenteId} AND "empresaId"=${empresaId} AND "coletadoEm">=NOW()-${intervalo}::interval`.catch(()=>[{}]).then(r=>r[0]||{});
      return { metricas, ultima, picos };
    }),

  // ── Registro de agente (público — chamado pelo agente instalado no PC) ────
  registerAgent: publicProcedure
    .input(z.object({
      hostname: z.string(), ip: z.string().optional(), so: z.string().optional(),
      mac: z.string().optional(), versao_agente: z.string().optional(),
      anydesk_id: z.string().optional(), empresa_token: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const token = `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      if (!input.empresa_token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registro de agente exige código de empresa ou pareamento válido.",
        });
      }
      const empresaRows = await client`
        SELECT id FROM empresas
        WHERE codigo=${input.empresa_token}
          AND "deletedAt" IS NULL
          AND COALESCE(ativo, true) = true
        LIMIT 1
      `.catch(()=>[]);
      if (!empresaRows[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Código de empresa inválido." });
      }
      const empresaId = empresaRows[0].id;
      const rows = await client`
        INSERT INTO monitor_agentes ("empresaId",hostname,ip,so,mac,"versaoAgente","anydeskId",token,status,"createdAt","updatedAt")
        VALUES (${empresaId},${input.hostname},${input.ip||null},${input.so||null},${input.mac||null},${input.versao_agente||'1.0.0'},${input.anydesk_id||null},${token},'online',NOW(),NOW())
        RETURNING *
      `.catch(async () => {
        return client`SELECT * FROM monitor_agentes WHERE hostname=${input.hostname} AND "empresaId"=${empresaId} LIMIT 1`.catch(()=>[]);
      });
      const agente = rows[0];
      return { token: agente?.token || token, agenteId: agente?.id };
    }),

  // ── Ingestão de métricas (público — chamado pelo agente) ──────────────────
  ingestMetrics: publicProcedure
    .input(z.object({
      token: z.string(),
      metricas: z.array(z.object({
        hostname: z.string(), coletado_em: z.string(),
        cpu_uso: z.number().optional(), cpu_temp: z.number().optional(),
        ram_uso_pct: z.number().optional(), ram_total_mb: z.number().optional(), ram_usada_mb: z.number().optional(),
        disco_uso_pct: z.number().optional(), disco_total_gb: z.number().optional(), disco_usado_gb: z.number().optional(),
        rede_enviado_kb: z.number().optional(), rede_recebido_kb: z.number().optional(),
        latencia_ms: z.number().optional(), processos: z.number().optional(),
        anydesk_id: z.string().optional(), usuario_logado: z.string().optional(),
        uptime: z.number().optional(), top_processos: z.any().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const client = await getRawClient();
      if (!client) return { received: 0 };
      const agentes = await client`
        SELECT * FROM monitor_agentes
        WHERE token=${input.token}
          AND "deletedAt" IS NULL
          AND COALESCE(ativo, true) = true
        LIMIT 1
      `.catch(()=>[]);
      const agente = agentes[0];
      if (!agente) return { received: 0, error: "Token inválido" };
      await client`UPDATE monitor_agentes SET status='online',"updatedAt"=NOW() WHERE id=${agente.id}`.catch(()=>{});
      let inserted = 0;
      for (const m of input.metricas) {
        await client`
          INSERT INTO monitor_metricas ("agenteId","empresaId","coletadoEm","cpuUso","cpuTemp","ramUsoPct","ramTotalMb","ramUsadaMb","discoUsoPct","discoTotalGb","discoUsadoGb","redeEnviadoKb","redeRecebidoKb","latenciaMs",processos,"anydeskId","usuarioLogado",uptime,"topProcessos")
          VALUES (${agente.id},${agente.empresaId},${new Date(m.coletado_em)},${m.cpu_uso||null},${m.cpu_temp||null},${m.ram_uso_pct||null},${m.ram_total_mb||null},${m.ram_usada_mb||null},${m.disco_uso_pct||null},${m.disco_total_gb||null},${m.disco_usado_gb||null},${m.rede_enviado_kb||null},${m.rede_recebido_kb||null},${m.latencia_ms||null},${m.processos||null},${m.anydesk_id||null},${m.usuario_logado||null},${m.uptime||null},${m.top_processos?JSON.stringify(m.top_processos):null})
        `.catch(()=>{});
        inserted++;
      }
      return { received: inserted };
    }),

  listAlertas: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) return [];
      const empresaId = await resolveTiEmpresaId(ctx);
      return client`
        SELECT e.*, a.hostname FROM monitor_eventos e
        LEFT JOIN monitor_agentes a ON a.id=e."agenteId"
        WHERE e."empresaId"=${empresaId}
        ORDER BY e."ocorridoEm" DESC LIMIT ${input.limit||50}
      `.catch(()=>[]);
    }),

  // ── Códigos de Pareamento PC↔Synapse ──────────────────────────────────────────────────────────────────────────────
  gerarCodigoPareamento: protectedProcedure
      .input(z.object({
        descricao: z.string().optional(),
        ativoId: z.number().optional(),
        empresaId: z.number().optional(),
        userId: z.number().optional(),
        departmentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        requireTiManager(ctx.user);
        const client = await getRawClient();
        if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const empresaId = await resolveTiEmpresaId(ctx, input.empresaId);
        const userId = input.userId || ctx.user.id;
        // Gera código único no formato SYNC-XXXX-XXXX
        const parte1 = Math.random().toString(36).slice(2,6).toUpperCase();
        const parte2 = Math.random().toString(36).slice(2,6).toUpperCase();
        const codigo = `SYNC-${parte1}-${parte2}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
        const rows = await client`
          INSERT INTO agent_pairing_codes ("empresaId",codigo,descricao,"ativoId","criadoPor","expiresAt","createdAt",user_id,department_id)
          VALUES (${empresaId},${codigo},${input.descricao||null},${input.ativoId||null},${ctx.user.id},${expiresAt},NOW(),${userId},${input.departmentId || null})
          RETURNING *
        `;
        return rows[0];
      }),

  listCodigosPareamento: protectedProcedure.input(z.object({ empresaId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
      requireTiManager(ctx.user);
      const client = await getRawClient();
      if (!client) return [];
      const empresaId = await resolveTiEmpresaId(ctx, input?.empresaId);
      return client`
        SELECT p.*, a.hostname as agente_hostname, a.ip as agente_ip
        FROM agent_pairing_codes p
        LEFT JOIN monitor_agentes a ON a.id = p."agenteId"
        WHERE p."empresaId" = ${empresaId}
        ORDER BY p."createdAt" DESC LIMIT 50
      `.catch(()=>[]);
    }),

  // ── Certificados Digitais ──────────────────────────────────────────────────
  listCertificados: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const conds: any[] = [eq(certificadosTi.empresaId, empresaId), isNull(certificadosTi.deletedAt)];
      if (input.search) conds.push(ilike(certificadosTi.nome, `%${input.search}%`));
      return db.select().from(certificadosTi).where(and(...conds)).orderBy(certificadosTi.vencimento);
    }),

  createCertificado: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      tipo: z.string(),
      vencimento: z.string(),
      senha: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      const [novo] = await db.insert(certificadosTi).values({
        empresaId,
        nome: input.nome,
        tipo: input.tipo,
        vencimento: new Date(`${input.vencimento}T12:00:00`),
        senha: input.senha,
        observacoes: input.observacoes,
      }).returning();
      return novo;
    }),

  deleteCertificado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      requireTiManager(ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveTiEmpresaId(ctx);
      await db.update(certificadosTi).set({ deletedAt: new Date() }).where(and(eq(certificadosTi.id, input.id), eq(certificadosTi.empresaId, empresaId)));
      return { success: true };
    }),

  revogarCodigoPareamento: protectedProcedure
      .input(z.object({ id: z.number(), empresaId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        requireTiManager(ctx.user);
        const client = await getRawClient();
        if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const empresaId = await resolveTiEmpresaId(ctx, input.empresaId);
        await client`DELETE FROM agent_pairing_codes WHERE id=${input.id} AND "empresaId"=${empresaId}`;
        return { success: true };
      }),

  // Chamado pelo agente na primeira execução para se vincular
  pairAgent: publicProcedure
    .input(z.object({
      codigo: z.string(),
      hostname: z.string(),
      ip: z.string().optional(),
      so: z.string().optional(),
      mac: z.string().optional(),
      fingerprint: z.string().optional(),
      anydesk_id: z.string().optional(),
      versao_agente: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Valida o código de pareamento
      const codes = await client`
        SELECT * FROM agent_pairing_codes
        WHERE codigo=${input.codigo} AND usado=false AND "expiresAt" > NOW()
        LIMIT 1
      `;
      if (!codes[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Código inválido ou expirado" });
      const pairing = codes[0];
      // Gera token permanente único
      const token = `agent_${pairing.empresaId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
      // Registra o agente
      const agentes = await client`
        INSERT INTO monitor_agentes ("empresaId",hostname,ip,so,mac,"versaoAgente","anydeskId",fingerprint,"pairingCode",token,status,"ultimoContato",online,ativo,"createdAt","updatedAt")
        VALUES (${pairing.empresaId},${input.hostname},${input.ip||null},${input.so||null},${input.mac||null},${input.versao_agente||'1.0.0'},${input.anydesk_id||null},${input.fingerprint||null},${input.codigo},${token},'online',NOW(),true,true,NOW(),NOW())
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      let agente = agentes[0];
      if (!agente) {
        // Já existia, retorna o existente
        const existentes = await client`SELECT * FROM monitor_agentes WHERE fingerprint=${input.fingerprint||''} AND "empresaId"=${pairing.empresaId} LIMIT 1`;
        agente = existentes[0];
      }
      // Marca código como usado
      await client`UPDATE agent_pairing_codes SET usado=true,"agenteId"=${agente?.id||null},"usadoEm"=NOW() WHERE id=${pairing.id}`;
      return { token, agenteId: agente?.id, empresaId: pairing.empresaId };
    }),

  // Obter token da empresa para o agente (após pareamento)
  getEmpresaAgentToken: protectedProcedure.query(async ({ ctx }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return { token: null };
    const empresaId = await resolveTiEmpresaId(ctx);
    // Gera ou retorna o agentToken da empresa
    const empresas = await client`SELECT "agentToken" FROM empresas WHERE id=${empresaId} LIMIT 1`;
    let token = empresas[0]?.agentToken;
    if (!token) {
      token = `et_${empresaId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
      await client`UPDATE empresas SET "agentToken"=${token} WHERE id=${empresaId}`.catch(()=>{});
    }
    return { token, empresaId };
  }),

  // ── Listar usuários da empresa (para atribuição de técnico) ────────────────────────
  listTecnicos: protectedProcedure.query(async ({ ctx }) => {
    requireTiManager(ctx.user);
    const client = await getRawClient();
    if (!client) return [];
    const empresaId = await resolveTiEmpresaId(ctx);
    return client`SELECT id, name, email FROM users WHERE "empresaId"=${empresaId} AND "deletedAt" IS NULL ORDER BY name ASC`.catch(()=>[]);
  }),
});
