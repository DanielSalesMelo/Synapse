import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { createAuditLog } from "../_core/audit";
import { getDb } from "../db";
import { checklists } from "../drizzle/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

const itemChecklistSchema = z.enum(["conforme", "nao_conforme", "nao_se_aplica"]).optional();

const checklistInput = z.object({
  empresaId: z.number(),
  veiculoId: z.number(),
  cavaloPrincipalId: z.number().nullable().optional(),
  motoristaId: z.number().nullable().optional(),
  turno: z.enum(["manha", "tarde", "noite"]).optional(),
  tipo: z.enum(["saida", "retorno", "revisao"]).default("saida"),
  // Itens
  cracha: itemChecklistSchema,
  cnh: itemChecklistSchema,
  documentosVeiculo: itemChecklistSchema,
  epi: itemChecklistSchema,
  computadorBordo: itemChecklistSchema,
  cinto: itemChecklistSchema,
  banco: itemChecklistSchema,
  direcao: itemChecklistSchema,
  luzesPainel: itemChecklistSchema,
  tacografo: itemChecklistSchema,
  extintor: itemChecklistSchema,
  portas: itemChecklistSchema,
  limpador: itemChecklistSchema,
  buzina: itemChecklistSchema,
  freioDeMao: itemChecklistSchema,
  alarmeCacamba: itemChecklistSchema,
  cabineLimpa: itemChecklistSchema,
  objetosSoltos: itemChecklistSchema,
  pneus: itemChecklistSchema,
  vazamentos: itemChecklistSchema,
  trianguloCones: itemChecklistSchema,
  espelhos: itemChecklistSchema,
  lonaCarga: itemChecklistSchema,
  faixasRefletivas: itemChecklistSchema,
  luzesLaterais: itemChecklistSchema,
  luzesFreio: itemChecklistSchema,
  farol: itemChecklistSchema,
  piscaAlerta: itemChecklistSchema,
  re: itemChecklistSchema,
  setas: itemChecklistSchema,
  macacoEstepe: itemChecklistSchema,
  lanternas: itemChecklistSchema,
  observacoes: z.string().optional(),
  assinaturaMotorista: z.string().optional(),
});

export const checklistsRouter = router({
  list: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      veiculoId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "checklists.list");
        return db.select().from(checklists)
          .where(and(
            eq(checklists.empresaId, input.empresaId),
            isNull(checklists.deletedAt),
            input.veiculoId ? eq(checklists.veiculoId, input.veiculoId) : undefined
          ))
          .orderBy(desc(checklists.createdAt))
          .limit(input.limit);
      }, "checklists.list");
    }),

  create: protectedProcedure
    .input(checklistInput)
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "checklists.create");
        const empresaId = ctx.user.role !== "master_admin" ? ctx.user.empresaId! : input.empresaId;
        
        // Contar itens não conformes
        const itens = Object.values(input).filter(v => v === "nao_conforme");
        const itensNaoConformes = itens.length;

        const [result] = await db.insert(checklists).values({
          ...input,
          empresaId,
          itensNaoConformes,
        }).returning({ id: checklists.id });

        await createAuditLog(ctx, {
          acao: "CREATE",
          tabela: "checklists",
          registroId: result.id,
          dadosDepois: input,
        });

        return { id: result.id };
      }, "checklists.create");
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "checklists.getById");
        const rows = await db.select().from(checklists)
          .where(and(
            eq(checklists.id, input.id),
            isNull(checklists.deletedAt),
            ctx.user.role !== "master_admin" ? eq(checklists.empresaId, ctx.user.empresaId!) : undefined
          ))
          .limit(1);
        return rows[0] ?? null;
      }, "checklists.getById");
    }),

  softDelete: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "checklists.softDelete");
        const [deleted] = await db.update(checklists).set({
          deletedAt: new Date(),
          deletedBy: ctx.user!.id,
          deleteReason: input.reason,
        }).where(eq(checklists.id, input.id)).returning();

        if (deleted) {
          await createAuditLog(ctx, {
            acao: "DELETE",
            tabela: "checklists",
            registroId: input.id,
            dadosAntes: { reason: input.reason },
          });
        }

        return { success: true };
      }, "checklists.softDelete");
    }),
});
