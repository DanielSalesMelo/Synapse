import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { documentos } from "../drizzle/schema";
import { eq, and, isNull, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";
import { createAuditLog } from "../_core/audit";

const documentoInput = z.object({
  empresaId: z.number(),
  tipo: z.enum(["cnh", "crlv", "aso", "mopp", "nota_fiscais", "seguro", "licenciamento", "contrato", "outro"]),
  nome: z.string().min(1),
  url: z.string().url(),
  extensao: z.string().optional(),
  tamanho: z.number().optional(),
  veiculoId: z.number().nullable().optional(),
  funcionarioId: z.number().nullable().optional(),
  viagemId: z.number().nullable().optional(),
  manutencaoId: z.number().nullable().optional(),
  dataVencimento: z.string().nullable().optional(),
  observacoes: z.string().optional(),
});

function parseDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

export const documentosRouter = router({
  list: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      tipo: z.string().optional(),
      veiculoId: z.number().optional(),
      funcionarioId: z.number().optional(),
      apenasAtivos: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "documentos.list");
        return db.select().from(documentos)
          .where(and(
            eq(documentos.empresaId, input.empresaId),
            isNull(documentos.deletedAt),
            input.tipo ? eq(documentos.tipo, input.tipo as any) : undefined,
            input.veiculoId ? eq(documentos.veiculoId, input.veiculoId) : undefined,
            input.funcionarioId ? eq(documentos.funcionarioId, input.funcionarioId) : undefined,
          ))
          .orderBy(desc(documentos.createdAt));
      }, "documentos.list");
    }),

  getAlertasVencimento: protectedProcedure
    .input(z.object({ empresaId: z.number(), dias: z.number().default(30) }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "documentos.getAlertasVencimento");
        const hoje = new Date();
        const limite = new Date();
        limite.setDate(hoje.getDate() + input.dias);
        
        return db.select().from(documentos)
          .where(and(
            eq(documentos.empresaId, input.empresaId),
            isNull(documentos.deletedAt),
            gte(documentos.dataVencimento, hoje.toISOString().split("T")[0]),
            lte(documentos.dataVencimento, limite.toISOString().split("T")[0])
          ))
          .orderBy(documentos.dataVencimento);
      }, "documentos.getAlertasVencimento");
    }),

  create: protectedProcedure
    .input(documentoInput)
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "documentos.create");
        const empresaId = ctx.user.role !== "master_admin" ? ctx.user.empresaId! : input.empresaId;
        const [result] = await db.insert(documentos).values({
          ...input,
          empresaId,
          dataVencimento: parseDate(input.dataVencimento),
        }).returning({ id: documentos.id });

        await createAuditLog(ctx, {
          acao: "CREATE",
          tabela: "documentos",
          registroId: result.id,
          dadosDepois: input,
        });

        return { id: result.id };
      }, "documentos.create");
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "documentos.softDelete");
        await db.update(documentos).set({
          deletedAt: new Date(),
          deletedBy: ctx.user!.id,
        }).where(eq(documentos.id, input.id));

        await createAuditLog(ctx, {
          acao: "DELETE",
          tabela: "documentos",
          registroId: input.id,
        });

        return { success: true };
      }, "documentos.softDelete");
    }),
});
