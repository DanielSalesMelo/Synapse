import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { auditoriaDetalhada, auditLog } from "../drizzle/schema";
import { eq, and, desc, ilike, or, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const auditoriaRouter = router({
  // Lista completa de auditoria (admin master vê tudo, admin vê só da empresa)
  list: protectedProcedure.input(z.object({
    modulo: z.string().optional(),
    tipoEvento: z.string().optional(),
    userId: z.number().optional(),
    risco: z.string().optional(),
    search: z.string().optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
    page: z.number().default(1),
    limit: z.number().default(50),
  })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [];
    // Master admin vê tudo, outros só da empresa
    if (ctx.user.role !== "master_admin") {
      conds.push(eq(auditoriaDetalhada.empresaId, ctx.user.empresaId!));
    }
    if (input.modulo) conds.push(eq(auditoriaDetalhada.modulo, input.modulo));
    if (input.tipoEvento) conds.push(eq(auditoriaDetalhada.tipoEvento, input.tipoEvento as any));
    if (input.userId) conds.push(eq(auditoriaDetalhada.userId, input.userId));
    if (input.risco) conds.push(eq(auditoriaDetalhada.risco, input.risco));
    if (input.search) conds.push(or(ilike(auditoriaDetalhada.descricao, `%${input.search}%`), ilike(auditoriaDetalhada.userName, `%${input.search}%`))!);
    if (input.dataInicio) conds.push(gte(auditoriaDetalhada.createdAt, new Date(input.dataInicio)));
    if (input.dataFim) conds.push(lte(auditoriaDetalhada.createdAt, new Date(input.dataFim)));

    const offset = (input.page - 1) * input.limit;
    const where = conds.length > 0 ? and(...conds) : undefined;
    const items = await db.select().from(auditoriaDetalhada).where(where).orderBy(desc(auditoriaDetalhada.createdAt)).limit(input.limit).offset(offset);
    const [countResult] = await db.select({ total: sql<number>`count(*)` }).from(auditoriaDetalhada).where(where);
    return { items, total: countResult.total, page: input.page, totalPages: Math.ceil(countResult.total / input.limit) };
  }),

  // Logs legados (audit_log antigo)
  listLegacy: protectedProcedure.input(z.object({ page: z.number().default(1), limit: z.number().default(50) })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [];
    if (ctx.user.role !== "master_admin") conds.push(eq(auditLog.empresaId, ctx.user.empresaId!));
    const offset = (input.page - 1) * input.limit;
    const where = conds.length > 0 ? and(...conds) : undefined;
    return db.select().from(auditLog).where(where).orderBy(desc(auditLog.createdAt)).limit(input.limit).offset(offset);
  }),

  // Estatísticas de auditoria
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [];
    if (ctx.user.role !== "master_admin") conds.push(eq(auditoriaDetalhada.empresaId, ctx.user.empresaId!));
    const where = conds.length > 0 ? and(...conds) : undefined;
    const [stats] = await db.select({
      total: sql<number>`count(*)`,
      criticos: sql<number>`count(*) filter (where risco = 'critico')`,
      altos: sql<number>`count(*) filter (where risco = 'alto')`,
      hoje: sql<number>`count(*) filter (where "createdAt" >= current_date)`,
    }).from(auditoriaDetalhada).where(where);
    return stats;
  }),

  // Módulos mais acessados
  modulosMaisAcessados: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [];
    if (ctx.user.role !== "master_admin") conds.push(eq(auditoriaDetalhada.empresaId, ctx.user.empresaId!));
    const where = conds.length > 0 ? and(...conds) : undefined;
    return db.select({
      modulo: auditoriaDetalhada.modulo,
      total: sql<number>`count(*)`,
    }).from(auditoriaDetalhada).where(where).groupBy(auditoriaDetalhada.modulo).orderBy(desc(sql`count(*)`)).limit(10);
  }),
});
