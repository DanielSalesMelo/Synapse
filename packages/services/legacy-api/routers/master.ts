import { masterAdminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createNotification } from "../_core/notifications";

const AREA_VALUES = ["vida", "clientes", "synapse"] as const;
const TASK_STATUS_VALUES = ["a_fazer", "em_andamento", "concluida", "bloqueada"] as const;
const PRIORIDADE_VALUES = ["alta", "media", "baixa"] as const;
const PERIODO_VALUES = ["manha", "tarde", "noite"] as const;
const FINANCIAL_TYPE_VALUES = ["receita", "despesa"] as const;
const FINANCIAL_STATUS_VALUES = ["pendente", "pago", "atrasado", "cancelado"] as const;
const CAMPAIGN_PLATFORM_VALUES = ["meta_ads", "google_ads", "google_meu_negocio", "outro"] as const;
const CAMPAIGN_STATUS_VALUES = ["ativa", "em_revisao", "pausada", "encerrada"] as const;
const LANDING_PAGE_STATUS_VALUES = ["rascunho", "publicada", "em_ajuste", "pausada"] as const;
const LEAD_STATUS_VALUES = ["novo", "contato", "qualificado", "proposta", "fechado", "perdido"] as const;
const PROPOSAL_STATUS_VALUES = ["rascunho", "enviada", "negociacao", "aprovada", "recusada"] as const;
const COLLEGE_STATUS_VALUES = ["a_fazer", "em_andamento", "concluida", "atrasada"] as const;
const PROJECT_STATUS_VALUES = ["planejamento", "execucao", "pausado", "concluido"] as const;
const MASTER_SERVICE_TYPE_VALUES = ["trafego_pago", "landing_page", "google_meu_negocio", "consultoria", "implantacao", "synapse", "faculdade"] as const;
const MASTER_SERVICE_STATUS_VALUES = ["ativo", "em_revisao", "pausado", "encerrado"] as const;
const FOLLOW_UP_CHANNEL_VALUES = ["whatsapp", "telefone", "email", "instagram", "telegram", "reuniao"] as const;
const FOLLOW_UP_STATUS_VALUES = ["pendente", "feito", "sem_retorno", "reagendado", "cancelado"] as const;
const PAYMENT_SCHEDULE_STATUS_VALUES = ["pendente", "cobrado", "pago", "atrasado", "cancelado"] as const;
const PAYMENT_SCHEDULE_RECURRENCE_VALUES = ["mensal", "quinzenal", "semanal", "avulso"] as const;
const RELEASE_STATUS_VALUES = ["planejada", "em_desenvolvimento", "em_teste", "publicada", "adiada"] as const;

function humanizeArea(area?: string | null) {
  if (area === "vida") return "vida pessoal";
  if (area === "clientes") return "clientes";
  return "Synapse";
}

