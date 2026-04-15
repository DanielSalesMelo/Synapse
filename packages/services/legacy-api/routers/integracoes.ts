import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { integracoes, logIntegracoes, winthorSync } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const integracoesRouter = router({
  // Listar integrações
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(integracoes).where(eq(integracoes.empresaId, ctx.user.empresaId!)).orderBy(desc(integracoes.createdAt));
  }),

  // Criar integração
  create: protectedProcedure.input(z.object({
    tipo: z.enum(["whatsapp", "winthor", "webhook", "api_externa"]),
    nome: z.string().min(2), config: z.string().optional(),
    webhookUrl: z.string().optional(), webhookSecret: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem criar integrações" });
    const [i] = await db.insert(integracoes).values({
      ...input, empresaId: ctx.user.empresaId!, createdBy: ctx.user.id,
    }).returning();
    return i;
  }),

  // Atualizar status
  updateStatus: protectedProcedure.input(z.object({
    id: z.number(), status: z.enum(["ativa", "inativa", "erro", "configurando"]),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(integracoes).set({ status: input.status, updatedAt: new Date() }).where(and(eq(integracoes.id, input.id), eq(integracoes.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // Logs de integração
  getLogs: protectedProcedure.input(z.object({
    integracaoId: z.number(), page: z.number().default(1), limit: z.number().default(50),
  })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const offset = (input.page - 1) * input.limit;
    return db.select().from(logIntegracoes).where(and(
      eq(logIntegracoes.integracaoId, input.integracaoId),
      eq(logIntegracoes.empresaId, ctx.user.empresaId!),
    )).orderBy(desc(logIntegracoes.createdAt)).limit(input.limit).offset(offset);
  }),

  // Winthor sync config
  getWinthorSync: protectedProcedure.input(z.object({ integracaoId: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(winthorSync).where(and(
      eq(winthorSync.integracaoId, input.integracaoId),
      eq(winthorSync.empresaId, ctx.user.empresaId!),
    ));
  }),

  // Configurar sync Winthor
  createWinthorSync: protectedProcedure.input(z.object({
    integracaoId: z.number(), tabelaOrigem: z.string(), tabelaDestino: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [s] = await db.insert(winthorSync).values({ ...input, empresaId: ctx.user.empresaId! }).returning();
    return s;
  }),

  // Templates de integração disponíveis
  templates: protectedProcedure.query(async () => {
    return [
      { tipo: "whatsapp", nome: "WhatsApp Business API", descricao: "Envie e receba mensagens via WhatsApp. Integração com Evolution API ou API oficial Meta.", campos: ["apiUrl", "apiKey", "instanceName"] },
      { tipo: "winthor", nome: "TOTVS Winthor", descricao: "Sincronize produtos, clientes, notas fiscais e estoque com o Winthor (TOTVS).", campos: ["host", "port", "database", "user", "password", "schema"] },
      { tipo: "webhook", nome: "Webhook Genérico", descricao: "Receba notificações de sistemas externos via webhook HTTP.", campos: ["webhookUrl", "webhookSecret"] },
      { tipo: "api_externa", nome: "API Externa", descricao: "Conecte-se a qualquer API REST externa.", campos: ["baseUrl", "apiKey", "headers"] },
    ];
  }),
});
