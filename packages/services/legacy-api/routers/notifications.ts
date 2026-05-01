import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const empresaId = ctx.user.role === "master_admin" ? null : (ctx.user.empresaId ?? null);
      const limit = input?.limit ?? 20;

      const rows = await db.execute(sql`
        SELECT
          id,
          tipo,
          titulo,
          mensagem,
          payload,
          "readAt",
          "createdAt"
        FROM notifications
        WHERE "deletedAt" IS NULL
          AND (
            "userId" = ${ctx.user.id}
            OR (${empresaId} IS NOT NULL AND "empresaId" = ${empresaId} AND "userId" IS NULL)
          )
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `);

      return rows as unknown as any[];
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const empresaId = ctx.user.role === "master_admin" ? null : (ctx.user.empresaId ?? null);
    const rows = await db.execute(sql`
      SELECT count(*)::int AS total
      FROM notifications
      WHERE "deletedAt" IS NULL
        AND "readAt" IS NULL
        AND (
          "userId" = ${ctx.user.id}
          OR (${empresaId} IS NOT NULL AND "empresaId" = ${empresaId} AND "userId" IS NULL)
        )
    `);

    return { total: (rows as any[])[0]?.total ?? 0 };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const empresaId = ctx.user.role === "master_admin" ? null : (ctx.user.empresaId ?? null);
      await db.execute(sql`
        UPDATE notifications
        SET "readAt" = NOW()
        WHERE id = ${input.id}
          AND "deletedAt" IS NULL
          AND (
            "userId" = ${ctx.user.id}
            OR (${empresaId} IS NOT NULL AND "empresaId" = ${empresaId} AND "userId" IS NULL)
          )
      `);

      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const empresaId = ctx.user.role === "master_admin" ? null : (ctx.user.empresaId ?? null);
    await db.execute(sql`
      UPDATE notifications
      SET "readAt" = NOW()
      WHERE "readAt" IS NULL
        AND "deletedAt" IS NULL
        AND (
          "userId" = ${ctx.user.id}
          OR (${empresaId} IS NOT NULL AND "empresaId" = ${empresaId} AND "userId" IS NULL)
        )
    `);

    return { success: true };
  }),
});
