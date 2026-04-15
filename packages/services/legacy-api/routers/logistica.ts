import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { chamadosSac, interacoesSac, licencasRegulatorias } from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const logisticaRouter = router({
  // ─── SAC ───────────────────────────────────────────────────────────────────
  listChamados: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      prioridade: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;
      const conditions: any[] = [eq(chamadosSac.empresaId, empresaId), isNull(chamadosSac.deletedAt)];
      if (input.status && input.status !== "todos") conditions.push(eq(chamadosSac.status, input.status as any));
      if (input.prioridade && input.prioridade !== "todas") conditions.push(eq(chamadosSac.prioridade, input.prioridade as any));
      if (input.search) {
        conditions.push(or(
          ilike(chamadosSac.protocolo, `%${input.search}%`),
          ilike(chamadosSac.clienteNome, `%${input.search}%`),
          ilike(chamadosSac.assunto, `%${input.search}%`)
        )!);
      }
      return db.select().from(chamadosSac).where(and(...conditions)).orderBy(desc(chamadosSac.createdAt));
    }),

  createChamado: protectedProcedure
    .input(z.object({
      clienteNome: z.string().min(2),
      clienteEmail: z.string().optional(),
      clienteTelefone: z.string().optional(),
      assunto: z.string().min(2),
      descricao: z.string().min(5),
      categoria: z.string().optional(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
      viagemId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;
      // Gerar protocolo sequencial
      const [last] = await db.select({ id: chamadosSac.id }).from(chamadosSac)
        .where(eq(chamadosSac.empresaId, empresaId)).orderBy(desc(chamadosSac.id)).limit(1);
      const protocolo = `SAC-${String((last?.id ?? 0) + 1).padStart(6, "0")}`;
      const [c] = await db.insert(chamadosSac).values({
        ...input, empresaId, protocolo, status: "aberto",
        prioridade: input.prioridade || "media", createdBy: ctx.user.id,
      }).returning();
      return c;
    }),

  getChamado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [chamado] = await db.select().from(chamadosSac)
        .where(and(eq(chamadosSac.id, input.id), eq(chamadosSac.empresaId, ctx.user.empresaId!))).limit(1);
      if (!chamado) throw new TRPCError({ code: "NOT_FOUND" });
      const interacoes = await db.select().from(interacoesSac)
        .where(eq(interacoesSac.chamadoId, input.id)).orderBy(desc(interacoesSac.createdAt));
      return { ...chamado, interacoes };
    }),

  addInteracao: protectedProcedure
    .input(z.object({ chamadoId: z.number(), conteudo: z.string().min(1), tipo: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [i] = await db.insert(interacoesSac).values({
        chamadoId: input.chamadoId, conteudo: input.conteudo,
        tipo: input.tipo || "mensagem", userId: ctx.user.id,
      }).returning();
      return i;
    }),

  updateStatusChamado: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aberto", "em_andamento", "aguardando_cliente", "resolvido", "fechado"]),
      resolucao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: Record<string, any> = { status: input.status, updatedAt: new Date() };
      if (input.resolucao) updateData.resolucao = input.resolucao;
      if (input.status === "resolvido" || input.status === "fechado") updateData.resolvidoEm = new Date();
      await db.update(chamadosSac).set(updateData)
        .where(and(eq(chamadosSac.id, input.id), eq(chamadosSac.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  // ─── LICENÇAS REGULATÓRIAS (ANVISA, VISA, IBAMA) ──────────────────────────
  listLicencas: protectedProcedure
    .input(z.object({ tipo: z.string().optional(), status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(licencasRegulatorias.empresaId, ctx.user.empresaId!), isNull(licencasRegulatorias.deletedAt)];
      if (input.tipo) conditions.push(eq(licencasRegulatorias.tipo, input.tipo));
      if (input.status && input.status !== "todos") conditions.push(eq(licencasRegulatorias.status, input.status as any));
      return db.select().from(licencasRegulatorias).where(and(...conditions)).orderBy(desc(licencasRegulatorias.createdAt));
    }),

  createLicenca: protectedProcedure
    .input(z.object({
      tipo: z.string().min(2),
      numero: z.string().optional(),
      orgaoEmissor: z.string().optional(),
      descricao: z.string().optional(),
      dataEmissao: z.date().optional(),
      dataVencimento: z.date().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [l] = await db.insert(licencasRegulatorias).values({
        ...input, empresaId: ctx.user.empresaId!, status: "pendente", createdBy: ctx.user.id,
      }).returning();
      return l;
    }),

  dashboardSac: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [totais] = await db.select({
      total: sql<number>`count(*)`,
      abertos: sql<number>`count(*) filter (where status = 'aberto')`,
      emAndamento: sql<number>`count(*) filter (where status = 'em_andamento')`,
      resolvidos: sql<number>`count(*) filter (where status = 'resolvido' or status = 'fechado')`,
      urgentes: sql<number>`count(*) filter (where prioridade = 'urgente' and status not in ('resolvido','fechado'))`,
    }).from(chamadosSac).where(and(eq(chamadosSac.empresaId, empresaId), isNull(chamadosSac.deletedAt)));

    const [licencasTotais] = await db.select({
      total: sql<number>`count(*)`,
      vencidas: sql<number>`count(*) filter (where status = 'vencida')`,
      proxVencer: sql<number>`count(*) filter (where "dataVencimento" < now() + interval '30 days' and status = 'aprovada')`,
    }).from(licencasRegulatorias).where(and(eq(licencasRegulatorias.empresaId, empresaId), isNull(licencasRegulatorias.deletedAt)));

    return { sac: totais, licencas: licencasTotais };
  }),
});
