import { masterAdminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const AREA_VALUES = ["vida", "clientes", "synapse"] as const;
const TASK_STATUS_VALUES = ["a_fazer", "em_andamento", "concluida", "bloqueada"] as const;
const PRIORIDADE_VALUES = ["alta", "media", "baixa"] as const;
const PERIODO_VALUES = ["manha", "tarde", "noite"] as const;
const FINANCIAL_TYPE_VALUES = ["receita", "despesa"] as const;
const FINANCIAL_STATUS_VALUES = ["pendente", "pago", "atrasado", "cancelado"] as const;

export const masterRouter = router({
  dashboard: masterAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const ownerUserId = ctx.user.id;

    const [tasksResult, remindersResult, financeResult, clientsResult, eventsResult, notesResult] = await Promise.all([
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

    return {
      stats: {
        tarefas: (tasksResult as any[])[0] ?? {},
        lembretes: (remindersResult as any[])[0] ?? {},
        financeiro: (financeResult as any[])[0] ?? {},
        clientes: (clientsResult as any[])[0] ?? {},
      },
      focoHoje: (tarefasHoje as any[]) ?? [],
      recebimentos: (recebimentos as any[]) ?? [],
      clientesCriticos: (clientesCriticos as any[]) ?? [],
      agenda: (eventsResult as any[]) ?? [],
      notasRecentes: (notesResult as any[]) ?? [],
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
      return ((res as any[])[0]) ?? null;
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
      return ((res as any[])[0]) ?? null;
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
      return ((res as any[])[0]) ?? null;
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
      return ((res as any[])[0]) ?? null;
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
      return ((res as any[])[0]) ?? null;
    }),
});