export const masterRouter = router({
  dashboard: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const ownerUserId = ctx.user.id;

    const [tasksResult, remindersResult, financeResult, clientsResult, eventsResult, notesResult, campaignsResult, landingPagesResult, leadsResult, proposalsResult] = await Promise.all([
      db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'a_fazer')::int AS abertas,
          count(*) FILTER (WHERE status = 'em_andamento')::int AS andamento,
          count(*) FILTER (WHERE status = 'concluida')::int AS concluidas,
          count(*) FILTER (WHERE status = 'bloqueada')::int AS bloqueadas,
          count(*) FILTER (WHERE "dataLimite" IS NOT NULL AND "dataLimite"::date <= CURRENT_DATE AND status <> 'concluida')::int AS "vencendoHoje"
        FROM master_tasks
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'pendente' AND "lembrarEm"::date = CURRENT_DATE)::int AS hoje
        FROM master_reminders
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT
          coalesce(sum(CASE WHEN tipo = 'receita' AND status <> 'cancelado' THEN valor::numeric ELSE 0 END), 0)::text AS receitas,
          coalesce(sum(CASE WHEN tipo = 'despesa' AND status <> 'cancelado' THEN valor::numeric ELSE 0 END), 0)::text AS despesas,
          coalesce(sum(CASE WHEN tipo = 'receita' AND status = 'pendente' THEN valor::numeric ELSE 0 END), 0)::text AS "receberPendente",
          coalesce(sum(CASE WHEN tipo = 'despesa' AND status = 'pendente' THEN valor::numeric ELSE 0 END), 0)::text AS "pagarPendente",
          count(*) FILTER (WHERE status = 'pendente' AND vencimento < CURRENT_DATE)::int AS atrasados
        FROM master_financial_transactions
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'ativo')::int AS ativos,
          count(*) FILTER (WHERE status = 'lead')::int AS leads,
          count(*) FILTER (WHERE status = 'proposta_enviada')::int AS propostas
        FROM master_clients
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT id, titulo, area, tipo, inicio, local
        FROM master_calendar_events
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
          AND inicio >= NOW() - INTERVAL '2 hours'
        ORDER BY inicio ASC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT id, titulo, pasta, "updatedAt"
        FROM notas
        WHERE "userId" = ${ownerUserId}
          AND "deletedAt" IS NULL
        ORDER BY fixada DESC, "updatedAt" DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'ativa')::int AS ativas,
          count(*) FILTER (WHERE "proximaRevisao" IS NOT NULL AND "proximaRevisao" <= CURRENT_DATE + INTERVAL '7 days')::int AS revisar
        FROM master_campaigns
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'publicada')::int AS publicadas,
          count(*) FILTER (WHERE status = 'em_ajuste')::int AS ajustes
        FROM master_landing_pages
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status IN ('novo','contato','qualificado'))::int AS abertos,
          count(*) FILTER (WHERE status = 'proposta')::int AS emproposta
        FROM master_leads
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
      db.execute(sql`
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status IN ('enviada','negociacao'))::int AS abertas,
          count(*) FILTER (WHERE status = 'aprovada')::int AS aprovadas
        FROM master_proposals
        WHERE "ownerUserId" = ${ownerUserId}
          AND "deletedAt" IS NULL
      `),
    ]);

    const tarefasHoje = await db.execute(sql`
      SELECT id, titulo, area, status, prioridade, periodo, "dataLimite", descricao
      FROM master_tasks
      WHERE "ownerUserId" = ${ownerUserId}
        AND "deletedAt" IS NULL
        AND status <> 'concluida'
      ORDER BY
        CASE prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
        CASE periodo WHEN 'manha' THEN 0 WHEN 'tarde' THEN 1 ELSE 2 END,
        COALESCE("dataLimite", NOW() + INTERVAL '365 days') ASC,
        id ASC
      LIMIT 5
    `);

    const recebimentos = await db.execute(sql`
      SELECT mft.id, mft.descricao, mft.valor, mft.status, mft.vencimento, mc.nome AS "clienteNome"
      FROM master_financial_transactions mft
      LEFT JOIN master_clients mc ON mc.id = mft."clientId"
      WHERE mft."ownerUserId" = ${ownerUserId}
        AND mft."deletedAt" IS NULL
        AND mft.tipo = 'receita'
        AND mft.status IN ('pendente', 'atrasado')
      ORDER BY mft.vencimento ASC NULLS LAST, mft.id DESC
      LIMIT 5
    `);

    const clientesCriticos = await db.execute(sql`
      SELECT id, nome, empresa, status, "proximaAcao", "valorMensal"
      FROM master_clients
      WHERE "ownerUserId" = ${ownerUserId}
        AND "deletedAt" IS NULL
        AND status IN ('lead', 'proposta_enviada', 'ativo')
      ORDER BY
        CASE status WHEN 'proposta_enviada' THEN 0 WHEN 'lead' THEN 1 ELSE 2 END,
        id DESC
      LIMIT 5
    `);

    const campanhasRows = await db.execute(sql`
      SELECT mc.*, cli.nome AS "clienteNome"
      FROM master_campaigns mc
      LEFT JOIN master_clients cli ON cli.id = mc."clientId"
      WHERE mc."ownerUserId" = ${ownerUserId}
        AND mc."deletedAt" IS NULL
      ORDER BY
        CASE mc.status WHEN 'ativa' THEN 0 WHEN 'em_revisao' THEN 1 WHEN 'pausada' THEN 2 ELSE 3 END,
        COALESCE(mc."proximaRevisao", CURRENT_DATE + INTERVAL '365 days') ASC,
        mc.id DESC
      LIMIT 5
    `);

    const landingPagesRows = await db.execute(sql`
      SELECT mlp.*, cli.nome AS "clienteNome"
      FROM master_landing_pages mlp
      LEFT JOIN master_clients cli ON cli.id = mlp."clientId"
      WHERE mlp."ownerUserId" = ${ownerUserId}
        AND mlp."deletedAt" IS NULL
      ORDER BY
        CASE mlp.status WHEN 'publicada' THEN 0 WHEN 'em_ajuste' THEN 1 WHEN 'rascunho' THEN 2 ELSE 3 END,
        mlp.id DESC
      LIMIT 5
    `);

    const leadsRows = await db.execute(sql`
      SELECT *
      FROM master_leads
      WHERE "ownerUserId" = ${ownerUserId}
        AND "deletedAt" IS NULL
      ORDER BY
        CASE status WHEN 'novo' THEN 0 WHEN 'contato' THEN 1 WHEN 'qualificado' THEN 2 WHEN 'proposta' THEN 3 ELSE 4 END,
        id DESC
      LIMIT 5
    `);

    const proposalsRows = await db.execute(sql`
      SELECT mp.*, mc.nome AS "clienteNome", ml.nome AS "leadNome"
      FROM master_proposals mp
      LEFT JOIN master_clients mc ON mc.id = mp."clientId"
      LEFT JOIN master_leads ml ON ml.id = mp."leadId"
      WHERE mp."ownerUserId" = ${ownerUserId}
        AND mp."deletedAt" IS NULL
      ORDER BY
        CASE mp.status WHEN 'enviada' THEN 0 WHEN 'negociacao' THEN 1 WHEN 'rascunho' THEN 2 ELSE 3 END,
        COALESCE(mp.validade, CURRENT_DATE + INTERVAL '365 days') ASC,
        mp.id DESC
      LIMIT 5
    `);

    const focoHojeRows = (tarefasHoje as any[]) ?? [];
    const agendaRows = (eventsResult as any[]) ?? [];
    const reminderStats = ((remindersResult as any[])[0] ?? {}) as any;
    const taskStats = ((tasksResult as any[])[0] ?? {}) as any;
    const financeStats = ((financeResult as any[])[0] ?? {}) as any;
    const clientesRows = (clientesCriticos as any[]) ?? [];

    const topTasks = focoHojeRows.slice(0, 3).map((task: any) => task.titulo);
    const hasAtrasados = Number(financeStats.atrasados ?? 0) > 0;
    const firstEvento = agendaRows[0];
    const firstClientAction = clientesRows.find((client: any) => client.proximaAcao);

    const resumoPartes = topTasks.length
      ? topTasks
      : [
          hasAtrasados ? "regularizar recebimentos atrasados" : null,
          firstClientAction ? `agir com ${firstClientAction.nome}` : null,
          firstEvento ? `preparar ${firstEvento.titulo}` : null,
        ].filter(Boolean) as string[];

    const resumo =
      resumoPartes.length > 0
        ? `Daniel, hoje recomendo focar em ${resumoPartes.slice(0, 3).join(", ")}.`
        : "Daniel, hoje o melhor passo é cadastrar as primeiras tarefas, clientes e compromissos para o sistema conseguir priorizar seu dia.";

    const proximaAcao = topTasks[0]
      ? `Comece por: ${topTasks[0]}.`
      : hasAtrasados
        ? "Comece cobrando os recebimentos atrasados."
        : firstClientAction?.proximaAcao
          ? `Comece pelo cliente ${firstClientAction.nome}: ${firstClientAction.proximaAcao}.`
          : firstEvento
            ? `Comece se preparando para o compromisso ${firstEvento.titulo}.`
            : "Comece criando a primeira tarefa prioritária do dia.";

    const excessoTarefas = Number(taskStats.abertas ?? 0) + Number(taskStats.andamento ?? 0) > 8;
    const alertas: string[] = [];
    if (excessoTarefas) alertas.push("Você está com muitas tarefas abertas. Reduza o foco para no máximo 5 prioridades.");
    if (hasAtrasados) alertas.push("Existem recebimentos ou pagamentos atrasados na sua central.");
    if (Number(reminderStats.hoje ?? 0) > 3) alertas.push("Há vários lembretes para hoje. Vale reorganizar a agenda.");

    return {
      stats: {
        tarefas: (tasksResult as any[])[0] ?? {},
        lembretes: (remindersResult as any[])[0] ?? {},
        financeiro: (financeResult as any[])[0] ?? {},
        clientes: (clientsResult as any[])[0] ?? {},
        campanhas: (campaignsResult as any[])[0] ?? {},
        landingPages: (landingPagesResult as any[])[0] ?? {},
        leads: (leadsResult as any[])[0] ?? {},
        propostas: (proposalsResult as any[])[0] ?? {},
      },
      focoHoje: (tarefasHoje as any[]) ?? [],
      recebimentos: (recebimentos as any[]) ?? [],
      clientesCriticos: (clientesCriticos as any[]) ?? [],
      campanhas: (campanhasRows as any[]) ?? [],
      landingPages: (landingPagesRows as any[]) ?? [],
      leads: (leadsRows as any[]) ?? [],
      propostas: (proposalsRows as any[]) ?? [],
      agenda: (eventsResult as any[]) ?? [],
      notasRecentes: (notesResult as any[]) ?? [],
      planejamento: {
        resumo,
        proximaAcao,
        microtarefas: focoHojeRows.slice(0, 5).map((task: any) => ({
          id: task.id,
          titulo: task.titulo,
          area: humanizeArea(task.area),
          periodo: task.periodo,
          prioridade: task.prioridade,
        })),
        alertas,
      },
    };
  }),

  listClients: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_clients
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY
        CASE status WHEN 'ativo' THEN 0 WHEN 'proposta_enviada' THEN 1 WHEN 'lead' THEN 2 ELSE 3 END,
        id DESC
    `) as unknown as any[];
  }),

  createClient: masterAdminProcedure
    .input(z.object({
      nome: z.string().min(2, "Informe o nome do cliente."),
      empresa: z.string().optional(),
      contato: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      servicos: z.string().optional(),
      valorMensal: z.string().optional(),
      status: z.enum(["lead", "proposta_enviada", "ativo", "pausado", "saindo", "encerrado"]).default("lead"),
      dataInicio: z.string().optional(),
      proximaAcao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_clients (
          "ownerUserId", nome, empresa, contato, whatsapp, email, servicos,
          "valorMensal", status, "dataInicio", "proximaAcao", observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.nome}, ${input.empresa ?? null}, ${input.contato ?? null},
          ${input.whatsapp ?? null}, ${input.email ?? null}, ${input.servicos ?? null},
          ${input.valorMensal ?? null}, ${input.status}, ${input.dataInicio ? new Date(input.dataInicio) : null},
          ${input.proximaAcao ?? null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_cliente",
        titulo: "Cliente cadastrado",
        mensagem: `O cliente ${input.nome} foi salvo na Central do Daniel.`,
        payload: created ? { clientId: created.id } : null,
      });
      return created;
    }),

  updateClient: masterAdminProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(2).optional(),
      empresa: z.string().optional(),
      contato: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      servicos: z.string().optional(),
      valorMensal: z.string().optional(),
      status: z.enum(["lead", "proposta_enviada", "ativo", "pausado", "saindo", "encerrado"]).optional(),
      dataInicio: z.string().nullable().optional(),
      proximaAcao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, ...fields } = input;
      const updates: string[] = [];
      if (fields.nome !== undefined) updates.push(`nome = '${fields.nome.replace(/'/g, "''")}'`);
      if (fields.empresa !== undefined) updates.push(`empresa = ${fields.empresa ? `'${fields.empresa.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.contato !== undefined) updates.push(`contato = ${fields.contato ? `'${fields.contato.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.whatsapp !== undefined) updates.push(`whatsapp = ${fields.whatsapp ? `'${fields.whatsapp.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.email !== undefined) updates.push(`email = ${fields.email ? `'${fields.email.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.servicos !== undefined) updates.push(`servicos = ${fields.servicos ? `'${fields.servicos.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.valorMensal !== undefined) updates.push(`"valorMensal" = ${fields.valorMensal ? `'${fields.valorMensal.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.status !== undefined) updates.push(`status = '${fields.status}'`);
      if (fields.dataInicio !== undefined) updates.push(`"dataInicio" = ${fields.dataInicio ? `'${new Date(fields.dataInicio).toISOString()}'` : "NULL"}`);
      if (fields.proximaAcao !== undefined) updates.push(`"proximaAcao" = ${fields.proximaAcao ? `'${fields.proximaAcao.replace(/'/g, "''")}'` : "NULL"}`);
      if (fields.observacoes !== undefined) updates.push(`observacoes = ${fields.observacoes ? `'${fields.observacoes.replace(/'/g, "''")}'` : "NULL"}`);
      updates.push(`"updatedAt" = NOW()`);
      await db.execute(sql.raw(`
        UPDATE master_clients
        SET ${updates.join(", ")}
        WHERE id = ${id}
          AND "ownerUserId" = ${ctx.user.id}
          AND "deletedAt" IS NULL
      `));
      return { success: true };
    }),

  listTasks: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mt.*, mc.nome AS "clienteNome"
      FROM master_tasks mt
      LEFT JOIN master_clients mc ON mc.id = mt."clientId"
      WHERE mt."ownerUserId" = ${ctx.user.id}
        AND mt."deletedAt" IS NULL
      ORDER BY
        CASE mt.status WHEN 'a_fazer' THEN 0 WHEN 'em_andamento' THEN 1 WHEN 'bloqueada' THEN 2 ELSE 3 END,
        CASE mt.prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
        COALESCE(mt."dataLimite", NOW() + INTERVAL '365 days') ASC,
        mt.id DESC
    `) as unknown as any[];
  }),

  createTask: masterAdminProcedure
    .input(z.object({
      titulo: z.string().min(2, "Informe o título."),
      descricao: z.string().optional(),
      area: z.enum(AREA_VALUES).default("synapse"),
      status: z.enum(TASK_STATUS_VALUES).default("a_fazer"),
      prioridade: z.enum(PRIORIDADE_VALUES).default("media"),
      periodo: z.enum(PERIODO_VALUES).default("manha"),
      clientId: z.number().optional(),
      dataLimite: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_tasks (
          "ownerUserId", "clientId", titulo, descricao, area, status,
          prioridade, periodo, "dataLimite"
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.titulo}, ${input.descricao ?? null},
          ${input.area}, ${input.status}, ${input.prioridade}, ${input.periodo},
          ${input.dataLimite ? new Date(input.dataLimite) : null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_tarefa",
        titulo: "Tarefa criada",
        mensagem: `A tarefa ${input.titulo} foi adicionada ao seu planejamento.`,
        payload: created ? { taskId: created.id, area: input.area } : null,
      });
      return created;
    }),

  updateTaskStatus: masterAdminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(TASK_STATUS_VALUES),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.execute(sql`
        UPDATE master_tasks
        SET status = ${input.status},
            "concluidaEm" = CASE WHEN ${input.status} = 'concluida' THEN NOW() ELSE NULL END,
            "updatedAt" = NOW()
        WHERE id = ${input.id}
          AND "ownerUserId" = ${ctx.user.id}
          AND "deletedAt" IS NULL
      `);
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_tarefa",
        titulo: input.status === "concluida" ? "Tarefa concluída" : "Tarefa atualizada",
        mensagem: input.status === "concluida" ? "Uma tarefa do seu planejamento foi concluída." : "O status de uma tarefa foi atualizado.",
        payload: { taskId: input.id, status: input.status },
      });
      return { success: true };
    }),

  listFinancial: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mft.*, mc.nome AS "clienteNome"
      FROM master_financial_transactions mft
      LEFT JOIN master_clients mc ON mc.id = mft."clientId"
      WHERE mft."ownerUserId" = ${ctx.user.id}
        AND mft."deletedAt" IS NULL
      ORDER BY mft.vencimento ASC NULLS LAST, mft.id DESC
    `) as unknown as any[];
  }),

  createFinancial: masterAdminProcedure
    .input(z.object({
      tipo: z.enum(FINANCIAL_TYPE_VALUES),
      categoria: z.string().optional(),
      descricao: z.string().min(2, "Informe a descrição."),
      valor: z.string().min(1, "Informe o valor."),
      status: z.enum(FINANCIAL_STATUS_VALUES).default("pendente"),
      vencimento: z.string().optional(),
      formaPagamento: z.string().optional(),
      clientId: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_financial_transactions (
          "ownerUserId", "clientId", tipo, categoria, descricao, valor, status,
          vencimento, "formaPagamento", observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.tipo}, ${input.categoria ?? null},
          ${input.descricao}, ${input.valor}, ${input.status},
          ${input.vencimento ? new Date(input.vencimento) : null},
          ${input.formaPagamento ?? null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_financeiro",
        titulo: input.tipo === "receita" ? "Receita registrada" : "Despesa registrada",
        mensagem: `${input.descricao} foi salva no financeiro da Central do Daniel.`,
        payload: created ? { transactionId: created.id, tipo: input.tipo, status: input.status } : null,
      });
      return created;
    }),

  markFinancialPaid: masterAdminProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pago", "cancelado"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.execute(sql`
        UPDATE master_financial_transactions
        SET status = ${input.status},
            "pagoEm" = CASE WHEN ${input.status} = 'pago' THEN NOW() ELSE NULL END,
            "updatedAt" = NOW()
        WHERE id = ${input.id}
          AND "ownerUserId" = ${ctx.user.id}
          AND "deletedAt" IS NULL
      `);
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_financeiro",
        titulo: input.status === "pago" ? "Lançamento marcado como pago" : "Lançamento cancelado",
        mensagem: input.status === "pago" ? "Um lançamento financeiro foi baixado." : "Um lançamento financeiro foi cancelado.",
        payload: { transactionId: input.id, status: input.status },
      });
      return { success: true };
    }),

  listEvents: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mce.*, mc.nome AS "clienteNome"
      FROM master_calendar_events mce
      LEFT JOIN master_clients mc ON mc.id = mce."clientId"
      WHERE mce."ownerUserId" = ${ctx.user.id}
        AND mce."deletedAt" IS NULL
      ORDER BY mce.inicio ASC
      LIMIT 20
    `) as unknown as any[];
  }),

  createEvent: masterAdminProcedure
    .input(z.object({
      titulo: z.string().min(2, "Informe o título."),
      descricao: z.string().optional(),
      area: z.enum(AREA_VALUES).default("vida"),
      tipo: z.string().optional(),
      inicio: z.string().min(1, "Informe a data."),
      fim: z.string().optional(),
      local: z.string().optional(),
      lembreteMinutos: z.number().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_calendar_events (
          "ownerUserId", "clientId", titulo, descricao, area, tipo,
          inicio, fim, local, "lembreteMinutos"
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.titulo}, ${input.descricao ?? null},
          ${input.area}, ${input.tipo ?? "compromisso"}, ${new Date(input.inicio)},
          ${input.fim ? new Date(input.fim) : null}, ${input.local ?? null}, ${input.lembreteMinutos ?? 30}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_agenda",
        titulo: "Compromisso criado",
        mensagem: `${input.titulo} foi adicionado à sua agenda.`,
        payload: created ? { eventId: created.id, area: input.area } : null,
      });
      return created;
    }),

  listReminders: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_reminders
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY "lembrarEm" ASC
      LIMIT 20
    `) as unknown as any[];
  }),

  createReminder: masterAdminProcedure
    .input(z.object({
      titulo: z.string().min(2, "Informe o título."),
      descricao: z.string().optional(),
      lembrarEm: z.string().min(1, "Informe quando lembrar."),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_reminders ("ownerUserId", titulo, descricao, "lembrarEm")
        VALUES (${ctx.user.id}, ${input.titulo}, ${input.descricao ?? null}, ${new Date(input.lembrarEm)})
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_lembrete",
        titulo: "Lembrete criado",
        mensagem: `${input.titulo} foi salvo para acompanhamento.`,
        payload: created ? { reminderId: created.id } : null,
      });
      return created;
    }),

  listCampaigns: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mc.*, cli.nome AS "clienteNome"
      FROM master_campaigns mc
      LEFT JOIN master_clients cli ON cli.id = mc."clientId"
      WHERE mc."ownerUserId" = ${ctx.user.id}
        AND mc."deletedAt" IS NULL
      ORDER BY
        CASE mc.status WHEN 'ativa' THEN 0 WHEN 'em_revisao' THEN 1 WHEN 'pausada' THEN 2 ELSE 3 END,
        COALESCE(mc."proximaRevisao", CURRENT_DATE + INTERVAL '365 days') ASC,
        mc.id DESC
    `) as unknown as any[];
  }),

  createCampaign: masterAdminProcedure
    .input(z.object({
      nome: z.string().min(2, "Informe o nome da campanha."),
      plataforma: z.enum(CAMPAIGN_PLATFORM_VALUES).default("meta_ads"),
      objetivo: z.string().optional(),
      status: z.enum(CAMPAIGN_STATUS_VALUES).default("ativa"),
      orcamento: z.string().optional(),
      custoPorLead: z.string().optional(),
      ultimaRevisao: z.string().optional(),
      proximaRevisao: z.string().optional(),
      resultado: z.string().optional(),
      pendencias: z.string().optional(),
      observacoes: z.string().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_campaigns (
          "ownerUserId", "clientId", plataforma, nome, objetivo, status,
          orcamento, "custoPorLead", "ultimaRevisao", "proximaRevisao",
          resultado, pendencias, observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.plataforma}, ${input.nome},
          ${input.objetivo ?? null}, ${input.status}, ${input.orcamento ?? null},
          ${input.custoPorLead ?? null},
          ${input.ultimaRevisao ? new Date(input.ultimaRevisao) : null},
          ${input.proximaRevisao ? new Date(input.proximaRevisao) : null},
          ${input.resultado ?? null}, ${input.pendencias ?? null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_campanha",
        titulo: "Campanha registrada",
        mensagem: `${input.nome} foi adicionada ao painel de campanhas.`,
        payload: created ? { campaignId: created.id, plataforma: input.plataforma } : null,
      });
      return created;
    }),

  listLandingPages: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mlp.*, cli.nome AS "clienteNome"
      FROM master_landing_pages mlp
      LEFT JOIN master_clients cli ON cli.id = mlp."clientId"
      WHERE mlp."ownerUserId" = ${ctx.user.id}
        AND mlp."deletedAt" IS NULL
      ORDER BY
        CASE mlp.status WHEN 'publicada' THEN 0 WHEN 'em_ajuste' THEN 1 WHEN 'rascunho' THEN 2 ELSE 3 END,
        mlp.id DESC
    `) as unknown as any[];
  }),

  createLandingPage: masterAdminProcedure
    .input(z.object({
      nome: z.string().min(2, "Informe o nome da landing page."),
      url: z.string().optional(),
      dominio: z.string().optional(),
      status: z.enum(LANDING_PAGE_STATUS_VALUES).default("rascunho"),
      dataPublicacao: z.string().optional(),
      formularioOk: z.boolean().default(false),
      whatsappOk: z.boolean().default(false),
      pixelInstalado: z.boolean().default(false),
      observacoes: z.string().optional(),
      melhorias: z.string().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_landing_pages (
          "ownerUserId", "clientId", nome, url, dominio, status, "dataPublicacao",
          "formularioOk", "whatsappOk", "pixelInstalado", observacoes, melhorias
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.nome}, ${input.url ?? null},
          ${input.dominio ?? null}, ${input.status}, ${input.dataPublicacao ? new Date(input.dataPublicacao) : null},
          ${input.formularioOk}, ${input.whatsappOk}, ${input.pixelInstalado},
          ${input.observacoes ?? null}, ${input.melhorias ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_landing_page",
        titulo: "Landing page registrada",
        mensagem: `${input.nome} foi salva na Central do Daniel.`,
        payload: created ? { landingPageId: created.id, status: input.status } : null,
      });
      return created;
    }),

  listLeads: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_leads
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY
        CASE status WHEN 'novo' THEN 0 WHEN 'contato' THEN 1 WHEN 'qualificado' THEN 2 WHEN 'proposta' THEN 3 ELSE 4 END,
        id DESC
    `) as unknown as any[];
  }),

  createLead: masterAdminProcedure
    .input(z.object({
      nome: z.string().min(2, "Informe o nome do lead."),
      empresa: z.string().optional(),
      contato: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().optional(),
      origem: z.string().optional(),
      status: z.enum(LEAD_STATUS_VALUES).default("novo"),
      interesse: z.string().optional(),
      proximaAcao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_leads (
          "ownerUserId", nome, empresa, contato, whatsapp, email, origem, status, interesse, "proximaAcao", observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.nome}, ${input.empresa ?? null}, ${input.contato ?? null},
          ${input.whatsapp ?? null}, ${input.email ?? null}, ${input.origem ?? null},
          ${input.status}, ${input.interesse ?? null}, ${input.proximaAcao ?? null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_lead",
        titulo: "Lead cadastrado",
        mensagem: `${input.nome} entrou na sua fila comercial.`,
        payload: created ? { leadId: created.id, status: input.status } : null,
      });
      return created;
    }),

  listProposals: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mp.*, mc.nome AS "clienteNome", ml.nome AS "leadNome"
      FROM master_proposals mp
      LEFT JOIN master_clients mc ON mc.id = mp."clientId"
      LEFT JOIN master_leads ml ON ml.id = mp."leadId"
      WHERE mp."ownerUserId" = ${ctx.user.id}
        AND mp."deletedAt" IS NULL
      ORDER BY
        CASE mp.status WHEN 'enviada' THEN 0 WHEN 'negociacao' THEN 1 WHEN 'rascunho' THEN 2 ELSE 3 END,
        COALESCE(mp.validade, CURRENT_DATE + INTERVAL '365 days') ASC,
        mp.id DESC
    `) as unknown as any[];
  }),

  createProposal: masterAdminProcedure
    .input(z.object({
      titulo: z.string().min(2, "Informe o título da proposta."),
      valor: z.string().optional(),
      status: z.enum(PROPOSAL_STATUS_VALUES).default("rascunho"),
      validade: z.string().optional(),
      descricao: z.string().optional(),
      observacoes: z.string().optional(),
      clientId: z.number().optional(),
      leadId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_proposals (
          "ownerUserId", "clientId", "leadId", titulo, valor, status, validade, descricao, observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.leadId ?? null}, ${input.titulo},
          ${input.valor ?? null}, ${input.status}, ${input.validade ? new Date(input.validade) : null},
          ${input.descricao ?? null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_proposta",
        titulo: "Proposta registrada",
        mensagem: `${input.titulo} foi adicionada ao seu pipeline comercial.`,
        payload: created ? { proposalId: created.id, status: input.status } : null,
      });
      return created;
    }),

  listHealthLogs: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_health_logs
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY referencia DESC, id DESC
      LIMIT 20
    `) as unknown as any[];
  }),

  createHealthLog: masterAdminProcedure
    .input(z.object({
      referencia: z.string().optional(),
      humor: z.number().min(1).max(5).optional(),
      energia: z.number().min(1).max(5).optional(),
      sonoHoras: z.string().optional(),
      pesoKg: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_health_logs (
          "ownerUserId", referencia, humor, energia, "sonoHoras", "pesoKg", observacoes
        ) VALUES (
          ${ctx.user.id},
          ${input.referencia ? new Date(input.referencia) : new Date()},
          ${input.humor ?? null},
          ${input.energia ?? null},
          ${input.sonoHoras ?? null},
          ${input.pesoKg ?? null},
          ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      return ((res as any[])[0]) ?? null;
    }),

  listCollegeTasks: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_college_tasks
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY
        CASE status WHEN 'a_fazer' THEN 0 WHEN 'em_andamento' THEN 1 WHEN 'atrasada' THEN 2 ELSE 3 END,
        COALESCE(prazo, CURRENT_DATE + INTERVAL '365 days') ASC,
        id DESC
      LIMIT 30
    `) as unknown as any[];
  }),

  createCollegeTask: masterAdminProcedure
    .input(z.object({
      disciplina: z.string().min(2, "Informe a disciplina."),
      titulo: z.string().min(2, "Informe o título."),
      status: z.enum(COLLEGE_STATUS_VALUES).default("a_fazer"),
      prazo: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_college_tasks (
          "ownerUserId", disciplina, titulo, status, prazo, observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.disciplina}, ${input.titulo}, ${input.status},
          ${input.prazo ? new Date(input.prazo) : null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      return ((res as any[])[0]) ?? null;
    }),

  updateCollegeTaskStatus: masterAdminProcedure
    .input(z.object({ id: z.number(), status: z.enum(COLLEGE_STATUS_VALUES) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.execute(sql`
        UPDATE master_college_tasks
        SET status = ${input.status}, "updatedAt" = NOW()
        WHERE id = ${input.id}
          AND "ownerUserId" = ${ctx.user.id}
          AND "deletedAt" IS NULL
      `);
      return { success: true };
    }),

  listProjects: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mp.*, mc.nome AS "clienteNome"
      FROM master_projects mp
      LEFT JOIN master_clients mc ON mc.id = mp."clientId"
      WHERE mp."ownerUserId" = ${ctx.user.id}
        AND mp."deletedAt" IS NULL
      ORDER BY
        CASE mp.status WHEN 'execucao' THEN 0 WHEN 'planejamento' THEN 1 WHEN 'pausado' THEN 2 ELSE 3 END,
        mp.id DESC
      LIMIT 25
    `) as unknown as any[];
  }),

  createProject: masterAdminProcedure
    .input(z.object({
      titulo: z.string().min(2, "Informe o título."),
      area: z.enum(AREA_VALUES).default("synapse"),
      status: z.enum(PROJECT_STATUS_VALUES).default("planejamento"),
      progresso: z.number().min(0).max(100).default(0),
      descricao: z.string().optional(),
      proximaEntrega: z.string().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_projects (
          "ownerUserId", "clientId", titulo, area, status, progresso, descricao, "proximaEntrega"
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.titulo}, ${input.area},
          ${input.status}, ${input.progresso}, ${input.descricao ?? null},
          ${input.proximaEntrega ? new Date(input.proximaEntrega) : null}
        )
        RETURNING *
      `);
      return ((res as any[])[0]) ?? null;
    }),

  listAiNotes: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_ai_notes
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 20
    `) as unknown as any[];
  }),

  createAiNote: masterAdminProcedure
    .input(z.object({
      titulo: z.string().min(2, "Informe o título."),
      categoria: z.string().optional(),
      conteudo: z.string().min(3, "Informe o conteúdo."),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_ai_notes ("ownerUserId", titulo, categoria, conteudo)
        VALUES (${ctx.user.id}, ${input.titulo}, ${input.categoria ?? null}, ${input.conteudo})
        RETURNING *
      `);
      return ((res as any[])[0]) ?? null;
    }),

  listDailyPlans: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_daily_plans
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY referencia DESC, id DESC
      LIMIT 15
    `) as unknown as any[];
  }),

  createDailyPlan: masterAdminProcedure
    .input(z.object({
      referencia: z.string().optional(),
      focoPrincipal: z.string().min(2, "Informe o foco principal."),
      top3: z.string().optional(),
      manha: z.string().optional(),
      tarde: z.string().optional(),
      noite: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_daily_plans (
          "ownerUserId", referencia, "focoPrincipal", top3, manha, tarde, noite, observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.referencia ? new Date(input.referencia) : new Date()},
          ${input.focoPrincipal}, ${input.top3 ?? null}, ${input.manha ?? null},
          ${input.tarde ?? null}, ${input.noite ?? null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      return ((res as any[])[0]) ?? null;
    }),

  listServices: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT ms.*, mc.nome AS "clienteNome"
      FROM master_services ms
      LEFT JOIN master_clients mc ON mc.id = ms."clientId"
      WHERE ms."ownerUserId" = ${ctx.user.id}
        AND ms."deletedAt" IS NULL
      ORDER BY
        CASE ms.status WHEN 'ativo' THEN 0 WHEN 'em_revisao' THEN 1 WHEN 'pausado' THEN 2 ELSE 3 END,
        COALESCE(ms."proximaRevisao", CURRENT_DATE + INTERVAL '365 days') ASC,
        ms.id DESC
      LIMIT 30
    `) as unknown as any[];
  }),

  createService: masterAdminProcedure
    .input(z.object({
      nome: z.string().min(2, "Informe o nome do serviço."),
      tipo: z.enum(MASTER_SERVICE_TYPE_VALUES),
      status: z.enum(MASTER_SERVICE_STATUS_VALUES).default("ativo"),
      checklist: z.string().optional(),
      valorMensal: z.string().optional(),
      proximaRevisao: z.string().optional(),
      observacoes: z.string().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_services (
          "ownerUserId", "clientId", nome, tipo, status, checklist, "valorMensal", "proximaRevisao", observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.nome}, ${input.tipo}, ${input.status},
          ${input.checklist ?? null}, ${input.valorMensal ?? null},
          ${input.proximaRevisao ? new Date(input.proximaRevisao) : null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_servico",
        titulo: "Serviço registrado",
        mensagem: `${input.nome} foi adicionado ao seu portfólio.`,
        payload: created ? { serviceId: created.id, tipo: input.tipo } : null,
      });
      return created;
    }),

  listGoogleBusinessProfiles: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mgbp.*, mc.nome AS "clienteNome"
      FROM master_google_business_profiles mgbp
      LEFT JOIN master_clients mc ON mc.id = mgbp."clientId"
      WHERE mgbp."ownerUserId" = ${ctx.user.id}
        AND mgbp."deletedAt" IS NULL
      ORDER BY COALESCE(mgbp."ultimaAtualizacao", CURRENT_DATE - INTERVAL '365 days') DESC, mgbp.id DESC
      LIMIT 30
    `) as unknown as any[];
  }),

  createGoogleBusinessProfile: masterAdminProcedure
    .input(z.object({
      perfil: z.string().min(2, "Informe o nome do perfil."),
      linkPerfil: z.string().optional(),
      ultimaAtualizacao: z.string().optional(),
      fotosPendentes: z.boolean().default(false),
      avaliacoesPendentes: z.boolean().default(false),
      postagemSemanal: z.boolean().default(false),
      servicosAtualizados: z.boolean().default(false),
      palavrasChave: z.string().optional(),
      relatorioMensal: z.boolean().default(false),
      checklistOtimizacao: z.string().optional(),
      observacoes: z.string().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_google_business_profiles (
          "ownerUserId", "clientId", perfil, "linkPerfil", "ultimaAtualizacao", "fotosPendentes",
          "avaliacoesPendentes", "postagemSemanal", "servicosAtualizados", "palavrasChave",
          "relatorioMensal", "checklistOtimizacao", observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.perfil}, ${input.linkPerfil ?? null},
          ${input.ultimaAtualizacao ? new Date(input.ultimaAtualizacao) : null}, ${input.fotosPendentes},
          ${input.avaliacoesPendentes}, ${input.postagemSemanal}, ${input.servicosAtualizados},
          ${input.palavrasChave ?? null}, ${input.relatorioMensal}, ${input.checklistOtimizacao ?? null},
          ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_google_business",
        titulo: "Perfil Google salvo",
        mensagem: `${input.perfil} foi salvo na gestão de Google Meu Negócio.`,
        payload: created ? { profileId: created.id } : null,
      });
      return created;
    }),

  listFollowUps: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mfu.*, mc.nome AS "clienteNome", ml.nome AS "leadNome", mp.titulo AS "propostaTitulo"
      FROM master_follow_ups mfu
      LEFT JOIN master_clients mc ON mc.id = mfu."clientId"
      LEFT JOIN master_leads ml ON ml.id = mfu."leadId"
      LEFT JOIN master_proposals mp ON mp.id = mfu."proposalId"
      WHERE mfu."ownerUserId" = ${ctx.user.id}
        AND mfu."deletedAt" IS NULL
      ORDER BY
        CASE mfu.status WHEN 'pendente' THEN 0 WHEN 'reagendado' THEN 1 WHEN 'sem_retorno' THEN 2 WHEN 'feito' THEN 3 ELSE 4 END,
        COALESCE(mfu."dataPrevista", CURRENT_DATE + INTERVAL '365 days') ASC,
        mfu.id DESC
      LIMIT 40
    `) as unknown as any[];
  }),

  createFollowUp: masterAdminProcedure
    .input(z.object({
      titulo: z.string().min(2, "Informe o título do follow-up."),
      canal: z.enum(FOLLOW_UP_CHANNEL_VALUES).default("whatsapp"),
      status: z.enum(FOLLOW_UP_STATUS_VALUES).default("pendente"),
      dataPrevista: z.string().optional(),
      resposta: z.string().optional(),
      observacoes: z.string().optional(),
      clientId: z.number().optional(),
      leadId: z.number().optional(),
      proposalId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_follow_ups (
          "ownerUserId", "clientId", "leadId", "proposalId", titulo, canal, status, "dataPrevista", resposta, observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.leadId ?? null}, ${input.proposalId ?? null},
          ${input.titulo}, ${input.canal}, ${input.status},
          ${input.dataPrevista ? new Date(input.dataPrevista) : null},
          ${input.resposta ?? null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_follow_up",
        titulo: "Follow-up criado",
        mensagem: `${input.titulo} entrou na sua fila de acompanhamento.`,
        payload: created ? { followUpId: created.id, canal: input.canal } : null,
      });
      return created;
    }),

  updateFollowUpStatus: masterAdminProcedure
    .input(z.object({ id: z.number(), status: z.enum(FOLLOW_UP_STATUS_VALUES) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.execute(sql`
        UPDATE master_follow_ups
        SET status = ${input.status}, "updatedAt" = NOW()
        WHERE id = ${input.id}
          AND "ownerUserId" = ${ctx.user.id}
          AND "deletedAt" IS NULL
      `);
      return { success: true };
    }),

  listPaymentSchedules: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT mps.*, mc.nome AS "clienteNome"
      FROM master_payment_schedules mps
      LEFT JOIN master_clients mc ON mc.id = mps."clientId"
      WHERE mps."ownerUserId" = ${ctx.user.id}
        AND mps."deletedAt" IS NULL
      ORDER BY
        CASE mps.status WHEN 'atrasado' THEN 0 WHEN 'pendente' THEN 1 WHEN 'cobrado' THEN 2 WHEN 'pago' THEN 3 ELSE 4 END,
        COALESCE(mps.vencimento, CURRENT_DATE + INTERVAL '365 days') ASC,
        mps.id DESC
      LIMIT 40
    `) as unknown as any[];
  }),

  createPaymentSchedule: masterAdminProcedure
    .input(z.object({
      descricao: z.string().min(2, "Informe a descrição da cobrança."),
      valor: z.string().min(1, "Informe o valor."),
      status: z.enum(PAYMENT_SCHEDULE_STATUS_VALUES).default("pendente"),
      recorrencia: z.enum(PAYMENT_SCHEDULE_RECURRENCE_VALUES).default("mensal"),
      vencimento: z.string().optional(),
      ultimaCobranca: z.string().optional(),
      observacoes: z.string().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_payment_schedules (
          "ownerUserId", "clientId", descricao, valor, status, recorrencia, vencimento, "ultimaCobranca", observacoes
        ) VALUES (
          ${ctx.user.id}, ${input.clientId ?? null}, ${input.descricao}, ${input.valor}, ${input.status},
          ${input.recorrencia}, ${input.vencimento ? new Date(input.vencimento) : null},
          ${input.ultimaCobranca ? new Date(input.ultimaCobranca) : null}, ${input.observacoes ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_cobranca_programada",
        titulo: "Cobrança programada",
        mensagem: `${input.descricao} foi adicionada à agenda de cobrança.`,
        payload: created ? { paymentScheduleId: created.id, status: input.status } : null,
      });
      return created;
    }),

  updatePaymentScheduleStatus: masterAdminProcedure
    .input(z.object({ id: z.number(), status: z.enum(PAYMENT_SCHEDULE_STATUS_VALUES) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.execute(sql`
        UPDATE master_payment_schedules
        SET status = ${input.status},
            "ultimaCobranca" = CASE WHEN ${input.status} IN ('cobrado', 'pago') THEN NOW() ELSE "ultimaCobranca" END,
            "updatedAt" = NOW()
        WHERE id = ${input.id}
          AND "ownerUserId" = ${ctx.user.id}
          AND "deletedAt" IS NULL
      `);
      return { success: true };
    }),

  listSynapseReleases: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return db.execute(sql`
      SELECT *
      FROM master_synapse_releases
      WHERE "ownerUserId" = ${ctx.user.id}
        AND "deletedAt" IS NULL
      ORDER BY
        CASE status WHEN 'em_teste' THEN 0 WHEN 'em_desenvolvimento' THEN 1 WHEN 'planejada' THEN 2 WHEN 'publicada' THEN 3 ELSE 4 END,
        COALESCE("dataPrevista", CURRENT_DATE + INTERVAL '365 days') ASC,
        id DESC
      LIMIT 30
    `) as unknown as any[];
  }),

  createSynapseRelease: masterAdminProcedure
    .input(z.object({
      versao: z.string().min(2, "Informe a versão."),
      titulo: z.string().min(2, "Informe o título da release."),
      status: z.enum(RELEASE_STATUS_VALUES).default("planejada"),
      dataPrevista: z.string().optional(),
      destaques: z.string().optional(),
      riscos: z.string().optional(),
      deployStatus: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const res = await db.execute(sql`
        INSERT INTO master_synapse_releases (
          "ownerUserId", versao, titulo, status, "dataPrevista", destaques, riscos, "deployStatus"
        ) VALUES (
          ${ctx.user.id}, ${input.versao}, ${input.titulo}, ${input.status},
          ${input.dataPrevista ? new Date(input.dataPrevista) : null},
          ${input.destaques ?? null}, ${input.riscos ?? null}, ${input.deployStatus ?? null}
        )
        RETURNING *
      `);
      const created = ((res as any[])[0]) ?? null;
      await createNotification({
        userId: ctx.user.id,
        tipo: "master_synapse_release",
        titulo: "Release do Synapse salva",
        mensagem: `${input.versao} · ${input.titulo} foi adicionada ao roadmap do produto.`,
        payload: created ? { releaseId: created.id, status: input.status } : null,
      });
      return created;
    }),
});
