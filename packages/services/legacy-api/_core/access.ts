import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  empresas,
  grupoEmpresas,
  moduloPermissoes,
  userCompanyAccess,
  userPermissoes,
  type User,
} from "../drizzle/schema";
import type { TrpcContext } from "./context";

export const ACCESS_MODULES = [
  "dashboard",
  "frota",
  "viagens",
  "funcionarios",
  "financeiro",
  "wms",
  "recepcionista",
  "logistica",
  "crm",
  "vendas",
  "auditoria",
  "bi",
  "ti",
  "ponto",
  "conferencia",
  "integracoes",
  "chat",
  "ia",
  "empresas",
  "usuarios",
  "permissoes",
] as const;

export type AccessModule = (typeof ACCESS_MODULES)[number];
export type AccessAction = "ver" | "criar" | "editar" | "deletar" | "exportar";

export const COMPANY_ROLE_CODES = [
  "master_admin",
  "admin_empresa",
  "supervisor_geral",
  "supervisor_financeiro",
  "contas_pagar",
  "contas_receber",
  "rh",
  "ti",
  "despachante",
  "motorista",
  "ajudante",
  "operacional",
  "comercial",
  "estoque",
  "logistica",
  "compras",
  "leitor",
] as const;

export type CompanyRoleCode = (typeof COMPANY_ROLE_CODES)[number];

type PermissionFlags = {
  podeVer: boolean;
  podeCriar: boolean;
  podeEditar: boolean;
  podeDeletar: boolean;
  podeExportar: boolean;
};

type AccessSummaryItem = {
  empresaId: number;
  roleCode: string;
  canViewGroup: boolean;
  isDefault: boolean;
  empresaNome?: string | null;
  grupoId?: number | null;
};

const FULL_ACCESS: PermissionFlags = {
  podeVer: true,
  podeCriar: true,
  podeEditar: true,
  podeDeletar: true,
  podeExportar: true,
};

const VIEW_ONLY: PermissionFlags = {
  podeVer: true,
  podeCriar: false,
  podeEditar: false,
  podeDeletar: false,
  podeExportar: false,
};

const EDITOR_ACCESS: PermissionFlags = {
  podeVer: true,
  podeCriar: true,
  podeEditar: true,
  podeDeletar: false,
  podeExportar: false,
};

const MODULE_SET = new Set<string>(ACCESS_MODULES);

function emptyPermissions(): PermissionFlags {
  return {
    podeVer: false,
    podeCriar: false,
    podeEditar: false,
    podeDeletar: false,
    podeExportar: false,
  };
}

function fullAccessMap(): Record<string, PermissionFlags> {
  return Object.fromEntries(ACCESS_MODULES.map(module => [module, { ...FULL_ACCESS }]));
}

function mixedAccessMap(modules: string[], flags: PermissionFlags): Record<string, PermissionFlags> {
  return Object.fromEntries(
    ACCESS_MODULES.map(module => [module, modules.includes(module) ? { ...flags } : emptyPermissions()])
  );
}

