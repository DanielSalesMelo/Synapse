import { getDb } from "../db";
import { auditLog } from "../drizzle/schema";
import type { TrpcContext } from "./context";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "LOGIN" | "LOGOUT";

export async function createAuditLog(
  ctx: TrpcContext,
  params: {
    acao: AuditAction;
    tabela: string;
    registroId: number;
    dadosAntes?: any;
    dadosDepois?: any;
  }
) {
  try {
    const db = await getDb();
    if (!db) return;

    const user = ctx.user;
    if (!user) return;

    await db.insert(auditLog).values({
      empresaId: user.empresaId,
      userId: user.id,
      userName: user.name || user.email || "Usuário",
      acao: params.acao,
      tabela: params.tabela,
      registroId: params.registroId,
      dadosAntes: params.dadosAntes ? JSON.stringify(params.dadosAntes) : null,
      dadosDepois: params.dadosDepois ? JSON.stringify(params.dadosDepois) : null,
      ip: (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.socket?.remoteAddress || null,
      userAgent: ctx.req.headers["user-agent"] || null,
    });
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
  }
}
