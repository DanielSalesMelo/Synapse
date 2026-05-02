import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { contasPagar, funcionarios } from "../drizzle/schema";
import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";
import { createAuditLog } from "../_core/audit";
import { resolveAccessibleEmpresaId } from "../_core/access";

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
  // Novos campos de RH
  dataNascimento: z.string().nullable().optional(),
  estadoCivil: z.string().max(20).optional(),
  escolaridade: z.string().max(50).optional(),
  tituloEleitor: z.string().max(20).optional(),
  pis: z.string().max(20).optional(),
  ctps: z.string().max(20).optional(),
  serieCtps: z.string().max(10).optional(),
  ufCtps: z.string().max(2).optional(),
  dataExpedicaoRg: z.string().nullable().optional(),
  orgaoEmissorRg: z.string().max(20).optional(),
  // Benefícios
  temPlanoSaude: z.boolean().optional(),
  temValeRefeicao: z.boolean().optional(),
  temValeTransporte: z.boolean().optional(),
  valorValeRefeicao: z.string().nullable().optional(),
});

function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const funcionariosRouter = router({
  dashboard: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.dashboard");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);

        const [stats] = await db.select({
          total: sql<number>`count(*)`,
          ativos: sql<number>`count(*) filter (where ${funcionarios.ativo} = true and ${funcionarios.deletedAt} is null)`,
          inativos: sql<number>`count(*) filter (where ${funcionarios.ativo} = false and ${funcionarios.deletedAt} is null)`,
          motoristas: sql<number>`count(*) filter (where ${funcionarios.funcao} = 'motorista' and ${funcionarios.deletedAt} is null)`,
          ajudantes: sql<number>`count(*) filter (where ${funcionarios.funcao} = 'ajudante' and ${funcionarios.deletedAt} is null)`,
          folhaAtiva: sql<number>`coalesce(sum(${funcionarios.salario}) filter (where ${funcionarios.ativo} = true and ${funcionarios.deletedAt} is null), 0)`,
          alertasDocumentos: sql<number>`count(*) filter (
            where ${funcionarios.deletedAt} is null and (
              (${funcionarios.vencimentoCnh} is not null and ${funcionarios.vencimentoCnh} <= current_date + interval '30 days')
              or (${funcionarios.vencimentoAso} is not null and ${funcionarios.vencimentoAso} <= current_date + interval '30 days')
              or (${funcionarios.vencimentoMopp} is not null and ${funcionarios.vencimentoMopp} <= current_date + interval '30 days')
            )
          )`,
          bloqueadosOperacionalmente: sql<number>`count(*) filter (
            where ${funcionarios.deletedAt} is null and ${funcionarios.funcao} in ('motorista', 'ajudante') and (
              (${funcionarios.vencimentoCnh} is not null and ${funcionarios.vencimentoCnh} < current_date)
              or (${funcionarios.vencimentoAso} is not null and ${funcionarios.vencimentoAso} < current_date)
              or (${funcionarios.vencimentoMopp} is not null and ${funcionarios.vencimentoMopp} < current_date)
            )
          )`,
        }).from(funcionarios).where(eq(funcionarios.empresaId, empresaId));

        const distribuicaoFuncao = await db.select({
          funcao: funcionarios.funcao,
          total: sql<number>`count(*)`,
        }).from(funcionarios)
          .where(and(eq(funcionarios.empresaId, empresaId), isNull(funcionarios.deletedAt)))
          .groupBy(funcionarios.funcao)
          .orderBy(funcionarios.funcao);

        const vencimentos = await db.select({
          id: funcionarios.id,
          nome: funcionarios.nome,
          funcao: funcionarios.funcao,
          vencimentoCnh: funcionarios.vencimentoCnh,
          vencimentoAso: funcionarios.vencimentoAso,
          vencimentoMopp: funcionarios.vencimentoMopp,
        }).from(funcionarios)
          .where(and(eq(funcionarios.empresaId, empresaId), isNull(funcionarios.deletedAt)))
          .orderBy(funcionarios.nome);

        return {
          ...stats,
          folhaAtiva: Number(stats?.folhaAtiva || 0),
          distribuicaoFuncao,
          vencimentos,
        };
      }, "funcionarios.dashboard");
    }),

  folhaResumo: protectedProcedure
    .input(z.object({ empresaId: z.number(), limit: z.number().min(1).max(24).default(12) }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.folhaResumo");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        return db.select({
          competencia: sql<string>`to_char(date_trunc('month', ${contasPagar.dataVencimento}), 'MM/YYYY')`,
          referencia: sql<string>`to_char(date_trunc('month', ${contasPagar.dataVencimento}), 'YYYY-MM-01')`,
          funcionarios: sql<number>`count(distinct ${contasPagar.funcionarioId})`,
          totalBruto: sql<number>`coalesce(sum(${contasPagar.valor}), 0)`,
          pagos: sql<number>`count(*) filter (where ${contasPagar.status} = 'pago')`,
          pendentes: sql<number>`count(*) filter (where ${contasPagar.status} in ('pendente', 'vencido'))`,
        }).from(contasPagar)
          .where(and(
            eq(contasPagar.empresaId, empresaId),
            eq(contasPagar.categoria, "salario"),
            isNull(contasPagar.deletedAt),
          ))
          .groupBy(sql`date_trunc('month', ${contasPagar.dataVencimento})`)
          .orderBy(sql`date_trunc('month', ${contasPagar.dataVencimento}) desc`)
          .limit(input.limit);
      }, "funcionarios.folhaResumo");
    }),

  beneficiosResumo: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.beneficiosResumo");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        const [stats] = await db.select({
          planoSaude: sql<number>`count(*) filter (where ${funcionarios.temPlanoSaude} = true and ${funcionarios.deletedAt} is null and ${funcionarios.ativo} = true)`,
          valeRefeicao: sql<number>`count(*) filter (where ${funcionarios.temValeRefeicao} = true and ${funcionarios.deletedAt} is null and ${funcionarios.ativo} = true)`,
          valeTransporte: sql<number>`count(*) filter (where ${funcionarios.temValeTransporte} = true and ${funcionarios.deletedAt} is null and ${funcionarios.ativo} = true)`,
          totalValeRefeicao: sql<number>`coalesce(sum(${funcionarios.valorValeRefeicao}) filter (where ${funcionarios.temValeRefeicao} = true and ${funcionarios.deletedAt} is null and ${funcionarios.ativo} = true), 0)`,
        }).from(funcionarios).where(eq(funcionarios.empresaId, empresaId));
        return {
          planoSaude: Number(stats?.planoSaude) || 0,
          valeRefeicao: Number(stats?.valeRefeicao) || 0,
          valeTransporte: Number(stats?.valeTransporte) || 0,
          totalValeRefeicao: Number(stats?.totalValeRefeicao) || 0,
        };
      }, "funcionarios.beneficiosResumo");
    }),

  previsaoFolha: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.previsaoFolha");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        const [stats] = await db.select({
          totalSalarios: sql<number>`coalesce(sum(${funcionarios.salario}) filter (where ${funcionarios.deletedAt} is null and ${funcionarios.ativo} = true), 0)`,
          totalValeRefeicao: sql<number>`coalesce(sum(${funcionarios.valorValeRefeicao}) filter (where ${funcionarios.deletedAt} is null and ${funcionarios.ativo} = true and ${funcionarios.temValeRefeicao} = true), 0)`,
          headcount: sql<number>`count(*) filter (where ${funcionarios.deletedAt} is null and ${funcionarios.ativo} = true)`,
        }).from(funcionarios).where(eq(funcionarios.empresaId, empresaId));

        const totalSalarios = Number(stats?.totalSalarios) || 0;
        const totalValeRefeicao = Number(stats?.totalValeRefeicao) || 0;
        const encargosEstimados = totalSalarios * 0.28;
        const custoTotal = totalSalarios + totalValeRefeicao + encargosEstimados;

        return {
          headcount: Number(stats?.headcount) || 0,
          totalSalarios,
          totalValeRefeicao,
          encargosEstimados,
          custoTotal,
        };
      }, "funcionarios.previsaoFolha");
    }),

  list: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      funcao: z.enum(["motorista", "ajudante", "despachante", "gerente", "admin", "outro"]).optional(),
      tipoContrato: z.enum(["clt", "freelancer", "terceirizado", "estagiario"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.list");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, empresaId),
            isNull(funcionarios.deletedAt),
            input.funcao ? eq(funcionarios.funcao, input.funcao) : undefined,
            input.tipoContrato ? eq(funcionarios.tipoContrato, input.tipoContrato) : undefined,
          ))
          .orderBy(funcionarios.nome);
      }, "funcionarios.list");
    }),

  listMotoristas: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.listMotoristas");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, empresaId),
            eq(funcionarios.funcao, "motorista"),
            isNull(funcionarios.deletedAt),
          ))
          .orderBy(funcionarios.nome);
      }, "funcionarios.listMotoristas");
    }),

  listAjudantes: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.listAjudantes");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, empresaId),
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
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.freelancersPendentes");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        const hoje = new Date();
        const rows = await db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, empresaId),
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
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
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
          dataNascimento: input.dataNascimento || null,
          dataExpedicaoRg: input.dataExpedicaoRg || null,
          ativo: true,
        }).returning({ id: funcionarios.id });
        
        const result = results[0];
        if (!result) {
          throw new Error("Falha ao criar funcionário: nenhum resultado retornado");
        }

        await createAuditLog(ctx, {
          acao: "CREATE",
          tabela: "funcionarios",
          registroId: result.id,
          dadosDepois: input,
        });

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

        const [oldData] = await db.select().from(funcionarios).where(and(...whereClause)).limit(1);
        if (!oldData) throw new Error("Funcionário não encontrado ou sem permissão");

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

        await createAuditLog(ctx, {
          acao: "UPDATE",
          tabela: "funcionarios",
          registroId: id,
          dadosAntes: oldData,
          dadosDepois: updated,
        });

        return { success: true };
      }, "funcionarios.update");
    }),

  // Integração RH -> Financeiro: Lançar folha de pagamento
  lancarFolha: adminProcedure
    .input(z.object({
      empresaId: z.number(),
      mes: z.number().min(1).max(12),
      ano: z.number(),
      dataVencimento: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.lancarFolha");
        const { contasPagar } = await import("../drizzle/schema");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);

        // Buscar todos os funcionários ativos da empresa que têm salário definido
        const funcs = await db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, empresaId),
            eq(funcionarios.ativo, true),
            isNull(funcionarios.deletedAt),
            isNotNull(funcionarios.salario)
          ));

        let lancados = 0;
        let beneficiosLancados = 0;
        let encargosLancados = 0;
        for (const f of funcs) {
          const salario = Number(f.salario ?? 0);
          const vr = f.temValeRefeicao ? Number(f.valorValeRefeicao ?? 0) : 0;
          const vt = f.temValeTransporte ? Math.round((salario * 0.06) * 100) / 100 : 0;
          const planoSaude = f.temPlanoSaude ? 350 : 0;
          const encargos = Math.round((salario * 0.28) * 100) / 100;

          await db.insert(contasPagar).values({
            empresaId,
            descricao: `Salário ${f.nome} - Ref: ${input.mes}/${input.ano}`,
            categoria: "salario",
            valor: f.salario!,
            dataVencimento: input.dataVencimento,
            status: "pendente",
            funcionarioId: f.id,
          });
          lancados++;

          if (vr > 0) {
            await db.insert(contasPagar).values({
              empresaId,
              descricao: `Vale refeição ${f.nome} - Ref: ${input.mes}/${input.ano}`,
              categoria: "outro",
              valor: String(vr),
              dataVencimento: input.dataVencimento,
              status: "pendente",
              funcionarioId: f.id,
              observacoes: "Benefício automático de folha",
            });
            beneficiosLancados++;
          }

          if (vt > 0) {
            await db.insert(contasPagar).values({
              empresaId,
              descricao: `Vale transporte ${f.nome} - Ref: ${input.mes}/${input.ano}`,
              categoria: "outro",
              valor: String(vt),
              dataVencimento: input.dataVencimento,
              status: "pendente",
              funcionarioId: f.id,
              observacoes: "Benefício automático de folha",
            });
            beneficiosLancados++;
          }

          if (planoSaude > 0) {
            await db.insert(contasPagar).values({
              empresaId,
              descricao: `Plano de saúde ${f.nome} - Ref: ${input.mes}/${input.ano}`,
              categoria: "seguro",
              valor: String(planoSaude),
              dataVencimento: input.dataVencimento,
              status: "pendente",
              funcionarioId: f.id,
              observacoes: "Benefício automático de folha",
            });
            beneficiosLancados++;
          }

          if (encargos > 0) {
            await db.insert(contasPagar).values({
              empresaId,
              descricao: `Encargos estimados ${f.nome} - Ref: ${input.mes}/${input.ano}`,
              categoria: "outro",
              valor: String(encargos),
              dataVencimento: input.dataVencimento,
              status: "pendente",
              funcionarioId: f.id,
              observacoes: "Encargo estimado automático de folha (28%)",
            });
            encargosLancados++;
          }
        }

        await createAuditLog(ctx, {
          acao: "CREATE",
          tabela: "contas_pagar",
          registroId: 0,
          dadosDepois: {
            mes: input.mes,
            ano: input.ano,
            totalLancados: lancados,
            beneficiosLancados,
            encargosLancados,
          },
        });

        return {
          success: true,
          totalLancados: lancados,
          beneficiosLancados,
          encargosLancados,
          totalRegistros: lancados + beneficiosLancados + encargosLancados,
        };
      }, "funcionarios.lancarFolha");
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
    .query(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "funcionarios.listDeleted");
        const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
        return db.select().from(funcionarios)
          .where(and(
            eq(funcionarios.empresaId, empresaId),
            isNotNull(funcionarios.deletedAt),
          ))
          .orderBy(desc(funcionarios.deletedAt));
      }, "funcionarios.listDeleted");
    }),
});
