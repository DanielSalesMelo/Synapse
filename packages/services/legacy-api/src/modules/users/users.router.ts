import { publicProcedure, router, adminProcedure, masterAdminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getAllUsers, updateUser, deleteUser, getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const usersRouter = router({
  // Listar todos os usuários (apenas para admins)
  listAll: adminProcedure.query(async ({ ctx }) => {

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

  // Atualizar dados do usuário
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(["user", "admin", "master_admin", "monitor", "dispatcher"]).optional(),
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
            throw new TRPCError({ code: "FORBIDDEN", message: "Apenas master_admin pode promover a master_admin" });
          }
          updateData.role = input.role;
        }
        if (input.empresaId !== undefined) updateData.empresaId = input.empresaId;

        await updateUser(input.id, updateData);
        return { success: true };
      } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao atualizar usuário" });
      }
    }),

  // Aprovar usuário (mudar status de pending para approved)
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
        console.error("Erro ao aprovar usuário:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao aprovar usuário" });
      }
    }),

  // Rejeitar usuário (mudar status de pending para rejected)
  reject: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {

      try {
        await updateUser(input.id, { status: "rejected" });
        return { success: true };
      } catch (error) {
        console.error("Erro ao rejeitar usuário:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao rejeitar usuário" });
      }
    }),

  // Deletar usuário
  delete: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {

      try {
        await deleteUser(input.id);
        return { success: true };
      } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao deletar usuário" });
      }
    }),

  // Vincular usuário a uma empresa (master_admin only)
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
});
