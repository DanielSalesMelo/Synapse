import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { integracoes, logIntegracoes, winthorSync } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { resolveAccessibleEmpresaId } from "../_core/access";

const integrationTypeSchema = z.enum([
  "whatsapp",
  "telegram",
  "instagram",
  "serasa",
  "gmail",
  "google_calendar",
  "google_drive",
  "meta_ads",
  "google_ads",
  "anydesk",
  "evolution_api",
  "winthor",
  "webhook",
  "api_externa",
  "arquivei",
  "controle_de_ponto",
  "ponto_mobile",
  "ofx_cnab",
  "bancos_pix_boletos",
  "nfe",
  "cte",
  "mdfe",
  "sefaz_xml",
  "slack",
  "teams",
  "google_business_profile",
  "google_maps",
  "mercadopago",
  "asaas",
  "clicksign",
  "intelbras_pabx",
]);
const integrationStatusSchema = z.enum(["ativa", "inativa", "erro", "configurando"]);

export const integracoesRouter = router({
  // Listar integrações
  list: protectedProcedure.input(z.object({ empresaId: z.number().optional() }).optional()).query(async ({ ctx, input }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input?.empresaId);
    return db.select().from(integracoes).where(eq(integracoes.empresaId, empresaId)).orderBy(desc(integracoes.createdAt));
  }),

  getByTipo: protectedProcedure.input(z.object({ empresaId: z.number(), tipo: integrationTypeSchema })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
    const [registro] = await db.select().from(integracoes).where(and(
      eq(integracoes.empresaId, empresaId),
      eq(integracoes.tipo, input.tipo)
    )).orderBy(desc(integracoes.createdAt)).limit(1);
    return registro ?? null;
  }),

  // Criar integração
  create: protectedProcedure.input(z.object({
    empresaId: z.number().optional(),
    tipo: integrationTypeSchema,
    nome: z.string().min(2), config: z.string().optional(),
    webhookUrl: z.string().optional(), webhookSecret: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem criar integrações" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
    const [i] = await db.insert(integracoes).values({
      ...input, empresaId, createdBy: ctx.user.id,
    }).returning();
    return i;
  }),

  upsert: protectedProcedure.input(z.object({
    empresaId: z.number(),
    tipo: integrationTypeSchema,
    nome: z.string().min(2),
    status: integrationStatusSchema.default("configurando"),
    config: z.string().optional(),
    webhookUrl: z.string().optional(),
    webhookSecret: z.string().optional(),
    erroUltimo: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem configurar integrações" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
    const [existing] = await db.select().from(integracoes).where(and(
      eq(integracoes.empresaId, empresaId),
      eq(integracoes.tipo, input.tipo)
    )).orderBy(desc(integracoes.createdAt)).limit(1);

    if (existing) {
      const [updated] = await db.update(integracoes).set({
        nome: input.nome,
        status: input.status,
        config: input.config,
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret,
        erroUltimo: input.erroUltimo ?? null,
        ativo: input.status !== "inativa",
        updatedAt: new Date(),
      }).where(eq(integracoes.id, existing.id)).returning();
      return updated;
    }

    const [created] = await db.insert(integracoes).values({
      empresaId,
      tipo: input.tipo,
      nome: input.nome,
      status: input.status,
      config: input.config,
      webhookUrl: input.webhookUrl,
      webhookSecret: input.webhookSecret,
      erroUltimo: input.erroUltimo ?? null,
      ativo: input.status !== "inativa",
      createdBy: ctx.user.id,
    }).returning();
    return created;
  }),

  // Atualizar status
  updateStatus: protectedProcedure.input(z.object({
    id: z.number(), status: integrationStatusSchema,
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.role === "master_admin" ? undefined : ctx.user.empresaId!;
    await db.update(integracoes).set({ status: input.status, ativo: input.status !== "inativa", updatedAt: new Date() }).where(and(eq(integracoes.id, input.id), empresaId ? eq(integracoes.empresaId, empresaId) : undefined));
    return { success: true };
  }),

  // Logs de integração
  getLogs: protectedProcedure.input(z.object({
    integracaoId: z.number(), empresaId: z.number().optional(), page: z.number().default(1), limit: z.number().default(50),
  })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const offset = (input.page - 1) * input.limit;
    const empresaId = input.empresaId ? await resolveAccessibleEmpresaId(ctx, input.empresaId) : (ctx.user.role === "master_admin" ? undefined : ctx.user.empresaId!);
    return db.select().from(logIntegracoes).where(and(
      eq(logIntegracoes.integracaoId, input.integracaoId),
      empresaId ? eq(logIntegracoes.empresaId, empresaId) : undefined,
    )).orderBy(desc(logIntegracoes.createdAt)).limit(input.limit).offset(offset);
  }),

  addLog: protectedProcedure.input(z.object({
    empresaId: z.number(),
    integracaoId: z.number(),
    direcao: z.enum(["entrada", "saida"]),
    endpoint: z.string().optional(),
    payload: z.string().optional(),
    resposta: z.string().optional(),
    statusCode: z.number().optional(),
    sucesso: z.boolean().default(true),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
    const [registro] = await db.insert(logIntegracoes).values({
      integracaoId: input.integracaoId,
      empresaId,
      direcao: input.direcao,
      endpoint: input.endpoint,
      payload: input.payload,
      resposta: input.resposta,
      statusCode: input.statusCode,
      sucesso: input.sucesso,
    }).returning();
    return registro;
  }),

  // Winthor sync config
  getWinthorSync: protectedProcedure.input(z.object({ integracaoId: z.number(), empresaId: z.number().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = input.empresaId ? await resolveAccessibleEmpresaId(ctx, input.empresaId) : (ctx.user.role === "master_admin" ? undefined : ctx.user.empresaId!);
    return db.select().from(winthorSync).where(and(
      eq(winthorSync.integracaoId, input.integracaoId),
      empresaId ? eq(winthorSync.empresaId, empresaId) : undefined,
    ));
  }),

  // Configurar sync Winthor
  createWinthorSync: protectedProcedure.input(z.object({
    empresaId: z.number().optional(), integracaoId: z.number(), tabelaOrigem: z.string(), tabelaDestino: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
    const [s] = await db.insert(winthorSync).values({ ...input, empresaId }).returning();
    return s;
  }),

  // Templates de integração disponíveis
  templates: protectedProcedure.query(async () => {
    return [
      { tipo: "whatsapp", nome: "WhatsApp Business API", descricao: "Envie e receba mensagens via WhatsApp. Integração com Evolution API ou API oficial Meta.", campos: ["apiUrl", "apiKey", "instanceName"] },
      { tipo: "telegram", nome: "Telegram Bot", descricao: "Receba alertas, tickets e mensagens operacionais pelo Telegram.", campos: ["botToken", "chatIdPadrao"] },
      { tipo: "instagram", nome: "Instagram DM", descricao: "Centralize mensagens do Instagram para comercial e atendimento.", campos: ["appId", "appSecret", "paginaId"] },
      { tipo: "serasa", nome: "Serasa / Crédito", descricao: "Base para consultas e validações financeiras em cobranças e cadastros.", campos: ["clientId", "clientSecret", "ambiente"] },
      { tipo: "gmail", nome: "Gmail", descricao: "Sincronize caixa de entrada, cobranças, propostas e notificações por e-mail.", campos: ["clientId", "clientSecret", "refreshToken"] },
      { tipo: "google_calendar", nome: "Google Calendar", descricao: "Integre agenda, compromissos, follow-ups e tarefas do Synapse.", campos: ["clientId", "clientSecret", "calendarId"] },
      { tipo: "google_drive", nome: "Google Drive", descricao: "Armazene anexos, documentos e relatórios compartilhados por equipe.", campos: ["clientId", "clientSecret", "folderId"] },
      { tipo: "meta_ads", nome: "Meta Ads", descricao: "Puxe resultados, campanhas e revisão de mídia para clientes e marketing.", campos: ["appId", "appSecret", "adAccountId"] },
      { tipo: "google_ads", nome: "Google Ads", descricao: "Consolide campanhas e custos com foco em performance comercial.", campos: ["developerToken", "clientId", "clientSecret", "customerId"] },
      { tipo: "anydesk", nome: "AnyDesk", descricao: "Estruture consentimento, identificação e operação remota da equipe de TI.", campos: ["aliasPadrao", "clientePadrao", "observacoesOperacionais"] },
      { tipo: "evolution_api", nome: "Evolution API", descricao: "Camada de mensageria para WhatsApp omnichannel, bots e notificações.", campos: ["apiUrl", "apiKey", "instanceName"] },
      { tipo: "winthor", nome: "TOTVS Winthor", descricao: "Sincronize produtos, clientes, notas fiscais e estoque com o Winthor (TOTVS).", campos: ["host", "port", "database", "user", "password", "schema"] },
      { tipo: "webhook", nome: "Webhook Genérico", descricao: "Receba notificações de sistemas externos via webhook HTTP.", campos: ["webhookUrl", "webhookSecret"] },
      { tipo: "api_externa", nome: "API Externa", descricao: "Conecte-se a qualquer API REST externa.", campos: ["baseUrl", "apiKey", "headers"] },
      { tipo: "arquivei", nome: "Arquivei / Qive", descricao: "Consulta e download de XML e DANFE por chave de acesso.", campos: ["appId", "apiKey"] },
      { tipo: "controle_de_ponto", nome: "Controle de Ponto", descricao: "Integre marcações de ponto para RH, escalas e jornada.", campos: ["provider", "clientId", "clientSecret", "companyCode"] },
      { tipo: "ponto_mobile", nome: "Ponto Mobile", descricao: "Registro de ponto por aplicativo móvel com geolocalização.", campos: ["apiUrl", "apiKey", "tenantCode"] },
      { tipo: "ofx_cnab", nome: "OFX / CNAB", descricao: "Importe extratos bancários e arquivos de retorno para conciliação.", campos: ["bankCode", "layout", "folderPath"] },
      { tipo: "bancos_pix_boletos", nome: "PIX / Boletos", descricao: "Geração e baixa de PIX e boletos para cobranças.", campos: ["gateway", "clientId", "clientSecret", "webhookSecret"] },
      { tipo: "nfe", nome: "NF-e", descricao: "Emissão e acompanhamento de notas fiscais eletrônicas.", campos: ["cnpj", "certificateRef", "issuerApiUrl"] },
      { tipo: "cte", nome: "CT-e", descricao: "Fluxo de emissão e consulta de CT-e para operação logística.", campos: ["cnpj", "certificateRef", "issuerApiUrl"] },
      { tipo: "mdfe", nome: "MDF-e", descricao: "Manifestos eletrônicos para viagens e cargas.", campos: ["cnpj", "certificateRef", "issuerApiUrl"] },
      { tipo: "sefaz_xml", nome: "SEFAZ / XML", descricao: "Captura e processamento de XML fiscais.", campos: ["uf", "certificateRef", "schemaVersion"] },
      { tipo: "slack", nome: "Slack", descricao: "Alertas, suporte e automações internas pelo Slack.", campos: ["botToken", "signingSecret", "channelId"] },
      { tipo: "teams", nome: "Microsoft Teams", descricao: "Alertas, reuniões e suporte interno pelo Teams.", campos: ["tenantId", "clientId", "clientSecret"] },
      { tipo: "google_business_profile", nome: "Google Business Profile", descricao: "Sincronize perfis, avaliações e atualizações do Google Meu Negócio.", campos: ["clientId", "clientSecret", "locationId"] },
      { tipo: "google_maps", nome: "Google Maps", descricao: "Mapas, rotas, distância e geocodificação para logística e simulação.", campos: ["apiKey", "mapId"] },
      { tipo: "mercadopago", nome: "Mercado Pago", descricao: "Cobrança, links de pagamento e recebimentos.", campos: ["accessToken", "publicKey", "webhookSecret"] },
      { tipo: "asaas", nome: "Asaas", descricao: "Cobranças recorrentes, PIX e boletos integrados ao financeiro.", campos: ["apiKey", "walletId", "webhookSecret"] },
      { tipo: "clicksign", nome: "Clicksign", descricao: "Assinatura eletrônica para contratos e documentos.", campos: ["apiKey", "sandbox", "folderId"] },
      { tipo: "intelbras_pabx", nome: "Intelbras PABX", descricao: "Integração de telefonia corporativa para atendimento e registros de chamadas.", campos: ["apiUrl", "token", "ramalPadrao", "filaAtendimento"] },
    ];
  }),
});
