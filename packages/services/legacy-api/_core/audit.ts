import { getDb } from "../db";
import { auditLog, auditoriaDetalhada } from "../drizzle/schema";
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

    const ip = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.socket?.remoteAddress || null;
    const userAgent = ctx.req.headers["user-agent"] || null;
    const dadosAntes = params.dadosAntes ? JSON.stringify(params.dadosAntes) : null;
    const dadosDepois = params.dadosDepois ? JSON.stringify(params.dadosDepois) : null;

    await db.insert(auditLog).values({
      empresaId: user.empresaId,
      userId: user.id,
      userName: user.name || user.email || "Usuário",
      acao: params.acao,
      tabela: params.tabela,
      registroId: params.registroId,
      dadosAntes,
      dadosDepois,
      ip,
      userAgent,
    });

    await db.insert(auditoriaDetalhada).values({
      empresaId: user.empresaId,
      userId: user.id,
      userName: user.name || user.email || "Usuário",
      userRole: user.role,
      tipoEvento:
        params.acao === "LOGIN" ? "login" :
        params.acao === "LOGOUT" ? "logout" :
        params.acao === "CREATE" ? "create" :
        params.acao === "UPDATE" ? "update" :
        params.acao === "DELETE" ? "delete" :
        "restore",
      modulo: params.tabela,
      tabela: params.tabela,
      registroId: params.registroId,
      descricao: `${params.acao} em ${params.tabela}`,
      dadosAntes,
      dadosDepois,
      ip,
      userAgent,
      risco: params.acao === "DELETE" ? "medio" : "baixo",
    }).catch(() => undefined);
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
  }
}
