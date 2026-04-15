import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { moduloPermissoes, userPermissoes } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const MODULOS = [
  "dashboard", "frota", "viagens", "funcionarios", "financeiro", "wms",
  "recepcionista", "logistica", "crm", "vendas", "auditoria", "bi", "ti",
  "ponto", "conferencia", "integracoes", "chat", "ia", "empresas", "usuarios",
];

export const permissoesRouter = router({
  // Listar permissões por role
  listByRole: protectedProcedure.input(z.object({ role: z.string() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.select().from(moduloPermissoes).where(and(
      eq(moduloPermissoes.empresaId, ctx.user.empresaId!),
      eq(moduloPermissoes.role, input.role as any),
    ));
  }),

  // Salvar permissões por role
  saveByRole: protectedProcedure.input(z.object({
    role: z.string(),
    permissoes: z.array(z.object({
      modulo: z.string(), podeVer: z.boolean(), podeCriar: z.boolean(),
      podeEditar: z.boolean(), podeDeletar: z.boolean(), podeExportar: z.boolean(),
    })),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN" });
    const empresaId = ctx.user.empresaId!;
    // Deletar permissões antigas
    await db.delete(moduloPermissoes).where(and(eq(moduloPermissoes.empresaId, empresaId), eq(moduloPermissoes.role, input.role as any)));
    // Inserir novas
    for (const p of input.permissoes) {
      await db.insert(moduloPermissoes).values({ ...p, empresaId, role: input.role as any });
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
    // Master admin tem acesso a tudo
    if (ctx.user.role === "master_admin") {
      return MODULOS.map(m => ({ modulo: m, podeVer: true, podeCriar: true, podeEditar: true, podeDeletar: true, podeExportar: true }));
    }
    // Verificar permissões individuais primeiro
    const userPerms = await db.select().from(userPermissoes).where(and(
      eq(userPermissoes.empresaId, ctx.user.empresaId!),
      eq(userPermissoes.userId, ctx.user.id),
    ));
    if (userPerms.length > 0) return userPerms;
    // Senão, usar permissões da role
    const rolePerms = await db.select().from(moduloPermissoes).where(and(
      eq(moduloPermissoes.empresaId, ctx.user.empresaId!),
      eq(moduloPermissoes.role, ctx.user.role as any),
    ));
    if (rolePerms.length > 0) return rolePerms;
    // Default: acesso total para admin, limitado para outros
    if (ctx.user.role === "admin") {
      return MODULOS.map(m => ({ modulo: m, podeVer: true, podeCriar: true, podeEditar: true, podeDeletar: true, podeExportar: true }));
    }
    // Usuário comum: ver tudo, criar em alguns
    return MODULOS.map(m => ({ modulo: m, podeVer: true, podeCriar: true, podeEditar: false, podeDeletar: false, podeExportar: false }));
  }),

  // Lista de módulos disponíveis
  modulos: protectedProcedure.query(async () => {
    return MODULOS.map(m => ({
      id: m,
      nome: {
        dashboard: "Dashboard", frota: "Frota", viagens: "Viagens", funcionarios: "RH / Funcionários",
        financeiro: "Financeiro", wms: "WMS / Estoque", recepcionista: "Recepcionista",
        logistica: "Logística / SAC", crm: "CRM", vendas: "Vendas", auditoria: "Auditoria",
        bi: "BI / Inteligência", ti: "TI / Suporte", ponto: "Ponto Eletrônico",
        conferencia: "Conferência de Veículos", integracoes: "Integrações", chat: "Chat",
        ia: "IA / Agentes", empresas: "Empresas", usuarios: "Usuários",
      }[m] || m,
    }));
  }),
});
