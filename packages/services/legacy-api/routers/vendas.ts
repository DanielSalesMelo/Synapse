import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { pedidos, itensPedido, propostas, comissoes } from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const vendasRouter = router({
  // ─── PEDIDOS ───────────────────────────────────────────────────────────────
  listPedidos: protectedProcedure.input(z.object({ status: z.string().optional(), search: z.string().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(pedidos.empresaId, ctx.user.empresaId!), isNull(pedidos.deletedAt)];
    if (input.status && input.status !== "todos") conds.push(eq(pedidos.status, input.status as any));
    if (input.search) conds.push(or(ilike(pedidos.clienteNome, `%${input.search}%`), ilike(pedidos.numero, `%${input.search}%`))!);
    return db.select().from(pedidos).where(and(...conds)).orderBy(desc(pedidos.createdAt));
  }),
  createPedido: protectedProcedure.input(z.object({
    clienteId: z.number().optional(), clienteNome: z.string().min(2),
    formaPagamento: z.string().optional(), condicaoPagamento: z.string().optional(),
    observacoes: z.string().optional(),
    itens: z.array(z.object({ descricao: z.string(), quantidade: z.string(), valorUnitario: z.string(), valorTotal: z.string() })).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const numero = `PED-${Date.now().toString(36).toUpperCase()}`;
    const valorTotal = input.itens?.reduce((s, i) => s + parseFloat(i.valorTotal || "0"), 0).toFixed(2) || "0";
    const { itens, ...pedidoData } = input;
    const [p] = await db.insert(pedidos).values({ ...pedidoData, numero, valorTotal, empresaId: ctx.user.empresaId!, vendedorId: ctx.user.id, createdBy: ctx.user.id }).returning();
    if (itens && itens.length > 0) {
      for (const item of itens) {
        await db.insert(itensPedido).values({ ...item, pedidoId: p.id });
      }
    }
    return p;
  }),
  updatePedidoStatus: protectedProcedure.input(z.object({
    id: z.number(), status: z.enum(["rascunho", "enviado", "aprovado", "em_separacao", "expedido", "entregue", "cancelado"]),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(pedidos).set({ status: input.status, updatedAt: new Date() }).where(and(eq(pedidos.id, input.id), eq(pedidos.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),
  getItensPedido: protectedProcedure.input(z.object({ pedidoId: z.number() })).query(async ({ input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(itensPedido).where(eq(itensPedido.pedidoId, input.pedidoId));
  }),

  // ─── PROPOSTAS ─────────────────────────────────────────────────────────────
  listPropostas: protectedProcedure.input(z.object({ status: z.string().optional(), search: z.string().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(propostas.empresaId, ctx.user.empresaId!), isNull(propostas.deletedAt)];
    if (input.status && input.status !== "todos") conds.push(eq(propostas.status, input.status as any));
    if (input.search) conds.push(ilike(propostas.titulo, `%${input.search}%`));
    return db.select().from(propostas).where(and(...conds)).orderBy(desc(propostas.createdAt));
  }),
  createProposta: protectedProcedure.input(z.object({
    clienteId: z.number().optional(), leadId: z.number().optional(),
    titulo: z.string().min(2), valorTotal: z.string().optional(),
    descricao: z.string().optional(), condicoes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const numero = `PROP-${Date.now().toString(36).toUpperCase()}`;
    const [p] = await db.insert(propostas).values({ ...input, numero, empresaId: ctx.user.empresaId!, vendedorId: ctx.user.id, createdBy: ctx.user.id }).returning();
    return p;
  }),

  // ─── COMISSÕES ─────────────────────────────────────────────────────────────
  listComissoes: protectedProcedure.input(z.object({ vendedorId: z.number().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(comissoes.empresaId, ctx.user.empresaId!)];
    if (input.vendedorId) conds.push(eq(comissoes.vendedorId, input.vendedorId));
    return db.select().from(comissoes).where(and(...conds)).orderBy(desc(comissoes.createdAt));
  }),

  // ─── DASHBOARD VENDAS ──────────────────────────────────────────────────────
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [pedidoStats] = await db.select({
      total: sql<number>`count(*)`,
      valorTotal: sql<string>`coalesce(sum("valorTotal"::numeric), 0)::text`,
      entregues: sql<number>`count(*) filter (where status = 'entregue')`,
    }).from(pedidos).where(and(eq(pedidos.empresaId, empresaId), isNull(pedidos.deletedAt)));
    const [propostaStats] = await db.select({
      total: sql<number>`count(*)`,
      aprovadas: sql<number>`count(*) filter (where status = 'aprovada')`,
    }).from(propostas).where(and(eq(propostas.empresaId, empresaId), isNull(propostas.deletedAt)));
    return { pedidos: pedidoStats, propostas: propostaStats };
  }),
});