const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, PermissionFlags>> = {
  master_admin: fullAccessMap(),
  admin_empresa: fullAccessMap(),
  supervisor_geral: fullAccessMap(),
  supervisor_financeiro: mixedAccessMap(
    ["dashboard", "financeiro", "bi", "chat", "empresas", "usuarios"],
    FULL_ACCESS
  ),
  contas_pagar: mixedAccessMap(["dashboard", "financeiro"], EDITOR_ACCESS),
  contas_receber: mixedAccessMap(["dashboard", "financeiro"], EDITOR_ACCESS),
  rh: mixedAccessMap(["dashboard", "funcionarios", "ponto", "bi"], FULL_ACCESS),
  ti: mixedAccessMap(["dashboard", "ti", "chat", "auditoria"], FULL_ACCESS),
  despachante: mixedAccessMap(["dashboard", "frota", "viagens", "logistica", "conferencia"], FULL_ACCESS),
  motorista: mixedAccessMap(["dashboard", "viagens", "checklists", "chat"], VIEW_ONLY),
  ajudante: mixedAccessMap(["dashboard", "viagens", "chat"], VIEW_ONLY),
  operacional: mixedAccessMap(["dashboard", "wms", "logistica", "chat"], EDITOR_ACCESS),
  comercial: mixedAccessMap(["dashboard", "crm", "vendas", "chat"], FULL_ACCESS),
  estoque: mixedAccessMap(["dashboard", "wms", "chat"], FULL_ACCESS),
  logistica: mixedAccessMap(["dashboard", "frota", "viagens", "logistica", "chat"], FULL_ACCESS),
  compras: mixedAccessMap(["dashboard", "financeiro", "chat"], EDITOR_ACCESS),
  leitor: mixedAccessMap([...ACCESS_MODULES], VIEW_ONLY),
  user: mixedAccessMap(["dashboard", "chat"], VIEW_ONLY),
  admin: fullAccessMap(),
  monitor: mixedAccessMap(["dashboard", "frota", "viagens", "chat"], EDITOR_ACCESS),
  dispatcher: mixedAccessMap(["dashboard", "frota", "viagens", "logistica"], FULL_ACCESS),
};

const LEGACY_ROLE_TO_COMPANY_ROLE: Record<string, CompanyRoleCode> = {
  master_admin: "master_admin",
  admin: "admin_empresa",
  dispatcher: "despachante",
  monitor: "operacional",
  user: "leitor",
};

function normalizeRoleCode(user: User, rawRoleCode?: string | null): string {
  if (rawRoleCode && rawRoleCode.trim().length > 0) {
    return rawRoleCode.trim();
  }
  return LEGACY_ROLE_TO_COMPANY_ROLE[user.role] ?? "leitor";
}

async function getBaseAccessRows(user: User): Promise<AccessSummaryItem[]> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  }

  const rows = user.role === "master_admin"
    ? []
    : await db
        .select({
          empresaId: userCompanyAccess.empresaId,
          roleCode: userCompanyAccess.roleCode,
          canViewGroup: userCompanyAccess.canViewGroup,
          isDefault: userCompanyAccess.isDefault,
        })
        .from(userCompanyAccess)
        .where(
          and(
            eq(userCompanyAccess.userId, user.id),
            eq(userCompanyAccess.ativo, true),
            isNull(userCompanyAccess.deletedAt),
          )
        );

  if (rows.length > 0) {
    return rows;
  }

  if (!user.empresaId) {
    return [];
  }

  return [
    {
      empresaId: user.empresaId,
      roleCode: normalizeRoleCode(user),
      canViewGroup: false,
      isDefault: true,
    },
  ];
}

