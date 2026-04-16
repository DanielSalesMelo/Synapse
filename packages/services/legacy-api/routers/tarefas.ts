import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const STATUS_VALUES = ["backlog", "a_fazer", "em_andamento", "revisao", "concluido"] as const;
const PRIORIDADE_VALUES = ["critica", "alta", "media", "baixa"] as const;

export const tarefasRouter = router({
  // ── Listar projetos ──────────────────────────────────────────────────────
  listProjetos: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(sql`
      SELECT * FROM projetos
      WHERE "empresaId" = ${ctx.user.empresaId ?? 1}
        AND ativo = true
      ORDER BY nome
    `);
    return rows as unknown as any[];
  }),

  createProjeto: protectedProcedure
    .input(z.object({
      nome: z.string().min(1).max(200),
      descricao: z.string().optional(),
      cor: z.string().optional().default("#6366f1"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`
        INSERT INTO projetos ("empresaId", nome, descricao, cor)
        VALUES (${ctx.user.empresaId ?? 1}, ${input.nome}, ${input.descricao ?? null}, ${input.cor})
      `);
      return { success: true };
    }),

  // ── Listar tarefas ───────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      projetoId: z.number().optional(),
      status: z.enum(STATUS_VALUES).optional(),
      responsavelId: z.number().optional(),
      sprint: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db.execute(sql`
        SELECT
          t.*,
          u.name AS "responsavelNomeReal",
          p.nome AS "projetoNome",
          p.cor AS "projetoCor",
          (
            SELECT COUNT(*)::int FROM tarefa_comentarios tc WHERE tc."tarefaId" = t.id
          ) AS "totalComentarios"
        FROM tarefas t
        LEFT JOIN users u ON t."responsavelId" = u.id
        LEFT JOIN projetos p ON t."projetoId" = p.id
        WHERE t."empresaId" = ${ctx.user.empresaId ?? 1}
          ${input?.projetoId ? sql`AND t."projetoId" = ${input.projetoId}` : sql``}
          ${input?.status ? sql`AND t.status = ${input.status}` : sql``}
          ${input?.responsavelId ? sql`AND t."responsavelId" = ${input.responsavelId}` : sql``}
          ${input?.sprint ? sql`AND t.sprint = ${input.sprint}` : sql``}
        ORDER BY t."createdAt" DESC
        LIMIT 500
      `);

      return (rows as unknown as any[]).map((row) => ({
        ...row,
        tags: (() => {
          try { return JSON.parse(row.tags || "[]"); } catch { return []; }
        })(),
      }));
    }),

  // ── Criar tarefa ─────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      titulo: z.string().min(1).max(500),
      descricao: z.string().optional(),
      status: z.enum(STATUS_VALUES).default("backlog"),
      prioridade: z.enum(PRIORIDADE_VALUES).default("media"),
      responsavelId: z.number().optional(),
      responsavelNome: z.string().optional(),
      prazo: z.string().optional(), // ISO date string
      estimativaHoras: z.number().optional(),
      projetoId: z.number().optional(),
      sprint: z.string().optional(),
      tags: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.execute(sql`
        INSERT INTO tarefas (
          "empresaId", titulo, descricao, status, prioridade,
          "responsavelId", "responsavelNome", prazo, "estimativaHoras",
          "projetoId", sprint, tags, "criadoPorId"
        )
        VALUES (
          ${ctx.user.empresaId ?? 1},
          ${input.titulo},
          ${input.descricao ?? null},
          ${input.status},
          ${input.prioridade},
          ${input.responsavelId ?? null},
          ${input.responsavelNome ?? null},
          ${input.prazo ? new Date(input.prazo) : null},
          ${input.estimativaHoras ?? null},
          ${input.projetoId ?? null},
          ${input.sprint ?? null},
          ${JSON.stringify(input.tags ?? [])},
          ${ctx.user.id}
        )
        RETURNING id
      `);

      const rows = result as unknown as any[];
      return { id: rows[0]?.id, success: true };
    }),

  // ── Atualizar tarefa ─────────────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().min(1).max(500).optional(),
      descricao: z.string().optional(),
      status: z.enum(STATUS_VALUES).optional(),
      prioridade: z.enum(PRIORIDADE_VALUES).optional(),
      responsavelId: z.number().nullable().optional(),
      responsavelNome: z.string().optional(),
      prazo: z.string().nullable().optional(),
      estimativaHoras: z.number().nullable().optional(),
      progresso: z.number().min(0).max(100).optional(),
      sprint: z.string().optional(),
      tags: z.array(z.string()).optional(),
      projetoId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se a tarefa pertence à empresa
      const existing = await db.execute(sql`
        SELECT id FROM tarefas WHERE id = ${input.id} AND "empresaId" = ${ctx.user.empresaId ?? 1}
      `);
      if ((existing as unknown as any[]).length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      }

      const updates: string[] = [];
      const { id, ...fields } = input;

      if (fields.titulo !== undefined) updates.push(`titulo = '${fields.titulo.replace(/'/g, "''")}'`);
      if (fields.descricao !== undefined) updates.push(`descricao = ${fields.descricao ? `'${fields.descricao.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.status !== undefined) updates.push(`status = '${fields.status}'`);
      if (fields.prioridade !== undefined) updates.push(`prioridade = '${fields.prioridade}'`);
      if (fields.responsavelId !== undefined) updates.push(`"responsavelId" = ${fields.responsavelId ?? "NULL"}`);
      if (fields.responsavelNome !== undefined) updates.push(`"responsavelNome" = ${fields.responsavelNome ? `'${fields.responsavelNome.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.prazo !== undefined) updates.push(`prazo = ${fields.prazo ? `'${new Date(fields.prazo).toISOString()}'` : "NULL"}`);
      if (fields.estimativaHoras !== undefined) updates.push(`"estimativaHoras" = ${fields.estimativaHoras ?? "NULL"}`);
      if (fields.progresso !== undefined) updates.push(`progresso = ${fields.progresso}`);
      if (fields.sprint !== undefined) updates.push(`sprint = ${fields.sprint ? `'${fields.sprint.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.tags !== undefined) updates.push(`tags = '${JSON.stringify(fields.tags).replace(/'/g, "''")}'`);
      if (fields.projetoId !== undefined) updates.push(`"projetoId" = ${fields.projetoId ?? "NULL"}`);

      if (updates.length === 0) return { success: true };

      updates.push(`"updatedAt" = NOW()`);

      await db.execute(sql.raw(`
        UPDATE tarefas SET ${updates.join(", ")}
        WHERE id = ${id}
      `));

      return { success: true };
    }),

  // ── Mover tarefa para outro status (drag & drop) ─────────────────────────
  moveStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(STATUS_VALUES),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.execute(sql`
        UPDATE tarefas
        SET status = ${input.status}, "updatedAt" = NOW()
        WHERE id = ${input.id}
          AND "empresaId" = ${ctx.user.empresaId ?? 1}
      `);

      return { success: true };
    }),

  // ── Deletar tarefa ───────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.execute(sql`
        DELETE FROM tarefas
        WHERE id = ${input.id}
          AND "empresaId" = ${ctx.user.empresaId ?? 1}
      `);

      return { success: true };
    }),

  // ── Comentários ──────────────────────────────────────────────────────────
  listComentarios: protectedProcedure
    .input(z.object({ tarefaId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db.execute(sql`
        SELECT tc.*, u.name AS "userName", u."lastName" AS "userLastName"
        FROM tarefa_comentarios tc
        LEFT JOIN users u ON tc."userId" = u.id
        WHERE tc."tarefaId" = ${input.tarefaId}
        ORDER BY tc."createdAt" ASC
      `);

      return (rows as unknown as any[]).map((row) => ({
        ...row,
        userName: `${row.userName || ""} ${row.userLastName || ""}`.trim(),
      }));
    }),

  addComentario: protectedProcedure
    .input(z.object({
      tarefaId: z.number(),
      conteudo: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.execute(sql`
        INSERT INTO tarefa_comentarios ("tarefaId", "userId", "userName", conteudo)
        VALUES (
          ${input.tarefaId},
          ${ctx.user.id},
          ${ctx.user.name || "Usuário"},
          ${input.conteudo}
        )
      `);

      return { success: true };
    }),

  // ── Listar usuários para atribuição ──────────────────────────────────────
  listUsuarios: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db.execute(sql`
      SELECT id, name, "lastName", email
      FROM users
      WHERE "empresaId" = ${ctx.user.empresaId ?? 1}
        OR ${ctx.user.role === "master_admin" ? sql`true` : sql`false`}
      ORDER BY name
      LIMIT 100
    `);

    return (rows as unknown as any[]).map((u) => ({
      id: u.id,
      name: `${u.name || ""} ${u.lastName || ""}`.trim(),
      email: u.email,
    }));
  }),
});
