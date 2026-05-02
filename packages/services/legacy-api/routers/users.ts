import { router, adminProcedure, masterAdminProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { updateUser, getDb, getUserByEmail } from "../db";
import { TRPCError } from "@trpc/server";
import { userCompanyAccess, users } from "../drizzle/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  COMPANY_ROLE_CODES,
  ensurePrimaryCompanyAccess,
  listAccessibleCompanyIds,
  resolveAccessibleEmpresaId,
} from "../_core/access";

const LEGACY_USER_ROLES = [
  "user",
  "admin",
  "master_admin",
  "monitor",
  "dispatcher",
] as const;

const COMPANY_ROLE_INPUT = z.enum(COMPANY_ROLE_CODES);

export const usersRouter = router({

  // ── Criar usuário (admin cria para sua empresa; master_admin pode escolher) ──
  create: adminProcedure
    .input(z.object({
      name: z.string().min(2),
      lastName: z.string().optional(),
      email: z.string().email(),
      password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
      phone: z.string().optional(),
      role: z.enum(LEGACY_USER_ROLES).default("user"),
      roleCode: COMPANY_ROLE_INPUT.optional(),
      empresaId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

        const existing = await getUserByEmail(input.email).catch(() => null);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado no sistema" });

        let targetEmpresaId = input.empresaId;
        if (ctx.user.role !== "master_admin") {
          targetEmpresaId = (ctx.user as any).empresaId;
        }
        if (!targetEmpresaId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "É obrigatório vincular o usuário a uma empresa" });
        }

        if (input.role === "master_admin" && ctx.user.role !== "master_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas Master ADM pode criar outro Master ADM" });
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);
        const [created] = await db.insert(users).values({
          name: input.name,
          lastName: input.lastName ?? "",
          email: input.email,
          password: hashedPassword,
          phone: input.phone ?? "",
          role: input.role,
          status: "approved",
          empresaId: targetEmpresaId,
        } as any).returning({ id: users.id });

        await ensurePrimaryCompanyAccess({
          userId: created.id,
          empresaId: targetEmpresaId,
          roleCode: input.roleCode ?? input.role,
          createdBy: ctx.user.id,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar usuário" });
      }
    }),

  // ── Listar todos os usuários (VERSÃO CORRIGIDA E FINAL) ──────────────────
  listAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      }

      if (ctx.user.role === "master_admin") {
        return await db.select().from(users).where(isNull(users.deletedAt));
      }

      const accessibleIds = await listAccessibleCompanyIds(ctx.user);
      if (accessibleIds.length === 0) return [];

      return await db
        .select()
        .from(users)
        .where(and(inArray(users.empresaId, accessibleIds), isNull(users.deletedAt)));

    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao listar usuários" });
    }
  }),

  // ... (o resto do arquivo continua igual, não precisa mexer) ...
  // ── Atualizar dados do usuário ────────────────────────────────────────────
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(LEGACY_USER_ROLES).optional(),
      roleCode: COMPANY_ROLE_INPUT.optional(),
      empresaId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

        const [target] = await db.select().from(users).where(and(eq(users.id, input.id), isNull(users.deletedAt))).limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

        if (ctx.user.role !== "master_admin") {
          const accessibleIds = await listAccessibleCompanyIds(ctx.user);
          if (!target.empresaId || !accessibleIds.includes(target.empresaId)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode editar este usuário." });
          }
        }

        const updateData: Record<string, unknown> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.lastName !== undefined) updateData.lastName = input.lastName;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.role !== undefined) {
          if (input.role === "master_admin" && ctx.user.role !== "master_admin") {
            throw new TRPCError({ code: "FORBIDDEN", message: "Apenas Master ADM pode promover a Master ADM" });
          }
          updateData.role = input.role;
        }
        if (input.empresaId !== undefined) {
          updateData.empresaId =
            input.empresaId === null ? null : await resolveAccessibleEmpresaId(ctx, input.empresaId);
        }

        await updateUser(input.id, updateData);
        if (updateData.empresaId) {
          await ensurePrimaryCompanyAccess({
            userId: input.id,
            empresaId: updateData.empresaId as number,
            roleCode: input.roleCode ?? input.role ?? target.role,
            createdBy: ctx.user.id,
          });
        }
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar usuário" });
      }
    }),

  // ── Trocar senha de qualquer usuário (admin/master) ───────────────────────
  changePassword: adminProcedure
    .input(z.object({
      userId: z.number(),
      newPassword: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

        const [target] = await db.select().from(users).where(and(eq(users.id, input.userId), isNull(users.deletedAt)));
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

        if (ctx.user.role !== "master_admin") {
          const accessibleIds = await listAccessibleCompanyIds(ctx.user);
          if (!target.empresaId || !accessibleIds.includes(target.empresaId)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para alterar este usuário" });
          }
        }

        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await db.update(users).set({ password: hashedPassword } as any).where(eq(users.id, input.userId));
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao trocar senha" });
      }
    }),

  // ── Alterar própria senha (usuário logado) ────────────────────────────────
  changeOwnPassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, "Informe a senha atual"),
      newPassword: z.string().min(6, "Nova senha deve ter ao menos 6 caracteres"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

        const [currentUser] = await db.select().from(users).where(eq(users.id, ctx.user.id));
        if (!currentUser) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

        const valid = await bcrypt.compare(input.currentPassword, currentUser.password);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha atual incorreta" });

        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await db.update(users).set({ password: hashedPassword } as any).where(eq(users.id, ctx.user.id));
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao alterar senha" });
      }
    }),

  // ── Aprovar usuário ───────────────────────────────────────────────────────
  approve: adminProcedure
    .input(z.object({
      id: z.number(),
      empresaId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updateData: Record<string, unknown> = { status: "approved" };
        if (ctx.user.role === "admin" && (ctx.user as any).empresaId) {
          updateData.empresaId = (ctx.user as any).empresaId;
        } else if (input.empresaId) {
          updateData.empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        }
        await updateUser(input.id, updateData);
        if (updateData.empresaId) {
          await ensurePrimaryCompanyAccess({
            userId: input.id,
            empresaId: updateData.empresaId as number,
            roleCode: "leitor",
            createdBy: ctx.user.id,
          });
        }
        return { success: true };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao aprovar usuário" });
      }
    }),

  // ── Rejeitar usuário ──────────────────────────────────────────────────────
  reject: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await updateUser(input.id, { status: "rejected" });
        return { success: true };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao rejeitar usuário" });
      }
    }),

  // ── Deletar usuário ───────────────────────────────────────────────────────
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
        await db.update(users).set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
          deleteReason: "Desativado pelo administrador",
          status: "rejected",
          updatedAt: new Date(),
        } as any).where(eq(users.id, input.id));
        return { success: true };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao deletar usuário" });
      }
    }),

  // ── Vincular usuário a empresa (master_admin only) ────────────────────────
  setEmpresa: masterAdminProcedure
    .input(z.object({
      userId: z.number(),
      empresaId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
        await db.update(users).set({ empresaId: input.empresaId } as any).where(eq(users.id, input.userId));
        if (input.empresaId) {
          await ensurePrimaryCompanyAccess({
            userId: input.userId,
            empresaId: input.empresaId,
            roleCode: "leitor",
          });
        }
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao vincular empresa" });
      }
    }),

  listCompanyAccess: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const rows = await db
        .select()
        .from(userCompanyAccess)
        .where(and(eq(userCompanyAccess.userId, input.userId), isNull(userCompanyAccess.deletedAt)));

      if (ctx.user.role === "master_admin") {
        return rows;
      }

      const accessibleIds = await listAccessibleCompanyIds(ctx.user);
      return rows.filter(row => accessibleIds.includes(row.empresaId));
    }),

  saveCompanyAccess: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        accessos: z.array(
          z.object({
            empresaId: z.number(),
            roleCode: COMPANY_ROLE_INPUT,
            canViewGroup: z.boolean().default(false),
            isDefault: z.boolean().default(false),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const allowedAccess = ctx.user.role === "master_admin"
        ? input.accessos
        : await Promise.all(
            input.accessos.map(async acesso => ({
              ...acesso,
              empresaId: await resolveAccessibleEmpresaId(ctx, acesso.empresaId),
            }))
          );

      await db
        .update(userCompanyAccess)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
          deleteReason: "Acessos substituídos",
          updatedAt: new Date(),
        })
        .where(and(eq(userCompanyAccess.userId, input.userId), isNull(userCompanyAccess.deletedAt)));

      for (const acesso of allowedAccess) {
        await db.insert(userCompanyAccess).values({
          userId: input.userId,
          empresaId: acesso.empresaId,
          roleCode: acesso.roleCode,
          canViewGroup: acesso.canViewGroup,
          isDefault: acesso.isDefault,
          ativo: true,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const defaultAccess = allowedAccess.find(acesso => acesso.isDefault) ?? allowedAccess[0];
      if (defaultAccess) {
        await db.update(users).set({ empresaId: defaultAccess.empresaId, updatedAt: new Date() }).where(eq(users.id, input.userId));
      }

      return { success: true };
    }),

  // ── Atualizar próprio perfil ──────────────────────────────────────────────────
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
      phone: z.string().optional().nullable(),
      bio: z.string().max(500).optional().nullable(),
      avatarUrl: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
        const updateData: Record<string, any> = { updatedAt: new Date() };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.bio !== undefined) updateData.bio = input.bio;
        if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;
        await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));
        const [updated] = await db.select().from(users).where(eq(users.id, ctx.user.id));
        const { password: _pw, ...safeUser } = updated as any;
        return safeUser;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar perfil" });
      }
    }),

  // ── Listar empresas disponíveis para vínculo ────────────────────────────────────────────
  listEmpresas: adminProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return [];
      const { empresas } = await import("../drizzle/schema");
      const accessibleIds = ctx.user.role === "master_admin"
        ? undefined
        : await listAccessibleCompanyIds(ctx.user);
      if (ctx.user.role !== "master_admin" && (!accessibleIds || accessibleIds.length === 0)) {
        return [];
      }

      const all = await db.select({ id: empresas.id, nome: empresas.nome }).from(empresas).where(
        and(
          isNull(empresas.deletedAt),
          accessibleIds ? inArray(empresas.id, accessibleIds) : undefined,
        )
      );
      return all;
    } catch {
      return [];
    }
  }),
});
