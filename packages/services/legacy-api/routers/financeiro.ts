import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { contasPagar, contasReceber, adiantamentos, viagens } from "../drizzle/schema";
import { eq, and, isNull, isNotNull, desc, sql, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";
import { TRPCError } from "@trpc/server";
import { createAuditLog } from "../_core/audit";

function parseDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

export const financeiroRouter = router({
  // ─── CONTAS A PAGAR ───────────────────────────────────────────────────────
  pagar: router({
    list: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.pagar.list");
          return db.select().from(contasPagar)
            .where(and(
              eq(contasPagar.empresaId, input.empresaId),
              isNull(contasPagar.deletedAt),
              input.status ? eq(contasPagar.status, input.status) : undefined,
            ))
            .orderBy(contasPagar.dataVencimento)
            .limit(input.limit);
        }, "financeiro.pagar.list");
      }),

    create: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        descricao: z.string().min(1, "Descrição é obrigatória"),
        categoria: z.enum(["combustivel", "manutencao", "salario", "freelancer", "pedagio", "seguro", "ipva", "licenciamento", "pneu", "outro"]),
        valor: z.string(),
        dataVencimento: z.string(),
        dataPagamento: z.string().nullable().optional(),
        status: z.enum(["pendente", "pago", "vencido", "cancelado"]).default("pendente"),
        fornecedor: z.string().optional(),
        notaFiscal: z.string().optional(),
        veiculoId: z.number().nullable().optional(),
        funcionarioId: z.number().nullable().optional(),
        viagemId: z.number().nullable().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.pagar.create");
          const empresaId = ctx.user.role !== "master_admin" ? ctx.user.empresaId! : input.empresaId;
          const [result] = await db.insert(contasPagar).values({
            ...input,
            empresaId,
            dataVencimento: input.dataVencimento,
            dataPagamento: input.dataPagamento || null,
          }).returning({ id: contasPagar.id });

          await createAuditLog(ctx, {
            acao: "CREATE",
            tabela: "contas_pagar",
            registroId: result.id,
            dadosDepois: input,
          });

          return { id: result.id };
        }, "financeiro.pagar.create");
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        descricao: z.string().optional(),
        valor: z.string().optional(),
        dataVencimento: z.string().optional(),
        dataPagamento: z.string().nullable().optional(),
        status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.pagar.update");
          const { id, dataVencimento, dataPagamento, ...rest } = input;
          const whereClause = [eq(contasPagar.id, id)];
          if (ctx.user.role !== "master_admin") {
            whereClause.push(eq(contasPagar.empresaId, ctx.user.empresaId!));
          }
          const [oldData] = await db.select().from(contasPagar).where(and(...whereClause)).limit(1);
          if (!oldData) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });

          const [updated] = await db.update(contasPagar).set({
            ...rest,
            ...(dataVencimento ? { dataVencimento: dataVencimento } : {}),
            ...(dataPagamento !== undefined ? { dataPagamento: dataPagamento || null } : {}),
            updatedAt: new Date(),
          }).where(and(...whereClause)).returning();

          await createAuditLog(ctx, {
            acao: "UPDATE",
            tabela: "contas_pagar",
            registroId: id,
            dadosAntes: oldData,
            dadosDepois: updated,
          });

          return { success: true };
        }, "financeiro.pagar.update");
      }),

    softDelete: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo") }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.pagar.softDelete");
          await db.update(contasPagar).set({
            deletedAt: new Date(),
            deletedBy: ctx.user!.id,
            deleteReason: input.reason,
          }).where(eq(contasPagar.id, input.id));
          return { success: true };
        }, "financeiro.pagar.softDelete");
      }),

    resumo: protectedProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.pagar.resumo");
          const hoje = new Date();
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          const inicioMesStr = inicioMes.toISOString();
          const rows = await db.select({
            status: contasPagar.status,
            total: sql<number>`SUM(${contasPagar.valor})`,
          })
            .from(contasPagar)
            .where(and(eq(contasPagar.empresaId, input.empresaId), isNull(contasPagar.deletedAt)))
            .groupBy(contasPagar.status);
          const result = { pendente: 0, vencido: 0, pagoMes: 0 };
          rows.forEach(r => {
            if (r.status === "pendente") result.pendente = Number(r.total) || 0;
            if (r.status === "vencido") result.vencido = Number(r.total) || 0;
          });
          const pagoRows = await db.select({ total: sql<number>`SUM(${contasPagar.valor})` })
            .from(contasPagar)
            .where(and(
              eq(contasPagar.empresaId, input.empresaId),
              eq(contasPagar.status, "pago"),
              gte(contasPagar.dataPagamento, sql`${inicioMesStr}::timestamp`),
              isNull(contasPagar.deletedAt),
            ));
          result.pagoMes = Number(pagoRows[0]?.total) || 0;
          return result;
        }, "financeiro.pagar.resumo");
      }),
  }),

  // ─── CONTAS A RECEBER ─────────────────────────────────────────────────────
  receber: router({
    list: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        status: z.enum(["pendente", "recebido", "vencido", "cancelado"]).optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.receber.list");
          return db.select().from(contasReceber)
            .where(and(
              eq(contasReceber.empresaId, input.empresaId),
              isNull(contasReceber.deletedAt),
              input.status ? eq(contasReceber.status, input.status) : undefined,
            ))
            .orderBy(contasReceber.dataVencimento)
            .limit(input.limit);
        }, "financeiro.receber.list");
      }),

    create: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        descricao: z.string().min(1, "Descrição é obrigatória"),
        categoria: z.enum(["frete", "cte", "devolucao", "outro"]),
        valor: z.string(),
        dataVencimento: z.string(),
        dataRecebimento: z.string().nullable().optional(),
        status: z.enum(["pendente", "recebido", "vencido", "cancelado"]).default("pendente"),
        cliente: z.string().optional(),
        notaFiscal: z.string().optional(),
        cteNumero: z.string().optional(),
        viagemId: z.number().nullable().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.receber.create");
          const [result] = await db.insert(contasReceber).values({
            ...input,
            dataVencimento: input.dataVencimento,
            dataRecebimento: input.dataRecebimento || null,
          }).returning({ id: contasReceber.id });
          return { id: result.id };
        }, "financeiro.receber.create");
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        descricao: z.string().optional(),
        valor: z.string().optional(),
        dataVencimento: z.string().optional(),
        dataRecebimento: z.string().nullable().optional(),
        status: z.enum(["pendente", "recebido", "vencido", "cancelado"]).optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.receber.update");
          const { id, dataVencimento, dataRecebimento, ...rest } = input;
          await db.update(contasReceber).set({
            ...rest,
            ...(dataVencimento ? { dataVencimento: dataVencimento } : {}),
            ...(dataRecebimento !== undefined ? { dataRecebimento: dataRecebimento || null } : {}),
            updatedAt: new Date(),
          }).where(eq(contasReceber.id, id));
          return { success: true };
        }, "financeiro.receber.update");
      }),

    softDelete: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo") }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.receber.softDelete");
          await db.update(contasReceber).set({
            deletedAt: new Date(),
            deletedBy: ctx.user!.id,
            deleteReason: input.reason,
          }).where(eq(contasReceber.id, input.id));
          return { success: true };
        }, "financeiro.receber.softDelete");
      }),

    resumo: protectedProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.receber.resumo");
          const hoje = new Date();
          const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          const inicioMesStr = inicioMes.toISOString();
          const rows = await db.select({
            status: contasReceber.status,
            total: sql<number>`SUM(${contasReceber.valor})`,
          })
            .from(contasReceber)
            .where(and(eq(contasReceber.empresaId, input.empresaId), isNull(contasReceber.deletedAt)))
            .groupBy(contasReceber.status);
          const result = { pendente: 0, vencido: 0, recebidoMes: 0 };
          rows.forEach(r => {
            if (r.status === "pendente") result.pendente = Number(r.total) || 0;
            if (r.status === "vencido") result.vencido = Number(r.total) || 0;
          });
          const recRows = await db.select({ total: sql<number>`SUM(${contasReceber.valor})` })
            .from(contasReceber)
            .where(and(
              eq(contasReceber.empresaId, input.empresaId),
              eq(contasReceber.status, "recebido"),
              gte(contasReceber.dataRecebimento, sql`${inicioMesStr}::timestamp`),
              isNull(contasReceber.deletedAt),
            ));
          result.recebidoMes = Number(recRows[0]?.total) || 0;
          return result;
        }, "financeiro.receber.resumo");
      }),
  }),

  // ─── ADIANTAMENTOS ────────────────────────────────────────────────────────
  adiantamentos: router({
    list: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        funcionarioId: z.number().optional(),
        status: z.enum(["pendente", "acertado", "cancelado"]).optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.adiantamentos.list");
          return db.select().from(adiantamentos)
            .where(and(
              eq(adiantamentos.empresaId, input.empresaId),
              isNull(adiantamentos.deletedAt),
              input.funcionarioId ? eq(adiantamentos.funcionarioId, input.funcionarioId) : undefined,
              input.status ? eq(adiantamentos.status, input.status) : undefined,
            ))
            .orderBy(desc(adiantamentos.data))
            .limit(input.limit);
        }, "financeiro.adiantamentos.list");
      }),

    create: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        funcionarioId: z.number(),
        viagemId: z.number().nullable().optional(),
        valor: z.string(),
        formaPagamento: z.enum(["dinheiro", "pix", "transferencia", "cartao"]),
        data: z.string(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.adiantamentos.create");
          const [result] = await db.insert(adiantamentos).values({
            ...input,
            data: parseDate(input.data) ?? new Date().toISOString().split("T")[0],
          }).returning({ id: adiantamentos.id });
          return { id: result.id };
        }, "financeiro.adiantamentos.create");
      }),

    acertar: protectedProcedure
      .input(z.object({
        id: z.number(),
        valorAcertado: z.string(),
        dataAcerto: z.string(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.adiantamentos.acertar");
          const rows = await db.select().from(adiantamentos)
            .where(eq(adiantamentos.id, input.id)).limit(1);
          const adiant = rows[0];
          if (!adiant) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado." });
          }
          const saldo = Number(adiant.valor) - Number(input.valorAcertado);
          await db.update(adiantamentos).set({
            valorAcertado: input.valorAcertado,
            dataAcerto: parseDate(input.dataAcerto),
            saldo: String(saldo),
            status: "acertado",
            observacoes: input.observacoes,
            updatedAt: new Date(),
          }).where(eq(adiantamentos.id, input.id));
          return { success: true, saldo };
        }, "financeiro.adiantamentos.acertar");
      }),

    softDelete: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo") }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "financeiro.adiantamentos.softDelete");
          await db.update(adiantamentos).set({
            deletedAt: new Date(),
            deletedBy: ctx.user!.id,
            deleteReason: input.reason,
          }).where(eq(adiantamentos.id, input.id));
          return { success: true };
        }, "financeiro.adiantamentos.softDelete");
      }),
  }),

  // ─── DASHBOARD FINANCEIRO COMPLETO ────────────────────────────────────────
  dashboard: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "financeiro.dashboard");
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        const em7dias = new Date(hoje);
        em7dias.setDate(hoje.getDate() + 7);

        // Contas a pagar por status
        const pagarRows = await db.select({
          status: contasPagar.status,
          total: sql<number>`SUM(${contasPagar.valor})`,
          count: sql<number>`COUNT(*)`,
        })
          .from(contasPagar)
          .where(and(eq(contasPagar.empresaId, input.empresaId), isNull(contasPagar.deletedAt)))
          .groupBy(contasPagar.status);

        // Contas a receber por status
        const receberRows = await db.select({
          status: contasReceber.status,
          total: sql<number>`SUM(${contasReceber.valor})`,
          count: sql<number>`COUNT(*)`,
        })
          .from(contasReceber)
          .where(and(eq(contasReceber.empresaId, input.empresaId), isNull(contasReceber.deletedAt)))
          .groupBy(contasReceber.status);

        // Adiantamentos pendentes
        const adiantRows = await db.select({
          total: sql<number>`SUM(${adiantamentos.valor})`,
          count: sql<number>`COUNT(*)`,
        })
          .from(adiantamentos)
          .where(and(
            eq(adiantamentos.empresaId, input.empresaId),
            eq(adiantamentos.status, "pendente"),
            isNull(adiantamentos.deletedAt),
          ));

        // Resumo de viagens concluídas no mês (fretes recebidos vs despesas)
        const viagensRows = await db.select({
          totalFrete: sql<number>`SUM(${viagens.freteTotal})`,
          totalDespesas: sql<number>`SUM(${viagens.totalDespesas})`,
          totalSaldo: sql<number>`SUM(${viagens.saldoViagem})`,
          quantidade: sql<number>`COUNT(*)`,
        })
          .from(viagens)
          .where(and(
            eq(viagens.empresaId, input.empresaId),
            eq(viagens.status, "concluida"),
            gte(viagens.dataChegada, inicioMes),
            isNull(viagens.deletedAt),
          ));

        const totalPagar = Number(pagarRows.find(r => r.status === "pendente")?.total) || 0;
        const totalVencido = Number(pagarRows.find(r => r.status === "vencido")?.total) || 0;
        const totalReceber = Number(receberRows.find(r => r.status === "pendente")?.total) || 0;
        const totalAdiantamentos = Number(adiantRows[0]?.total) || 0;
        const totalFreteMes = Number(viagensRows[0]?.totalFrete) || 0;
        const totalDespesasMes = Number(viagensRows[0]?.totalDespesas) || 0;
        const lucroMes = totalFreteMes - totalDespesasMes;
        const margemMes = totalFreteMes > 0 ? (lucroMes / totalFreteMes) * 100 : 0;

        return {
          // Contas
          totalPagar,
          totalVencido,
          totalReceber,
          totalAdiantamentos,
          saldoProjetado: totalReceber - totalPagar,
          // Viagens do mês
          totalFreteMes,
          totalDespesasMes,
          lucroMes: Math.round(lucroMes * 100) / 100,
          margemMes: Math.round(margemMes * 10) / 10,
          viagensConcluidas: Number(viagensRows[0]?.quantidade) || 0,
          // Alertas
          alertas: {
            contasVencidas: Number(pagarRows.find(r => r.status === "vencido")?.count) || 0,
            adiantamentosPendentes: Number(adiantRows[0]?.count) || 0,
            contasReceberVencidas: Number(receberRows.find(r => r.status === "vencido")?.count) || 0,
          },
        };
      }, "financeiro.dashboard");
    }),
});

  // ─── DRE POR PLACA (Estratégico) ──────────────────────────────────────────
  drePorPlaca: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      veiculoId: z.number().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "financeiro.drePorPlaca");
        
        // 1. Buscar Receitas (Contas a Receber vinculadas a viagens do veículo)
        // Nota: Precisamos de um join ou subquery para pegar viagens do veículo
        const receitas = await db.execute(sql`
          SELECT 
            v."veiculoId",
            SUM(cr.valor) as total_receita
          FROM contas_receber cr
          JOIN viagens v ON cr."viagemId" = v.id
          WHERE cr."empresaId" = ${input.empresaId}
            AND cr."deletedAt" IS NULL
            AND cr.status = 'recebido'
            ${input.veiculoId ? sql`AND v."veiculoId" = ${input.veiculoId}` : sql``}
            ${input.dataInicio ? sql`AND cr."dataRecebimento" >= ${input.dataInicio}` : sql``}
            ${input.dataFim ? sql`AND cr."dataRecebimento" <= ${input.dataFim}` : sql``}
          GROUP BY v."veiculoId"
        `);

        // 2. Buscar Despesas (Contas a Pagar vinculadas ao veículo)
        const despesas = await db.execute(sql`
          SELECT 
            "veiculoId",
            categoria,
            SUM(valor) as total_despesa
          FROM contas_pagar
          WHERE "empresaId" = ${input.empresaId}
            AND "deletedAt" IS NULL
            AND status = 'pago'
            AND "veiculoId" IS NOT NULL
            ${input.veiculoId ? sql`AND "veiculoId" = ${input.veiculoId}` : sql``}
            ${input.dataInicio ? sql`AND "dataPagamento" >= ${input.dataInicio}` : sql``}
            ${input.dataFim ? sql`AND "dataPagamento" <= ${input.dataFim}` : sql``}
          GROUP BY "veiculoId", categoria
        `);

        // 3. Buscar KM Rodado no período para cálculo de custo/km
        const kmRodado = await db.execute(sql`
          SELECT 
            "veiculoId",
            SUM(COALESCE("kmChegada", 0) - COALESCE("kmSaida", 0)) as total_km
          FROM viagens
          WHERE "empresaId" = ${input.empresaId}
            AND "deletedAt" IS NULL
            AND status = 'concluida'
            ${input.veiculoId ? sql`AND "veiculoId" = ${input.veiculoId}` : sql``}
            ${input.dataInicio ? sql`AND "dataFim" >= ${input.dataInicio}` : sql``}
            ${input.dataFim ? sql`AND "dataFim" <= ${input.dataFim}` : sql``}
          GROUP BY "veiculoId"
        `);

        return {
          receitas: (receitas as unknown as any[]),
          despesas: (despesas as unknown as any[]),
          kmRodado: (kmRodado as unknown as any[]),
        };
      }, "financeiro.drePorPlaca");
    }),
});
