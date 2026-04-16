import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { registrosPonto, bancoHoras } from "../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const pontoRouter = router({
  // Registrar ponto — usa o usuário logado automaticamente
  registrar: protectedProcedure.input(z.object({
    tipo: z.enum(["entrada", "saida", "inicio_intervalo", "fim_intervalo"]),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    observacao: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

    // O funcionarioId É o id do usuário logado — sem seleção manual
    const funcionarioId = ctx.user.id;
    const empresaId = ctx.user.empresaId;

    if (!empresaId) throw new TRPCError({ code: "BAD_REQUEST", message: "Usuário não vinculado a uma empresa" });

    const [r] = await db.insert(registrosPonto).values({
      funcionarioId,
      empresaId,
      tipo: input.tipo,
      dataHora: new Date(),
      latitude: input.latitude,
      longitude: input.longitude,
      observacao: input.observacao,
    }).returning();

    return r;
  }),

  // Meu ponto — registros do próprio usuário logado
  meusPontos: protectedProcedure.input(z.object({
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const conds: any[] = [
      eq(registrosPonto.empresaId, ctx.user.empresaId!),
      eq(registrosPonto.funcionarioId, ctx.user.id),
    ];
    if (input.dataInicio) conds.push(gte(registrosPonto.dataHora, new Date(input.dataInicio)));
    if (input.dataFim) conds.push(lte(registrosPonto.dataHora, new Date(input.dataFim)));

    return db.select().from(registrosPonto)
      .where(and(...conds))
      .orderBy(desc(registrosPonto.dataHora))
      .limit(200);
  }),

  // Listar registros — admin pode ver todos, usuário comum vê só os seus
  list: protectedProcedure.input(z.object({
    funcionarioId: z.number().optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const isAdmin = ctx.user.role === "admin" || ctx.user.role === "master_admin";
    const conds: any[] = [eq(registrosPonto.empresaId, ctx.user.empresaId!)];

    // Usuário comum só vê os próprios registros
    if (!isAdmin) {
      conds.push(eq(registrosPonto.funcionarioId, ctx.user.id));
    } else if (input.funcionarioId) {
      conds.push(eq(registrosPonto.funcionarioId, input.funcionarioId));
    }

    if (input.dataInicio) conds.push(gte(registrosPonto.dataHora, new Date(input.dataInicio)));
    if (input.dataFim) conds.push(lte(registrosPonto.dataHora, new Date(input.dataFim)));

    return db.select().from(registrosPonto)
      .where(and(...conds))
      .orderBy(desc(registrosPonto.dataHora))
      .limit(200);
  }),

  // Resumo do dia — do próprio usuário logado
  resumoDia: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    return db.select().from(registrosPonto).where(and(
      eq(registrosPonto.empresaId, ctx.user.empresaId!),
      eq(registrosPonto.funcionarioId, ctx.user.id),
      gte(registrosPonto.dataHora, hoje),
      lte(registrosPonto.dataHora, amanha),
    )).orderBy(registrosPonto.dataHora);
  }),

  // Ajustar ponto (somente admin)
  ajustar: protectedProcedure.input(z.object({
    id: z.number(),
    motivoAjuste: z.string().min(5),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem ajustar registros de ponto" });
    }
    await db.update(registrosPonto)
      .set({ ajustadoPor: ctx.user.id, motivoAjuste: input.motivoAjuste })
      .where(and(
        eq(registrosPonto.id, input.id),
        eq(registrosPonto.empresaId, ctx.user.empresaId!),
      ));
    return { success: true };
  }),

  // Banco de horas do próprio usuário
  meuBancoHoras: protectedProcedure.input(z.object({
    mes: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const conds: any[] = [
      eq(bancoHoras.empresaId, ctx.user.empresaId!),
      eq(bancoHoras.funcionarioId, ctx.user.id),
    ];

    return db.select().from(bancoHoras)
      .where(and(...conds))
      .orderBy(desc(bancoHoras.data))
      .limit(60);
  }),

  // Banco de horas (admin pode ver de qualquer funcionário)
  getBancoHoras: protectedProcedure.input(z.object({
    funcionarioId: z.number().optional(),
    mes: z.string().optional(),
  })).query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const isAdmin = ctx.user.role === "admin" || ctx.user.role === "master_admin";
    const targetId = isAdmin && input.funcionarioId ? input.funcionarioId : ctx.user.id;

    const conds: any[] = [
      eq(bancoHoras.empresaId, ctx.user.empresaId!),
      eq(bancoHoras.funcionarioId, targetId),
    ];

    return db.select().from(bancoHoras)
      .where(and(...conds))
      .orderBy(desc(bancoHoras.data))
      .limit(60);
  }),
});
