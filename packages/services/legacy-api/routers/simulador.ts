import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "../_core/audit";
import { resolveAccessibleEmpresaId } from "../_core/access";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

export const simuladorRouter = router({
  listHistory: protectedProcedure
    .input(z.object({ empresaId: z.number(), limit: z.number().min(1).max(50).default(15) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
      const result = await db.execute(sql`
        SELECT id, origem, destino, "distanceKm", "durationSec", "idaVolta", consumo,
               "precoCombustivel", pedagio, "outrosCustos", "valorFrete", "custoTotal",
               lucro, margem, "rotaResumo", "createdAt"
        FROM simulation_history
        WHERE "empresaId" = ${empresaId}
          AND "userId" = ${ctx.user!.id}
        ORDER BY "createdAt" DESC
        LIMIT ${input.limit}
      `);
      return (result as any).rows ?? result;
    }),

  save: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      origem: z.string().min(2, "Informe a origem."),
      destino: z.string().min(2, "Informe o destino."),
      distanceKm: z.number().nonnegative().optional(),
      durationSec: z.number().nonnegative().optional(),
      idaVolta: z.boolean().default(false),
      consumo: z.number().positive().optional(),
      precoCombustivel: z.number().nonnegative().optional(),
      pedagio: z.number().nonnegative().optional(),
      outrosCustos: z.number().nonnegative().optional(),
      valorFrete: z.number().nonnegative().optional(),
      custoTotal: z.number().nonnegative().optional(),
      lucro: z.number().optional(),
      margem: z.number().optional(),
      rotaResumo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
      const result = await db.execute(sql`
        INSERT INTO simulation_history (
          "empresaId", "userId", origem, destino, "distanceKm", "durationSec", "idaVolta",
          consumo, "precoCombustivel", pedagio, "outrosCustos", "valorFrete", "custoTotal",
          lucro, margem, "rotaResumo", "createdAt"
        ) VALUES (
          ${empresaId}, ${ctx.user!.id}, ${input.origem}, ${input.destino}, ${input.distanceKm ?? null},
          ${input.durationSec ?? null}, ${input.idaVolta}, ${input.consumo ?? null},
          ${input.precoCombustivel ?? null}, ${input.pedagio ?? null}, ${input.outrosCustos ?? null},
          ${input.valorFrete ?? null}, ${input.custoTotal ?? null}, ${input.lucro ?? null},
          ${input.margem ?? null}, ${input.rotaResumo ?? null}, NOW()
        )
        RETURNING *
      `);
      const created = ((result as any).rows ?? result)[0];
      await createAuditLog(ctx, {
        acao: "CREATE",
        tabela: "simulation_history",
        registroId: created?.id,
        dadosDepois: {
          origem: input.origem,
          destino: input.destino,
          distanceKm: input.distanceKm ?? 0,
          custoTotal: input.custoTotal ?? 0,
        },
      });
      return created;
    }),
});
