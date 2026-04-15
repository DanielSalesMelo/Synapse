import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  armazens, localizacoes, produtos, estoque, movimentacoesEstoque, docas
} from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, sql, lt, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const wmsRouter = router({

  // ─── ARMAZÉNS ──────────────────────────────────────────────────────────────

  listArmazens: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(armazens)
      .where(and(eq(armazens.empresaId, ctx.user.empresaId!), isNull(armazens.deletedAt)));
  }),

  createArmazem: adminProcedure
    .input(z.object({
      nome: z.string().min(2),
      codigo: z.string().optional(),
      descricao: z.string().optional(),
      endereco: z.string().optional(),
      capacidadeTotal: z.string().optional(),
      unidadeCapacidade: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [arm] = await db.insert(armazens).values({
        empresaId: ctx.user.empresaId!,
        ...input,
      }).returning();
      return arm;
    }),

  // ─── LOCALIZAÇÕES ──────────────────────────────────────────────────────────

  listLocalizacoes: protectedProcedure
    .input(z.object({ armazemId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      const conditions = [eq(localizacoes.empresaId, empresaId), eq(localizacoes.ativo, true)];
      if (input.armazemId) conditions.push(eq(localizacoes.armazemId, input.armazemId));

      return db.select().from(localizacoes).where(and(...conditions)).orderBy(localizacoes.codigo);
    }),

  createLocalizacao: adminProcedure
    .input(z.object({
      armazemId: z.number(),
      codigo: z.string(),
      corredor: z.string().optional(),
      bloco: z.string().optional(),
      prateleira: z.string().optional(),
      posicao: z.string().optional(),
      tipo: z.enum(["padrao", "picking", "bulk", "refrigerado"]).default("padrao"),
      capacidade: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [loc] = await db.insert(localizacoes).values({
        empresaId: ctx.user.empresaId!,
        ...input,
      }).returning();
      return loc;
    }),

  // ─── PRODUTOS ──────────────────────────────────────────────────────────────

  listProdutos: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      categoria: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      const conditions = [eq(produtos.empresaId, empresaId), isNull(produtos.deletedAt), eq(produtos.ativo, true)];
      if (input.search) conditions.push(ilike(produtos.descricao, `%${input.search}%`));
      if (input.categoria) conditions.push(eq(produtos.categoria, input.categoria));

      return db.select().from(produtos)
        .where(and(...conditions))
        .orderBy(produtos.descricao)
        .limit(input.limit)
        .offset(input.offset);
    }),

  createProduto: protectedProcedure
    .input(z.object({
      codigo: z.string(),
      ean: z.string().optional(),
      descricao: z.string().min(2),
      unidade: z.string().default("UN"),
      categoria: z.string().optional(),
      marca: z.string().optional(),
      pesoUnitario: z.string().optional(),
      volumeUnitario: z.string().optional(),
      estoqueMinimo: z.string().optional(),
      estoqueMaximo: z.string().optional(),
      localizacaoPadrao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      const [existing] = await db.select().from(produtos)
        .where(and(eq(produtos.empresaId, empresaId), eq(produtos.codigo, input.codigo), isNull(produtos.deletedAt)))
        .limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Código de produto já cadastrado" });

      const [prod] = await db.insert(produtos).values({ empresaId, ...input }).returning();
      return prod;
    }),

  updateProduto: protectedProcedure
    .input(z.object({
      id: z.number(),
      descricao: z.string().optional(),
      categoria: z.string().optional(),
      marca: z.string().optional(),
      estoqueMinimo: z.string().optional(),
      estoqueMaximo: z.string().optional(),
      localizacaoPadrao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(produtos).set({ ...data, updatedAt: new Date() })
        .where(and(eq(produtos.id, id), eq(produtos.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  // ─── ESTOQUE ───────────────────────────────────────────────────────────────

  listEstoque: protectedProcedure
    .input(z.object({
      armazemId: z.number().optional(),
      search: z.string().optional(),
      apenasAbaixoMinimo: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      const rows = await db
        .select({
          estoqueId: estoque.id,
          produtoId: estoque.produtoId,
          codigoProduto: produtos.codigo,
          descricaoProduto: produtos.descricao,
          unidade: produtos.unidade,
          categoria: produtos.categoria,
          estoqueMinimo: produtos.estoqueMinimo,
          localizacaoPadrao: produtos.localizacaoPadrao,
          quantidade: estoque.quantidade,
          quantidadeReservada: estoque.quantidadeReservada,
          lote: estoque.lote,
          dataValidade: estoque.dataValidade,
          armazemId: estoque.armazemId,
          localizacaoId: estoque.localizacaoId,
          localizacaoCodigo: localizacoes.codigo,
        })
        .from(estoque)
        .innerJoin(produtos, eq(estoque.produtoId, produtos.id))
        .leftJoin(localizacoes, eq(estoque.localizacaoId, localizacoes.id))
        .where(
          and(
            eq(estoque.empresaId, empresaId),
            input.armazemId ? eq(estoque.armazemId, input.armazemId) : undefined,
            input.search ? ilike(produtos.descricao, `%${input.search}%`) : undefined,
          )
        )
        .orderBy(produtos.descricao);

      return rows;
    }),

  movimentar: protectedProcedure
    .input(z.object({
      produtoId: z.number(),
      armazemId: z.number(),
      tipo: z.enum(["entrada", "saida", "transferencia", "ajuste", "inventario", "devolucao"]),
      quantidade: z.string(),
      localizacaoOrigemId: z.number().optional(),
      localizacaoDestinoId: z.number().optional(),
      lote: z.string().optional(),
      documento: z.string().optional(),
      recebimentoId: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;
      const qtd = parseFloat(input.quantidade);

      // Buscar saldo atual
      const [saldoAtual] = await db.select({ quantidade: estoque.quantidade })
        .from(estoque)
        .where(and(
          eq(estoque.empresaId, empresaId),
          eq(estoque.produtoId, input.produtoId),
          eq(estoque.armazemId, input.armazemId),
        )).limit(1);

      const saldoAnterior = parseFloat(saldoAtual?.quantidade ?? "0");
      let novoSaldo = saldoAnterior;

      if (input.tipo === "entrada" || input.tipo === "devolucao") novoSaldo += qtd;
      else if (input.tipo === "saida") {
        if (saldoAnterior < qtd) throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente" });
        novoSaldo -= qtd;
      } else if (input.tipo === "ajuste" || input.tipo === "inventario") {
        novoSaldo = qtd;
      }

      // Upsert no estoque
      await db.insert(estoque).values({
        empresaId,
        produtoId: input.produtoId,
        armazemId: input.armazemId,
        localizacaoId: input.localizacaoDestinoId ?? input.localizacaoOrigemId,
        quantidade: String(novoSaldo),
        lote: input.lote,
      }).onConflictDoUpdate({
        target: [estoque.empresaId, estoque.produtoId, estoque.armazemId],
        set: { quantidade: String(novoSaldo), updatedAt: new Date() },
      });

      // Registrar movimentação
      await db.insert(movimentacoesEstoque).values({
        empresaId,
        produtoId: input.produtoId,
        armazemId: input.armazemId,
        localizacaoOrigemId: input.localizacaoOrigemId,
        localizacaoDestinoId: input.localizacaoDestinoId,
        tipo: input.tipo,
        quantidade: input.quantidade,
        saldoAnterior: String(saldoAnterior),
        saldoAtual: String(novoSaldo),
        lote: input.lote,
        documento: input.documento,
        recebimentoId: input.recebimentoId,
        observacoes: input.observacoes,
        operadorId: ctx.user.id,
      });

      return { success: true, novoSaldo };
    }),

  listMovimentacoes: protectedProcedure
    .input(z.object({
      produtoId: z.number().optional(),
      armazemId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      const conditions = [eq(movimentacoesEstoque.empresaId, empresaId)];
      if (input.produtoId) conditions.push(eq(movimentacoesEstoque.produtoId, input.produtoId));
      if (input.armazemId) conditions.push(eq(movimentacoesEstoque.armazemId, input.armazemId));

      return db.select().from(movimentacoesEstoque)
        .where(and(...conditions))
        .orderBy(desc(movimentacoesEstoque.createdAt))
        .limit(input.limit);
    }),

  // ─── DASHBOARD WMS ─────────────────────────────────────────────────────────

  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;

    const [totaisProdutos] = await db.select({
      total: sql<number>`count(distinct ${produtos.id})`,
      totalAtivos: sql<number>`count(distinct ${produtos.id}) filter (where ${produtos.ativo} = true)`,
    }).from(produtos).where(and(eq(produtos.empresaId, empresaId), isNull(produtos.deletedAt)));

    const [totaisEstoque] = await db.select({
      totalItens: sql<number>`count(*)`,
      totalQuantidade: sql<number>`sum(${estoque.quantidade}::numeric)`,
    }).from(estoque).where(eq(estoque.empresaId, empresaId));

    const [totalArmazens] = await db.select({
      total: sql<number>`count(*)`,
    }).from(armazens).where(and(eq(armazens.empresaId, empresaId), isNull(armazens.deletedAt)));

    const ultimasMovimentacoes = await db
      .select({
        id: movimentacoesEstoque.id,
        tipo: movimentacoesEstoque.tipo,
        quantidade: movimentacoesEstoque.quantidade,
        descricaoProduto: produtos.descricao,
        createdAt: movimentacoesEstoque.createdAt,
      })
      .from(movimentacoesEstoque)
      .innerJoin(produtos, eq(movimentacoesEstoque.produtoId, produtos.id))
      .where(eq(movimentacoesEstoque.empresaId, empresaId))
      .orderBy(desc(movimentacoesEstoque.createdAt))
      .limit(5);

    return {
      totalProdutos: totaisProdutos.total,
      totalArmazens: totalArmazens.total,
      totalItensEstoque: totaisEstoque.totalItens,
      ultimasMovimentacoes,
    };
  }),
});
