import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  abastecimentos,
  contasPagar,
  empresas,
  funcionarios,
  manutencoes,
  users,
  veiculos,
  viagens,
} from "../drizzle/schema";
import { and, eq, inArray, isNull, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { listAccessibleCompanyIds, resolveAccessibleEmpresaId } from "../_core/access";

export const dashboardRouter = router({
  resumo: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const em7dias = new Date(hoje);
      em7dias.setDate(hoje.getDate() + 7);

      const [veiculosResumo] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(veiculos)
        .where(and(eq(veiculos.empresaId, empresaId), eq(veiculos.ativo, true), isNull(veiculos.deletedAt)));

      const funcionariosResumo = await db
        .select({
          funcao: funcionarios.funcao,
          total: sql<number>`COUNT(*)`,
        })
        .from(funcionarios)
        .where(and(eq(funcionarios.empresaId, empresaId), eq(funcionarios.ativo, true), isNull(funcionarios.deletedAt)))
        .groupBy(funcionarios.funcao);

      const [abastecimentosResumo] = await db
        .select({
          total: sql<number>`SUM(${abastecimentos.valorTotal})`,
          litros: sql<number>`SUM(${abastecimentos.quantidade})`,
        })
        .from(abastecimentos)
        .where(and(eq(abastecimentos.empresaId, empresaId), isNull(abastecimentos.deletedAt), gte(abastecimentos.data, inicioMes)));

      const [manutencoesResumo] = await db
        .select({
          total: sql<number>`SUM(${manutencoes.valor})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(manutencoes)
        .where(and(eq(manutencoes.empresaId, empresaId), isNull(manutencoes.deletedAt), gte(manutencoes.data, inicioMes)));

      const viagensResumo = await db
        .select({
          status: viagens.status,
          total: sql<number>`COUNT(*)`,
        })
        .from(viagens)
        .where(and(eq(viagens.empresaId, empresaId), isNull(viagens.deletedAt)))
        .groupBy(viagens.status);

      const [contasVencendo] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          valor: sql<number>`SUM(${contasPagar.valor})`,
        })
        .from(contasPagar)
        .where(
          and(
            eq(contasPagar.empresaId, empresaId),
            eq(contasPagar.status, "pendente"),
            lte(contasPagar.dataVencimento, em7dias),
            gte(contasPagar.dataVencimento, hoje),
            isNull(contasPagar.deletedAt)
          )
        );

      const freelancers = await db
        .select()
        .from(funcionarios)
        .where(
          and(
            eq(funcionarios.empresaId, empresaId),
            eq(funcionarios.tipoContrato, "freelancer"),
            isNull(funcionarios.deletedAt)
          )
        );

      const freelancersParaPagar = freelancers.filter(funcionario => {
        if (!funcionario.diaPagamento) return false;
        const diff = funcionario.diaPagamento - hoje.getDate();
        return diff >= 0 && diff <= 7;
      });

      const [cnhVencendo] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(funcionarios)
        .where(
          and(
            eq(funcionarios.empresaId, empresaId),
            isNull(funcionarios.deletedAt),
            lte(funcionarios.vencimentoCnh, em7dias),
            gte(funcionarios.vencimentoCnh, hoje)
          )
        );

      const [crlvVencendo] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(veiculos)
        .where(
          and(
            eq(veiculos.empresaId, empresaId),
            isNull(veiculos.deletedAt),
            lte(veiculos.vencimentoCrlv, em7dias),
            gte(veiculos.vencimentoCrlv, hoje)
          )
        );

      return {
        veiculos: {
          total: Number(veiculosResumo?.total) || 0,
        },
        funcionarios: {
          motoristas: Number(funcionariosResumo.find(item => item.funcao === "motorista")?.total) || 0,
          ajudantes: Number(funcionariosResumo.find(item => item.funcao === "ajudante")?.total) || 0,
          total: funcionariosResumo.reduce((acc, item) => acc + Number(item.total || 0), 0),
        },
        combustivel: {
          valorMes: Number(abastecimentosResumo?.total) || 0,
          litrosMes: Number(abastecimentosResumo?.litros) || 0,
        },
        manutencao: {
          valorMes: Number(manutencoesResumo?.total) || 0,
          quantidadeMes: Number(manutencoesResumo?.count) || 0,
        },
        viagens: {
          emAndamento: Number(viagensResumo.find(item => item.status === "em_andamento")?.total) || 0,
          planejadas: Number(viagensResumo.find(item => item.status === "planejada")?.total) || 0,
          concluidasMes: Number(viagensResumo.find(item => item.status === "concluida")?.total) || 0,
        },
        alertas: {
          contasVencendo7dias: Number(contasVencendo?.total) || 0,
          valorContasVencendo: Number(contasVencendo?.valor) || 0,
          freelancersParaPagar: freelancersParaPagar.length,
          cnhVencendo: Number(cnhVencendo?.count) || 0,
          crlvVencendo: Number(crlvVencendo?.count) || 0,
        },
      };
    }),

  listUsers: protectedProcedure
    .input(z.object({ empresaId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      if (ctx.user.role === "master_admin") {
        return db.select().from(users).where(isNull(users.deletedAt)).orderBy(users.createdAt);
      }

      const accessibleIds = input.empresaId
        ? [await resolveAccessibleEmpresaId(ctx, input.empresaId)]
        : await listAccessibleCompanyIds(ctx.user);

      if (accessibleIds.length === 0) return [];

      return db
        .select()
        .from(users)
        .where(and(inArray(users.empresaId, accessibleIds), isNull(users.deletedAt)))
        .orderBy(users.createdAt);
    }),

  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "master_admin", "monitor", "dispatcher"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");

      if (ctx.user.role !== "admin" && ctx.user.role !== "master_admin") {
        throw new Error("Sem permissão para alterar níveis de acesso");
      }
      if (input.role === "master_admin" && ctx.user.role !== "master_admin") {
        throw new Error("Apenas master_admin pode promover outros a master_admin");
      }

      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  empresas: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const accessibleIds = await listAccessibleCompanyIds(ctx.user);
      if (ctx.user.role !== "master_admin" && accessibleIds.length === 0) return [];

      return db
        .select()
        .from(empresas)
        .where(
          and(
            eq(empresas.ativo, true),
            isNull(empresas.deletedAt),
            ctx.user.role !== "master_admin" ? inArray(empresas.id, accessibleIds) : undefined
          )
        )
        .orderBy(empresas.nome);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return null;

        await resolveAccessibleEmpresaId(ctx, input.id);
        const rows = await db.select().from(empresas).where(eq(empresas.id, input.id)).limit(1);
        return rows[0] ?? null;
      }),
  }),
});
