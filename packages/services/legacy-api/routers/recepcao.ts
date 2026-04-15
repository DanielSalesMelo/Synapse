import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  recebimentos, itensRecebimento, docas, armazens
} from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const recepcaoRouter = router({

  // ─── RECEBIMENTOS ──────────────────────────────────────────────────────────

  listRecebimentos: protectedProcedure
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
      if (input.status) conditions.push(eq(recebimentos.status, input.status as any));
      if (input.search) conditions.push(ilike(recebimentos.numero, `%${input.search}%`));

      const rows = await db.select().from(recebimentos)
        .where(and(...conditions))
        .orderBy(desc(recebimentos.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
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

  createRecebimento: protectedProcedure
    .input(z.object({
      tipo: z.enum(["nf_entrada", "devolucao", "transferencia", "bonificacao", "outro"]).default("nf_entrada"),
      fornecedorNome: z.string().optional(),
      fornecedorCnpj: z.string().optional(),
      nfNumero: z.string().optional(),
      nfSerie: z.string().optional(),
      nfChave: z.string().optional(),
      nfValorTotal: z.string().optional(),
      nfDataEmissao: z.string().optional(),
      transportadoraNome: z.string().optional(),
      veiculoPlaca: z.string().optional(),
      docaId: z.number().optional(),
      armazemId: z.number().optional(),
      dataAgendamento: z.string().optional(),
      observacoes: z.string().optional(),
      itens: z.array(z.object({
        codigoProduto: z.string().optional(),
        descricaoProduto: z.string(),
        unidade: z.string().optional(),
        ean: z.string().optional(),
        quantidadeEsperada: z.string(),
        valorUnitario: z.string().optional(),
      })).optional(),
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
        tipo: input.tipo,
        status: "aguardando",
        fornecedorNome: input.fornecedorNome,
        fornecedorCnpj: input.fornecedorCnpj,
        nfNumero: input.nfNumero,
        nfSerie: input.nfSerie,
        nfChave: input.nfChave,
        nfValorTotal: input.nfValorTotal,
        nfDataEmissao: input.nfDataEmissao,
        transportadoraNome: input.transportadoraNome,
        veiculoPlaca: input.veiculoPlaca,
        docaId: input.docaId,
        armazemId: input.armazemId,
        dataAgendamento: input.dataAgendamento ? new Date(input.dataAgendamento) : undefined,
        observacoes: input.observacoes,
        totalItensEsperados: input.itens?.length ?? 0,
        createdBy: ctx.user.id,
      }).returning();

      if (input.itens && input.itens.length > 0) {
        await db.insert(itensRecebimento).values(
          input.itens.map(item => ({
            recebimentoId: newRec.id,
            empresaId,
            descricaoProduto: item.descricaoProduto,
            codigoProduto: item.codigoProduto,
            unidade: item.unidade ?? "UN",
            ean: item.ean,
            quantidadeEsperada: item.quantidadeEsperada,
            valorUnitario: item.valorUnitario,
            status: "pendente" as const,
          }))
        );
      }

      return newRec;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aguardando", "em_conferencia", "conferido", "divergencia", "recusado", "finalizado"]),
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
      if (input.status === "finalizado" || input.status === "recusado") updateData.dataFim = new Date();

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

  // ─── DOCAS ─────────────────────────────────────────────────────────────────

  listDocas: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(docas)
      .where(and(eq(docas.empresaId, ctx.user.empresaId!), eq(docas.ativo, true)));
  }),

  createDoca: adminProcedure
    .input(z.object({
      armazemId: z.number(),
      nome: z.string(),
      codigo: z.string().optional(),
      tipo: z.enum(["recebimento", "expedicao", "misto"]).default("recebimento"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [doca] = await db.insert(docas).values({
        empresaId: ctx.user.empresaId!,
        ...input,
      }).returning();
      return doca;
    }),

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;

    const [totais] = await db.select({
      total: sql<number>`count(*)`,
      aguardando: sql<number>`count(*) filter (where status = 'aguardando')`,
      emConferencia: sql<number>`count(*) filter (where status = 'em_conferencia')`,
      finalizados: sql<number>`count(*) filter (where status = 'finalizado')`,
      divergencias: sql<number>`count(*) filter (where status = 'divergencia')`,
    }).from(recebimentos)
      .where(and(eq(recebimentos.empresaId, empresaId), isNull(recebimentos.deletedAt)));

    const recentes = await db.select().from(recebimentos)
      .where(and(eq(recebimentos.empresaId, empresaId), isNull(recebimentos.deletedAt)))
      .orderBy(desc(recebimentos.createdAt))
      .limit(5);

    return { totais, recentes };
  }),
});
