import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Roles do sistema Synapse:
// - user: operador básico (adiciona e edita, não deleta)
// - dispatcher: despachante (cria e gerencia viagens)
// - monitor: pode mover para lixeira (soft delete), mas não restaurar
// - admin: acesso total à empresa, pode restaurar da lixeira
// - master_admin: acesso total a todas as empresas

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Admin ou superior (admin, master_admin)
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const adminRoles = ["admin", "master_admin"];
    if (!ctx.user || !adminRoles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

// Monitor ou superior — pode fazer soft delete
export const monitorProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const monitorRoles = ["monitor", "admin", "master_admin"];
    if (!ctx.user || !monitorRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acesso negado. Apenas monitores e administradores podem realizar esta ação.",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

// Master admin apenas
export const masterAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "master_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acesso negado. Apenas o administrador master pode realizar esta ação.",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

// Despachante ou superior
export const dispatcherProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const dispatcherRoles = ["dispatcher", "monitor", "admin", "master_admin"];
    if (!ctx.user || !dispatcherRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acesso negado. Apenas despachantes e administradores podem realizar esta ação.",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
