import { router, adminProcedure, masterAdminProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getAllUsers, updateUser, deleteUser, getDb, getUserByEmail } from "../db";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ─── Todos os perfis de acesso do Synapse ────────────────────────────────────
const ALL_ROLES = [
  "user",
  "admin",
  "master_admin",
  "monitor",
  "dispatcher",
  "ti_master",
  "financeiro",
  "comercial",
  "motorista",
  "operador_wms",
  "rh",
] as const;

export const usersRouter = router({

  // ── Criar usuário (admin cria para sua empresa; master_admin pode escolher) ──
  create: adminProcedure
    .input(z.object({
      name: z.string().min(2),
      lastName: z.string().optional(),
      email: z.string().email(),
      password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
      phone: z.string().optional(),
      role: z.enum(ALL_ROLES).default("user"),
      empresaId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

        // Verificar e-mail duplicado
        const existing = await getUserByEmail(input.email).catch(() => null);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado no sistema" });

        // Determinar empresa vinculada
        let targetEmpresaId = input.empresaId;
        if (ctx.user.role !== "master_admin") {
          targetEmpresaId = (ctx.user as any).empresaId;
        }
        if (!targetEmpresaId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "É obrigatório vincular o usuário a uma empresa" });
        }

        // Apenas master_admin pode criar outro master_admin
        if (input.role === "master_admin" && ctx.user.role !== "master_admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas Master ADM pode criar outro Master ADM" });
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);
        await db.insert(users).values({
          name: input.name,
          lastName: input.lastName ?? "",
          email: input.email,
          password: hashedPassword,
          phone: input.phone ?? "",
          role: input.role as any,
          status: "approved", // criado pelo admin já vem aprovado
          empresaId: targetEmpresaId,
        } as any);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar usuário" });
      }
    }),

  // ── Listar todos os usuários ──────────────────────────────────────────────
  listAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const allUsers = await getAllUsers();
      // Admin só vê usuários da sua empresa; master_admin vê todos
      const filtered = ctx.user.role === "master_admin"
        ? allUsers
        : allUsers.filter(u => (u as any).empresaId === (ctx.user as any).empresaId);
      return filtered.map(user => ({
        id: user.id,
        name: user.name || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
        status: user.status,
        empresaId: (user as any).empresaId ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao listar usuários" });
    }
  }),

  // ── Atualizar dados do usuário ────────────────────────────────────────────
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(ALL_ROLES).optional(),
      empresaId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
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
        if (input.empresaId !== undefined) updateData.empresaId = input.empresaId;

        await updateUser(input.id, updateData);
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

        // Admin só pode trocar senha de usuários da mesma empresa
        if (ctx.user.role !== "master_admin") {
          const [target] = await db.select().from(users).where(eq(users.id, input.userId));
          if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
          if ((target as any).empresaId !== (ctx.user as any).empresaId) {
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
          updateData.empresaId = input.empresaId;
        }
        await updateUser(input.id, updateData);
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
    .mutation(async ({ input }) => {
      try {
        await deleteUser(input.id);
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
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao vincular empresa" });
      }
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
      const all = await db.select({ id: empresas.id, nome: empresas.nome }).from(empresas);
      if (ctx.user.role !== "master_admin") {
        return all.filter((e) => e.id === (ctx.user as any).empresaId);
      }
      return all;
    } catch {
      return [];
    }
  }),
});
