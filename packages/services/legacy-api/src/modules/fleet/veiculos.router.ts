import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { veiculos, funcionarios } from "../drizzle/schema";
import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

// Apenas placa e tipo são obrigatórios — todo o resto é opcional
const veiculoInput = z.object({
  empresaId: z.number(),
  placa: z.string().min(1, "Placa é obrigatória").max(10).transform(v => v.toUpperCase().trim()),
  tipo: z.enum(["van", "toco", "truck", "cavalo", "carreta", "empilhadeira", "paletera", "outro"]),
  cavaloPrincipalId: z.number().nullable().optional(),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  ano: z.number().min(1900).max(2100).nullable().optional(),
  cor: z.string().max(50).optional(),
  renavam: z.string().max(20).optional(),
  chassi: z.string().max(30).optional(),
  capacidadeCarga: z.string().nullable().optional(),
  motoristaId: z.number().nullable().optional(),
  ajudanteId: z.number().nullable().optional(),
  kmAtual: z.number().nullable().optional(),
  mediaConsumo: z.string().nullable().optional(),
  vencimentoCrlv: z.string().nullable().optional(),
  vencimentoSeguro: z.string().nullable().optional(),
  classificacao: z.number().min(0).max(5).optional(),
  observacoes: z.string().optional(),
});

function parseDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

export const veiculosRouter = router({
  list: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      tipo: z.enum(["van", "toco", "truck", "cavalo", "carreta", "empilhadeira", "paletera", "outro"]).optional(),
      apenasAtivos: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.list");
        return db.select().from(veiculos)
          .where(and(
            eq(veiculos.empresaId, input.empresaId),
            isNull(veiculos.deletedAt),
            input.apenasAtivos ? eq(veiculos.ativo, true) : undefined,
            input.tipo ? eq(veiculos.tipo, input.tipo) : undefined,
          ))
          .orderBy(veiculos.placa);
      }, "veiculos.list");
    }),

  listCavalos: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.listCavalos");
        return db.select().from(veiculos)
          .where(and(
            eq(veiculos.empresaId, input.empresaId),
            eq(veiculos.tipo, "cavalo"),
            eq(veiculos.ativo, true),
            isNull(veiculos.deletedAt),
          ))
          .orderBy(veiculos.placa);
      }, "veiculos.listCavalos");
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.getById");
        const rows = await db.select().from(veiculos)
          .where(and(
            eq(veiculos.id, input.id),
            isNull(veiculos.deletedAt),
            ctx.user.role !== "master_admin" ? eq(veiculos.empresaId, ctx.user.empresaId!) : undefined
          ))
          .limit(1);
        return rows[0] ?? null;
      }, "veiculos.getById");
    }),

  create: protectedProcedure
    .input(veiculoInput)
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.create");
        const empresaId = ctx.user.role !== "master_admin" ? ctx.user.empresaId! : input.empresaId;
        const [result] = await db.insert(veiculos).values({
          ...input,
          empresaId,
          capacidadeCarga: input.capacidadeCarga ?? null,
          mediaConsumo: input.mediaConsumo ?? null,
          vencimentoCrlv: parseDate(input.vencimentoCrlv),
          vencimentoSeguro: parseDate(input.vencimentoSeguro),
          ativo: true,
        }).returning({ id: veiculos.id });
        return { id: result.id };
      }, "veiculos.create");
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(veiculoInput.partial()))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.update");
        const { id, ...data } = input;
        const whereClause = [eq(veiculos.id, id)];
        if (ctx.user.role !== "master_admin") {
          whereClause.push(eq(veiculos.empresaId, ctx.user.empresaId!));
        }
        const [updated] = await db.update(veiculos).set({
          ...data,
          placa: data.placa ? data.placa.toUpperCase().trim() : undefined,
          vencimentoCrlv: data.vencimentoCrlv !== undefined ? parseDate(data.vencimentoCrlv) : undefined,
          vencimentoSeguro: data.vencimentoSeguro !== undefined ? parseDate(data.vencimentoSeguro) : undefined,
          updatedAt: new Date(),
        }).where(and(...whereClause)).returning();
        if (!updated) throw new Error("Veículo não encontrado ou sem permissão");
        return { success: true };
      }, "veiculos.update");
    }),

  softDelete: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo da exclusão") }))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.softDelete");
        await db.update(veiculos).set({
          deletedAt: new Date(),
          deletedBy: ctx.user!.id,
          deleteReason: input.reason,
          ativo: false,
        }).where(eq(veiculos.id, input.id));
        return { success: true };
      }, "veiculos.softDelete");
    }),

  restore: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.restore");
        await db.update(veiculos).set({
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          ativo: true,
        }).where(eq(veiculos.id, input.id));
        return { success: true };
      }, "veiculos.restore");
    }),

  getUltimoKm: protectedProcedure
    .input(z.object({ veiculoId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.getUltimoKm");
        // Busca o maior KM entre viagens, abastecimentos e odômetro do veículo
        const rows = await db.execute(sql`
          SELECT GREATEST(
            COALESCE((SELECT MAX("kmChegada") FROM viagens WHERE "veiculoId" = ${input.veiculoId} AND "kmChegada" IS NOT NULL), 0),
            COALESCE((SELECT MAX("kmSaida") FROM viagens WHERE "veiculoId" = ${input.veiculoId} AND "kmSaida" IS NOT NULL), 0),
            COALESCE((SELECT MAX("kmAtual") FROM abastecimentos WHERE "veiculoId" = ${input.veiculoId} AND "kmAtual" IS NOT NULL), 0),
            COALESCE((SELECT "kmAtual" FROM veiculos WHERE id = ${input.veiculoId}), 0)
          ) as ultimoKm
        `);
        const r = (rows as unknown as any[])[0] ?? {};
        const km = Number(r.ultimoKm) || null;
        return { kmAtual: km };
      }, "veiculos.getUltimoKm");
    }),

  listDeleted: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "veiculos.listDeleted");
        return db.select().from(veiculos)
          .where(and(
            eq(veiculos.empresaId, input.empresaId),
            isNotNull(veiculos.deletedAt),
          ))
          .orderBy(desc(veiculos.deletedAt));
      }, "veiculos.listDeleted");
    }),
});
