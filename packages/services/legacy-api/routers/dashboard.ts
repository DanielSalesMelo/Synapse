import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getRawClient } from "../db";
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
      const client = await getRawClient();
      if (!client) return null;

      const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const em7dias = new Date(hoje);
      em7dias.setDate(hoje.getDate() + 7);
      const hojeIso = hoje.toISOString().slice(0, 10);
      const inicioMesIso = inicioMes.toISOString().slice(0, 10);
      const em7diasIso = em7dias.toISOString().slice(0, 10);

      const [veiculosResumo] = await client`
        SELECT COUNT(*)::int as total
        FROM veiculos
        WHERE "empresaId"=${empresaId}
          AND COALESCE(ativo, true) = true
          AND "deletedAt" IS NULL
      `.catch(() => [{ total: 0 }]);

      const funcionariosResumo = await client`
        SELECT funcao::text as funcao, COUNT(*)::int as total
        FROM funcionarios
        WHERE "empresaId"=${empresaId}
          AND COALESCE(ativo, true) = true
          AND "deletedAt" IS NULL
        GROUP BY funcao
      `.catch(() => []);

      const [abastecimentosResumo] = await client`
        SELECT
          COALESCE(SUM("valorTotal"), 0)::float8 as total,
          COALESCE(SUM(quantidade), 0)::float8 as litros
        FROM abastecimentos
        WHERE "empresaId"=${empresaId}
          AND "deletedAt" IS NULL
          AND data >= ${inicioMesIso}::date
      `.catch(() => [{ total: 0, litros: 0 }]);

      const [manutencoesResumo] = await client`
        SELECT
          COALESCE(SUM(valor), 0)::float8 as total,
          COUNT(*)::int as count
        FROM manutencoes
        WHERE "empresaId"=${empresaId}
          AND "deletedAt" IS NULL
          AND data >= ${inicioMesIso}::date
      `.catch(() => [{ total: 0, count: 0 }]);

      const viagensResumo = await client`
        SELECT status::text as status, COUNT(*)::int as total
        FROM viagens
        WHERE "empresaId"=${empresaId}
          AND "deletedAt" IS NULL
        GROUP BY status
      `.catch(() => []);

      const [contasVencendo] = await client`
        SELECT
          COUNT(*)::int as total,
          COALESCE(SUM(valor), 0)::float8 as valor
        FROM contas_pagar
        WHERE "empresaId"=${empresaId}
          AND status::text = 'pendente'
          AND "dataVencimento" <= ${em7diasIso}::date
          AND "dataVencimento" >= ${hojeIso}::date
          AND "deletedAt" IS NULL
      `.catch(() => [{ total: 0, valor: 0 }]);

      const freelancers = await client`
        SELECT "diaPagamento"
        FROM funcionarios
        WHERE "empresaId"=${empresaId}
          AND "tipoContrato"::text = 'freelancer'
          AND "deletedAt" IS NULL
      `.catch(() => []);

      const freelancersParaPagar = freelancers.filter(funcionario => {
        if (!funcionario.diaPagamento) return false;
        const diff = funcionario.diaPagamento - hoje.getDate();
        return diff >= 0 && diff <= 7;
      });

      const [cnhVencendo] = await client`
        SELECT COUNT(*)::int as count
        FROM funcionarios
        WHERE "empresaId"=${empresaId}
          AND "deletedAt" IS NULL
          AND "vencimentoCnh" <= ${em7diasIso}::date
          AND "vencimentoCnh" >= ${hojeIso}::date
      `.catch(() => [{ count: 0 }]);

      const [crlvVencendo] = await client`
        SELECT COUNT(*)::int as count
        FROM veiculos
        WHERE "empresaId"=${empresaId}
          AND "deletedAt" IS NULL
          AND "vencimentoCrlv" <= ${em7diasIso}::date
          AND "vencimentoCrlv" >= ${hojeIso}::date
      `.catch(() => [{ count: 0 }]);

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