export async function getAccessibleCompanySummary(user: User): Promise<AccessSummaryItem[]> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  }

  if (user.role === "master_admin") {
    const rows = await db
      .select({
        empresaId: empresas.id,
        empresaNome: empresas.nome,
        grupoId: empresas.grupoId,
      })
      .from(empresas)
      .where(and(isNull(empresas.deletedAt), eq(empresas.ativo, true)))
      .orderBy(empresas.nome);

    return rows.map(row => ({
      empresaId: row.empresaId,
      empresaNome: row.empresaNome,
      grupoId: row.grupoId,
      roleCode: "master_admin",
      canViewGroup: true,
      isDefault: user.empresaId === row.empresaId,
    }));
  }

  const baseRows = await getBaseAccessRows(user);
  if (baseRows.length === 0) {
    return [];
  }

  const baseCompanyIds = Array.from(new Set(baseRows.map(row => row.empresaId)));
  const companyRows = await db
    .select({
      id: empresas.id,
      nome: empresas.nome,
      grupoId: empresas.grupoId,
      matrizId: empresas.matrizId,
    })
    .from(empresas)
    .where(and(inArray(empresas.id, baseCompanyIds), isNull(empresas.deletedAt), eq(empresas.ativo, true)));

  const groupMembershipRows = await db
    .select({
      empresaId: grupoEmpresas.empresaId,
      grupoId: grupoEmpresas.grupoId,
    })
    .from(grupoEmpresas)
    .where(inArray(grupoEmpresas.empresaId, baseCompanyIds))
    .catch(() => []);

  const groupIds = new Set<number>();
  const matrixIds = new Set<number>();
  const companyById = new Map(companyRows.map(row => [row.id, row]));

  for (const row of baseRows) {
    if (!row.canViewGroup) continue;
    const company = companyById.get(row.empresaId);
    if (company?.grupoId) groupIds.add(company.grupoId);
    if (company?.matrizId) matrixIds.add(company.matrizId);
    if (company?.id) matrixIds.add(company.id);
    for (const membership of groupMembershipRows) {
      if (membership.empresaId === row.empresaId) {
        groupIds.add(membership.grupoId);
      }
    }
  }

  const expandedRows =
    groupIds.size === 0 && matrixIds.size === 0
      ? []
      : await db
          .select({
            id: empresas.id,
            nome: empresas.nome,
            grupoId: empresas.grupoId,
          })
          .from(empresas)
          .where(
            and(
              isNull(empresas.deletedAt),
              eq(empresas.ativo, true),
              or(
                groupIds.size > 0 ? inArray(empresas.grupoId, [...groupIds]) : undefined,
                matrixIds.size > 0 ? inArray(empresas.matrizId, [...matrixIds]) : undefined,
                matrixIds.size > 0 ? inArray(empresas.id, [...matrixIds]) : undefined,
              )
            )
          )
          .catch(() => []);

  const summaryByCompany = new Map<number, AccessSummaryItem>();

  for (const row of baseRows) {
    const company = companyById.get(row.empresaId);
    summaryByCompany.set(row.empresaId, {
      ...row,
      empresaNome: company?.nome ?? null,
      grupoId: company?.grupoId ?? null,
      isDefault: row.isDefault || user.empresaId === row.empresaId,
    });
  }

  for (const row of expandedRows) {
    if (summaryByCompany.has(row.id)) continue;
    const source = baseRows.find(item => item.canViewGroup) ?? baseRows[0];
    summaryByCompany.set(row.id, {
      empresaId: row.id,
      empresaNome: row.nome,
      grupoId: row.grupoId,
      roleCode: source?.roleCode ?? normalizeRoleCode(user),
      canViewGroup: true,
      isDefault: user.empresaId === row.id,
    });
  }

  return [...summaryByCompany.values()].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return (a.empresaNome || "").localeCompare(b.empresaNome || "");
  });
}

export async function listAccessibleCompanyIds(user: User): Promise<number[]> {
  const summary = await getAccessibleCompanySummary(user);
  return summary.map(item => item.empresaId);
}

export async function resolveAccessibleEmpresaId(
  ctx: TrpcContext,
  requestedEmpresaId?: number | null
): Promise<number> {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
  }

  if (ctx.user.role === "master_admin") {
    if (requestedEmpresaId) return requestedEmpresaId;
    if (ctx.user.empresaId) return ctx.user.empresaId;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selecione uma empresa para continuar.",
    });
  }

  const accessible = await listAccessibleCompanyIds(ctx.user);
  const targetEmpresaId = requestedEmpresaId ?? ctx.user.empresaId;
  if (!targetEmpresaId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Sua conta não possui empresa ativa vinculada.",
    });
  }

  if (!accessible.includes(targetEmpresaId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem acesso à empresa selecionada.",
    });
  }

  return targetEmpresaId;
}

export async function resolveRoleCodeForCompany(user: User, empresaId: number): Promise<string> {
  if (user.role === "master_admin") {
    return "master_admin";
  }

  const summary = await getAccessibleCompanySummary(user);
  const match = summary.find(item => item.empresaId === empresaId);
  return normalizeRoleCode(user, match?.roleCode);
}

