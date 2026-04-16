import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const notasRouter = router({

  list: protectedProcedure.input(z.object({
    pasta: z.string().optional(),
    search: z.string().optional(),
    tag: z.string().optional(),
    arquivadas: z.boolean().default(false),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    try {
      const res = await db.execute(sql`
        SELECT * FROM notas
        WHERE "userId" = ${ctx.user.id}
          AND "deletedAt" IS NULL
          AND arquivada = ${input.arquivadas}
          ${input.pasta && input.pasta !== "todas" ? sql`AND pasta = ${input.pasta}` : sql``}
          ${input.search ? sql`AND (titulo ILIKE ${'%' + input.search + '%'} OR conteudo ILIKE ${'%' + input.search + '%'})` : sql``}
          ${input.tag ? sql`AND tags ILIKE ${'%' + input.tag + '%'}` : sql``}
        ORDER BY fixada DESC, "updatedAt" DESC
      `);
      return (res as any).rows || (res as any) || [];
    } catch { return []; }
  }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    try {
      const res = await db.execute(sql`
        SELECT * FROM notas WHERE id = ${input.id} AND "userId" = ${ctx.user.id} AND "deletedAt" IS NULL LIMIT 1
      `);
      const rows = (res as any).rows || (res as any) || [];
      return rows[0] || null;
    } catch { return null; }
  }),

  create: protectedProcedure.input(z.object({
    titulo: z.string().default("Sem título"),
    conteudo: z.string().default(""),
    pasta: z.string().default("Geral"),
    tags: z.string().default(""),
    cor: z.string().default("default"),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const res = await db.execute(sql`
      INSERT INTO notas ("userId","empresaId","titulo","conteudo","pasta","tags","cor")
      VALUES (${ctx.user.id}, ${ctx.user.empresaId!}, ${input.titulo}, ${input.conteudo}, ${input.pasta}, ${input.tags}, ${input.cor})
      RETURNING *
    `);
    const rows = (res as any).rows || (res as any) || [];
    return rows[0];
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    titulo: z.string().optional(),
    conteudo: z.string().optional(),
    pasta: z.string().optional(),
    tags: z.string().optional(),
    cor: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.execute(sql`
      UPDATE notas SET
        titulo = COALESCE(${input.titulo ?? null}, titulo),
        conteudo = COALESCE(${input.conteudo ?? null}, conteudo),
        pasta = COALESCE(${input.pasta ?? null}, pasta),
        tags = COALESCE(${input.tags ?? null}, tags),
        cor = COALESCE(${input.cor ?? null}, cor),
        "updatedAt" = now()
      WHERE id = ${input.id} AND "userId" = ${ctx.user.id}
    `);
    return { success: true };
  }),

  // Auto-save (só conteúdo e título, sem retorno pesado)
  autoSave: protectedProcedure.input(z.object({
    id: z.number(),
    titulo: z.string(),
    conteudo: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) return { success: false };
    try {
      await db.execute(sql`
        UPDATE notas SET titulo = ${input.titulo}, conteudo = ${input.conteudo}, "updatedAt" = now()
        WHERE id = ${input.id} AND "userId" = ${ctx.user.id}
      `);
      return { success: true };
    } catch { return { success: false }; }
  }),

  toggleFixada: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.execute(sql`
      UPDATE notas SET fixada = NOT fixada, "updatedAt" = now()
      WHERE id = ${input.id} AND "userId" = ${ctx.user.id}
    `);
    return { success: true };
  }),

  toggleArquivada: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.execute(sql`
      UPDATE notas SET arquivada = NOT arquivada, "updatedAt" = now()
      WHERE id = ${input.id} AND "userId" = ${ctx.user.id}
    `);
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.execute(sql`
      UPDATE notas SET "deletedAt" = now() WHERE id = ${input.id} AND "userId" = ${ctx.user.id}
    `);
    return { success: true };
  }),

  // Lista pastas únicas do usuário
  listPastas: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    try {
      const res = await db.execute(sql`
        SELECT pasta, count(*) as total FROM notas
        WHERE "userId" = ${ctx.user.id} AND "deletedAt" IS NULL AND arquivada = false
        GROUP BY pasta ORDER BY pasta
      `);
      return (res as any).rows || (res as any) || [];
    } catch { return []; }
  }),

  // Lista tags únicas do usuário
  listTags: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    try {
      const res = await db.execute(sql`
        SELECT tags FROM notas
        WHERE "userId" = ${ctx.user.id} AND "deletedAt" IS NULL AND tags != ''
      `);
      const rows = (res as any).rows || (res as any) || [];
      const allTags = new Set<string>();
      rows.forEach((r: any) => {
        if (r.tags) r.tags.split(",").forEach((t: string) => { const clean = t.trim(); if (clean) allTags.add(clean); });
      });
      return Array.from(allTags).sort();
    } catch { return []; }
  }),

  // Duplicar nota
  duplicate: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const res = await db.execute(sql`
      INSERT INTO notas ("userId","empresaId","titulo","conteudo","pasta","tags","cor")
      SELECT "userId","empresaId", titulo || ' (cópia)', conteudo, pasta, tags, cor
      FROM notas WHERE id = ${input.id} AND "userId" = ${ctx.user.id}
      RETURNING *
    `);
    const rows = (res as any).rows || (res as any) || [];
    return rows[0];
  }),
});
