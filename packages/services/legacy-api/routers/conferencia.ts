import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { conferenciaVeiculos, fotosConferencia, itensConferencia } from "../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const conferenciaRouter = router({
  // Listar conferências
  list: protectedProcedure.input(z.object({ status: z.string().optional() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const conds: any[] = [eq(conferenciaVeiculos.empresaId, ctx.user.empresaId!)];
    if (input.status && input.status !== "todos") conds.push(eq(conferenciaVeiculos.status, input.status as any));
    return db.select().from(conferenciaVeiculos).where(and(...conds)).orderBy(desc(conferenciaVeiculos.createdAt));
  }),

  // Detalhes completos (com fotos e itens)
  getDetalhes: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [conf] = await db.select().from(conferenciaVeiculos).where(and(eq(conferenciaVeiculos.id, input.id), eq(conferenciaVeiculos.empresaId, ctx.user.empresaId!)));
    if (!conf) throw new TRPCError({ code: "NOT_FOUND" });
    const fotos = await db.select().from(fotosConferencia).where(eq(fotosConferencia.conferenciaId, input.id)).orderBy(fotosConferencia.createdAt);
    const itens = await db.select().from(itensConferencia).where(eq(itensConferencia.conferenciaId, input.id));
    return { ...conf, fotos, itens };
  }),

  // 1. REGISTRAR SAÍDA (despachante registra o veículo saindo)
  registrarSaida: protectedProcedure.input(z.object({
    veiculoId: z.number(), motoristaId: z.number().optional(), viagemId: z.number().optional(),
    kmSaida: z.string().optional(), observacoesSaida: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [c] = await db.insert(conferenciaVeiculos).values({
      ...input, empresaId: ctx.user.empresaId!, status: "saida_registrada",
      despachanteSaidaId: ctx.user.id, dataSaida: new Date(), createdBy: ctx.user.id,
    }).returning();
    // Criar itens de checklist padrão
    const itensChecklist = [
      "Nível de combustível", "Pneus (calibragem e estado)", "Luzes e faróis",
      "Freios", "Documentos do veículo", "Extintor de incêndio",
      "Triângulo de sinalização", "Estepe", "Limpeza geral",
      "Carroceria (avarias/batidas)", "Espelhos retrovisores", "Cinto de segurança",
    ];
    for (const item of itensChecklist) {
      await db.insert(itensConferencia).values({ conferenciaId: c.id, item });
    }
    return c;
  }),

  // 2. REGISTRAR RETORNO (despachante registra o veículo voltando)
  registrarRetorno: protectedProcedure.input(z.object({
    id: z.number(), kmRetorno: z.string().optional(), observacoesRetorno: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(conferenciaVeiculos).set({
      status: "retorno_registrado", despachanteRetornoId: ctx.user.id,
      dataRetorno: new Date(), kmRetorno: input.kmRetorno,
      observacoesRetorno: input.observacoesRetorno, updatedAt: new Date(),
    }).where(and(eq(conferenciaVeiculos.id, input.id), eq(conferenciaVeiculos.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // 3. REALIZAR CONFERÊNCIA (conferente verifica carga, avarias, batidas com fotos)
  realizarConferencia: protectedProcedure.input(z.object({
    id: z.number(),
    cargaOk: z.boolean(), cargaObservacoes: z.string().optional(),
    avariasEncontradas: z.boolean(), avariasDescricao: z.string().optional(),
    batidasEncontradas: z.boolean(), batidasDescricao: z.string().optional(),
    pneusOk: z.boolean(), pneusObservacoes: z.string().optional(),
    limpezaOk: z.boolean(), documentosOk: z.boolean(),
    nivelCombustivel: z.string().optional(),
    observacoesConferencia: z.string().optional(),
    itens: z.array(z.object({ id: z.number(), conforme: z.boolean(), observacao: z.string().optional() })).optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { id, itens, ...data } = input;
    await db.update(conferenciaVeiculos).set({
      ...data, status: "aguardando_motorista", conferenteId: ctx.user.id,
      dataConferencia: new Date(), updatedAt: new Date(),
    }).where(and(eq(conferenciaVeiculos.id, id), eq(conferenciaVeiculos.empresaId, ctx.user.empresaId!)));
    // Atualizar itens de checklist
    if (itens) {
      for (const item of itens) {
        await db.update(itensConferencia).set({ conforme: item.conforme, observacao: item.observacao }).where(eq(itensConferencia.id, item.id));
      }
    }
    return { success: true };
  }),

  // 4. CONFIRMAÇÃO DO MOTORISTA (motorista confirma ou contesta)
  confirmarMotorista: protectedProcedure.input(z.object({
    id: z.number(), confirma: z.boolean(), contestacao: z.string().optional(),
    assinatura: z.string().optional(),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(conferenciaVeiculos).set({
      status: input.confirma ? "finalizado" : "aguardando_motorista",
      motoristaConfirmou: input.confirma, motoristaConfirmouEm: new Date(),
      motoristaContestacao: input.contestacao, assinaturaMotorista: input.assinatura,
      updatedAt: new Date(),
    }).where(and(eq(conferenciaVeiculos.id, input.id), eq(conferenciaVeiculos.empresaId, ctx.user.empresaId!)));
    return { success: true };
  }),

  // Upload de foto
  addFoto: protectedProcedure.input(z.object({
    conferenciaId: z.number(), tipo: z.string(), descricao: z.string().optional(),
    url: z.string(), momento: z.enum(["saida", "retorno", "conferencia"]),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [f] = await db.insert(fotosConferencia).values({
      ...input, empresaId: ctx.user.empresaId!, uploadedBy: ctx.user.id,
    }).returning();
    return f;
  }),

  // Dashboard
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [stats] = await db.select({
      total: sql<number>`count(*)`,
      emViagem: sql<number>`count(*) filter (where status in ('saida_registrada', 'em_viagem'))`,
      aguardandoConferencia: sql<number>`count(*) filter (where status = 'retorno_registrado')`,
      aguardandoMotorista: sql<number>`count(*) filter (where status = 'aguardando_motorista')`,
      finalizados: sql<number>`count(*) filter (where status = 'finalizado')`,
      comAvarias: sql<number>`count(*) filter (where "avariasEncontradas" = true)`,
      comBatidas: sql<number>`count(*) filter (where "batidasEncontradas" = true)`,
    }).from(conferenciaVeiculos).where(eq(conferenciaVeiculos.empresaId, empresaId));
    return stats;
  }),
});
