import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { abastecimentos, manutencoes, controleTanque, veiculos, funcionarios } from "../drizzle/schema";
import { eq, and, isNull, isNotNull, desc, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { safeDb, requireDb } from "../helpers/errorHandler";

function parseDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  // Retorna só a data (YYYY-MM-DD) para campos do tipo date no Postgres
  return parsed.toISOString().split("T")[0];
}

export const frotaRouter = router({
  // ─── ABASTECIMENTOS ───────────────────────────────────────────────────────
  abastecimentos: router({
    list: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        veiculoId: z.number().optional(),
        motoristaId: z.number().optional(),
        tipoCombustivel: z.enum(["diesel", "arla", "gasolina", "etanol", "gas", "outro"]).optional(),
        tipoAbastecimento: z.enum(["interno", "externo"]).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        busca: z.string().optional(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "abastecimentos.list");
          return db.select().from(abastecimentos)
            .where(and(
              eq(abastecimentos.empresaId, input.empresaId),
              isNull(abastecimentos.deletedAt),
              input.veiculoId ? eq(abastecimentos.veiculoId, input.veiculoId) : undefined,
              input.motoristaId ? eq(abastecimentos.motoristaId, input.motoristaId) : undefined,
              input.tipoCombustivel ? eq(abastecimentos.tipoCombustivel, input.tipoCombustivel) : undefined,
              input.tipoAbastecimento ? eq(abastecimentos.tipoAbastecimento, input.tipoAbastecimento) : undefined,
              input.dataInicio ? gte(abastecimentos.data, new Date(input.dataInicio)) : undefined,
              input.dataFim ? lte(abastecimentos.data, new Date(input.dataFim + "T23:59:59")) : undefined,
            ))
            .orderBy(desc(abastecimentos.data))
            .limit(input.limit);
        }, "abastecimentos.list");
      }),

    create: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        veiculoId: z.number(),
        motoristaId: z.number().nullable().optional(),
        data: z.string(),
        tipoCombustivel: z.enum(["diesel", "arla", "gasolina", "etanol", "gas", "outro"]),
        quantidade: z.string(),
        valorUnitario: z.string().nullable().optional(),
        valorTotal: z.string().nullable().optional(),
        kmAtual: z.number().nullable().optional(),
        kmRodado: z.number().nullable().optional(),
        mediaConsumo: z.string().nullable().optional(),
        local: z.string().optional(),
        tipoAbastecimento: z.enum(["interno", "externo"]).default("interno"),
        notaFiscal: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "abastecimentos.create");
          const empresaId = ctx.user.role !== "master_admin" ? ctx.user.empresaId! : input.empresaId;
          const [result] = await db.insert(abastecimentos).values({
            ...input,
            empresaId,
            quantidade: input.quantidade.toString(),
            valorUnitario: input.valorUnitario?.toString() ?? null,
            valorTotal: input.valorTotal?.toString() ?? null,
            mediaConsumo: input.mediaConsumo?.toString() ?? null,
            data: parseDate(input.data) ?? new Date().toISOString().split("T")[0],
          }).returning({ id: abastecimentos.id });
          return { id: result.id };
        }, "abastecimentos.create");
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.string().optional(),
        tipoCombustivel: z.enum(["diesel", "arla", "gasolina", "etanol", "gas", "outro"]).optional(),
        quantidade: z.string().optional(),
        valorUnitario: z.string().nullable().optional(),
        valorTotal: z.string().nullable().optional(),
        kmAtual: z.number().nullable().optional(),
        local: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "abastecimentos.update");
          const { id, data, ...rest } = input;
          const whereClause = [eq(abastecimentos.id, id)];
          if (ctx.user.role !== "master_admin") {
            whereClause.push(eq(abastecimentos.empresaId, ctx.user.empresaId!));
          }
          const [updated] = await db.update(abastecimentos).set({
            ...rest,
            ...(data ? { data: parseDate(data) ?? new Date().toISOString().split("T")[0] } : {}),
            updatedAt: new Date(),
          }).where(and(...whereClause)).returning();
          if (!updated) throw new Error("Abastecimento não encontrado ou sem permissão");
          return { success: true };
        }, "abastecimentos.update");
      }),

    softDelete: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo") }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "abastecimentos.softDelete");
          await db.update(abastecimentos).set({
            deletedAt: new Date(),
            deletedBy: ctx.user!.id,
            deleteReason: input.reason,
          }).where(eq(abastecimentos.id, input.id));
          return { success: true };
        }, "abastecimentos.softDelete");
      }),

    resumoPorVeiculo: protectedProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "abastecimentos.resumoPorVeiculo");
          return db.select({
            veiculoId: abastecimentos.veiculoId,
            totalLitros: sql<number>`SUM(${abastecimentos.quantidade})`,
            totalValor: sql<number>`SUM(${abastecimentos.valorTotal})`,
            mediaConsumo: sql<number>`AVG(${abastecimentos.mediaConsumo})`,
            ultimoAbastecimento: sql<string>`MAX(${abastecimentos.data})`,
          })
            .from(abastecimentos)
            .where(and(eq(abastecimentos.empresaId, input.empresaId), isNull(abastecimentos.deletedAt)))
            .groupBy(abastecimentos.veiculoId);
        }, "abastecimentos.resumoPorVeiculo");
      }),

    // Preço médio do diesel nos últimos 30 dias (para calculadora)
    precioMedioDiesel: protectedProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "abastecimentos.precioMedioDiesel");
          const trintaDiasAtras = new Date();
          trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
          const rows = await db.select({
            media: sql<number>`AVG(${abastecimentos.valorUnitario})`,
          })
            .from(abastecimentos)
            .where(and(
              eq(abastecimentos.empresaId, input.empresaId),
              eq(abastecimentos.tipoCombustivel, "diesel"),
              isNull(abastecimentos.deletedAt),
              gte(abastecimentos.data, trintaDiasAtras),
            ));
          return { precioMedio: Number(rows[0]?.media) || 6.5 }; // fallback R$6,50
        }, "abastecimentos.precioMedioDiesel");
      }),
  }),

  // ─── MANUTENÇÕES ──────────────────────────────────────────────────────────
  manutencoes: router({
    list: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        veiculoId: z.number().optional(),
        tipo: z.enum(["preventiva", "corretiva", "revisao", "pneu", "eletrica", "funilaria", "outro"]).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        busca: z.string().optional(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "manutencoes.list");
          return db.select().from(manutencoes)
            .where(and(
              eq(manutencoes.empresaId, input.empresaId),
              isNull(manutencoes.deletedAt),
              input.veiculoId ? eq(manutencoes.veiculoId, input.veiculoId) : undefined,
              input.tipo ? eq(manutencoes.tipo, input.tipo) : undefined,
              input.dataInicio ? gte(manutencoes.data, new Date(input.dataInicio)) : undefined,
              input.dataFim ? lte(manutencoes.data, new Date(input.dataFim + "T23:59:59")) : undefined,
            ))
            .orderBy(desc(manutencoes.data))
            .limit(input.limit);
        }, "manutencoes.list");
      }),

    create: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        veiculoId: z.number(),
        data: z.string(),
        tipo: z.enum(["preventiva", "corretiva", "revisao", "pneu", "eletrica", "funilaria", "outro"]),
        descricao: z.string().min(1, "Descrição é obrigatória"),
        empresa: z.string().optional(),
        valor: z.string().nullable().optional(),
        kmAtual: z.number().nullable().optional(),
        proximaManutencaoKm: z.number().nullable().optional(),
        proximaManutencaoData: z.string().nullable().optional(),
        notaFiscal: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "manutencoes.create");
          const [result] = await db.insert(manutencoes).values({
            ...input,
            data: new Date(input.data),
            proximaManutencaoData: parseDate(input.proximaManutencaoData),
          }).returning({ id: manutencoes.id });
          return { id: result.id };
        }, "manutencoes.create");
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        data: z.string().optional(),
        tipo: z.enum(["preventiva", "corretiva", "revisao", "pneu", "eletrica", "funilaria", "outro"]).optional(),
        descricao: z.string().optional(),
        empresa: z.string().optional(),
        valor: z.string().nullable().optional(),
        kmAtual: z.number().nullable().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "manutencoes.update");
          const { id, data, ...rest } = input;
          await db.update(manutencoes).set({
            ...rest,
            ...(data ? { data: new Date(data) } : {}),
            updatedAt: new Date(),
          }).where(eq(manutencoes.id, id));
          return { success: true };
        }, "manutencoes.update");
      }),

    softDelete: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(1, "Informe o motivo") }))
      .mutation(async ({ input, ctx }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "manutencoes.softDelete");
          await db.update(manutencoes).set({
            deletedAt: new Date(),
            deletedBy: ctx.user!.id,
            deleteReason: input.reason,
          }).where(eq(manutencoes.id, input.id));
          return { success: true };
        }, "manutencoes.softDelete");
      }),

    totalPorVeiculo: protectedProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "manutencoes.totalPorVeiculo");
          return db.select({
            veiculoId: manutencoes.veiculoId,
            totalValor: sql<number>`SUM(${manutencoes.valor})`,
            quantidade: sql<number>`COUNT(*)`,
            ultimaManutencao: sql<string>`MAX(${manutencoes.data})`,
          })
            .from(manutencoes)
            .where(and(eq(manutencoes.empresaId, input.empresaId), isNull(manutencoes.deletedAt)))
            .groupBy(manutencoes.veiculoId);
        }, "manutencoes.totalPorVeiculo");
      }),
  }),

  // ─── CONTROLE TANQUE ──────────────────────────────────────────────────────
  tanque: router({
    list: protectedProcedure
      .input(z.object({ empresaId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "tanque.list");
          return db.select().from(controleTanque)
            .where(and(eq(controleTanque.empresaId, input.empresaId), isNull(controleTanque.deletedAt)))
            .orderBy(desc(controleTanque.data))
            .limit(input.limit);
        }, "tanque.list");
      }),

    saldoAtual: protectedProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "tanque.saldoAtual");
          const rows = await db.select({
            tipo: controleTanque.tipo,
            saldo: sql<number>`SUM(CASE WHEN ${controleTanque.operacao} = 'entrada' THEN ${controleTanque.quantidade} ELSE -${controleTanque.quantidade} END)`,
          })
            .from(controleTanque)
            .where(and(eq(controleTanque.empresaId, input.empresaId), isNull(controleTanque.deletedAt)))
            .groupBy(controleTanque.tipo);
          const result = { diesel: 0, arla: 0 };
          rows.forEach(r => {
            if (r.tipo === "diesel") result.diesel = Number(r.saldo) || 0;
            if (r.tipo === "arla") result.arla = Number(r.saldo) || 0;
          });
          return result;
        }, "tanque.saldoAtual");
      }),

    create: protectedProcedure
      .input(z.object({
        empresaId: z.number(),
        tipo: z.enum(["diesel", "arla"]),
        data: z.string(),
        operacao: z.enum(["entrada", "saida"]),
        quantidade: z.string(),
        valorUnitario: z.string().nullable().optional(),
        valorTotal: z.string().nullable().optional(),
        fornecedor: z.string().optional(),
        notaFiscal: z.string().optional(),
        veiculoId: z.number().nullable().optional(),
        motoristaId: z.number().nullable().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "tanque.create");
          const [result] = await db.insert(controleTanque).values({
            ...input,
            data: new Date(input.data),
          }).returning({ id: controleTanque.id });
          return { id: result.id };
        }, "tanque.create");
      }),

    // Custo médio ponderado do tanque
    custoMedio: protectedProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return safeDb(async () => {
          const db = requireDb(await getDb(), "tanque.custoMedio");
          // Buscar todas as entradas (compras) com valor unitário
          const entradas = await db.select()
            .from(controleTanque)
            .where(and(
              eq(controleTanque.empresaId, input.empresaId),
              eq(controleTanque.operacao, "entrada"),
              isNull(controleTanque.deletedAt),
              isNotNull(controleTanque.valorUnitario)
            ))
            .orderBy(controleTanque.data);

          // Calcular custo médio ponderado por tipo
          const calcMedia = (tipo: "diesel" | "arla") => {
            const items = entradas.filter(e => e.tipo === tipo);
            let saldoQtd = 0;
            let saldoValor = 0;
            const historico: { data: string; quantidade: number; valorUnitario: number; valorTotal: number; custoMedio: number; fornecedor: string | null }[] = [];

            for (const item of items) {
              const qtd = Number(item.quantidade) || 0;
              const valUnit = Number(item.valorUnitario) || 0;
              const valTotal = qtd * valUnit;
              saldoQtd += qtd;
              saldoValor += valTotal;
              const custoMedioAtual = saldoQtd > 0 ? saldoValor / saldoQtd : 0;
              historico.push({
                data: String(item.data),
                quantidade: qtd,
                valorUnitario: valUnit,
                valorTotal: valTotal,
                custoMedio: Math.round(custoMedioAtual * 1000) / 1000,
                fornecedor: item.fornecedor,
              });
            }

            // Descontar saídas do saldo (mas não altera custo médio)
            return {
              custoMedio: saldoQtd > 0 ? Math.round((saldoValor / saldoQtd) * 1000) / 1000 : 0,
              totalComprado: Math.round(saldoQtd * 100) / 100,
              totalInvestido: Math.round(saldoValor * 100) / 100,
              ultimaCompra: items.length > 0 ? {
                data: String(items[items.length - 1].data),
                valorUnitario: Number(items[items.length - 1].valorUnitario) || 0,
                fornecedor: items[items.length - 1].fornecedor,
              } : null,
              historicoCompras: historico.slice(-20), // últimas 20 compras
            };
          };

          return {
            diesel: calcMedia("diesel"),
            arla: calcMedia("arla"),
          };
        }, "tanque.custoMedio");
      }),
  }),

  // ─── CALCULADORA DE VIAGEM ────────────────────────────────────────────────
  calcularCustoViagem: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      veiculoId: z.number(),
      distanciaKm: z.number().min(1, "Distância deve ser maior que zero"),
      freteTotal: z.number().min(0),
      diasViagem: z.number().min(1).default(1),
      // Ajudantes para calcular diárias
      ajudante1Id: z.number().nullable().optional(),
      ajudante2Id: z.number().nullable().optional(),
      ajudante3Id: z.number().nullable().optional(),
      // Custos extras estimados
      pedagioEstimado: z.number().default(0),
      outrosCustos: z.number().default(0),
      // Preço do diesel (se não informado, usa média dos últimos 30 dias)
      precoDiesel: z.number().nullable().optional(),
    }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "frota.calcularCustoViagem");

        // 1. Buscar dados do veículo (média de consumo)
        const veiculoRows = await db.select({
          mediaConsumo: veiculos.mediaConsumo,
          tipo: veiculos.tipo,
        }).from(veiculos).where(eq(veiculos.id, input.veiculoId)).limit(1);
        const veiculo = veiculoRows[0];
        const mediaConsumo = Number(veiculo?.mediaConsumo) || 3.5; // fallback 3,5 km/l

        // 2. Preço do diesel: usa o informado ou calcula média dos últimos 30 dias
        let precoDiesel = input.precoDiesel;
        if (!precoDiesel) {
          const trintaDiasAtras = new Date();
          trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
          const precoRows = await db.select({
            media: sql<number>`AVG(${abastecimentos.valorUnitario})`,
          }).from(abastecimentos)
            .where(and(
              eq(abastecimentos.empresaId, input.empresaId),
              eq(abastecimentos.tipoCombustivel, "diesel"),
              isNull(abastecimentos.deletedAt),
              gte(abastecimentos.data, trintaDiasAtras),
            ));
          precoDiesel = Number(precoRows[0]?.media) || 6.5;
        }

        // 3. Calcular custo de combustível
        const litrosNecessarios = input.distanciaKm / mediaConsumo;
        const custoCombustivel = litrosNecessarios * precoDiesel;

        // 4. Calcular diárias do motorista (buscar valor do veículo → motorista padrão)
        let custoDiariasMotorista = 0;
        const veiculoComMotorista = await db.select({
          motoristaId: veiculos.motoristaId,
        }).from(veiculos).where(eq(veiculos.id, input.veiculoId)).limit(1);

        if (veiculoComMotorista[0]?.motoristaId) {
          const motoristaRows = await db.select({
            valorDiaria: funcionarios.valorDiaria,
            tipoCobranca: funcionarios.tipoCobranca,
          }).from(funcionarios).where(eq(funcionarios.id, veiculoComMotorista[0].motoristaId)).limit(1);
          const motorista = motoristaRows[0];
          if (motorista?.tipoCobranca === "diaria" && motorista.valorDiaria) {
            custoDiariasMotorista = Number(motorista.valorDiaria) * input.diasViagem;
          }
        }

        // 5. Calcular diárias dos ajudantes
        let custoDiariasAjudantes = 0;
        const ajudanteIds = [input.ajudante1Id, input.ajudante2Id, input.ajudante3Id].filter(Boolean) as number[];
        for (const ajId of ajudanteIds) {
          const ajRows = await db.select({
            valorDiaria: funcionarios.valorDiaria,
            tipoCobranca: funcionarios.tipoCobranca,
          }).from(funcionarios).where(eq(funcionarios.id, ajId)).limit(1);
          const aj = ajRows[0];
          if (aj?.tipoCobranca === "diaria" && aj.valorDiaria) {
            custoDiariasAjudantes += Number(aj.valorDiaria) * input.diasViagem;
          }
        }

        // 6. Totais e margem
        const custoTotal = custoCombustivel + custoDiariasMotorista + custoDiariasAjudantes + input.pedagioEstimado + input.outrosCustos;
        const lucroEstimado = input.freteTotal - custoTotal;
        const margemPercent = input.freteTotal > 0 ? (lucroEstimado / input.freteTotal) * 100 : 0;

        // 7. Classificação da viagem
        let classificacao: "otimo" | "bom" | "atencao" | "prejuizo";
        if (margemPercent >= 30) classificacao = "otimo";
        else if (margemPercent >= 15) classificacao = "bom";
        else if (margemPercent >= 0) classificacao = "atencao";
        else classificacao = "prejuizo";

        return {
          // Inputs usados
          distanciaKm: input.distanciaKm,
          freteTotal: input.freteTotal,
          diasViagem: input.diasViagem,
          mediaConsumoVeiculo: mediaConsumo,
          precoDieselUsado: precoDiesel,
          // Custos detalhados
          litrosNecessarios: Math.round(litrosNecessarios * 10) / 10,
          custoCombustivel: Math.round(custoCombustivel * 100) / 100,
          custoDiariasMotorista: Math.round(custoDiariasMotorista * 100) / 100,
          custoDiariasAjudantes: Math.round(custoDiariasAjudantes * 100) / 100,
          pedagioEstimado: input.pedagioEstimado,
          outrosCustos: input.outrosCustos,
          // Resultado
          custoTotal: Math.round(custoTotal * 100) / 100,
          lucroEstimado: Math.round(lucroEstimado * 100) / 100,
          margemPercent: Math.round(margemPercent * 10) / 10,
          classificacao,
        };
      }, "frota.calcularCustoViagem");
    }),

  // ─── SIMULAÇÕES DE VIAGEM ─────────────────────────────────────────────────
  listSimulacoes: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "frota.listSimulacoes");
        const rows = await db.execute(sql`
          SELECT * FROM simulacoes_viagem
          WHERE "empresaId" = ${input.empresaId}
          ORDER BY "createdAt" DESC
          LIMIT 50
        `);
        return (rows as unknown as any[]) ?? [];
      }, "frota.listSimulacoes");
    }),

  salvarSimulacao: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      veiculoId: z.number().optional(),
      descricao: z.string().min(1),
      origem: z.string().optional(),
      destino: z.string().optional(),
      distanciaKm: z.number(),
      valorFrete: z.number(),
      custoTotal: z.number(),
      margemBruta: z.number(),
      margemPct: z.number(),
      detalhes: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return safeDb(async () => {
        const db = requireDb(await getDb(), "frota.salvarSimulacao");
        await db.execute(sql`
          INSERT INTO simulacoes_viagem
            ("empresaId", "veiculoId", "descricao", "origem", "destino", "distanciaKm", "valorFrete", "custoTotal", "margemBruta", "margemPct", "detalhes", "observacoes", "createdBy")
          VALUES
            (${input.empresaId}, ${input.veiculoId ?? null}, ${input.descricao}, ${input.origem ?? null}, ${input.destino ?? null},
             ${input.distanciaKm}, ${input.valorFrete}, ${input.custoTotal}, ${input.margemBruta}, ${input.margemPct},
             ${input.detalhes ?? null}, ${input.observacoes ?? null}, ${ctx.user?.name ?? null})
        `);
        return { success: true };
      }, "frota.salvarSimulacao");
    }),
});
