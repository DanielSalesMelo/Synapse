import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { viagens, despesasViagem, funcionarios, veiculos } from "../drizzle/schema";
import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

// Apenas veículo é obrigatório para criar uma viagem — resto pode ser preenchido depois
const viagemInput = z.object({
  empresaId: z.number(),
  tipo: z.enum(["entrega", "viagem"]).optional(),
  veiculoId: z.number(),
  cavaloPrincipalId: z.number().nullable().optional(),
  motoristaId: z.number().nullable().optional(),
  ajudante1Id: z.number().nullable().optional(),
  ajudante2Id: z.number().nullable().optional(),
  ajudante3Id: z.number().nullable().optional(),
  origem: z.string().optional(),
  destino: z.string().optional(),
  dataSaida: z.string().nullable().optional(),
  dataChegada: z.string().nullable().optional(),
  kmSaida: z.number().nullable().optional(),
  kmChegada: z.number().nullable().optional(),
  kmRodado: z.number().nullable().optional(),
  descricaoCarga: z.string().optional(),
  pesoCarga: z.string().nullable().optional(),
  freteTotalIda: z.string().nullable().optional(),
  freteTotalVolta: z.string().nullable().optional(),
  freteTotal: z.string().nullable().optional(),
  adiantamento: z.string().nullable().optional(),
  saldoViagem: z.string().nullable().optional(),
  totalDespesas: z.string().nullable().optional(),
  mediaConsumo: z.string().nullable().optional(),
  status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]).optional(),
  observacoes: z.string().optional(),
  teveProblema: z.boolean().optional(),
  voltouComCarga: z.boolean().optional(),
  observacoesChegada: z.string().optional(),
  tipoCarga: z.string().optional(),
  notaFiscal: z.string().optional(),
});

