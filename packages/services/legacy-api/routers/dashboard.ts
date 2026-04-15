import { protectedProcedure, router } from "../_core/trpc";
import { users } from "../drizzle/schema";
import { getDb } from "../db";
import { veiculos, funcionarios, abastecimentos, manutencoes, viagens, contasPagar, contasReceber, adiantamentos, checklists, empresas } from "../drizzle/schema";
import { eq, and, isNull, desc, sql, gte, lte } from "drizzle-orm";
import { z } from "zod";

export const dashboardRouter = router({
  // Resumo geral da empresa
  resumo: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const em7dias = new Date(hoje);
      em7dias.setDate(hoje.getDate() + 7);

      // Veículos ativos
      const veiculosRows = await db.select({
        total: sql<number>`COUNT(*)`,
      }).from(veiculos)
        .where(and(eq(veiculos.empresaId, input.empresaId), eq(veiculos.ativo, true), isNull(veiculos.deletedAt)));

      // Funcionários ativos
      const funcRows = await db.select({
        funcao: funcionarios.funcao,
        total: sql<number>`COUNT(*)`,
      }).from(funcionarios)
        .where(and(eq(funcionarios.empresaId, input.empresaId), eq(funcionarios.ativo, true), isNull(funcionarios.deletedAt)))
        .groupBy(funcionarios.funcao);

      // Abastecimentos do mês
      const abastRows = await db.select({
        total: sql<number>`SUM(${abastecimentos.valorTotal})`,
        litros: sql<number>`SUM(${abastecimentos.quantidade})`,
      }).from(abastecimentos)
        .where(and(
          eq(abastecimentos.empresaId, input.empresaId),
          isNull(abastecimentos.deletedAt),
          gte(abastecimentos.data, inicioMes)
        ));

      // Manutenções do mês
      const manutRows = await db.select({
        total: sql<number>`SUM(${manutencoes.valor})`,
        count: sql<number>`COUNT(*)`,
      }).from(manutencoes)
        .where(and(
          eq(manutencoes.empresaId, input.empresaId),
          isNull(manutencoes.deletedAt),
          gte(manutencoes.data, inicioMes)
        ));

      // Viagens ativas
      const viagensRows = await db.select({
        status: viagens.status,
        total: sql<number>`COUNT(*)`,
      }).from(viagens)
        .where(and(eq(viagens.empresaId, input.empresaId), isNull(viagens.deletedAt)))
        .groupBy(viagens.status);

      // Contas vencendo em 7 dias
      const contasVencendo = await db.select({
        total: sql<number>`COUNT(*)`,
        valor: sql<number>`SUM(${contasPagar.valor})`,
      }).from(contasPagar)
        .where(and(
          eq(contasPagar.empresaId, input.empresaId),
          eq(contasPagar.status, "pendente"),
          lte(contasPagar.dataVencimento, em7dias),
          gte(contasPagar.dataVencimento, hoje),
          isNull(contasPagar.deletedAt)
        ));

      // Freelancers para pagar esta semana
      const freelancers = await db.select().from(funcionarios)
        .where(and(
          eq(funcionarios.empresaId, input.empresaId),
          eq(funcionarios.tipoContrato, "freelancer"),
          isNull(funcionarios.deletedAt)
        ));
      const freelancersParaPagar = freelancers.filter(f => {
        if (!f.diaPagamento) return false;
        const diaAtual = hoje.getDate();
        const diff = f.diaPagamento - diaAtual;
        return diff >= 0 && diff <= 7;
      });

      // Documentos vencendo (CNH, CRLV, Seguro)
      const cnhVencendo = await db.select({
        count: sql<number>`COUNT(*)`,
      }).from(funcionarios)
        .where(and(
          eq(funcionarios.empresaId, input.empresaId),
          isNull(funcionarios.deletedAt),
          lte(funcionarios.vencimentoCnh, em7dias),
          gte(funcionarios.vencimentoCnh, hoje)
        ));

      const crlvVencendo = await db.select({
        count: sql<number>`COUNT(*)`,
      }).from(veiculos)
        .where(and(
          eq(veiculos.empresaId, input.empresaId),
          isNull(veiculos.deletedAt),
          lte(veiculos.vencimentoCrlv, em7dias),
          gte(veiculos.vencimentoCrlv, hoje)
        ));

      return {
        veiculos: {
          total: Number(veiculosRows[0]?.total) || 0,
        },
        funcionarios: {
          motoristas: Number(funcRows.find(f => f.funcao === "motorista")?.total) || 0,
          ajudantes: Number(funcRows.find(f => f.funcao === "ajudante")?.total) || 0,
          total: funcRows.reduce((acc, f) => acc + Number(f.total), 0),
        },
        combustivel: {
          valorMes: Number(abastRows[0]?.total) || 0,
          litrosMes: Number(abastRows[0]?.litros) || 0,
        },
        manutencao: {
          valorMes: Number(manutRows[0]?.total) || 0,
          quantidadeMes: Number(manutRows[0]?.count) || 0,
        },
        viagens: {
          emAndamento: Number(viagensRows.find(v => v.status === "em_andamento")?.total) || 0,
          planejadas: Number(viagensRows.find(v => v.status === "planejada")?.total) || 0,
          concluidasMes: Number(viagensRows.find(v => v.status === "concluida")?.total) || 0,
        },
        alertas: {
          contasVencendo7dias: Number(contasVencendo[0]?.total) || 0,
          valorContasVencendo: Number(contasVencendo[0]?.valor) || 0,
          freelancersParaPagar: freelancersParaPagar.length,
          cnhVencendo: Number(cnhVencendo[0]?.count) || 0,
          crlvVencendo: Number(crlvVencendo[0]?.count) || 0,
        },
      };
    }),

  // Gerenciamento de usuários
  listUsers: protectedProcedure
    .input(z.object({ empresaId: z.number().optional() }))
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(users).orderBy(users.createdAt);
    }),

  updateUserRole: protectedProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin", "master_admin", "monitor", "dispatcher"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco indisponível");
      const currentRole = (ctx.user as any)?.role;
      if (currentRole !== "admin" && currentRole !== "master_admin") {
        throw new Error("Sem permissão para alterar níveis de acesso");
      }
      if (input.role === "master_admin" && currentRole !== "master_admin") {
        throw new Error("Apenas master_admin pode promover outros a master_admin");
      }
      await db.update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Lista de empresas
  empresas: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(empresas)
        .where(and(eq(empresas.ativo, true), isNull(empresas.deletedAt)))
        .orderBy(empresas.nome);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const rows = await db.select().from(empresas)
          .where(eq(empresas.id, input.id)).limit(1);
        return rows[0] ?? null;
      }),
  }),
});
