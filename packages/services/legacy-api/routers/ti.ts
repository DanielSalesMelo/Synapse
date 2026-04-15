import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { ticketsTi, ativosTi } from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const tiRouter = router({
  // ─── TICKETS ───────────────────────────────────────────────────────────────
  listTickets: protectedProcedure.input(z.object({ status: z.string().optional(), search: z.string().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(ticketsTi.empresaId, ctx.user.empresaId!), isNull(ticketsTi.deletedAt)];
    if (input.status && input.status !== "todos") conds.push(eq(ticketsTi.status, input.status as any));
    if (input.search) conds.push(or(ilike(ticketsTi.titulo, `%${input.search}%`), ilike(ticketsTi.protocolo, `%${input.search}%`))!);
    return db.select().from(ticketsTi).where(and(...conds)).orderBy(desc(ticketsTi.createdAt));
  }),
  createTicket: protectedProcedure.input(z.object({
    titulo: z.string().min(2), descricao: z.string().min(5),
    categoria: z.enum(["hardware", "software", "rede", "acesso", "email", "impressora", "outro"]).optional(),
    prioridade: z.enum(["baixa", "media", "alta", "critica"]).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const protocolo = `TI-${Date.now().toString(36).toUpperCase()}`;
    const [t] = await db.insert(ticketsTi).values({
      ...input, protocolo, empresaId: ctx.user.empresaId!, solicitanteId: ctx.user.id,
      categoria: input.categoria || "outro", prioridade: input.prioridade || "media",
    }).returning();
    return t;
  }),
  updateTicketStatus: protectedProcedure.input(z.object({
    id: z.number(), status: z.enum(["aberto", "em_andamento", "aguardando", "resolvido", "fechado"]),
    resolucao: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const data: any = { status: input.status, updatedAt: new Date() };
    if (input.resolucao) data.resolucao = input.resolucao;
    if (input.status === "resolvido" || input.status === "fechado") data.resolvidoEm = new Date();
    await db.update(ticketsTi).set(data).where(and(eq(ticketsTi.id, input.id), eq(ticketsTi.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // ─── ATIVOS ────────────────────────────────────────────────────────────────
  listAtivos: protectedProcedure.input(z.object({ search: z.string().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(ativosTi.empresaId, ctx.user.empresaId!), isNull(ativosTi.deletedAt)];
    if (input.search) conds.push(or(ilike(ativosTi.tipo, `%${input.search}%`), ilike(ativosTi.patrimonio, `%${input.search}%`), ilike(ativosTi.marca, `%${input.search}%`))!);
    return db.select().from(ativosTi).where(and(...conds)).orderBy(desc(ativosTi.createdAt));
  }),
  createAtivo: protectedProcedure.input(z.object({
    tipo: z.string().min(2), marca: z.string().optional(), modelo: z.string().optional(),
    patrimonio: z.string().optional(), serial: z.string().optional(),
    setor: z.string().optional(), observacoes: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [a] = await db.insert(ativosTi).values({ ...input, empresaId: ctx.user.empresaId! }).returning();
    return a;
  }),

  // ─── DASHBOARD TI ──────────────────────────────────────────────────────────
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [ticketStats] = await db.select({
      total: sql<number>`count(*)`,
      abertos: sql<number>`count(*) filter (where status = 'aberto')`,
      emAndamento: sql<number>`count(*) filter (where status = 'em_andamento')`,
      resolvidos: sql<number>`count(*) filter (where status = 'resolvido')`,
    }).from(ticketsTi).where(and(eq(ticketsTi.empresaId, empresaId), isNull(ticketsTi.deletedAt)));
    const [ativoStats] = await db.select({ total: sql<number>`count(*)` }).from(ativosTi).where(and(eq(ativosTi.empresaId, empresaId), isNull(ativosTi.deletedAt)));
    return { tickets: ticketStats, ativos: ativoStats };
  }),
});
