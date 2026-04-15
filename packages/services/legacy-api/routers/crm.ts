import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { clientes, leads, contatosCrm, funis, etapasFunil, negociacoes, atividadesFunil } from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const crmRouter = router({
  // ─── CLIENTES ──────────────────────────────────────────────────────────────
  listClientes: protectedProcedure.input(z.object({ search: z.string().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(clientes.empresaId, ctx.user.empresaId!), isNull(clientes.deletedAt)];
    if (input.search) conds.push(or(ilike(clientes.nome, `%${input.search}%`), ilike(clientes.cnpjCpf, `%${input.search}%`))!);
    return db.select().from(clientes).where(and(...conds)).orderBy(desc(clientes.createdAt));
  }),
  createCliente: protectedProcedure.input(z.object({
    nome: z.string().min(2), cnpjCpf: z.string().optional(), email: z.string().optional(),
    telefone: z.string().optional(), endereco: z.string().optional(), cidade: z.string().optional(),
    estado: z.string().optional(), segmento: z.string().optional(), observacoes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [c] = await db.insert(clientes).values({ ...input, empresaId: ctx.user.empresaId!, createdBy: ctx.user.id }).returning();
    return c;
  }),
  updateCliente: protectedProcedure.input(z.object({
    id: z.number(), nome: z.string().optional(), cnpjCpf: z.string().optional(), email: z.string().optional(),
    telefone: z.string().optional(), endereco: z.string().optional(), cidade: z.string().optional(),
    estado: z.string().optional(), segmento: z.string().optional(), observacoes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { id, ...data } = input;
    await db.update(clientes).set({ ...data, updatedAt: new Date() }).where(and(eq(clientes.id, id), eq(clientes.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // ─── LEADS ─────────────────────────────────────────────────────────────────
  listLeads: protectedProcedure.input(z.object({ status: z.string().optional(), search: z.string().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(leads.empresaId, ctx.user.empresaId!), isNull(leads.deletedAt)];
    if (input.status && input.status !== "todos") conds.push(eq(leads.status, input.status as any));
    if (input.search) conds.push(or(ilike(leads.nome, `%${input.search}%`), ilike(leads.empresa, `%${input.search}%`))!);
    return db.select().from(leads).where(and(...conds)).orderBy(desc(leads.createdAt));
  }),
  createLead: protectedProcedure.input(z.object({
    nome: z.string().min(2), email: z.string().optional(), telefone: z.string().optional(),
    empresa: z.string().optional(), origem: z.string().optional(), valorEstimado: z.string().optional(),
    observacoes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [l] = await db.insert(leads).values({ ...input, empresaId: ctx.user.empresaId!, createdBy: ctx.user.id }).returning();
    return l;
  }),
  updateLeadStatus: protectedProcedure.input(z.object({
    id: z.number(), status: z.enum(["novo", "qualificado", "em_negociacao", "proposta_enviada", "ganho", "perdido"]),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(leads).set({ status: input.status, updatedAt: new Date() }).where(and(eq(leads.id, input.id), eq(leads.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // ─── CONTATOS ──────────────────────────────────────────────────────────────
  listContatos: protectedProcedure.input(z.object({ clienteId: z.number().optional(), leadId: z.number().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(contatosCrm.empresaId, ctx.user.empresaId!)];
    if (input.clienteId) conds.push(eq(contatosCrm.clienteId, input.clienteId));
    if (input.leadId) conds.push(eq(contatosCrm.leadId, input.leadId));
    return db.select().from(contatosCrm).where(and(...conds)).orderBy(desc(contatosCrm.createdAt));
  }),
  createContato: protectedProcedure.input(z.object({
    clienteId: z.number().optional(), leadId: z.number().optional(),
    tipo: z.string(), descricao: z.string(), resultado: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [c] = await db.insert(contatosCrm).values({ ...input, empresaId: ctx.user.empresaId!, userId: ctx.user.id }).returning();
    return c;
  }),

  // ─── FUNIL DE VENDAS (Kanban) ──────────────────────────────────────────────
  listFunis: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(funis).where(eq(funis.empresaId, ctx.user.empresaId!)).orderBy(desc(funis.createdAt));
  }),
  createFunil: protectedProcedure.input(z.object({ nome: z.string().min(2), descricao: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [f] = await db.insert(funis).values({ ...input, empresaId, createdBy: ctx.user.id }).returning();
    // Criar etapas padrão
    const etapas = ["Prospecção", "Qualificação", "Proposta", "Negociação", "Fechamento"];
    for (let i = 0; i < etapas.length; i++) {
      await db.insert(etapasFunil).values({ funilId: f.id, empresaId, nome: etapas[i], posicao: i, cor: ["#3b82f6","#8b5cf6","#f59e0b","#ef4444","#22c55e"][i] });
    }
    return f;
  }),
  getFunilCompleto: protectedProcedure.input(z.object({ funilId: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const etapas = await db.select().from(etapasFunil).where(and(eq(etapasFunil.funilId, input.funilId), eq(etapasFunil.empresaId, empresaId))).orderBy(etapasFunil.posicao);
    const negs = await db.select().from(negociacoes).where(and(eq(negociacoes.funilId, input.funilId), eq(negociacoes.empresaId, empresaId), isNull(negociacoes.deletedAt))).orderBy(desc(negociacoes.updatedAt));
    return { etapas, negociacoes: negs };
  }),
  createNegociacao: protectedProcedure.input(z.object({
    funilId: z.number(), etapaId: z.number(), titulo: z.string().min(2),
    valor: z.string().optional(), clienteId: z.number().optional(), leadId: z.number().optional(),
    probabilidade: z.number().optional(), previsaoFechamento: z.date().optional(), observacoes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [n] = await db.insert(negociacoes).values({ ...input, empresaId: ctx.user.empresaId!, responsavelId: ctx.user.id, createdBy: ctx.user.id }).returning();
    return n;
  }),
  moveNegociacao: protectedProcedure.input(z.object({ id: z.number(), etapaId: z.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(negociacoes).set({ etapaId: input.etapaId, updatedAt: new Date() }).where(and(eq(negociacoes.id, input.id), eq(negociacoes.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // ─── DASHBOARD CRM ─────────────────────────────────────────────────────────
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [clienteStats] = await db.select({ total: sql<number>`count(*)` }).from(clientes).where(and(eq(clientes.empresaId, empresaId), isNull(clientes.deletedAt)));
    const [leadStats] = await db.select({
      total: sql<number>`count(*)`,
      novos: sql<number>`count(*) filter (where status = 'novo')`,
      ganhos: sql<number>`count(*) filter (where status = 'ganho')`,
    }).from(leads).where(and(eq(leads.empresaId, empresaId), isNull(leads.deletedAt)));
    const [negStats] = await db.select({
      total: sql<number>`count(*)`,
      valorTotal: sql<string>`coalesce(sum(valor::numeric), 0)::text`,
    }).from(negociacoes).where(and(eq(negociacoes.empresaId, empresaId), isNull(negociacoes.deletedAt)));
    return { clientes: clienteStats, leads: leadStats, negociacoes: negStats };
  }),
});
