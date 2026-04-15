import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { carregamentos, itensCarregamento } from "../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

const statusCarregamentoEnum = z.enum(["montando", "pronto", "em_rota", "retornado", "encerrado"]);
const statusNfEnum = z.enum(["pendente", "entregue", "devolvida", "parcial", "extraviada"]);

const itemInput = z.object({
  carregamentoId: z.number(),
  empresaId: z.number(),
  numeroNf: z.string().min(1),
  serie: z.string().optional(),
  chaveAcesso: z.string().optional(),
  destinatario: z.string().optional(),
  cnpjDestinatario: z.string().optional(),
  enderecoEntrega: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  valorNf: z.string().optional(),
  pesoKg: z.string().optional(),
  volumes: z.number().optional(),
  descricaoCarga: z.string().optional(),
  ordemEntrega: z.number().optional(),
  observacoes: z.string().optional(),
});

// Recalcula totais do carregamento
async function recalcularTotais(db: any, carregamentoId: number) {
  const itens = await db
    .select()
    .from(itensCarregamento)
    .where(
      and(
        eq(itensCarregamento.carregamentoId, carregamentoId),
        isNull(itensCarregamento.deletedAt),
      ),
    );

  const totalNfs = itens.length;
  const totalVolumes = itens.reduce((acc: number, i: any) => acc + (Number(i.volumes) || 0), 0);
  const totalPesoKg = itens.reduce((acc: number, i: any) => acc + (Number(i.pesoKg) || 0), 0);
  const totalValorNfs = itens.reduce((acc: number, i: any) => acc + (Number(i.valorNf) || 0), 0);

  await db
    .update(carregamentos)
    .set({
      totalNfs,
      totalVolumes,
      totalPesoKg: totalPesoKg.toFixed(2),
      totalValorNfs: totalValorNfs.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(carregamentos.id, carregamentoId));
}

// Gera número sequencial do carregamento
async function gerarNumero(db: any, empresaId: number): Promise<string> {
  const rows = await db
    .select({ id: carregamentos.id })
    .from(carregamentos)
    .where(eq(carregamentos.empresaId, empresaId))
    .orderBy(desc(carregamentos.id))
    .limit(1);
  const seq = rows.length > 0 ? rows[0].id + 1 : 1;
  return `CARG-${String(seq).padStart(4, "0")}`;
}

export const carregamentosRouter = router({
  // ─── Listar carregamentos ──────────────────────────────────────────────────
  list: protectedProcedure
    .input(
      z.object({
        empresaId: z.number(),
        status: statusCarregamentoEnum.optional(),
      }),
    )
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.list");
        const conditions: any[] = [
          eq(carregamentos.empresaId, input.empresaId),
          isNull(carregamentos.deletedAt),
        ];
        if (input.status) conditions.push(eq(carregamentos.status, input.status));
        return db
          .select()
          .from(carregamentos)
          .where(and(...conditions))
          .orderBy(desc(carregamentos.createdAt));
      }, "carregamentos.list");
    }),

  // ─── Buscar carregamento por ID com itens ──────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.getById");
        const [carg] = await db
          .select()
          .from(carregamentos)
          .where(and(eq(carregamentos.id, input.id), isNull(carregamentos.deletedAt)))
          .limit(1);
        if (!carg) return null;
        const itens = await db
          .select()
          .from(itensCarregamento)
          .where(
            and(
              eq(itensCarregamento.carregamentoId, input.id),
              isNull(itensCarregamento.deletedAt),
            ),
          )
          .orderBy(itensCarregamento.ordemEntrega);
        return { ...carg, itens };
      }, "carregamentos.getById");
    }),

  // ─── Criar carregamento ────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        empresaId: z.number(),
        data: z.string(),
        veiculoId: z.number().optional(),
        veiculoPlaca: z.string().optional(),
        motoristaId: z.number().optional(),
        motoristaNome: z.string().optional(),
        ajudanteId: z.number().optional(),
        ajudanteNome: z.string().optional(),
        rotaDescricao: z.string().optional(),
        cidadesRota: z.string().optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.create");
        const numero = await gerarNumero(db, input.empresaId);
        const [result] = await db.insert(carregamentos).values({
          ...input,
          numero,
          status: "montando",
        }).returning({ id: carregamentos.id });
        return { id: result.id, numero };
      }, "carregamentos.create");
    }),

  // ─── Atualizar carregamento ────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.string().optional(),
        veiculoId: z.number().optional(),
        veiculoPlaca: z.string().optional(),
        motoristaId: z.number().optional(),
        motoristaNome: z.string().optional(),
        ajudanteId: z.number().optional(),
        ajudanteNome: z.string().optional(),
        rotaDescricao: z.string().optional(),
        cidadesRota: z.string().optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.update");
        const { id, ...data } = input;
        await db
          .update(carregamentos)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(carregamentos.id, id));
        return { success: true };
      }, "carregamentos.update");
    }),

  // ─── Registrar saída ──────────────────────────────────────────────────────
  registrarSaida: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        dataSaida: z.string(),
        kmSaida: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.registrarSaida");
        await db
          .update(carregamentos)
          .set({
            status: "em_rota",
            dataSaida: input.dataSaida,
            kmSaida: input.kmSaida,
            updatedAt: new Date(),
          })
          .where(eq(carregamentos.id, input.id));
        return { success: true };
      }, "carregamentos.registrarSaida");
    }),

  // ─── Registrar retorno ────────────────────────────────────────────────────
  registrarRetorno: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        dataRetorno: z.string(),
        kmRetorno: z.number().optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.registrarRetorno");
        await db
          .update(carregamentos)
          .set({
            status: "retornado",
            dataRetorno: input.dataRetorno,
            kmRetorno: input.kmRetorno,
            observacoes: input.observacoes,
            updatedAt: new Date(),
          })
          .where(eq(carregamentos.id, input.id));
        return { success: true };
      }, "carregamentos.registrarRetorno");
    }),

  // ─── Encerrar carregamento ────────────────────────────────────────────────
  encerrar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.encerrar");
        await db
          .update(carregamentos)
          .set({ status: "encerrado", updatedAt: new Date() })
          .where(eq(carregamentos.id, input.id));
        return { success: true };
      }, "carregamentos.encerrar");
    }),

  // ─── Marcar como pronto ───────────────────────────────────────────────────
  marcarPronto: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.marcarPronto");
        await db
          .update(carregamentos)
          .set({ status: "pronto", updatedAt: new Date() })
          .where(eq(carregamentos.id, input.id));
        return { success: true };
      }, "carregamentos.marcarPronto");
    }),

  // ─── Remover carregamento (soft delete) ───────────────────────────────────
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.remove");
        await db
          .update(carregamentos)
          .set({ deletedAt: new Date() })
          .where(eq(carregamentos.id, input.id));
        return { success: true };
      }, "carregamentos.remove");
    }),

  // ─── ITENS ────────────────────────────────────────────────────────────────

  // Listar itens de um carregamento
  listItens: protectedProcedure
    .input(z.object({ carregamentoId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.listItens");
        return db
          .select()
          .from(itensCarregamento)
          .where(
            and(
              eq(itensCarregamento.carregamentoId, input.carregamentoId),
              isNull(itensCarregamento.deletedAt),
            ),
          )
          .orderBy(itensCarregamento.ordemEntrega);
      }, "carregamentos.listItens");
    }),

  // Adicionar item (NF) ao carregamento
  addItem: protectedProcedure
    .input(itemInput)
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.addItem");
        const [result] = await db.insert(itensCarregamento).values({
          ...input,
          status: "pendente",
        }).returning({ id: itensCarregamento.id });
        await recalcularTotais(db, input.carregamentoId);
        return { id: result.id };
      }, "carregamentos.addItem");
    }),

  // Atualizar item
  updateItem: protectedProcedure
    .input(itemInput.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.updateItem");
        const { id, ...data } = input;
        await db
          .update(itensCarregamento)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(itensCarregamento.id, id));
        await recalcularTotais(db, input.carregamentoId);
        return { success: true };
      }, "carregamentos.updateItem");
    }),

  // Atualizar status do item (entrega)
  updateItemStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        carregamentoId: z.number(),
        status: statusNfEnum,
        dataCanhoto: z.string().optional(),
        recebidoPor: z.string().optional(),
        motivoDevolucao: z.string().optional(),
        observacoes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.updateItemStatus");
        const { id, carregamentoId, ...data } = input;
        await db
          .update(itensCarregamento)
          .set({
            ...data,
            dataCanhoto: data.dataCanhoto || undefined,
            updatedAt: new Date(),
          })
          .where(eq(itensCarregamento.id, id));
        return { success: true };
      }, "carregamentos.updateItemStatus");
    }),

  // Remover item
  removeItem: protectedProcedure
    .input(z.object({ id: z.number(), carregamentoId: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "carregamentos.removeItem");
        await db
          .update(itensCarregamento)
          .set({ deletedAt: new Date() })
          .where(eq(itensCarregamento.id, input.id));
        await recalcularTotais(db, input.carregamentoId);
        return { success: true };
      }, "carregamentos.removeItem");
    }),
});
