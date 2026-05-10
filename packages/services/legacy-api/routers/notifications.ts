import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const COMPANY_WIDE_NOTIFICATION_ROLES = new Set([
  "master_admin",
  "ti_master",
  "admin",
  "admin_empresa",
  "administrador",
  "ti",
  "supervisor_geral",
  "supervisor_ti",
  "financeiro",
  "comercial",
  "dispatcher",
  "rh",
  "wms_operator",
  "monitor",
]);

function notificationAccessSql(userId: number, empresaId: number | null, role: string | null) {
  if (!empresaId || !COMPANY_WIDE_NOTIFICATION_ROLES.has(String(role || "").toLowerCase())) {
    return sql`"userId" = ${userId}`;
  }

  return sql`
    (
      "userId" = ${userId}
      OR ("empresaId" = ${empresaId} AND "userId" IS NULL)
    )
  `;
}

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const empresaId = ctx.user.empresaId ?? null;
      const limit = input?.limit ?? 20;
      const accessWhere = notificationAccessSql(ctx.user.id, empresaId, ctx.user.role ?? null);

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
          AND ${accessWhere}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `);

      return rows as unknown as any[];
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const empresaId = ctx.user.empresaId ?? null;
    const accessWhere = notificationAccessSql(ctx.user.id, empresaId, ctx.user.role ?? null);
    const rows = await db.execute(sql`
      SELECT count(*)::int AS total
      FROM notifications
      WHERE "deletedAt" IS NULL
        AND "readAt" IS NULL
        AND ${accessWhere}
    `);

    return { total: (rows as any[])[0]?.total ?? 0 };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const empresaId = ctx.user.empresaId ?? null;
      const accessWhere = notificationAccessSql(ctx.user.id, empresaId, ctx.user.role ?? null);
      await db.execute(sql`
        UPDATE notifications
        SET "readAt" = NOW()
        WHERE id = ${input.id}
          AND "deletedAt" IS NULL
          AND ${accessWhere}
      `);

      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const empresaId = ctx.user.empresaId ?? null;
    const accessWhere = notificationAccessSql(ctx.user.id, empresaId, ctx.user.role ?? null);
    await db.execute(sql`
      UPDATE notifications
      SET "readAt" = NOW()
      WHERE "readAt" IS NULL
        AND "deletedAt" IS NULL
        AND ${accessWhere}
    `);

    return { success: true };
  }),
});
