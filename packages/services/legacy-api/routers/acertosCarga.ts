import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { acertosCarga } from "../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

const statusEnum = z.enum(["aberto", "em_analise", "fechado", "pago"]);

const acertoInput = z.object({
  empresaId: z.number(),
  viagemId: z.number(),
  motoristaId: z.number().optional(),
  dataAcerto: z.string().optional(),
  adiantamentoConcedido: z.string().default("0"),
  freteRecebido: z.string().default("0"),
  despesasPedagio: z.string().default("0"),
  despesasCombustivel: z.string().default("0"),
  despesasAlimentacao: z.string().default("0"),
  despesasEstacionamento: z.string().default("0"),
  despesasOutras: z.string().default("0"),
  descricaoOutras: z.string().optional(),
  valorDevolvido: z.string().default("0"),
  percentualComissao: z.string().default("0"),
  valorComissao: z.string().default("0"),
  observacoes: z.string().optional(),
});

// Calcula o saldo final do acerto
function calcularSaldo(data: {
  freteRecebido: string;
  adiantamentoConcedido: string;
  despesasPedagio: string;
  despesasCombustivel: string;
  despesasAlimentacao: string;
  despesasEstacionamento: string;
  despesasOutras: string;
  valorDevolvido: string;
  valorComissao: string;
}): string {
  const n = (v: string) => Number(v) || 0;
  const totalDespesas =
    n(data.despesasPedagio) +
    n(data.despesasCombustivel) +
    n(data.despesasAlimentacao) +
    n(data.despesasEstacionamento) +
    n(data.despesasOutras);

  // Saldo = Frete Recebido - Adiantamento Concedido - Total Despesas - Valor Devolvido + Comissão
  const saldo =
    n(data.freteRecebido) -
    n(data.adiantamentoConcedido) -
    totalDespesas -
    n(data.valorDevolvido) +
    n(data.valorComissao);

  return saldo.toFixed(2);
}

export const acertosCargaRouter = router({
  // Listar acertos de uma empresa
  list: protectedProcedure
    .input(
      z.object({
        empresaId: z.number(),
        status: statusEnum.optional(),
        motoristaId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "acertosCarga.list");
        const conditions: any[] = [
          eq(acertosCarga.empresaId, input.empresaId),
          isNull(acertosCarga.deletedAt),
        ];
        if (input.status) conditions.push(eq(acertosCarga.status, input.status));
        if (input.motoristaId) conditions.push(eq(acertosCarga.motoristaId, input.motoristaId));
        return db
          .select()
          .from(acertosCarga)
          .where(and(...conditions))
          .orderBy(desc(acertosCarga.createdAt));
      }, "acertosCarga.list");
    }),

  // Buscar acerto por viagem
  getByViagem: protectedProcedure
    .input(z.object({ viagemId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "acertosCarga.getByViagem");
        const rows = await db
          .select()
          .from(acertosCarga)
          .where(
            and(
              eq(acertosCarga.viagemId, input.viagemId),
              isNull(acertosCarga.deletedAt),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      }, "acertosCarga.getByViagem");
    }),

  // Criar acerto
  create: protectedProcedure
    .input(acertoInput)
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "acertosCarga.create");
        const saldoFinal = calcularSaldo(input);
        const [result] = await db.insert(acertosCarga).values({
          ...input,
          saldoFinal,
          status: "aberto",
        }).returning({ id: acertosCarga.id });
        return { id: result.id, saldoFinal };
      }, "acertosCarga.create");
    }),

  // Atualizar acerto
  update: protectedProcedure
    .input(acertoInput.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "acertosCarga.update");
        const { id, ...data } = input;
        const saldoFinal = calcularSaldo(data);
        await db
          .update(acertosCarga)
          .set({ ...data, saldoFinal, updatedAt: new Date() })
          .where(eq(acertosCarga.id, id));
        return { success: true, saldoFinal };
      }, "acertosCarga.update");
    }),

  // Atualizar status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: statusEnum,
        aprovadoPor: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "acertosCarga.updateStatus");
        await db
          .update(acertosCarga)
          .set({
            status: input.status,
            aprovadoPor: input.aprovadoPor,
            dataAprovacao:
              input.status === "fechado" || input.status === "pago"
                ? new Date()
                : undefined,
            updatedAt: new Date(),
          })
          .where(eq(acertosCarga.id, input.id));
        return { success: true };
      }, "acertosCarga.updateStatus");
    }),

  // Remover (soft delete)
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "acertosCarga.remove");
        await db
          .update(acertosCarga)
          .set({ deletedAt: new Date() })
          .where(eq(acertosCarga.id, input.id));
        return { success: true };
      }, "acertosCarga.remove");
    }),
});
