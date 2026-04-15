import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { funcionarios } from "../drizzle/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

// Apenas nome e função são obrigatórios — todo o resto é opcional
const funcionarioInput = z.object({
  empresaId: z.number(),
  nome: z.string().min(1, "Nome é obrigatório").max(255),
  funcao: z.enum(["motorista", "ajudante", "despachante", "gerente", "admin", "outro"]),
  tipoContrato: z.enum(["clt", "freelancer", "terceirizado", "estagiario"]).default("clt"),
  cpf: z.string().max(14).optional(),
  rg: z.string().max(20).optional(),
  telefone: z.string().max(20).optional(),
  email: z.string().email("E-mail inválido").max(320).optional().or(z.literal("")),
  // CLT
  salario: z.string().nullable().optional(),
  dataAdmissao: z.string().nullable().optional(),
  dataDemissao: z.string().nullable().optional(),
  // Freelancer
  valorDiaria: z.string().nullable().optional(),
  valorMensal: z.string().nullable().optional(),
  tipoCobranca: z.enum(["diaria", "mensal", "por_viagem"]).nullable().optional(),
  dataInicioContrato: z.string().nullable().optional(),
  dataFimContrato: z.string().nullable().optional(),
  diaPagamento: z.number().min(1).max(31).nullable().optional(),
  // Motorista
  cnh: z.string().max(20).optional(),
  categoriaCnh: z.string().max(5).optional(),
  vencimentoCnh: z.string().nullable().optional(),
  mopp: z.boolean().optional(),
  vencimentoMopp: z.string().nullable().optional(),
  vencimentoAso: z.string().nullable().optional(),
  // Bancário
  banco: z.string().max(100).optional(),
  agencia: z.string().max(10).optional(),
  conta: z.string().max(20).optional(),
  tipoConta: z.enum(["corrente", "poupanca", "pix"]).nullable().optional(),
  chavePix: z.string().max(255).optional(),
  observacoes: z.string().optional(),
  foto: z.string().optional(),
});

function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const funcionariosRouter = router({
  list: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      funcao: z.enum(["motorista", "ajudante", "despachante", "gerente", "admin", "outro"]).optional(),
      tipoContrato: z.enum(["clt", "freelancer", "terceirizado", "estagiario"]).optional(),
    }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.list");
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, input.empresaId),
            isNull(funcionarios.deletedAt),
            input.funcao ? eq(funcionarios.funcao, input.funcao) : undefined,
            input.tipoContrato ? eq(funcionarios.tipoContrato, input.tipoContrato) : undefined,
          ))
          .orderBy(funcionarios.nome);
      }, "funcionarios.list");
    }),

  listMotoristas: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.listMotoristas");
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, input.empresaId),
            eq(funcionarios.funcao, "motorista"),
            isNull(funcionarios.deletedAt),
          ))
          .orderBy(funcionarios.nome);
      }, "funcionarios.listMotoristas");
    }),

  listAjudantes: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.listAjudantes");
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, input.empresaId),
            eq(funcionarios.funcao, "ajudante"),
            isNull(funcionarios.deletedAt),
          ))
          .orderBy(funcionarios.nome);
      }, "funcionarios.listAjudantes");
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.getById");
        const rows = await db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.id, input.id),
            isNull(funcionarios.deletedAt),
            ctx.user.role !== "master_admin" ? eq(funcionarios.empresaId, ctx.user.empresaId!) : undefined
          ))
          .limit(1);
        return rows[0] ?? null;
      }, "funcionarios.getById");
    }),

  freelancersPendentes: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.freelancersPendentes");
        const hoje = new Date();
        const rows = await db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, input.empresaId),
            eq(funcionarios.tipoContrato, "freelancer"),
            isNull(funcionarios.deletedAt),
          ));
        return rows.filter(f => {
          if (!f.diaPagamento) return false;
          const diaAtual = hoje.getDate();
          const diff = f.diaPagamento - diaAtual;
          return diff >= 0 && diff <= 7;
        });
      }, "funcionarios.freelancersPendentes");
    }),

  create: protectedProcedure
    .input(funcionarioInput)
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.create");
        const empresaId = ctx.user.role !== "master_admin" ? ctx.user.empresaId! : input.empresaId;
        const results = await db.insert(funcionarios).values({
          ...input,
          empresaId,
          email: input.email || null,
          salario: input.salario ?? null,
          valorDiaria: input.valorDiaria ?? null,
          valorMensal: input.valorMensal ?? null,
          dataAdmissao: input.dataAdmissao || null,
          dataDemissao: input.dataDemissao || null,
          dataInicioContrato: input.dataInicioContrato || null,
          dataFimContrato: input.dataFimContrato || null,
          vencimentoCnh: input.vencimentoCnh || null,
          vencimentoMopp: input.vencimentoMopp || null,
          vencimentoAso: input.vencimentoAso || null,
          ativo: true,
        }).returning({ id: funcionarios.id });
        
        const result = results[0];
        if (!result) {
          throw new Error("Falha ao criar funcionário: nenhum resultado retornado");
        }
        return { id: result.id };
      }, "funcionarios.create");
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(funcionarioInput.partial()))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.update");
        const { id, ...data } = input;
        const whereClause = [eq(funcionarios.id, id)];
        if (ctx.user.role !== "master_admin") {
          whereClause.push(eq(funcionarios.empresaId, ctx.user.empresaId!));
        }
        const [updated] = await db.update(funcionarios).set({
          ...data,
          email: data.email !== undefined ? (data.email || null) : undefined,
          dataAdmissao: data.dataAdmissao !== undefined ? parseDate(data.dataAdmissao) : undefined,
          dataDemissao: data.dataDemissao !== undefined ? parseDate(data.dataDemissao) : undefined,
          dataInicioContrato: data.dataInicioContrato !== undefined ? parseDate(data.dataInicioContrato) : undefined,
          dataFimContrato: data.dataFimContrato !== undefined ? parseDate(data.dataFimContrato) : undefined,
          vencimentoCnh: data.vencimentoCnh !== undefined ? parseDate(data.vencimentoCnh) : undefined,
          vencimentoMopp: data.vencimentoMopp !== undefined ? parseDate(data.vencimentoMopp) : undefined,
          vencimentoAso: data.vencimentoAso !== undefined ? parseDate(data.vencimentoAso) : undefined,
          updatedAt: new Date(),
        }).where(and(...whereClause)).returning();
        if (!updated) throw new Error("Funcionário não encontrado ou sem permissão");
        return { success: true };
      }, "funcionarios.update");
    }),

  softDelete: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo da exclusão") }))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.softDelete");
        await db.update(funcionarios).set({
          deletedAt: new Date(),
          deletedBy: ctx.user!.id,
          deleteReason: input.reason,
          ativo: false,
        }).where(eq(funcionarios.id, input.id));
        return { success: true };
      }, "funcionarios.softDelete");
    }),

  restore: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.restore");
        await db.update(funcionarios).set({
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          ativo: true,
        }).where(eq(funcionarios.id, input.id));
        return { success: true };
      }, "funcionarios.restore");
    }),

  listDeleted: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.listDeleted");
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, input.empresaId),
            isNotNull(funcionarios.deletedAt),
          ))
          .orderBy(desc(funcionarios.deletedAt));
      }, "funcionarios.listDeleted");
    }),
});
