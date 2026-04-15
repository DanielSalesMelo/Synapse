import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { safeDb, requireDb } from "../helpers/errorHandler";

export const multasRouter = router({
  list: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "multas.list");
        const rows = await db.execute(sql`
          SELECT m.*, 
            v.placa as veiculoPlaca, v.modelo as veiculoModelo,
            f.nome as motoristaNome
          FROM multas m
          LEFT JOIN veiculos v ON v.id = m."veiculoId"
          LEFT JOIN funcionarios f ON f.id = m."motoristaId"
          WHERE m."empresaId" = ${input.empresaId} AND m."deletedAt" IS NULL
          ORDER BY m."data" DESC
        `);
        return (rows as unknown as any[]) ?? [];
      });
    }),

  create: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      veiculoId: z.number(),
      motoristaId: z.number().nullable().optional(),
      data: z.string(),
      local: z.string().optional(),
      descricao: z.string().min(1),
      numeroAuto: z.string().optional(),
      pontos: z.number().default(0),
      valor: z.number().min(0),
      vencimento: z.string().optional(),
      status: z.enum(["pendente","pago","recorrido","cancelado"]).default("pendente"),
      responsavel: z.enum(["motorista","empresa"]).default("motorista"),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "multas.create");
        await db.execute(sql`
          INSERT INTO multas ("empresaId", "veiculoId", "motoristaId", "data", "local", "descricao", "numeroAuto", "pontos", "valor", "vencimento", "status", "responsavel", "observacoes")
          VALUES (${input.empresaId}, ${input.veiculoId}, ${input.motoristaId ?? null}, ${input.data}, ${input.local ?? null}, ${input.descricao}, ${input.numeroAuto ?? null}, ${input.pontos}, ${input.valor}, ${input.vencimento ?? null}, ${input.status}, ${input.responsavel}, ${input.observacoes ?? null})
        `);
        return { success: true };
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pendente","pago","recorrido","cancelado"]),
    }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "multas.updateStatus");
        await db.execute(sql`UPDATE multas SET status = ${input.status} WHERE id = ${input.id}`);
        return { success: true };
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), userId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "multas.delete");
        await db.execute(sql`UPDATE multas SET "deletedAt" = NOW(), "deletedBy" = ${input.userId}, "deleteReason" = ${input.reason ?? null} WHERE id = ${input.id}`);
        return { success: true };
      });
    }),

  stats: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "multas.stats");
        const rows = await db.execute(sql`
          SELECT 
            COUNT(*) as total,
            SUM("valor") as totalValor,
            SUM("pontos") as totalPontos,
            SUM(CASE WHEN "status" = 'pendente' THEN 1 ELSE 0 END) as pendentes,
            SUM(CASE WHEN "status" = 'pendente' THEN "valor" ELSE 0 END) as valorPendente
          FROM multas WHERE "empresaId" = ${input.empresaId} AND "deletedAt" IS NULL
        `);
        const r = (rows as unknown as any[])[0] ?? {};
        return {
          total: Number(r.total) || 0,
          totalValor: Number(r.totalValor) || 0,
          totalPontos: Number(r.totalPontos) || 0,
          pendentes: Number(r.pendentes) || 0,
          valorPendente: Number(r.valorPendente) || 0,
        };
      });
    }),
});