export async function getPermissionsForModule(
  user: User,
  empresaId: number,
  moduleName: string
): Promise<PermissionFlags> {
  if (user.role === "master_admin") {
    return { ...FULL_ACCESS };
  }

  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  }

  const [userPermission] = await db
    .select({
      podeVer: userPermissoes.podeVer,
      podeCriar: userPermissoes.podeCriar,
      podeEditar: userPermissoes.podeEditar,
      podeDeletar: userPermissoes.podeDeletar,
      podeExportar: userPermissoes.podeExportar,
    })
    .from(userPermissoes)
    .where(
      and(
        eq(userPermissoes.userId, user.id),
        eq(userPermissoes.empresaId, empresaId),
        eq(userPermissoes.modulo, moduleName)
      )
    )
    .limit(1);

  if (userPermission) {
    return userPermission;
  }

  const roleCode = await resolveRoleCodeForCompany(user, empresaId);
  const [rolePermission] = await db
    .select({
      podeVer: moduloPermissoes.podeVer,
      podeCriar: moduloPermissoes.podeCriar,
      podeEditar: moduloPermissoes.podeEditar,
      podeDeletar: moduloPermissoes.podeDeletar,
      podeExportar: moduloPermissoes.podeExportar,
    })
    .from(moduloPermissoes)
    .where(
      and(
        eq(moduloPermissoes.empresaId, empresaId),
        eq(moduloPermissoes.roleCode, roleCode),
        eq(moduloPermissoes.modulo, moduleName)
      )
    )
    .limit(1)
    .catch(() => []);

  if (rolePermission) {
    return rolePermission;
  }

  return DEFAULT_ROLE_PERMISSIONS[roleCode]?.[moduleName] ??
    DEFAULT_ROLE_PERMISSIONS[normalizeRoleCode(user)]?.[moduleName] ??
    emptyPermissions();
}

export async function requireModulePermission(
  ctx: TrpcContext,
  moduleName: string,
  action: AccessAction,
  requestedEmpresaId?: number | null
): Promise<number> {
  const empresaId = await resolveAccessibleEmpresaId(ctx, requestedEmpresaId);
  const permission = await getPermissionsForModule(ctx.user!, empresaId, moduleName);
  const allowed =
    action === "ver" ? permission.podeVer :
    action === "criar" ? permission.podeCriar :
    action === "editar" ? permission.podeEditar :
    action === "deletar" ? permission.podeDeletar :
    permission.podeExportar;

  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para executar esta ação nesta empresa.",
    });
  }

  return empresaId;
}

export function sanitizeModuleName(moduleName: string): string {
  return MODULE_SET.has(moduleName) ? moduleName : "dashboard";
}

export async function ensurePrimaryCompanyAccess(params: {
  userId: number;
  empresaId: number;
  roleCode?: string | null;
  createdBy?: number | null;
}) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  }

  const existing = await db
    .select({ id: userCompanyAccess.id })
    .from(userCompanyAccess)
    .where(
      and(
        eq(userCompanyAccess.userId, params.userId),
        eq(userCompanyAccess.empresaId, params.empresaId),
        isNull(userCompanyAccess.deletedAt)
      )
    )
    .limit(1);

  const roleCode = params.roleCode?.trim() || "leitor";
  if (existing.length > 0) {
    await db
      .update(userCompanyAccess)
      .set({
        roleCode,
        ativo: true,
        isDefault: true,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        updatedAt: new Date(),
      })
      .where(eq(userCompanyAccess.id, existing[0].id));
    return;
  }

  await db.insert(userCompanyAccess).values({
    userId: params.userId,
    empresaId: params.empresaId,
    roleCode,
    canViewGroup: false,
    isDefault: true,
    ativo: true,
    createdBy: params.createdBy ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
