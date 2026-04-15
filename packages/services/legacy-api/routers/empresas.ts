import { masterAdminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { empresas, users } from "../drizzle/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";

function gerarCodigoConvite(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    codigo += chars[bytes[i] % chars.length];
  }
  return codigo;
}

export const empresasRouter = router({
  list: masterAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    return await db.select().from(empresas).where(isNull(empresas.deletedAt)).orderBy(empresas.nome);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      if (ctx.user.role !== "master_admin" && (ctx.user as any).empresaId !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const [empresa] = await db.select().from(empresas).where(and(eq(empresas.id, input.id), isNull(empresas.deletedAt))).limit(1);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
      return empresa;
    }),

  validarConvite: protectedProcedure
    .input(z.object({ codigo: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const codigoUpper = input.codigo.trim().toUpperCase();
      const idNumerico = parseInt(input.codigo);

      const empresa = (await db
        .select({ id: empresas.id, nome: empresas.nome, codigoConvite: empresas.codigoConvite, ativo: empresas.ativo })
        .from(empresas)
        .where(
          and(
            isNull(empresas.deletedAt),
            eq(empresas.ativo, true),
            !isNaN(idNumerico)
              ? or(eq(empresas.id, idNumerico), eq(empresas.codigoConvite, codigoUpper))
              : eq(empresas.codigoConvite, codigoUpper)
          )
        )
        .limit(1)
      )[0];

      if (!empresa) {
        return { valido: false, empresa: null };
      }

      return {
        valido: true,
        empresa: {
          id: empresa.id,
          nome: empresa.nome,
          codigoConvite: empresa.codigoConvite,
        },
      };
    }),

  listarUsuarios: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      if (ctx.user.role !== "master_admin" && (ctx.user as any).empresaId !== input.empresaId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, empresaId: users.empresaId, createdAt: users.createdAt }).from(users).where(eq(users.empresaId, input.empresaId));
    }),

  // ─── CRIAR EMPRESA ───────────────────────────────────────────────────────
  criar: masterAdminProcedure
    .input(z.object({
      nome: z.string().min(2, "Nome obrigatório"),
      cnpj: z.string().optional(),
      email: z.string().optional(),
      telefone: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().max(2).optional(),
      tipoEmpresa: z.enum(["independente", "matriz", "filial"]).default("independente"),
      matrizId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Gerar código de convite único
      let codigoConvite = gerarCodigoConvite();
      for (let i = 0; i < 10; i++) {
        const existing = await db.select({ id: empresas.id }).from(empresas).where(eq(empresas.codigoConvite, codigoConvite)).limit(1);
        if (existing.length === 0) break;
        codigoConvite = gerarCodigoConvite();
      }

      const [nova] = await db.insert(empresas).values({
        nome: input.nome,
        cnpj: input.cnpj || null,
        email: input.email || null,
        telefone: input.telefone || null,
        cidade: input.cidade || null,
        estado: input.estado || null,
        codigoConvite,
        tipoEmpresa: input.tipoEmpresa as any,
        matrizId: input.matrizId || null,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return nova;
    }),

  // ─── ATUALIZAR EMPRESA ───────────────────────────────────────────────────
  atualizar: masterAdminProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().min(2).optional(),
      cnpj: z.string().optional(),
      email: z.string().optional(),
      telefone: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().max(2).optional(),
      tipoEmpresa: z.enum(["independente", "matriz", "filial"]).optional(),
      matrizId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, ...dados } = input;
      const [updated] = await db.update(empresas)
        .set({ ...dados, updatedAt: new Date() } as any)
        .where(and(eq(empresas.id, id), isNull(empresas.deletedAt)))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
      return updated;
    }),

  // ─── TOGGLE ATIVO/INATIVO ────────────────────────────────────────────────
  toggleAtivo: masterAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [empresa] = await db.select({ id: empresas.id, ativo: empresas.ativo })
        .from(empresas).where(and(eq(empresas.id, input.id), isNull(empresas.deletedAt))).limit(1);
      if (!empresa) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
      const [updated] = await db.update(empresas)
        .set({ ativo: !empresa.ativo, updatedAt: new Date() })
        .where(eq(empresas.id, input.id)).returning();
      return updated;
    }),

  // ─── REGENERAR CÓDIGO DE CONVITE ─────────────────────────────────────────
  regenerarConvite: masterAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      let codigoConvite = gerarCodigoConvite();
      for (let i = 0; i < 10; i++) {
        const existing = await db.select({ id: empresas.id }).from(empresas).where(eq(empresas.codigoConvite, codigoConvite)).limit(1);
        if (existing.length === 0) break;
        codigoConvite = gerarCodigoConvite();
      }
      const [updated] = await db.update(empresas)
        .set({ codigoConvite, updatedAt: new Date() })
        .where(and(eq(empresas.id, input.id), isNull(empresas.deletedAt))).returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
      return updated;
    }),

  // ─── DELETAR EMPRESA (soft delete) ───────────────────────────────────────
  deletar: masterAdminProcedure
    .input(z.object({ id: z.number(), motivo: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [deleted] = await db.update(empresas)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
          deleteReason: input.motivo || "Removida pelo master admin",
          updatedAt: new Date(),
        })
        .where(and(eq(empresas.id, input.id), isNull(empresas.deletedAt))).returning();
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
      return { success: true };
    }),
});
