import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { sdk } from "../_core/sdk";

// ─── Rate limiting em memória para o endpoint de login ───────────────────────
// Limita tentativas por IP: máx 10 tentativas em 15 minutos
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Muitas tentativas de login. Tente novamente em ${waitSec} segundos.`,
    });
  }
}

function clearRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// Limpa entradas expiradas a cada 30 minutos para evitar vazamento de memória
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

// ─── Cookie seguro ────────────────────────────────────────────────────────────
const SESSION_COOKIE = "manus-enterprise-suite-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function buildCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

function buildClearCookieHeader(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const secure = isProduction ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const authRouter = router({
  login: publicProcedure
    .input(z.object({
      username: z.string().optional(),
      email: z.string().optional(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limiting por IP
      const ip =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        ctx.req.socket?.remoteAddress ||
        "unknown";
      checkRateLimit(ip);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const identifier = input.username || input.email;
      if (!identifier) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Usuário ou e-mail é obrigatório" });
      }

      // Buscar pelo nome de usuário ou e-mail (case-insensitive)
      const [user] = await db.select().from(users)
        .where(input.username ? eq(users.name, input.username) : sql`LOWER(${users.email}) = LOWER(${identifier})`)
        .limit(1);

      // Mensagem genérica para não revelar se o usuário existe
      if (!user || !user.password) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
      }

      // Verificar status de aprovação
      if (user.status === "pending") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sua conta está aguardando aprovação de um administrador.",
        });
      }

      // Validar senha via bcrypt (sem bypass hardcoded)
      const validPassword = await bcrypt.compare(input.password, user.password);
      if (!validPassword) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha incorretos" });
      }

      // Login bem-sucedido: limpar rate limit do IP
      clearRateLimit(ip);

      const token = await sdk.signSession(
        {
          openId: user.openId,
          appId: process.env.VITE_APP_ID || "synapse",
          name: user.name || user.email || "Usuário",
        },
        { expiresInMs: SESSION_MAX_AGE * 1000 }
      );

      ctx.res.setHeader("Set-Cookie", buildCookieHeader(token));

      // Retornar user sem o campo password
      const { password: _pw, ...safeUser } = user as any;
      return { success: true, user: safeUser, token };
    }),

  register: publicProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(6),
      companyCode: z.string().optional(),
      role: z.enum(["user", "admin", "monitor", "dispatcher"]).optional(),
      empresaId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const isAdmin = ctx.user && (ctx.user.role === "admin" || ctx.user.role === "master_admin");

      let targetEmpresaId = input.empresaId;
      let targetStatus = "pending";
      let targetRole = input.role || "user";

      if (isAdmin) {
        targetStatus = "approved";
        if (ctx.user.role === "admin") {
          targetEmpresaId = (ctx.user as any).empresaId;
        }
      } else {
        if (!input.companyCode || input.companyCode.trim() === "") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Código de empresa ou convite é obrigatório para se cadastrar. Solicite o código ao administrador da empresa.",
          });
        }

        const { empresas } = await import("../drizzle/schema");
        const { or } = await import("drizzle-orm");

        const codigoUpper = input.companyCode.trim().toUpperCase();
        const companyId = parseInt(input.companyCode);
        const [empresa] = await db.select().from(empresas)
          .where(
            !isNaN(companyId)
              ? or(eq(empresas.id, companyId), eq(empresas.codigoConvite, codigoUpper))
              : eq(empresas.codigoConvite, codigoUpper)
          )
          .limit(1);

        if (!empresa) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Código de empresa ou convite inválido. Verifique o código com o administrador da empresa.",
          });
        }

        if (!empresa.ativo) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta empresa está inativa. Entre em contato com o administrador.",
          });
        }

        targetEmpresaId = empresa.id;
      }

      const [existingUser] = await db.select().from(users).where(eq(users.name, input.name)).limit(1);
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "Este nome de usuário já está em uso" });
      }

      const [existingEmail] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existingEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está cadastrado" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const [newUser] = await db.insert(users).values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: hashedPassword,
        openId,
        role: targetRole as any,
        status: targetStatus as any,
        empresaId: targetEmpresaId,
        loginMethod: "local",
      }).returning();

      if (!newUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar usuário" });
      }

      return {
        success: true,
        message: isAdmin
          ? "Usuário criado com sucesso!"
          : "Cadastro realizado com sucesso! Aguarde a aprovação de um administrador para acessar o sistema.",
      };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    // Nunca retornar o hash da senha para o frontend
    const { password: _pw, ...safeUser } = ctx.user as any;
    return safeUser;
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.setHeader("Set-Cookie", buildClearCookieHeader());
    return { success: true };
  }),
});
