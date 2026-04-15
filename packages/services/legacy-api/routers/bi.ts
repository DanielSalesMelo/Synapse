import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { biDashboards, biWidgets, viagens, pedidos, contasPagar, contasReceber, funcionarios, veiculos, leads, clientes } from "../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const biRouter = router({
  // ─── DASHBOARDS ────────────────────────────────────────────────────────────
  listDashboards: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(biDashboards).where(and(eq(biDashboards.empresaId, ctx.user.empresaId!), isNull(biDashboards.deletedAt))).orderBy(desc(biDashboards.createdAt));
  }),
  createDashboard: protectedProcedure.input(z.object({
    nome: z.string().min(2), descricao: z.string().optional(), tipo: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [d] = await db.insert(biDashboards).values({ ...input, empresaId: ctx.user.empresaId!, createdBy: ctx.user.id }).returning();
    return d;
  }),

  // ─── MÉTRICAS GERAIS (BI automático) ───────────────────────────────────────
  metricas: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;

    // Viagens
    const [viagemStats] = await db.select({
      total: sql<number>`count(*)`,
      emAndamento: sql<number>`count(*) filter (where status = 'em_andamento')`,
      concluidas: sql<number>`count(*) filter (where status = 'concluida')`,
    }).from(viagens).where(eq(viagens.empresaId, empresaId));

    // Financeiro
    const [pagar] = await db.select({
      total: sql<string>`coalesce(sum(valor::numeric), 0)::text`,
      pendente: sql<string>`coalesce(sum(valor::numeric) filter (where status = 'pendente'), 0)::text`,
    }).from(contasPagar).where(eq(contasPagar.empresaId, empresaId));
    const [receber] = await db.select({
      total: sql<string>`coalesce(sum(valor::numeric), 0)::text`,
      pendente: sql<string>`coalesce(sum(valor::numeric) filter (where status = 'pendente'), 0)::text`,
    }).from(contasReceber).where(eq(contasReceber.empresaId, empresaId));

    // RH
    const [rhStats] = await db.select({ total: sql<number>`count(*)` }).from(funcionarios).where(eq(funcionarios.empresaId, empresaId));

    // Frota
    const [frotaStats] = await db.select({ total: sql<number>`count(*)` }).from(veiculos).where(eq(veiculos.empresaId, empresaId));

    // Vendas
    const [vendaStats] = await db.select({
      totalPedidos: sql<number>`count(*)`,
      valorPedidos: sql<string>`coalesce(sum("valorTotal"::numeric), 0)::text`,
    }).from(pedidos).where(and(eq(pedidos.empresaId, empresaId), isNull(pedidos.deletedAt)));

    // CRM
    const [crmStats] = await db.select({
      totalClientes: sql<number>`count(*)`,
    }).from(clientes).where(and(eq(clientes.empresaId, empresaId), isNull(clientes.deletedAt)));
    const [leadStats] = await db.select({
      totalLeads: sql<number>`count(*)`,
      novos: sql<number>`count(*) filter (where status = 'novo')`,
    }).from(leads).where(and(eq(leads.empresaId, empresaId), isNull(leads.deletedAt)));

    return {
      viagens: viagemStats,
      financeiro: { pagar, receber },
      rh: rhStats,
      frota: frotaStats,
      vendas: vendaStats,
      crm: { ...crmStats, leads: leadStats },
    };
  }),

  // ─── TENDÊNCIAS (últimos 30 dias) ──────────────────────────────────────────
  tendencias: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const viagensPorDia = await db.execute(sql`
      SELECT date_trunc('day', "createdAt")::date as dia, count(*) as total
      FROM viagens WHERE "empresaId" = ${empresaId} AND "createdAt" >= current_date - interval '30 days'
      GROUP BY dia ORDER BY dia
    `);
    const receitaPorDia = await db.execute(sql`
      SELECT date_trunc('day', "createdAt")::date as dia, coalesce(sum(valor::numeric), 0) as total
      FROM contas_receber WHERE "empresaId" = ${empresaId} AND "createdAt" >= current_date - interval '30 days'
      GROUP BY dia ORDER BY dia
    `);
    return { viagensPorDia: viagensPorDia.rows || [], receitaPorDia: receitaPorDia.rows || [] };
  }),
});