export const viagensRouter = router({
  list: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]).optional(),
      tipo: z.enum(["entrega", "viagem"]).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.list");
        const rows = await db.select({
          id: viagens.id,
          tipo: viagens.tipo,
          status: viagens.status,
          origem: viagens.origem,
          destino: viagens.destino,
          dataSaida: viagens.dataSaida,
          dataChegada: viagens.dataChegada,
          kmSaida: viagens.kmSaida,
          kmChegada: viagens.kmChegada,
          kmRodado: viagens.kmRodado,
          tipoCarga: viagens.tipoCarga,
          teveProblema: viagens.teveProblema,
          voltouComCarga: viagens.voltouComCarga,
          freteTotal: viagens.freteTotal,
          totalDespesas: viagens.totalDespesas,
          saldoViagem: viagens.saldoViagem,
          adiantamento: viagens.adiantamento,
          pesoCarga: viagens.pesoCarga,
          descricaoCarga: viagens.descricaoCarga,
          notaFiscal: viagens.notaFiscal,
          createdAt: viagens.createdAt,
          motoristaNome: funcionarios.nome,
          veiculoPlaca: veiculos.placa,
          veiculoTipo: veiculos.tipo,
          veiculoCapacidade: veiculos.capacidadeCarga,
        }).from(viagens)
          .leftJoin(funcionarios, eq(viagens.motoristaId, funcionarios.id))
          .leftJoin(veiculos, eq(viagens.veiculoId, veiculos.id))
          .where(and(
            eq(viagens.empresaId, input.empresaId),
            isNull(viagens.deletedAt),
            input.status ? eq(viagens.status, input.status) : undefined,
            input.tipo ? eq(viagens.tipo, input.tipo) : undefined,
          ))
          .orderBy(desc(viagens.dataSaida))
          .limit(input.limit);
        return rows;
      }, "viagens.list");
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.getById");
        const rows = await db.select().from(viagens)
          .where(and(
            eq(viagens.id, input.id),
            isNull(viagens.deletedAt),
            ctx.user.role !== "master_admin" ? eq(viagens.empresaId, ctx.user.empresaId!) : undefined
          ))
          .limit(1);
        if (!rows[0]) return null;
        const despesas = await db.select().from(despesasViagem)
          .where(and(eq(despesasViagem.viagemId, input.id), isNull(despesasViagem.deletedAt)));
        return { ...rows[0], despesas };
      }, "viagens.getById");
    }),

  create: protectedProcedure
    .input(viagemInput)
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.create");
        const empresaId = ctx.user.role !== "master_admin" ? ctx.user.empresaId! : input.empresaId;
        const [result] = await db.insert(viagens).values({
          ...input,
          empresaId,
          pesoCarga: input.pesoCarga?.toString() ?? null,
          freteTotalIda: input.freteTotalIda?.toString() ?? null,
          freteTotalVolta: input.freteTotalVolta?.toString() ?? null,
          freteTotal: input.freteTotal?.toString() ?? null,
          adiantamento: input.adiantamento?.toString() ?? null,
          saldoViagem: input.saldoViagem?.toString() ?? null,
          totalDespesas: input.totalDespesas?.toString() ?? null,
          mediaConsumo: input.mediaConsumo?.toString() ?? null,
          dataSaida: input.dataSaida ? new Date(input.dataSaida).toISOString().split("T")[0] : null,
          dataChegada: input.dataChegada ? new Date(input.dataChegada).toISOString().split("T")[0] : null,
          status: input.status ?? "planejada",
        }).returning({ id: viagens.id });
        return { id: result.id };
      }, "viagens.create");
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(viagemInput.partial()))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.update");
        const { id, ...data } = input;
        const whereClause = [eq(viagens.id, id)];
        if (ctx.user.role !== "master_admin") {
          whereClause.push(eq(viagens.empresaId, ctx.user.empresaId!));
        }
        const [updated] = await db.update(viagens).set({
          ...data,
          dataSaida: data.dataSaida !== undefined ? (data.dataSaida || null) : undefined,
          dataChegada: data.dataChegada !== undefined ? (data.dataChegada || null) : undefined,
          updatedAt: new Date(),
        }).where(and(...whereClause)).returning();
        if (!updated) throw new Error("Viagem não encontrada ou sem permissão");
        return { success: true };
      }, "viagens.update");
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["planejada", "em_andamento", "concluida", "cancelada"]),
      kmChegada: z.number().optional(),
      dataChegada: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.updateStatus");
        await db.update(viagens).set({
          status: input.status,
          kmChegada: input.kmChegada,
          dataChegada: input.dataChegada || undefined,
          updatedAt: new Date(),
        }).where(eq(viagens.id, input.id));
        return { success: true };
      }, "viagens.updateStatus");
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo da exclusão") }))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.softDelete");
        await db.update(viagens).set({
          deletedAt: new Date(),
          deletedBy: ctx.user!.id,
          deleteReason: input.reason,
        }).where(eq(viagens.id, input.id));
        return { success: true };
      }, "viagens.softDelete");
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.restore");
        await db.update(viagens).set({
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
        }).where(eq(viagens.id, input.id));
        return { success: true };
      }, "viagens.restore");
    }),

  listDeleted: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.listDeleted");
        return db.select().from(viagens)
          .where(and(eq(viagens.empresaId, input.empresaId), isNotNull(viagens.deletedAt)))
          .orderBy(desc(viagens.deletedAt));
      }, "viagens.listDeleted");
    }),

  // Despesas da viagem
  addDespesa: protectedProcedure
    .input(z.object({
      viagemId: z.number(),
      empresaId: z.number(),
      tipo: z.enum(["combustivel", "pedagio", "borracharia", "estacionamento", "oficina", "telefone", "descarga", "diaria", "alimentacao", "outro"]),
      descricao: z.string().optional(),
      valor: z.string(),
      data: z.string().optional(),
      comprovante: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.addDespesa");
        const [result] = await db.insert(despesasViagem).values({
          ...input,
          data: input.data || null,
        }).returning({ id: despesasViagem.id });
        // Atualizar total de despesas na viagem
        const totalRows = await db.select({
          total: sql<number>`SUM(${despesasViagem.valor})`,
        }).from(despesasViagem)
          .where(and(eq(despesasViagem.viagemId, input.viagemId), isNull(despesasViagem.deletedAt)));
        const novoTotal = String(Number(totalRows[0]?.total) || 0);
        await db.update(viagens).set({ totalDespesas: novoTotal, updatedAt: new Date() })
          .where(eq(viagens.id, input.viagemId));
        return { id: result.id };
      }, "viagens.addDespesa");
    }),

  // Veículos em viagem (status em_andamento) com motorista vinculado
  veiculosEmViagem: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.veiculosEmViagem");
        const rows = await db.select({
          veiculoId: viagens.veiculoId,
          motoristaId: viagens.motoristaId,
          veiculoPlaca: veiculos.placa,
          motoristaNome: funcionarios.nome,
          origem: viagens.origem,
          destino: viagens.destino,
        }).from(viagens)
          .leftJoin(veiculos, eq(viagens.veiculoId, veiculos.id))
          .leftJoin(funcionarios, eq(viagens.motoristaId, funcionarios.id))
          .where(and(
            eq(viagens.empresaId, input.empresaId),
            eq(viagens.status, "em_andamento"),
            isNull(viagens.deletedAt),
          ));
        return rows;
      }, "viagens.veiculosEmViagem");
    }),

  // Resumo financeiro para dashboard
  resumoFinanceiro: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "viagens.resumoFinanceiro");
        const rows = await db.select({
          status: viagens.status,
          totalFrete: sql<number>`SUM(${viagens.freteTotal})`,
          totalDespesas: sql<number>`SUM(${viagens.totalDespesas})`,
          totalSaldo: sql<number>`SUM(${viagens.saldoViagem})`,
          quantidade: sql<number>`COUNT(*)`,
        }).from(viagens)
          .where(and(eq(viagens.empresaId, input.empresaId), isNull(viagens.deletedAt)))
          .groupBy(viagens.status);
        return rows;
      }, "viagens.resumoFinanceiro");
    }),
});
