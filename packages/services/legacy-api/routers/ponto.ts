import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { registrosPonto, bancoHoras } from "../drizzle/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const pontoRouter = router({
  // Registrar ponto (entrada, saída, intervalo)
  registrar: protectedProcedure.input(z.object({
    funcionarioId: z.number(),
    tipo: z.enum(["entrada", "saida", "inicio_intervalo", "fim_intervalo"]),
    latitude: z.string().optional(), longitude: z.string().optional(),
    observacao: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [r] = await db.insert(registrosPonto).values({
      ...input, empresaId: ctx.user.empresaId!, dataHora: new Date(),
    }).returning();
    return r;
  }),

  // Listar registros de ponto
  list: protectedProcedure.input(z.object({
    funcionarioId: z.number().optional(),
    dataInicio: z.string().optional(), dataFim: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(registrosPonto.empresaId, ctx.user.empresaId!)];
    if (input.funcionarioId) conds.push(eq(registrosPonto.funcionarioId, input.funcionarioId));
    if (input.dataInicio) conds.push(gte(registrosPonto.dataHora, new Date(input.dataInicio)));
    if (input.dataFim) conds.push(lte(registrosPonto.dataHora, new Date(input.dataFim)));
    return db.select().from(registrosPonto).where(and(...conds)).orderBy(desc(registrosPonto.dataHora)).limit(200);
  }),

  // Ajustar ponto (admin)
  ajustar: protectedProcedure.input(z.object({
    id: z.number(), motivoAjuste: z.string().min(5),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN" });
    await db.update(registrosPonto).set({ ajustadoPor: ctx.user.id, motivoAjuste: input.motivoAjuste }).where(and(eq(registrosPonto.id, input.id), eq(registrosPonto.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // Banco de horas
  getBancoHoras: protectedProcedure.input(z.object({
    funcionarioId: z.number(), mes: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(bancoHoras.empresaId, ctx.user.empresaId!), eq(bancoHoras.funcionarioId, input.funcionarioId)];
    return db.select().from(bancoHoras).where(and(...conds)).orderBy(desc(bancoHoras.data)).limit(60);
  }),

  // Resumo do dia
  resumoDia: protectedProcedure.input(z.object({ funcionarioId: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    const registros = await db.select().from(registrosPonto).where(and(
      eq(registrosPonto.empresaId, ctx.user.empresaId!),
      eq(registrosPonto.funcionarioId, input.funcionarioId),
      gte(registrosPonto.dataHora, hoje), lte(registrosPonto.dataHora, amanha),
    )).orderBy(registrosPonto.dataHora);
    return registros;
  }),
});
