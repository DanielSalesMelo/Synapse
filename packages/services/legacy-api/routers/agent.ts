import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getRawClient } from "../db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

// ─── Utilitários ──────────────────────────────────────────────────────────────
function generateDeviceId(): string {
  return `DEV-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function generateAgentToken(): string {
  return `agt_${crypto.randomBytes(24).toString("hex")}`;
}

function generatePairCode(): string {
  const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SYNC-${part()}-${part()}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const agentRouter = router({

  // Gerar código de pareamento
  generatePairCode: protectedProcedure
    .input(z.object({ label: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getRawClient();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const empresaId = (ctx.user as any).empresaId;
      if (!empresaId) throw new TRPCError({ code: "FORBIDDEN", message: "Sem empresa vinculada" });

      const code = generatePairCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

      await db.unsafe(`
        INSERT INTO "agent_pair_codes" ("empresaId", "code", "label", "createdBy", "expiresAt")
        VALUES ($1, $2, $3, $4, $5)
      `, [empresaId, code, input.label || null, (ctx.user as any).id, expiresAt]);

      return { code, expiresAt };
    }),

  // Listar códigos de pareamento
  listPairCodes: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getRawClient();
      if (!db) return [];
      const empresaId = (ctx.user as any).empresaId;
      if (!empresaId) return [];

      const rows = await db.unsafe(`
        SELECT * FROM "agent_pair_codes"
        WHERE "empresaId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 20
      `, [empresaId]);
      return rows as any[];
    }),

  // Listar dispositivos registrados
  listDevices: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getRawClient();
      if (!db) return [];
      const empresaId = (ctx.user as any).empresaId;
      if (!empresaId) return [];

      const rows = await db.unsafe(`
        SELECT d.*,
          (SELECT row_to_json(m) FROM (
            SELECT * FROM "agent_metrics"
            WHERE "deviceId" = d."deviceId"
            ORDER BY "timestamp" DESC
            LIMIT 1
          ) m) as "lastMetric"
        FROM "agent_devices" d
        WHERE d."empresaId" = $1
        ORDER BY d."lastSeenAt" DESC
      `, [empresaId]);
      return rows as any[];
    }),

  // Buscar métricas de um dispositivo
  getDeviceMetrics: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      limit: z.number().min(1).max(200).default(60),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getRawClient();
      if (!db) return [];
      const empresaId = (ctx.user as any).empresaId;

      const rows = await db.unsafe(`
        SELECT * FROM "agent_metrics"
        WHERE "deviceId" = $1 AND ("empresaId" = $2 OR $2 IS NULL)
        ORDER BY "timestamp" DESC
        LIMIT $3
      `, [input.deviceId, empresaId, input.limit]);
      return (rows as any[]).reverse();
    }),

  // Atualizar label do dispositivo
  updateDeviceLabel: protectedProcedure
    .input(z.object({ deviceId: z.string(), label: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getRawClient();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = (ctx.user as any).empresaId;
      await db.unsafe(`
        UPDATE "agent_devices" SET "label" = $1
        WHERE "deviceId" = $2 AND "empresaId" = $3
      `, [input.label, input.deviceId, empresaId]);
      return { ok: true };
    }),

  // Remover dispositivo
  removeDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getRawClient();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = (ctx.user as any).empresaId;
      await db.unsafe(`
        DELETE FROM "agent_devices"
        WHERE "deviceId" = $1 AND "empresaId" = $2
      `, [input.deviceId, empresaId]);
      return { ok: true };
    }),
});
