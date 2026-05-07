import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { biDashboards, biWidgets, viagens, pedidos, contasPagar, contasReceber, funcionarios, veiculos, leads, clientes } from "../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { resolveAccessibleEmpresaId } from "../_core/access";

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
  metricas: protectedProcedure.input(z.object({ empresaId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);

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
    }).from(pedidos).where(and(eq(pedidos.empresaId, empresaId), isNull(pedidos.deletedAt))).catch(() => [{ totalPedidos: 0, valorPedidos: "0" } as any]);

    // CRM
    const [crmStats] = await db.select({
      totalClientes: sql<number>`count(*)`,
    }).from(clientes).where(and(eq(clientes.empresaId, empresaId), isNull(clientes.deletedAt))).catch(() => [{ totalClientes: 0 } as any]);
    const [leadStats] = await db.select({
      totalLeads: sql<number>`count(*)`,
      novos: sql<number>`count(*) filter (where status = 'novo')`,
    }).from(leads).where(and(eq(leads.empresaId, empresaId), isNull(leads.deletedAt))).catch(() => [{ totalLeads: 0, novos: 0 } as any]);

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
  tendencias: protectedProcedure.input(z.object({ empresaId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);
    const viagensPorDia = await db.execute(sql`
      SELECT date_trunc('day', "createdAt")::date as dia, count(*) as total
      FROM viagens WHERE "empresaId" = ${empresaId} AND "createdAt" >= current_date - interval '30 days'
      GROUP BY dia ORDER BY dia
    `).catch(() => ({ rows: [] } as any));
    const receitaPorDia = await db.execute(sql`
      SELECT date_trunc('day', "createdAt")::date as dia, coalesce(sum(valor::numeric), 0) as total
      FROM contas_receber WHERE "empresaId" = ${empresaId} AND "createdAt" >= current_date - interval '30 days'
      GROUP BY dia ORDER BY dia
    `).catch(() => ({ rows: [] } as any));
    return { viagensPorDia: viagensPorDia.rows || [], receitaPorDia: receitaPorDia.rows || [] };
  }),

  painelAvancado: protectedProcedure
    .input(z.object({ empresaId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);

      const [financeiro] = await db.execute(sql`
        SELECT
          COALESCE(SUM(cp.valor::numeric) FILTER (WHERE cp.status = 'pendente'), 0) as pagar_pendente,
          COALESCE(SUM(cp.valor::numeric) FILTER (WHERE cp.status = 'vencido' OR cp."dataVencimento" < current_date), 0) as pagar_vencido,
          COALESCE(SUM(cr.valor::numeric) FILTER (WHERE cr.status = 'pendente'), 0) as receber_pendente,
          COALESCE(SUM(cr.valor::numeric) FILTER (WHERE cr.status = 'vencido' OR cr."dataVencimento" < current_date), 0) as receber_vencido
        FROM contas_pagar cp
        FULL OUTER JOIN contas_receber cr ON false
        WHERE (cp."empresaId" = ${empresaId} OR cp."empresaId" IS NULL)
          AND (cr."empresaId" = ${empresaId} OR cr."empresaId" IS NULL)
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [rh] = await db.execute(sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE ativo = true)::int as ativos,
          COUNT(*) FILTER (WHERE ativo = false)::int as inativos,
          COUNT(*) FILTER (WHERE "vencimentoCnh" IS NOT NULL AND "vencimentoCnh" < current_date)::int as cnh_vencida
        FROM funcionarios
        WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [ti] = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('aberto','triagem_ia','aguardando_ti','em_andamento'))::int as chamados_abertos,
          COUNT(*) FILTER (WHERE prioridade = 'critica' AND status NOT IN ('encerrado','cancelado'))::int as chamados_criticos,
          COUNT(*) FILTER (WHERE status = 'resolvido')::int as chamados_resolvidos
        FROM tickets_ti
        WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [agentes] = await db.execute(sql`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE online = true)::int as online,
          COUNT(*) FILTER (WHERE online = false)::int as offline
        FROM monitor_agentes
        WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [logistica] = await db.execute(sql`
        SELECT
          COUNT(*)::int as viagens_total,
          COUNT(*) FILTER (WHERE status = 'em_andamento')::int as viagens_andamento,
          COUNT(*) FILTER (WHERE status = 'concluida')::int as viagens_concluidas,
          COALESCE(SUM(COALESCE("freteTotal", 0)::numeric), 0) as faturamento_viagens
        FROM viagens
        WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [comercial] = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM leads WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL) as leads_total,
          (SELECT COUNT(*)::int FROM leads WHERE "empresaId" = ${empresaId} AND status = 'novo' AND "deletedAt" IS NULL) as leads_novos,
          (SELECT COUNT(*)::int FROM clientes WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL) as clientes_total,
          (SELECT COUNT(*)::int FROM pedidos WHERE "empresaId" = ${empresaId} AND "deletedAt" IS NULL) as pedidos_total
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [estoque] = await db.execute(sql`
        SELECT
          COUNT(*)::int as produtos_total,
          COUNT(*) FILTER (WHERE (e.quantidade::numeric) <= COALESCE(p."estoqueMinimo"::numeric, 0))::int as baixo_estoque
        FROM estoque e
        INNER JOIN produtos p ON p.id = e."produtoId"
        WHERE e."empresaId" = ${empresaId} AND p."deletedAt" IS NULL
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const alertasCriticos = [
        Number(financeiro?.pagar_vencido || 0) > 0 ? "Contas a pagar vencidas" : null,
        Number(financeiro?.receber_vencido || 0) > 0 ? "Contas a receber vencidas" : null,
        Number(rh?.cnh_vencida || 0) > 0 ? "Motoristas com CNH vencida" : null,
        Number(ti?.chamados_criticos || 0) > 0 ? "Chamados TI críticos em aberto" : null,
        Number(agentes?.offline || 0) > 0 ? "Agentes de monitoramento offline" : null,
        Number(estoque?.baixo_estoque || 0) > 0 ? "Produtos abaixo do estoque mínimo" : null,
      ].filter(Boolean);

      return {
        financeiro,
        rh,
        ti,
        agentes,
        logistica,
        comercial,
        estoque,
        alertasCriticos,
      };
    }),

  cockpit25: protectedProcedure
    .input(z.object({ empresaId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);

      const [base] = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM viagens v WHERE v."empresaId"=${empresaId} AND v."deletedAt" IS NULL) as viagens_total,
          (SELECT COUNT(*)::int FROM viagens v WHERE v."empresaId"=${empresaId} AND v.status='concluida' AND v."deletedAt" IS NULL) as viagens_concluidas,
          (SELECT COUNT(*)::int FROM veiculos v WHERE v."empresaId"=${empresaId} AND v.ativo=true AND v."deletedAt" IS NULL) as veiculos_ativos,
          (SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f.ativo=true AND f."deletedAt" IS NULL) as funcionarios_ativos,
          (SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f."vencimentoCnh" < current_date AND f."deletedAt" IS NULL) as cnh_vencida,
          (SELECT COALESCE(SUM(cp.valor::numeric),0) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp.status='pendente' AND cp."deletedAt" IS NULL) as pagar_pendente,
          (SELECT COALESCE(SUM(cp.valor::numeric),0) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND (cp.status='vencido' OR cp."dataVencimento"<current_date) AND cp."deletedAt" IS NULL) as pagar_vencido,
          (SELECT COALESCE(SUM(cr.valor::numeric),0) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr.status='pendente' AND cr."deletedAt" IS NULL) as receber_pendente,
          (SELECT COALESCE(SUM(cr.valor::numeric),0) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND (cr.status='vencido' OR cr."dataVencimento"<current_date) AND cr."deletedAt" IS NULL) as receber_vencido,
          (SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t.status IN ('aberto','triagem_ia','aguardando_ti','em_andamento') AND t."deletedAt" IS NULL) as ti_abertos,
          (SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t.prioridade='critica' AND t.status NOT IN ('encerrado','cancelado') AND t."deletedAt" IS NULL) as ti_criticos,
          (SELECT COUNT(*)::int FROM monitor_agentes a WHERE a."empresaId"=${empresaId} AND a.online=true AND a."deletedAt" IS NULL) as agentes_online,
          (SELECT COUNT(*)::int FROM monitor_agentes a WHERE a."empresaId"=${empresaId} AND a.online=false AND a."deletedAt" IS NULL) as agentes_offline,
          (SELECT COUNT(*)::int FROM leads l WHERE l."empresaId"=${empresaId} AND l."deletedAt" IS NULL) as leads_total,
          (SELECT COUNT(*)::int FROM leads l WHERE l."empresaId"=${empresaId} AND l.status='novo' AND l."deletedAt" IS NULL) as leads_novos,
          (SELECT COUNT(*)::int FROM clientes c WHERE c."empresaId"=${empresaId} AND c."deletedAt" IS NULL) as clientes_total,
          (SELECT COUNT(*)::int FROM pedidos p WHERE p."empresaId"=${empresaId} AND p."deletedAt" IS NULL) as pedidos_total,
          (SELECT COALESCE(SUM(p."valorTotal"::numeric),0) FROM pedidos p WHERE p."empresaId"=${empresaId} AND p."deletedAt" IS NULL) as pedidos_valor,
          (SELECT COUNT(*)::int FROM produtos p WHERE p."empresaId"=${empresaId} AND p."deletedAt" IS NULL) as produtos_total,
          (SELECT COUNT(*)::int FROM estoque e INNER JOIN produtos p ON p.id=e."produtoId" WHERE e."empresaId"=${empresaId} AND (e.quantidade::numeric) <= COALESCE(p."estoqueMinimo"::numeric,0)) as estoque_critico,
          (SELECT COALESCE(SUM(COALESCE(v."freteTotal",0)::numeric),0) FROM viagens v WHERE v."empresaId"=${empresaId} AND v."deletedAt" IS NULL) as faturamento_viagens,
          (SELECT COUNT(*)::int FROM carregamentos c WHERE c."empresaId"=${empresaId} AND c.status='fechado' AND c."deletedAt" IS NULL) as carregamentos_fechados,
          (SELECT COUNT(*)::int FROM manutencoes m WHERE m."empresaId"=${empresaId} AND m."deletedAt" IS NULL) as manutencoes_total,
          (SELECT COUNT(*)::int FROM licencas_ti l WHERE l."empresaId"=${empresaId} AND l."deletedAt" IS NULL) as licencas_ti_total,
          (SELECT COUNT(*)::int FROM compras_ti c WHERE c."empresaId"=${empresaId} AND c.status IN ('pendente','em_analise') AND c."deletedAt" IS NULL) as compras_pendentes
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const kpis = [
        { chave: "viagens_total", label: "Viagens Totais", valor: Number(base.viagens_total || 0), tipo: "numero" },
        { chave: "viagens_concluidas", label: "Viagens Concluídas", valor: Number(base.viagens_concluidas || 0), tipo: "numero" },
        { chave: "veiculos_ativos", label: "Veículos Ativos", valor: Number(base.veiculos_ativos || 0), tipo: "numero" },
        { chave: "funcionarios_ativos", label: "Funcionários Ativos", valor: Number(base.funcionarios_ativos || 0), tipo: "numero" },
        { chave: "cnh_vencida", label: "CNH Vencida", valor: Number(base.cnh_vencida || 0), tipo: "numero" },
        { chave: "pagar_pendente", label: "Contas a Pagar", valor: Number(base.pagar_pendente || 0), tipo: "moeda" },
        { chave: "pagar_vencido", label: "Pagar Vencido", valor: Number(base.pagar_vencido || 0), tipo: "moeda" },
        { chave: "receber_pendente", label: "Contas a Receber", valor: Number(base.receber_pendente || 0), tipo: "moeda" },
        { chave: "receber_vencido", label: "Receber Vencido", valor: Number(base.receber_vencido || 0), tipo: "moeda" },
        { chave: "ti_abertos", label: "TI Abertos", valor: Number(base.ti_abertos || 0), tipo: "numero" },
        { chave: "ti_criticos", label: "TI Críticos", valor: Number(base.ti_criticos || 0), tipo: "numero" },
        { chave: "agentes_online", label: "Agentes Online", valor: Number(base.agentes_online || 0), tipo: "numero" },
        { chave: "agentes_offline", label: "Agentes Offline", valor: Number(base.agentes_offline || 0), tipo: "numero" },
        { chave: "leads_total", label: "Leads Totais", valor: Number(base.leads_total || 0), tipo: "numero" },
        { chave: "leads_novos", label: "Leads Novos", valor: Number(base.leads_novos || 0), tipo: "numero" },
        { chave: "clientes_total", label: "Clientes Ativos", valor: Number(base.clientes_total || 0), tipo: "numero" },
        { chave: "pedidos_total", label: "Pedidos", valor: Number(base.pedidos_total || 0), tipo: "numero" },
        { chave: "pedidos_valor", label: "Valor de Pedidos", valor: Number(base.pedidos_valor || 0), tipo: "moeda" },
        { chave: "produtos_total", label: "Produtos", valor: Number(base.produtos_total || 0), tipo: "numero" },
        { chave: "estoque_critico", label: "Estoque Crítico", valor: Number(base.estoque_critico || 0), tipo: "numero" },
        { chave: "faturamento_viagens", label: "Faturamento Viagens", valor: Number(base.faturamento_viagens || 0), tipo: "moeda" },
        { chave: "carregamentos_fechados", label: "Carregamentos Fechados", valor: Number(base.carregamentos_fechados || 0), tipo: "numero" },
        { chave: "manutencoes_total", label: "Manutenções", valor: Number(base.manutencoes_total || 0), tipo: "numero" },
        { chave: "licencas_ti_total", label: "Licenças TI", valor: Number(base.licencas_ti_total || 0), tipo: "numero" },
        { chave: "compras_pendentes", label: "Compras Pendentes", valor: Number(base.compras_pendentes || 0), tipo: "numero" },
      ];

      return { kpis };
    }),

  powerInsights: protectedProcedure
    .input(z.object({ empresaId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);

      const [financeiro] = await db.execute(sql`
        SELECT
          COALESCE((SELECT SUM(cr.valor::numeric) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr.status='pendente' AND cr."deletedAt" IS NULL), 0) as receber_pendente,
          COALESCE((SELECT SUM(cp.valor::numeric) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp.status='pendente' AND cp."deletedAt" IS NULL), 0) as pagar_pendente,
          COALESCE((SELECT SUM(cr.valor::numeric) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND (cr.status='vencido' OR cr."dataVencimento"<current_date) AND cr."deletedAt" IS NULL), 0) as receber_vencido,
          COALESCE((SELECT SUM(cp.valor::numeric) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND (cp.status='vencido' OR cp."dataVencimento"<current_date) AND cp."deletedAt" IS NULL), 0) as pagar_vencido,
          COALESCE((SELECT COUNT(*)::int FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr."deletedAt" IS NULL), 0) as receber_titulos,
          COALESCE((SELECT COUNT(*)::int FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp."deletedAt" IS NULL), 0) as pagar_titulos
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [operacao] = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*)::int FROM viagens v WHERE v."empresaId"=${empresaId} AND v."deletedAt" IS NULL), 0) as viagens_total,
          COALESCE((SELECT COUNT(*)::int FROM viagens v WHERE v."empresaId"=${empresaId} AND v.status='concluida' AND v."deletedAt" IS NULL), 0) as viagens_concluidas,
          COALESCE((SELECT SUM(COALESCE(v."freteTotal",0)::numeric) FROM viagens v WHERE v."empresaId"=${empresaId} AND v."deletedAt" IS NULL), 0) as faturamento_viagens,
          COALESCE((SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t.status IN ('aberto','triagem_ia','aguardando_ti','em_andamento') AND t."deletedAt" IS NULL), 0) as chamados_abertos,
          COALESCE((SELECT COUNT(*)::int FROM monitor_agentes a WHERE a."empresaId"=${empresaId} AND a.online=false AND a."deletedAt" IS NULL), 0) as agentes_offline
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const serieMensal = await db.execute(sql`
        SELECT
          to_char(mes, 'YYYY-MM') as mes,
          COALESCE(receber, 0)::text as receber,
          COALESCE(pagar, 0)::text as pagar
        FROM (
          SELECT generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') as mes
        ) s
        LEFT JOIN (
          SELECT date_trunc('month', cr."createdAt") as mes, SUM(cr.valor::numeric) as receber
          FROM contas_receber cr
          WHERE cr."empresaId"=${empresaId} AND cr."deletedAt" IS NULL
          GROUP BY 1
        ) r ON r.mes = s.mes
        LEFT JOIN (
          SELECT date_trunc('month', cp."createdAt") as mes, SUM(cp.valor::numeric) as pagar
          FROM contas_pagar cp
          WHERE cp."empresaId"=${empresaId} AND cp."deletedAt" IS NULL
          GROUP BY 1
        ) p ON p.mes = s.mes
        ORDER BY s.mes
      `).then((r: any) => r.rows ?? []).catch(() => []);

      const receberPendente = Number(financeiro?.receber_pendente || 0);
      const pagarPendente = Number(financeiro?.pagar_pendente || 0);
      const receberVencido = Number(financeiro?.receber_vencido || 0);
      const pagarVencido = Number(financeiro?.pagar_vencido || 0);
      const saldoPrevisto = receberPendente - pagarPendente;
      const valorEmRisco = receberVencido + pagarVencido;
      const inadimplenciaPct = receberPendente > 0 ? (receberVencido / receberPendente) * 100 : 0;
      const eficienciaOperacional = Number(operacao?.viagens_total || 0) > 0
        ? (Number(operacao?.viagens_concluidas || 0) / Number(operacao?.viagens_total || 1)) * 100
        : 0;

      return {
        resumo: {
          saldoPrevisto,
          valorEmRisco,
          inadimplenciaPct,
          eficienciaOperacional,
          receberPendente,
          pagarPendente,
          receberVencido,
          pagarVencido,
          chamadosAbertos: Number(operacao?.chamados_abertos || 0),
          agentesOffline: Number(operacao?.agentes_offline || 0),
          faturamentoViagens: Number(operacao?.faturamento_viagens || 0),
        },
        serieMensal,
      };
    }),

  financeiroGradeDiaria: protectedProcedure
    .input(z.object({ empresaId: z.number().optional(), dias: z.number().min(7).max(60).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);
      const dias = input?.dias ?? 15;

      const rows = await db.execute(sql`
        WITH dias AS (
          SELECT generate_series(current_date - (${dias}::int - 1), current_date, interval '1 day')::date as dia
        ),
        rec AS (
          SELECT date_trunc('day', cr."createdAt")::date as dia, SUM(cr.valor::numeric) as receber
          FROM contas_receber cr
          WHERE cr."empresaId" = ${empresaId} AND cr."deletedAt" IS NULL
            AND cr."createdAt" >= current_date - (${dias}::int - 1)
          GROUP BY 1
        ),
        pag AS (
          SELECT date_trunc('day', cp."createdAt")::date as dia, SUM(cp.valor::numeric) as pagar
          FROM contas_pagar cp
          WHERE cp."empresaId" = ${empresaId} AND cp."deletedAt" IS NULL
            AND cp."createdAt" >= current_date - (${dias}::int - 1)
          GROUP BY 1
        )
        SELECT
          d.dia::text as dia,
          COALESCE(r.receber, 0)::text as receber,
          COALESCE(p.pagar, 0)::text as pagar,
          (COALESCE(r.receber, 0) - COALESCE(p.pagar, 0))::text as saldo
        FROM dias d
        LEFT JOIN rec r ON r.dia = d.dia
        LEFT JOIN pag p ON p.dia = d.dia
        ORDER BY d.dia DESC
      `).then((r: any) => r.rows ?? []).catch(() => []);

      return { rows };
    }),

  executiveModules20: protectedProcedure
    .input(z.object({ empresaId: z.number().optional(), dias: z.number().min(7).max(180).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);
      const dias = input?.dias ?? 30;

      const [k] = await db.execute(sql`
        SELECT
          COALESCE((SELECT SUM(cr.valor::numeric) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr.status='pendente' AND cr."deletedAt" IS NULL), 0) as receber_pendente,
          COALESCE((SELECT SUM(cp.valor::numeric) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp.status='pendente' AND cp."deletedAt" IS NULL), 0) as pagar_pendente,
          COALESCE((SELECT SUM(cr.valor::numeric) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND (cr.status='vencido' OR cr."dataVencimento" < current_date) AND cr."deletedAt" IS NULL), 0) as receber_vencido,
          COALESCE((SELECT SUM(cp.valor::numeric) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND (cp.status='vencido' OR cp."dataVencimento" < current_date) AND cp."deletedAt" IS NULL), 0) as pagar_vencido,
          COALESCE((SELECT COUNT(*)::int FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr."dataVencimento" between current_date and current_date + interval '7 days' AND cr.status in ('pendente','vencendo') AND cr."deletedAt" IS NULL), 0) as titulos_receber_7d,
          COALESCE((SELECT COUNT(*)::int FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp."dataVencimento" between current_date and current_date + interval '7 days' AND cp.status in ('pendente','vencendo') AND cp."deletedAt" IS NULL), 0) as titulos_pagar_7d,
          COALESCE((SELECT COUNT(*)::int FROM viagens v WHERE v."empresaId"=${empresaId} AND v."deletedAt" IS NULL), 0) as viagens_total,
          COALESCE((SELECT COUNT(*)::int FROM viagens v WHERE v."empresaId"=${empresaId} AND v.status='concluida' AND v."deletedAt" IS NULL), 0) as viagens_concluidas,
          COALESCE((SELECT SUM(COALESCE(v."freteTotal",0)::numeric) FROM viagens v WHERE v."empresaId"=${empresaId} AND v."deletedAt" IS NULL), 0) as frete_total,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f.ativo=true AND f."deletedAt" IS NULL), 0) as funcionarios_ativos,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f."vencimentoCnh" < current_date AND f."deletedAt" IS NULL), 0) as cnh_vencida,
          COALESCE((SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t.status IN ('aberto','triagem_ia','aguardando_ti','em_andamento') AND t."deletedAt" IS NULL), 0) as ti_abertos,
          COALESCE((SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t.prioridade='critica' AND t.status NOT IN ('encerrado','cancelado') AND t."deletedAt" IS NULL), 0) as ti_criticos,
          COALESCE((SELECT COUNT(*)::int FROM monitor_agentes a WHERE a."empresaId"=${empresaId} AND a.online=false AND a."deletedAt" IS NULL), 0) as agentes_offline,
          COALESCE((SELECT COUNT(*)::int FROM leads l WHERE l."empresaId"=${empresaId} AND l."deletedAt" IS NULL), 0) as leads_total,
          COALESCE((SELECT COUNT(*)::int FROM leads l WHERE l."empresaId"=${empresaId} AND l.status='novo' AND l."deletedAt" IS NULL), 0) as leads_novos,
          COALESCE((SELECT COUNT(*)::int FROM clientes c WHERE c."empresaId"=${empresaId} AND c."deletedAt" IS NULL), 0) as clientes_total,
          COALESCE((SELECT COUNT(*)::int FROM pedidos p WHERE p."empresaId"=${empresaId} AND p."deletedAt" IS NULL), 0) as pedidos_total,
          COALESCE((SELECT SUM(p."valorTotal"::numeric) FROM pedidos p WHERE p."empresaId"=${empresaId} AND p."deletedAt" IS NULL), 0) as pedidos_valor,
          COALESCE((SELECT COUNT(*)::int FROM produtos p WHERE p."empresaId"=${empresaId} AND p."deletedAt" IS NULL), 0) as produtos_total,
          COALESCE((SELECT COUNT(*)::int FROM estoque e INNER JOIN produtos p ON p.id=e."produtoId" WHERE e."empresaId"=${empresaId} AND (e.quantidade::numeric) <= COALESCE(p."estoqueMinimo"::numeric,0)), 0) as estoque_critico
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const [trend] = await db.execute(sql`
        WITH rec AS (
          SELECT COALESCE(SUM(valor::numeric),0) as total
          FROM contas_receber
          WHERE "empresaId"=${empresaId} AND "deletedAt" IS NULL AND "createdAt" >= current_date - (${dias}::int - 1)
        ),
        pag AS (
          SELECT COALESCE(SUM(valor::numeric),0) as total
          FROM contas_pagar
          WHERE "empresaId"=${empresaId} AND "deletedAt" IS NULL AND "createdAt" >= current_date - (${dias}::int - 1)
        )
        SELECT rec.total as receber_periodo, pag.total as pagar_periodo
        FROM rec, pag
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const saldoPrevisto = Number(k?.receber_pendente || 0) - Number(k?.pagar_pendente || 0);
      const riscoFinanceiro = Number(k?.receber_vencido || 0) + Number(k?.pagar_vencido || 0);
      const eficienciaViagens = Number(k?.viagens_total || 0) > 0 ? (Number(k?.viagens_concluidas || 0) / Math.max(1, Number(k?.viagens_total || 1))) * 100 : 0;
      const conversaoComercial = Number(k?.leads_total || 0) > 0 ? (Number(k?.clientes_total || 0) / Math.max(1, Number(k?.leads_total || 1))) * 100 : 0;

      const modules = [
        { key: "m01", area: "Financeiro", label: "Saldo Projetado", tipo: "moeda", valor: saldoPrevisto },
        { key: "m02", area: "Financeiro", label: "Risco Financeiro", tipo: "moeda", valor: riscoFinanceiro },
        { key: "m03", area: "Financeiro", label: "Receber Pendente", tipo: "moeda", valor: Number(k?.receber_pendente || 0) },
        { key: "m04", area: "Financeiro", label: "Pagar Pendente", tipo: "moeda", valor: Number(k?.pagar_pendente || 0) },
        { key: "m05", area: "Financeiro", label: "Recebimentos (30d)", tipo: "moeda", valor: Number(trend?.receber_periodo || 0) },
        { key: "m06", area: "Financeiro", label: "Pagamentos (30d)", tipo: "moeda", valor: Number(trend?.pagar_periodo || 0) },
        { key: "m07", area: "Financeiro", label: "Títulos a Receber em 7d", tipo: "numero", valor: Number(k?.titulos_receber_7d || 0) },
        { key: "m08", area: "Financeiro", label: "Títulos a Pagar em 7d", tipo: "numero", valor: Number(k?.titulos_pagar_7d || 0) },
        { key: "m09", area: "Logística", label: "Viagens Totais", tipo: "numero", valor: Number(k?.viagens_total || 0) },
        { key: "m10", area: "Logística", label: "Eficiência de Viagens", tipo: "percent", valor: eficienciaViagens },
        { key: "m11", area: "Logística", label: "Faturamento de Frete", tipo: "moeda", valor: Number(k?.frete_total || 0) },
        { key: "m12", area: "RH", label: "Funcionários Ativos", tipo: "numero", valor: Number(k?.funcionarios_ativos || 0) },
        { key: "m13", area: "RH", label: "CNH Vencida", tipo: "numero", valor: Number(k?.cnh_vencida || 0) },
        { key: "m14", area: "TI", label: "Chamados Abertos", tipo: "numero", valor: Number(k?.ti_abertos || 0) },
        { key: "m15", area: "TI", label: "Chamados Críticos", tipo: "numero", valor: Number(k?.ti_criticos || 0) },
        { key: "m16", area: "TI", label: "Agentes Offline", tipo: "numero", valor: Number(k?.agentes_offline || 0) },
        { key: "m17", area: "Comercial", label: "Leads Totais", tipo: "numero", valor: Number(k?.leads_total || 0) },
        { key: "m18", area: "Comercial", label: "Leads Novos", tipo: "numero", valor: Number(k?.leads_novos || 0) },
        { key: "m19", area: "Comercial", label: "Conversão Comercial", tipo: "percent", valor: conversaoComercial },
        { key: "m20", area: "Estoque", label: "Itens Críticos", tipo: "numero", valor: Number(k?.estoque_critico || 0) },
      ];

      return { modules };
    }),

  tiFinanceiroRhPulse: protectedProcedure
    .input(z.object({ empresaId: z.number().optional(), dias: z.number().min(7).max(180).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);
      const dias = input?.dias ?? 30;

      const [row] = await db.execute(sql`
        SELECT
          COALESCE((SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t.status IN ('aberto','triagem_ia','aguardando_ti','em_andamento') AND t."deletedAt" IS NULL), 0) as ti_abertos,
          COALESCE((SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t.prioridade='critica' AND t.status NOT IN ('encerrado','cancelado') AND t."deletedAt" IS NULL), 0) as ti_criticos,
          COALESCE((SELECT COUNT(*)::int FROM monitor_agentes a WHERE a."empresaId"=${empresaId} AND a.online=false), 0) as agentes_offline,
          COALESCE((SELECT COUNT(*)::int FROM remote_access_requests r WHERE r."empresaId"=${empresaId} AND r.status IN ('solicitado','aprovado') AND r."deletedAt" IS NULL), 0) as remoto_pendente,
          COALESCE((SELECT SUM(cp.valor::numeric) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp.status='pendente' AND cp."deletedAt" IS NULL), 0) as pagar_pendente,
          COALESCE((SELECT SUM(cp.valor::numeric) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND (cp.status='vencido' OR cp."dataVencimento" < current_date) AND cp."deletedAt" IS NULL), 0) as pagar_vencido,
          COALESCE((SELECT SUM(cr.valor::numeric) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr.status='pendente' AND cr."deletedAt" IS NULL), 0) as receber_pendente,
          COALESCE((SELECT SUM(cr.valor::numeric) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND (cr.status='vencido' OR cr."dataVencimento" < current_date) AND cr."deletedAt" IS NULL), 0) as receber_vencido,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f.ativo=true AND f."deletedAt" IS NULL), 0) as rh_ativos,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f.ativo=false AND f."deletedAt" IS NULL), 0) as rh_inativos,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f."vencimentoCnh" < current_date AND f."deletedAt" IS NULL), 0) as rh_cnh_vencida,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f."vencimentoToxicologico" < current_date AND f."deletedAt" IS NULL), 0) as rh_tox_vencido,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f."vencimentoPeriodico" < current_date AND f."deletedAt" IS NULL), 0) as rh_periodico_vencido,
          COALESCE((SELECT COUNT(*)::int FROM tickets_ti t WHERE t."empresaId"=${empresaId} AND t."createdAt" >= NOW() - (${dias}::int || ' days')::interval), 0) as ti_abertos_periodo,
          COALESCE((SELECT COUNT(*)::int FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp."createdAt" >= NOW() - (${dias}::int || ' days')::interval AND cp."deletedAt" IS NULL), 0) as pagar_lanc_periodo,
          COALESCE((SELECT COUNT(*)::int FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr."createdAt" >= NOW() - (${dias}::int || ' days')::interval AND cr."deletedAt" IS NULL), 0) as receber_lanc_periodo,
          COALESCE((SELECT SUM(cp.valor::numeric) FROM contas_pagar cp WHERE cp."empresaId"=${empresaId} AND cp."createdAt" >= NOW() - (${dias}::int || ' days')::interval AND cp."deletedAt" IS NULL), 0) as pagar_valor_periodo,
          COALESCE((SELECT SUM(cr.valor::numeric) FROM contas_receber cr WHERE cr."empresaId"=${empresaId} AND cr."createdAt" >= NOW() - (${dias}::int || ' days')::interval AND cr."deletedAt" IS NULL), 0) as receber_valor_periodo,
          COALESCE((SELECT COUNT(*)::int FROM funcionarios f WHERE f."empresaId"=${empresaId} AND f."createdAt" >= NOW() - (${dias}::int || ' days')::interval AND f."deletedAt" IS NULL), 0) as rh_mov_periodo
      `).then((r: any) => r.rows ?? [{}]).catch(() => [{}]);

      const modules = [
        { key: "tf01", area: "TI", label: "Chamados Abertos", tipo: "numero", valor: Number(row?.ti_abertos || 0) },
        { key: "tf02", area: "TI", label: "Chamados Críticos", tipo: "numero", valor: Number(row?.ti_criticos || 0) },
        { key: "tf03", area: "TI", label: "Agentes Offline", tipo: "numero", valor: Number(row?.agentes_offline || 0) },
        { key: "tf04", area: "TI", label: "Acesso Remoto Pendente", tipo: "numero", valor: Number(row?.remoto_pendente || 0) },
        { key: "tf05", area: "TI", label: `Chamados (${dias}d)`, tipo: "numero", valor: Number(row?.ti_abertos_periodo || 0) },
        { key: "tf06", area: "Financeiro", label: "Pagar Pendente", tipo: "moeda", valor: Number(row?.pagar_pendente || 0) },
        { key: "tf07", area: "Financeiro", label: "Pagar Vencido", tipo: "moeda", valor: Number(row?.pagar_vencido || 0) },
        { key: "tf08", area: "Financeiro", label: "Receber Pendente", tipo: "moeda", valor: Number(row?.receber_pendente || 0) },
        { key: "tf09", area: "Financeiro", label: "Receber Vencido", tipo: "moeda", valor: Number(row?.receber_vencido || 0) },
        { key: "tf10", area: "Financeiro", label: "Saldo Pendente", tipo: "moeda", valor: Number(row?.receber_pendente || 0) - Number(row?.pagar_pendente || 0) },
        { key: "tf11", area: "Financeiro", label: `Lançamentos Pagar (${dias}d)`, tipo: "numero", valor: Number(row?.pagar_lanc_periodo || 0) },
        { key: "tf12", area: "Financeiro", label: `Lançamentos Receber (${dias}d)`, tipo: "numero", valor: Number(row?.receber_lanc_periodo || 0) },
        { key: "tf13", area: "Financeiro", label: `Valor Pagar (${dias}d)`, tipo: "moeda", valor: Number(row?.pagar_valor_periodo || 0) },
        { key: "tf14", area: "Financeiro", label: `Valor Receber (${dias}d)`, tipo: "moeda", valor: Number(row?.receber_valor_periodo || 0) },
        { key: "tf15", area: "RH", label: "Funcionários Ativos", tipo: "numero", valor: Number(row?.rh_ativos || 0) },
        { key: "tf16", area: "RH", label: "Funcionários Inativos", tipo: "numero", valor: Number(row?.rh_inativos || 0) },
        { key: "tf17", area: "RH", label: "CNH Vencida", tipo: "numero", valor: Number(row?.rh_cnh_vencida || 0) },
        { key: "tf18", area: "RH", label: "Toxicológico Vencido", tipo: "numero", valor: Number(row?.rh_tox_vencido || 0) },
        { key: "tf19", area: "RH", label: "Periódico Vencido", tipo: "numero", valor: Number(row?.rh_periodico_vencido || 0) },
        { key: "tf20", area: "RH", label: `Movimentações RH (${dias}d)`, tipo: "numero", valor: Number(row?.rh_mov_periodo || 0) },
      ];

      const alerts = [
        Number(row?.ti_criticos || 0) > 0 ? "TI: chamados críticos em aberto" : null,
        Number(row?.agentes_offline || 0) > 0 ? "TI: agentes offline" : null,
        Number(row?.pagar_vencido || 0) > 0 ? "Financeiro: contas a pagar vencidas" : null,
        Number(row?.receber_vencido || 0) > 0 ? "Financeiro: contas a receber vencidas" : null,
        Number(row?.rh_cnh_vencida || 0) > 0 ? "RH: CNH vencida" : null,
        Number(row?.rh_tox_vencido || 0) > 0 ? "RH: toxicológico vencido" : null,
      ].filter(Boolean);

      return { modules, alerts, dias };
    }),
});
