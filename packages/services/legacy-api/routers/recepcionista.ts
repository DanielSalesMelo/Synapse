import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { visitantes, visitas } from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const recepcionistaRouter = router({
  // ─── VISITANTES ────────────────────────────────────────────────────────────
  listVisitantes: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;
      const conditions = [eq(visitantes.empresaId, empresaId)];
      if (input.search) {
        conditions.push(or(
          ilike(visitantes.nome, `%${input.search}%`),
          ilike(visitantes.documento, `%${input.search}%`),
          ilike(visitantes.empresa, `%${input.search}%`)
        )!);
      }
      return db.select().from(visitantes).where(and(...conditions)).orderBy(desc(visitantes.createdAt));
    }),

  createVisitante: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      documento: z.string().optional(),
      telefone: z.string().optional(),
      email: z.string().optional(),
      empresa: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [v] = await db.insert(visitantes).values({
        ...input, empresaId: ctx.user.empresaId!,
      }).returning();
      return v;
    }),

  // ─── VISITAS ───────────────────────────────────────────────────────────────
  listVisitas: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;
      const conditions: any[] = [eq(visitas.empresaId, empresaId), isNull(visitas.deletedAt)];
      if (input.status && input.status !== "todos") conditions.push(eq(visitas.status, input.status as any));
      if (input.search) {
        conditions.push(or(
          ilike(visitas.motivo, `%${input.search}%`),
          ilike(visitas.pessoaContato, `%${input.search}%`)
        )!);
      }
      const rows = await db.select().from(visitas).where(and(...conditions)).orderBy(desc(visitas.createdAt));
      // Enriquecer com nome do visitante
      const visitanteIds = [...new Set(rows.map(r => r.visitanteId))];
      const visitantesList = visitanteIds.length > 0
        ? await db.select().from(visitantes).where(sql`${visitantes.id} IN (${sql.join(visitanteIds.map(id => sql`${id}`), sql`, `)})`)
        : [];
      const visitanteMap = Object.fromEntries(visitantesList.map(v => [v.id, v]));
      return rows.map(r => ({ ...r, visitante: visitanteMap[r.visitanteId] || null }));
    }),

  createVisita: protectedProcedure
    .input(z.object({
      visitanteId: z.number(),
      motivo: z.string().min(2),
      setor: z.string().optional(),
      pessoaContato: z.string().optional(),
      dataAgendamento: z.date().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [v] = await db.insert(visitas).values({
        ...input, empresaId: ctx.user.empresaId!, status: "agendado", createdBy: ctx.user.id,
      }).returning();
      return v;
    }),

  registrarEntrada: protectedProcedure
    .input(z.object({ id: z.number(), cracha: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(visitas).set({
        status: "em_atendimento", dataEntrada: new Date(), cracha: input.cracha, updatedAt: new Date(),
      }).where(and(eq(visitas.id, input.id), eq(visitas.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  registrarSaida: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(visitas).set({
        status: "finalizado", dataSaida: new Date(), updatedAt: new Date(),
      }).where(and(eq(visitas.id, input.id), eq(visitas.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [totais] = await db.select({
      total: sql<number>`count(*)`,
      agendados: sql<number>`count(*) filter (where status = 'agendado')`,
      emAtendimento: sql<number>`count(*) filter (where status = 'em_atendimento')`,
      finalizados: sql<number>`count(*) filter (where status = 'finalizado')`,
    }).from(visitas).where(and(eq(visitas.empresaId, empresaId), isNull(visitas.deletedAt)));
    return totais;
  }),
});
