import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { moduloPermissoes, userPermissoes } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  ACCESS_MODULES,
  COMPANY_ROLE_CODES,
  getPermissionsForModule,
  resolveAccessibleEmpresaId,
  resolveRoleCodeForCompany,
} from "../_core/access";

const MODULOS = [...ACCESS_MODULES];

export const permissoesRouter = router({
  // Listar permissões por role
  listByRole: protectedProcedure.input(z.object({ roleCode: z.enum(COMPANY_ROLE_CODES), empresaId: z.number().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId ?? ctx.user.empresaId ?? undefined);
    return db.select().from(moduloPermissoes).where(and(
      eq(moduloPermissoes.empresaId, empresaId),
      eq(moduloPermissoes.roleCode, input.roleCode),
    ));
  }),

  // Salvar permissões por role
  saveByRole: protectedProcedure.input(z.object({
    roleCode: z.enum(COMPANY_ROLE_CODES),
    empresaId: z.number().optional(),
    permissoes: z.array(z.object({
      modulo: z.string(), podeVer: z.boolean(), podeCriar: z.boolean(),
      podeEditar: z.boolean(), podeDeletar: z.boolean(), podeExportar: z.boolean(),
    })),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId ?? ctx.user.empresaId ?? undefined);
    // Deletar permissões antigas
    await db.delete(moduloPermissoes).where(and(eq(moduloPermissoes.empresaId, empresaId), eq(moduloPermissoes.roleCode, input.roleCode)));
    // Inserir novas
    for (const p of input.permissoes) {
      await db.insert(moduloPermissoes).values({ ...p, empresaId, roleCode: input.roleCode });
    }
    return { success: true };
  }),

  // Listar permissões de um usuário específico
  listByUser: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.select().from(userPermissoes).where(and(
      eq(userPermissoes.empresaId, ctx.user.empresaId!),
      eq(userPermissoes.userId, input.userId),
    ));
  }),

  // Salvar permissões de um usuário específico
  saveByUser: protectedProcedure.input(z.object({
    userId: z.number(),
    permissoes: z.array(z.object({
      modulo: z.string(), podeVer: z.boolean(), podeCriar: z.boolean(),
      podeEditar: z.boolean(), podeDeletar: z.boolean(), podeExportar: z.boolean(),
    })),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN" });
    const empresaId = ctx.user.empresaId!;
    await db.delete(userPermissoes).where(and(eq(userPermissoes.empresaId, empresaId), eq(userPermissoes.userId, input.userId)));
    for (const p of input.permissoes) {
      await db.insert(userPermissoes).values({ ...p, empresaId, userId: input.userId });
    }
    return { success: true };
  }),

  // Obter minhas permissões (para o frontend renderizar o menu)
  minhasPermissoes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, ctx.user.empresaId ?? undefined);
    const roleCode = await resolveRoleCodeForCompany(ctx.user, empresaId);
    const rows = await Promise.all(
      MODULOS.map(async modulo => ({
        modulo,
        ...(await getPermissionsForModule(ctx.user, empresaId, modulo)),
      }))
    );

    return {
      empresaId,
      roleCode,
      permissoes: rows,
    };
  }),

  // Lista de módulos disponíveis
  modulos: protectedProcedure.query(async () => {
    return MODULOS.map(m => ({
      id: m,
      nome: {
        dashboard: "Painel", frota: "Frota", viagens: "Viagens", funcionarios: "RH / Funcionários",
        financeiro: "Financeiro", wms: "WMS / Estoque", recepcionista: "Recepcionista",
        logistica: "Logística / SAC", crm: "CRM", vendas: "Vendas", auditoria: "Auditoria",
        bi: "BI / Inteligência", ti: "TI / Suporte", ponto: "Ponto Eletrônico",
        conferencia: "Conferência de Veículos", integracoes: "Integrações", chat: "Chat",
        ia: "IA / Agentes", empresas: "Empresas", usuarios: "Usuários",
      }[m] || m,
    }));
  }),
});
