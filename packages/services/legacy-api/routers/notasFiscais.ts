import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notasFiscaisViagem } from "../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

const nfStatusEnum = z.enum(["pendente", "entregue", "devolvida", "parcial", "extraviada"]);

const nfInput = z.object({
  empresaId: z.number(),
  viagemId: z.number(),
  numeroNf: z.string().min(1, "Número da NF é obrigatório"),
  serie: z.string().optional(),
  chaveAcesso: z.string().length(44).optional().or(z.literal("")),
  destinatario: z.string().optional(),
  cnpjDestinatario: z.string().optional(),
  enderecoEntrega: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  valorNf: z.string().optional(),
  pesoKg: z.string().optional(),
  volumes: z.number().optional(),
  ordemEntrega: z.number().optional(),
  observacoes: z.string().optional(),
});

export const notasFiscaisRouter = router({
  // Listar todas as NFs de uma viagem
  listByViagem: protectedProcedure
    .input(z.object({ viagemId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.listByViagem");
        return db
          .select()
          .from(notasFiscaisViagem)
          .where(
            and(
              eq(notasFiscaisViagem.viagemId, input.viagemId),
              isNull(notasFiscaisViagem.deletedAt),
            ),
          )
          .orderBy(notasFiscaisViagem.ordemEntrega, notasFiscaisViagem.numeroNf);
      }, "notasFiscais.listByViagem");
    }),

  // Listar NFs de uma empresa com filtros
  listByEmpresa: protectedProcedure
    .input(
      z.object({
        empresaId: z.number(),
        status: nfStatusEnum.optional(),
        viagemId: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.listByEmpresa");
        const conditions = [
          eq(notasFiscaisViagem.empresaId, input.empresaId),
          isNull(notasFiscaisViagem.deletedAt),
        ];
        if (input.status) conditions.push(eq(notasFiscaisViagem.status, input.status));
        if (input.viagemId) conditions.push(eq(notasFiscaisViagem.viagemId, input.viagemId));
        return db
          .select()
          .from(notasFiscaisViagem)
          .where(and(...conditions))
          .orderBy(desc(notasFiscaisViagem.createdAt));
      }, "notasFiscais.listByEmpresa");
    }),

  // Adicionar NF a uma viagem
  add: protectedProcedure
    .input(nfInput)
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.add");
        const [result] = await db.insert(notasFiscaisViagem).values({
          ...input,
          chaveAcesso: input.chaveAcesso || null,
          status: "pendente",
        }).returning({ id: notasFiscaisViagem.id });
        return { id: result.id };
      }, "notasFiscais.add");
    }),

  // Atualizar dados de uma NF
  update: protectedProcedure
    .input(nfInput.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.update");
        const { id, ...data } = input;
        await db
          .update(notasFiscaisViagem)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(notasFiscaisViagem.id, id));
        return { success: true };
      }, "notasFiscais.update");
    }),

  // Atualizar status de entrega de uma NF
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: nfStatusEnum,
        dataEntrega: z.string().optional(),
        dataCanhoto: z.string().optional(),
        recebidoPor: z.string().optional(),
        motivoDevolucao: z.string().optional(),
        observacoes: z.string().optional(),
        fotoCanhoto: z.string().optional(), // URL da foto do canhoto
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.updateStatus");
        await db
          .update(notasFiscaisViagem)
          .set({
            status: input.status,
            dataEntrega: input.dataEntrega || undefined,
            dataCanhoto: input.dataCanhoto || undefined,
            recebidoPor: input.recebidoPor,
            motivoDevolucao: input.motivoDevolucao,
            observacoes: input.observacoes,
            fotoCanhoto: input.fotoCanhoto,
            updatedAt: new Date(),
          })
          .where(eq(notasFiscaisViagem.id, input.id));
        return { success: true };
      }, "notasFiscais.updateStatus");
    }),

  // Lançar canhoto (atalho rápido — rotina 421 do Winthor)
  lancarCanhoto: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        dataCanhoto: z.string(),
        recebidoPor: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.lancarCanhoto");
        await db
          .update(notasFiscaisViagem)
          .set({
            dataCanhoto: input.dataCanhoto,
            recebidoPor: input.recebidoPor,
            status: "entregue",
            dataEntrega: input.dataCanhoto,
            updatedAt: new Date(),
          })
          .where(eq(notasFiscaisViagem.id, input.id));
        return { success: true };
      }, "notasFiscais.lancarCanhoto");
    }),

  // Remover NF (soft delete)
  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.remove");
        await db
          .update(notasFiscaisViagem)
          .set({ deletedAt: new Date() })
          .where(eq(notasFiscaisViagem.id, input.id));
        return { success: true };
      }, "notasFiscais.remove");
    }),

  // Resumo de status das NFs de uma viagem (para dashboard)
  resumoViagem: protectedProcedure
    .input(z.object({ viagemId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "notasFiscais.resumoViagem");
        const rows = await db
          .select({
            status: notasFiscaisViagem.status,
            quantidade: sql<number>`COUNT(*)`,
            valorTotal: sql<number>`SUM(CAST("valorNf" AS DECIMAL))`,
          })
          .from(notasFiscaisViagem)
          .where(
            and(
              eq(notasFiscaisViagem.viagemId, input.viagemId),
              isNull(notasFiscaisViagem.deletedAt),
            ),
          )
          .groupBy(notasFiscaisViagem.status);
        return rows;
      }, "notasFiscais.resumoViagem");
    }),
});
