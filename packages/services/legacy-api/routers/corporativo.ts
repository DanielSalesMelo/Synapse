import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { resolveAccessibleEmpresaId } from "../_core/access";
import { getRawClient } from "../db";

const ADMIN_ROLES = new Set([
  "master_admin",
  "admin",
  "admin_empresa",
  "administrador",
  "supervisor_geral",
  "ti",
  "supervisor_ti",
]);

const UNIT_TYPES = [
  "empresa",
  "filial",
  "unidade",
  "setor",
  "equipe",
  "grupo",
  "centro_custo",
] as const;

type Scope = {
  empresaId: number | null;
  global: boolean;
};

function canManageCorporate(user: any): boolean {
  const role = String(user?.role || "").toLowerCase();
  return ADMIN_ROLES.has(role);
}

function requireCorporateManager(user: any): void {
  if (!canManageCorporate(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a administradores, TI e supervisores.",
    });
  }
}

async function ensureCorporateSchema(client: any) {
  await client`
    CREATE TABLE IF NOT EXISTS "organizational_units" (
      "id" serial PRIMARY KEY,
      "empresaId" integer NOT NULL,
      "parentId" integer,
      "type" varchar(40) NOT NULL DEFAULT 'setor',
      "name" varchar(160) NOT NULL,
      "code" varchar(60),
      "responsibleUserId" integer,
      "costCenter" varchar(80),
      "status" varchar(30) NOT NULL DEFAULT 'ativo',
      "metadata" jsonb,
      "createdBy" integer,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      "deletedAt" timestamptz,
      "deletedBy" integer,
      "deleteReason" text
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS idx_organizational_units_empresa ON "organizational_units"("empresaId")`;
  await client`CREATE INDEX IF NOT EXISTS idx_organizational_units_parent ON "organizational_units"("parentId")`;
  await client`CREATE INDEX IF NOT EXISTS idx_organizational_units_status ON "organizational_units"("status")`;
  await client`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "organizationalUnitId" integer`;
  await client`ALTER TABLE "tickets_ti" ADD COLUMN IF NOT EXISTS "organizationalUnitId" integer`.catch(() => {});
  await client`ALTER TABLE "monitor_agentes" ADD COLUMN IF NOT EXISTS "organizationalUnitId" integer`.catch(() => {});
  await client`
    CREATE TABLE IF NOT EXISTS "corporate_audit_events" (
      "id" bigserial PRIMARY KEY,
      "empresaId" integer,
      "actorUserId" integer,
      "action" varchar(80) NOT NULL,
      "entityType" varchar(80) NOT NULL,
      "entityId" varchar(120),
      "summary" text,
      "metadata" jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS idx_corporate_audit_empresa ON "corporate_audit_events"("empresaId")`;
}

async function resolveCorporateScope(ctx: any, requestedEmpresaId?: number | null): Promise<Scope> {
  if (ctx.user?.role === "master_admin" && !requestedEmpresaId && !ctx.user?.empresaId) {
    return { empresaId: null, global: true };
  }

  const empresaId = await resolveAccessibleEmpresaId(
    ctx,
    requestedEmpresaId ?? ctx.user?.empresaId ?? undefined,
  );
  return { empresaId, global: false };
}

function scopeWhere(scope: Scope, alias?: string): { sql: string; params: any[] } {
  if (scope.global) return { sql: "TRUE", params: [] };
  const prefix = alias ? `${alias}.` : "";
  return { sql: `${prefix}"empresaId" = $1`, params: [scope.empresaId] };
}

