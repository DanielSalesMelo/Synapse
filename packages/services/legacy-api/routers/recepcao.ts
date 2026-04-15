import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  recebimentos, itensRecebimento, docas, armazens
} from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, sql, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const recepcaoRouter = router({
  // ─── RECEBIMENTOS (Nomes e campos usados pelo Frontend) ───────────────────
  
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const empresaId = ctx.user.empresaId!;

      const conditions = [
        eq(recebimentos.empresaId, empresaId),
        isNull(recebimentos.deletedAt),
      ];
      if (input.status && input.status !== "todos") conditions.push(eq(recebimentos.status, input.status as any));
      
      if (input.search) {
        conditions.push(or(
          ilike(recebimentos.fornecedorNome, `%${input.search}%`),
          ilike(recebimentos.nfNumero, `%${input.search}%`),
          ilike(recebimentos.transportadoraNome, `%${input.search}%`)
        ));
      }

      const rows = await db.select().from(recebimentos)
        .where(and(...conditions))
        .orderBy(desc(recebimentos.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Mapear campos do DB para o que o frontend espera
      return rows.map(r => ({
        id: r.id,
        status: r.status,
        fornecedor: r.fornecedorNome,
        notaFiscal: r.nfNumero,
        transportadora: r.transportadoraNome,
        doca: r.docaId ? `Doca ${r.docaId}` : null, // Simplificação para exibição
        previsaoChegada: r.dataAgendamento,
        observacoes: r.observacoes,
        createdAt: r.createdAt
      }));
    }),

  create: protectedProcedure
    .input(z.object({
      fornecedor: z.string(),
      notaFiscal: z.string().optional(),
      transportadora: z.string().optional(),
      doca: z.string().optional(),
      previsaoChegada: z.date().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      // Gerar número sequencial
      const [lastRec] = await db.select({ id: recebimentos.id })
        .from(recebimentos).where(eq(recebimentos.empresaId, empresaId))
        .orderBy(desc(recebimentos.id)).limit(1);
      const nextNum = (lastRec?.id ?? 0) + 1;
      const numero = `REC-${String(nextNum).padStart(6, "0")}`;

      const [newRec] = await db.insert(recebimentos).values({
        empresaId,
        numero,
        status: "aguardando",
        fornecedorNome: input.fornecedor,
        nfNumero: input.notaFiscal,
        transportadoraNome: input.transportadora,
        dataAgendamento: input.previsaoChegada,
        observacoes: input.observacoes,
        createdBy: ctx.user.id,
      }).returning();

      return newRec;
    }),

  iniciarConferencia: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      await db.update(recebimentos)
        .set({ 
          status: "em_conferencia", 
          dataInicio: new Date(),
          updatedAt: new Date() 
        })
        .where(and(eq(recebimentos.id, input.id), eq(recebimentos.empresaId, empresaId)));

      return { success: true };
    }),

  concluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      await db.update(recebimentos)
        .set({ 
          status: "concluido", 
          dataFim: new Date(),
          updatedAt: new Date() 
        })
        .where(and(eq(recebimentos.id, input.id), eq(recebimentos.empresaId, empresaId)));

      return { success: true };
    }),

  // ─── MÉTODOS ORIGINAIS (Para manutenção e outros usos) ───────────────────

  listRecebimentos: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;
      const conditions = [
        eq(recebimentos.empresaId, empresaId),
        isNull(recebimentos.deletedAt),
      ];
      if (input.status) conditions.push(eq(recebimentos.status, input.status as any));
      
      return db.select().from(recebimentos)
        .where(and(...conditions))
        .orderBy(desc(recebimentos.createdAt));
    }),

  getRecebimento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      const [rec] = await db.select().from(recebimentos)
        .where(and(eq(recebimentos.id, input.id), eq(recebimentos.empresaId, empresaId), isNull(recebimentos.deletedAt)))
        .limit(1);
      if (!rec) throw new TRPCError({ code: "NOT_FOUND", message: "Recebimento não encontrado" });

      const itens = await db.select().from(itensRecebimento)
        .where(and(eq(itensRecebimento.recebimentoId, input.id), isNull(itensRecebimento.deletedAt)));

      return { ...rec, itens };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aguardando", "em_conferencia", "conferido", "divergencia", "recusado", "finalizado", "concluido"]),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      const updateData: Record<string, any> = {
        status: input.status,
        updatedAt: new Date(),
      };
      if (input.observacoes) updateData.observacoes = input.observacoes;
      if (input.status === "em_conferencia") updateData.dataInicio = new Date();
      if (input.status === "finalizado" || input.status === "concluido" || input.status === "recusado") updateData.dataFim = new Date();

      await db.update(recebimentos)
        .set(updateData)
        .where(and(eq(recebimentos.id, input.id), eq(recebimentos.empresaId, empresaId)));

      return { success: true };
    }),

  conferirItem: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      quantidadeRecebida: z.string(),
      status: z.enum(["conferido", "divergencia_quantidade", "divergencia_qualidade", "recusado"]),
      localizacao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(itensRecebimento)
        .set({
          quantidadeRecebida: input.quantidadeRecebida,
          status: input.status,
          localizacao: input.localizacao,
          observacoes: input.observacoes,
          updatedAt: new Date(),
        })
        .where(eq(itensRecebimento.id, input.itemId));

      return { success: true };
    }),

  deleteRecebimento: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      await db.update(recebimentos)
        .set({ deletedAt: new Date(), deletedBy: ctx.user.id })
        .where(and(eq(recebimentos.id, input.id), eq(recebimentos.empresaId, empresaId)));

      return { success: true };
    }),

  listDocas: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(docas)
      .where(and(eq(docas.empresaId, ctx.user.empresaId!), eq(docas.ativo, true)));
  }),

  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;

    const [totais] = await db.select({
      total: sql<number>`count(*)`,
      aguardando: sql<number>`count(*) filter (where status = 'aguardando')`,
      emConferencia: sql<number>`count(*) filter (where status = 'em_conferencia')`,
      finalizados: sql<number>`count(*) filter (where status = 'concluido' or status = 'finalizado')`,
      divergencias: sql<number>`count(*) filter (where status = 'divergencia')`,
    }).from(recebimentos)
      .where(and(eq(recebimentos.empresaId, empresaId), isNull(recebimentos.deletedAt)));

    const recentes = await db.select().from(recebimentos)
      .where(and(eq(recebimentos.empresaId, empresaId), isNull(recebimentos.deletedAt)))
      .orderBy(desc(recebimentos.createdAt))
      .limit(5);

    return { 
      totais, 
      recentes: recentes.map(r => ({
        id: r.id,
        status: r.status,
        fornecedor: r.fornecedorNome,
        notaFiscal: r.nfNumero,
        createdAt: r.createdAt
      }))
    };
  }),
});