function numberFrom(row: any, key: string): number {
  const value = Number(row?.[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildInsight(params: {
  chamadosCriticos: number;
  agentesOffline: number;
  chamadosAbertos: number;
  unidades: number;
  setoresSemDono: number;
}) {
  const insights: Array<{ tipo: "risco" | "acao" | "oportunidade"; titulo: string; descricao: string }> = [];
  if (params.chamadosCriticos > 0) {
    insights.push({
      tipo: "risco",
      titulo: "Chamados críticos exigem atenção",
      descricao: `${params.chamadosCriticos} chamado(s) crítico(s) ainda estão abertos. Priorize triagem, responsável e SLA.`,
    });
  }
  if (params.agentesOffline > 0) {
    insights.push({
      tipo: "risco",
      titulo: "Ativos sem contato recente",
      descricao: `${params.agentesOffline} agente(s) aparecem offline. Verifique heartbeat, vínculo e conectividade por setor.`,
    });
  }
  if (params.unidades === 0) {
    insights.push({
      tipo: "acao",
      titulo: "Cadastre setores para ganhar visão preventiva",
      descricao: "Sem setores/unidades, o Synapse não consegue apontar qual área abre mais chamados, consome mais suporte ou tem mais risco.",
    });
  }
  if (params.setoresSemDono > 0) {
    insights.push({
      tipo: "acao",
      titulo: "Setores sem responsável",
      descricao: `${params.setoresSemDono} setor(es) ainda não têm responsável definido. Isso reduz rastreabilidade e governança.`,
    });
  }
  if (params.chamadosAbertos === 0 && params.agentesOffline === 0) {
    insights.push({
      tipo: "oportunidade",
      titulo: "Operação estável",
      descricao: "Boa janela para manutenção preventiva, inventário fino e criação de automações seguras.",
    });
  }
  return insights;
}

async function audit(client: any, params: {
  empresaId: number | null;
  actorUserId: number;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  summary: string;
  metadata?: any;
}) {
  await client`
    INSERT INTO "corporate_audit_events" (
      "empresaId", "actorUserId", "action", "entityType", "entityId", "summary", "metadata", "createdAt"
    ) VALUES (
      ${params.empresaId}, ${params.actorUserId}, ${params.action}, ${params.entityType},
      ${params.entityId == null ? null : String(params.entityId)}, ${params.summary},
      ${params.metadata ? JSON.stringify(params.metadata) : null}, now()
    )
  `.catch(() => {});
}

export const corporativoRouter = router({
  resumoExecutivo: protectedProcedure
    .input(z.object({ empresaId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      requireCorporateManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      await ensureCorporateSchema(client);
      const scope = await resolveCorporateScope(ctx, input?.empresaId);
      const scoped = scopeWhere(scope);
      const params = scoped.params;

      const [tickets] = await client.unsafe(`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status IN ('aberto','triagem_ia','aguardando_ti','aguardando_usuario','em_andamento','reaberto'))::int as abertos,
          COUNT(*) FILTER (WHERE prioridade = 'critica' AND status NOT IN ('encerrado','cancelado','resolvido'))::int as criticos,
          COUNT(*) FILTER (WHERE status = 'resolvido')::int as resolvidos,
          COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days')::int as ultimos_7d
        FROM tickets_ti
        WHERE ${scoped.sql} AND "deletedAt" IS NULL
      `, params).catch(() => [{ total: 0, abertos: 0, criticos: 0, resolvidos: 0, ultimos_7d: 0 }]);

      const [agents] = await client.unsafe(`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE COALESCE(ativo, true) = true)::int as monitorados,
          COUNT(*) FILTER (WHERE COALESCE(online, false) = true OR status = 'online')::int as online,
          COUNT(*) FILTER (
            WHERE COALESCE(ativo, true) = true
              AND NOT (COALESCE(online, false) = true OR status = 'online')
          )::int as offline,
          COUNT(*) FILTER (
            WHERE COALESCE("updatedAt", "ultimoContato", NOW() - INTERVAL '365 days') < NOW() - INTERVAL '7 days'
          )::int as sem_heartbeat_7d
        FROM monitor_agentes
        WHERE ${scoped.sql} AND "deletedAt" IS NULL
      `, params).catch(() => [{ total: 0, monitorados: 0, online: 0, offline: 0, sem_heartbeat_7d: 0 }]);

      const [units] = await client.unsafe(`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE status = 'ativo')::int as ativos,
          COUNT(*) FILTER (WHERE status = 'arquivado')::int as arquivados,
          COUNT(*) FILTER (WHERE "responsibleUserId" IS NULL AND status = 'ativo')::int as sem_responsavel
        FROM organizational_units
        WHERE ${scoped.sql} AND "deletedAt" IS NULL
      `, params).catch(() => [{ total: 0, ativos: 0, arquivados: 0, sem_responsavel: 0 }]);

      const [security] = await client.unsafe(`
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(ativo, true) = true AND status IN ('critico','critical'))::int as criticos,
          COUNT(*) FILTER (WHERE COALESCE(ativo, true) = true AND status IN ('atencao','warning','degraded'))::int as atencao
        FROM monitor_agentes
        WHERE ${scoped.sql} AND "deletedAt" IS NULL
      `, params).catch(() => [{ criticos: 0, atencao: 0 }]);

      const ticketRows = await client.unsafe(`
        SELECT COALESCE(NULLIF(TRIM(setor), ''), 'Sem setor') as setor,
          COUNT(*)::int as chamados,
          COUNT(*) FILTER (WHERE status IN ('aberto','triagem_ia','aguardando_ti','aguardando_usuario','em_andamento','reaberto'))::int as abertos,
          COUNT(*) FILTER (WHERE prioridade = 'critica' AND status NOT IN ('encerrado','cancelado','resolvido'))::int as criticos
        FROM tickets_ti
        WHERE ${scoped.sql} AND "deletedAt" IS NULL
        GROUP BY COALESCE(NULLIF(TRIM(setor), ''), 'Sem setor')
      `, params).catch(() => []);

      const agentRows = await client.unsafe(`
        SELECT COALESCE(NULLIF(TRIM(setor), ''), NULLIF(TRIM(department_id), ''), 'Sem setor') as setor,
          COUNT(*)::int as ativos,
          COUNT(*) FILTER (WHERE COALESCE(online, false) = true OR status = 'online')::int as online,
          COUNT(*) FILTER (WHERE COALESCE(ativo, true) = true AND NOT (COALESCE(online, false) = true OR status = 'online'))::int as offline
        FROM monitor_agentes
        WHERE ${scoped.sql} AND "deletedAt" IS NULL
        GROUP BY COALESCE(NULLIF(TRIM(setor), ''), NULLIF(TRIM(department_id), ''), 'Sem setor')
      `, params).catch(() => []);

      const setores = new Map<string, any>();
      for (const row of ticketRows as any[]) {
        setores.set(row.setor, {
          setor: row.setor,
          chamados: numberFrom(row, "chamados"),
          chamadosAbertos: numberFrom(row, "abertos"),
          chamadosCriticos: numberFrom(row, "criticos"),
          ativos: 0,
          online: 0,
          offline: 0,
        });
      }
      for (const row of agentRows as any[]) {
        const current = setores.get(row.setor) || {
          setor: row.setor,
          chamados: 0,
          chamadosAbertos: 0,
          chamadosCriticos: 0,
          ativos: 0,
          online: 0,
          offline: 0,
        };
        current.ativos = numberFrom(row, "ativos");
        current.online = numberFrom(row, "online");
        current.offline = numberFrom(row, "offline");
        setores.set(row.setor, current);
      }

      const chamadosCriticos = numberFrom(tickets, "criticos");
      const agentesOffline = numberFrom(agents, "offline");
      const score = clampScore(100 - chamadosCriticos * 9 - agentesOffline * 5 - numberFrom(agents, "sem_heartbeat_7d") * 3 - numberFrom(units, "sem_responsavel") * 2);
      const statusGeral = score >= 85 ? "saudavel" : score >= 70 ? "atencao" : score >= 45 ? "risco" : "critico";

      return {
        contexto: {
          global: scope.global,
          empresaId: scope.empresaId,
          label: scope.global ? "Visão global administrativa" : "Empresa ativa",
        },
        score,
        statusGeral,
        tickets: {
          total: numberFrom(tickets, "total"),
          abertos: numberFrom(tickets, "abertos"),
          criticos: chamadosCriticos,
          resolvidos: numberFrom(tickets, "resolvidos"),
          ultimos7d: numberFrom(tickets, "ultimos_7d"),
        },
        ativos: {
          total: numberFrom(agents, "total"),
          monitorados: numberFrom(agents, "monitorados"),
          online: numberFrom(agents, "online"),
          offline: agentesOffline,
          semHeartbeat7d: numberFrom(agents, "sem_heartbeat_7d"),
        },
        unidades: {
          total: numberFrom(units, "total"),
          ativos: numberFrom(units, "ativos"),
          arquivados: numberFrom(units, "arquivados"),
          semResponsavel: numberFrom(units, "sem_responsavel"),
        },
        seguranca: {
          criticos: numberFrom(security, "criticos"),
          atencao: numberFrom(security, "atencao"),
        },
        setores: Array.from(setores.values()).sort((a, b) => {
          const impactA = a.chamadosCriticos * 5 + a.offline * 3 + a.chamadosAbertos;
          const impactB = b.chamadosCriticos * 5 + b.offline * 3 + b.chamadosAbertos;
          return impactB - impactA;
        }),
        modulos: [
          { key: "atendimento", nome: "Atendimento / Helpdesk", status: "ativo", sinal: numberFrom(tickets, "abertos") > 0 ? "movimento" : "estavel" },
          { key: "monitoramento", nome: "Monitoramento", status: "ativo", sinal: agentesOffline > 0 ? "atencao" : "estavel" },
          { key: "inventario", nome: "Inventário", status: "ativo", sinal: numberFrom(agents, "total") > 0 ? "estavel" : "configurar" },
          { key: "rede", nome: "Rede", status: "planejado", sinal: "preparado" },
          { key: "seguranca", nome: "Segurança", status: "planejado", sinal: numberFrom(security, "criticos") > 0 ? "risco" : "preparado" },
          { key: "impressoras", nome: "Impressoras", status: "planejado", sinal: "preparado" },
          { key: "estoque", nome: "Estoque", status: "ativo", sinal: "estavel" },
          { key: "auditoria", nome: "Auditoria", status: "ativo", sinal: "estavel" },
          { key: "ia", nome: "IA Operacional", status: "preparado", sinal: "aprendizado" },
          { key: "automacao", nome: "Automação", status: "preparado", sinal: "governado" },
          { key: "preventivo", nome: "Preventivo", status: "preparado", sinal: "evoluir" },
          { key: "executivo", nome: "Painel Executivo", status: "ativo", sinal: statusGeral },
        ],
        insights: buildInsight({
          chamadosCriticos,
          agentesOffline,
          chamadosAbertos: numberFrom(tickets, "abertos"),
          unidades: numberFrom(units, "total"),
          setoresSemDono: numberFrom(units, "sem_responsavel"),
        }),
      };
    }),

  listarUnidades: protectedProcedure
    .input(z.object({ empresaId: z.number().optional(), incluirArquivadas: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      requireCorporateManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      await ensureCorporateSchema(client);
      const scope = await resolveCorporateScope(ctx, input?.empresaId);
      const scoped = scopeWhere(scope, "ou");
      const archivedFilter = input?.incluirArquivadas ? "" : "AND ou.status <> 'arquivado'";
      return client.unsafe(`
        SELECT ou.*,
          e.nome as empresa_nome,
          parent.name as parent_name,
          u.name as responsible_name
        FROM organizational_units ou
        LEFT JOIN empresas e ON e.id = ou."empresaId"
        LEFT JOIN organizational_units parent ON parent.id = ou."parentId"
        LEFT JOIN users u ON u.id = ou."responsibleUserId"
        WHERE ${scoped.sql}
          AND ou."deletedAt" IS NULL
          ${archivedFilter}
        ORDER BY e.nome NULLS LAST, ou."type", ou.name
      `, scoped.params).catch(() => []);
    }),

  criarUnidade: protectedProcedure
    .input(z.object({
      empresaId: z.number().optional(),
      parentId: z.number().nullable().optional(),
      type: z.enum(UNIT_TYPES).default("setor"),
      name: z.string().min(2).max(160),
      code: z.string().max(60).optional(),
      responsibleUserId: z.number().nullable().optional(),
      costCenter: z.string().max(80).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCorporateManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      await ensureCorporateSchema(client);
      const scope = await resolveCorporateScope(ctx, input.empresaId);
      if (scope.global || !scope.empresaId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selecione uma empresa para cadastrar uma unidade.",
        });
      }
      const [row] = await client`
        INSERT INTO "organizational_units" (
          "empresaId", "parentId", "type", "name", "code", "responsibleUserId",
          "costCenter", "status", "createdBy", "createdAt", "updatedAt"
        ) VALUES (
          ${scope.empresaId}, ${input.parentId ?? null}, ${input.type}, ${input.name.trim()},
          ${input.code?.trim() || null}, ${input.responsibleUserId ?? null},
          ${input.costCenter?.trim() || null}, 'ativo', ${ctx.user.id}, now(), now()
        )
        RETURNING *
      `;
      await audit(client, {
        empresaId: scope.empresaId,
        actorUserId: ctx.user.id,
        action: "organizational_unit.created",
        entityType: "organizational_unit",
        entityId: row?.id,
        summary: `Unidade ${input.name.trim()} criada.`,
        metadata: input,
      });
      return row;
    }),

  atualizarUnidade: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresaId: z.number().optional(),
      parentId: z.number().nullable().optional(),
      type: z.enum(UNIT_TYPES).optional(),
      name: z.string().min(2).max(160).optional(),
      code: z.string().max(60).nullable().optional(),
      responsibleUserId: z.number().nullable().optional(),
      costCenter: z.string().max(80).nullable().optional(),
      status: z.enum(["ativo", "arquivado", "inativo"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireCorporateManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      await ensureCorporateSchema(client);
      const scope = await resolveCorporateScope(ctx, input.empresaId);
      if (scope.global) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma empresa para editar unidades." });
      }
      const existing = await client`
        SELECT id FROM "organizational_units"
        WHERE id=${input.id} AND "empresaId"=${scope.empresaId} AND "deletedAt" IS NULL
        LIMIT 1
      `;
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Unidade não encontrada." });

      const sets = ['"updatedAt" = now()'];
      const params: any[] = [];
      const addSet = (column: string, value: any) => {
        params.push(value);
        sets.push(`"${column}" = $${params.length}`);
      };
      if (input.parentId !== undefined) addSet("parentId", input.parentId);
      if (input.type !== undefined) addSet("type", input.type);
      if (input.name !== undefined) addSet("name", input.name.trim());
      if (input.code !== undefined) addSet("code", input.code?.trim() || null);
      if (input.responsibleUserId !== undefined) addSet("responsibleUserId", input.responsibleUserId);
      if (input.costCenter !== undefined) addSet("costCenter", input.costCenter?.trim() || null);
      if (input.status !== undefined) addSet("status", input.status);

      params.push(input.id, scope.empresaId);
      const [row] = await client.unsafe(`
        UPDATE "organizational_units"
        SET ${sets.join(", ")}
        WHERE id=$${params.length - 1} AND "empresaId"=$${params.length}
        RETURNING *
      `, params);
      await audit(client, {
        empresaId: scope.empresaId,
        actorUserId: ctx.user.id,
        action: "organizational_unit.updated",
        entityType: "organizational_unit",
        entityId: input.id,
        summary: `Unidade ${row?.name ?? input.id} atualizada.`,
        metadata: input,
      });
      return row;
    }),

  arquivarUnidade: protectedProcedure
    .input(z.object({ id: z.number(), empresaId: z.number().optional(), motivo: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireCorporateManager(ctx.user);
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      await ensureCorporateSchema(client);
      const scope = await resolveCorporateScope(ctx, input.empresaId);
      if (scope.global) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione uma empresa para arquivar unidades." });
      }
      const [row] = await client`
        UPDATE "organizational_units"
        SET "status"='arquivado', "deletedBy"=${ctx.user.id}, "deleteReason"=${input.motivo ?? null}, "updatedAt"=now()
        WHERE id=${input.id} AND "empresaId"=${scope.empresaId} AND "deletedAt" IS NULL
        RETURNING *
      `;
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Unidade não encontrada." });
      await audit(client, {
        empresaId: scope.empresaId,
        actorUserId: ctx.user.id,
        action: "organizational_unit.archived",
        entityType: "organizational_unit",
        entityId: input.id,
        summary: `Unidade ${row.name} arquivada.`,
        metadata: { motivo: input.motivo },
      });
      return { success: true, message: "Unidade arquivada. Histórico preservado.", unidade: row };
    }),
});
