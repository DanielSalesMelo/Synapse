import { masterAdminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { planos, licencas, cobrancas, empresas } from "../drizzle/schema";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Planos padrão para seed ──────────────────────────────────────────────────
const PLANOS_DEFAULT = [
  {
    codigo: "trial" as const,
    nome: "Trial",
    descricao: "Período de teste gratuito por 14 dias com acesso completo.",
    precoMensal: "0",
    precoTrimestral: "0",
    precoSemestral: "0",
    precoAnual: "0",
    limiteUsuarios: 3,
    limiteVeiculos: 5,
    limiteMotoristas: 5,
    modulosAtivos: JSON.stringify(["viagens","carregamento","notas_fiscais","acerto","abastecimentos","manutencoes","motoristas","checklist","financeiro","despachante","alertas"]),
    temIntegracaoWinthor: false,
    temIntegracaoArquivei: true,
    temRelatoriosAvancados: false,
    temMultiEmpresa: false,
    temSuportePrioritario: false,
    diasTrial: 14,
  },
  {
    codigo: "basico" as const,
    nome: "Básico",
    descricao: "Ideal para frotas pequenas. Módulos essenciais de operação.",
    precoMensal: "199",
    precoTrimestral: "549",
    precoSemestral: "1049",
    precoAnual: "1899",
    limiteUsuarios: 5,
    limiteVeiculos: 15,
    limiteMotoristas: 15,
    modulosAtivos: JSON.stringify(["viagens","carregamento","notas_fiscais","acerto","abastecimentos","manutencoes","motoristas","checklist","despachante","alertas"]),
    temIntegracaoWinthor: false,
    temIntegracaoArquivei: true,
    temRelatoriosAvancados: false,
    temMultiEmpresa: false,
    temSuportePrioritario: false,
    diasTrial: 14,
  },
  {
    codigo: "pro" as const,
    nome: "Pro",
    descricao: "Para frotas médias e grandes. Integrações, relatórios avançados e multi-empresa.",
    precoMensal: "449",
    precoTrimestral: "1199",
    precoSemestral: "2199",
    precoAnual: "3999",
    limiteUsuarios: 20,
    limiteVeiculos: 50,
    limiteMotoristas: 50,
    modulosAtivos: JSON.stringify(["viagens","carregamento","notas_fiscais","acerto","abastecimentos","manutencoes","motoristas","checklist","financeiro","despachante","alertas","integracoes","relatorios"]),
    temIntegracaoWinthor: true,
    temIntegracaoArquivei: true,
    temRelatoriosAvancados: true,
    temMultiEmpresa: true,
    temSuportePrioritario: false,
    diasTrial: 14,
  },
  {
    codigo: "enterprise" as const,
    nome: "Enterprise",
    descricao: "Solução completa sem limites. Suporte prioritário e personalização.",
    precoMensal: "0",
    precoTrimestral: "0",
    precoSemestral: "0",
    precoAnual: "0",
    limiteUsuarios: 9999,
    limiteVeiculos: 9999,
    limiteMotoristas: 9999,
    modulosAtivos: JSON.stringify(["todos"]),
    temIntegracaoWinthor: true,
    temIntegracaoArquivei: true,
    temRelatoriosAvancados: true,
    temMultiEmpresa: true,
    temSuportePrioritario: true,
    diasTrial: 30,
  },
];

// ─── Helper: calcular dataFim pelo ciclo ──────────────────────────────────────
function calcularDataFim(inicio: Date, ciclo: string): Date {
  const d = new Date(inicio);
  switch (ciclo) {
    case "mensal":      d.setMonth(d.getMonth() + 1); break;
    case "trimestral":  d.setMonth(d.getMonth() + 3); break;
    case "semestral":   d.setMonth(d.getMonth() + 6); break;
    case "anual":       d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

// ─── Helper: status automático da licença ─────────────────────────────────────
function calcularStatusLicenca(licenca: any): string {
  const agora = new Date();
  if (licenca.status === "cancelada") return "cancelada";
  if (licenca.status === "suspensa") return "suspensa";
  if (licenca.planoCod === "trial") {
    if (licenca.dataTrialFim && new Date(licenca.dataTrialFim) < agora) return "vencida";
    return "trial";
  }
  if (licenca.dataFim && new Date(licenca.dataFim) < agora) return "vencida";
  return "ativa";
}

export const licenciamentoRouter = router({

  // ─── PLANOS ────────────────────────────────────────────────────────────────
  listarPlanos: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const lista = await db.select().from(planos).where(eq(planos.ativo, true)).orderBy(planos.id);
    return lista;
  }),

  seedPlanos: masterAdminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    for (const p of PLANOS_DEFAULT) {
      await db.insert(planos).values(p).onConflictDoNothing();
    }
    return { ok: true, mensagem: "Planos padrão criados com sucesso!" };
  }),

  atualizarPlano: masterAdminProcedure
    .input(z.object({
      codigo: z.enum(["trial", "basico", "pro", "enterprise"]),
      precoMensal: z.string().optional(),
      precoTrimestral: z.string().optional(),
      precoSemestral: z.string().optional(),
      precoAnual: z.string().optional(),
      limiteUsuarios: z.number().optional(),
      limiteVeiculos: z.number().optional(),
      limiteMotoristas: z.number().optional(),
      diasTrial: z.number().optional(),
      descricao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { codigo, ...updates } = input;
      const filtered = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      await db.update(planos).set({ ...filtered, updatedAt: new Date() }).where(eq(planos.codigo, codigo));
      return { ok: true, mensagem: "Plano atualizado!" };
    }),

  // ─── LICENÇAS ──────────────────────────────────────────────────────────────
  listarLicencas: masterAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
    const lista = await db
      .select({
        licenca: licencas,
        empresa: { id: empresas.id, nome: empresas.nome, email: empresas.email, cnpj: empresas.cnpj },
      })
      .from(licencas)
      .leftJoin(empresas, eq(licencas.empresaId, empresas.id))
      .orderBy(desc(licencas.createdAt));
    return lista;
  }),

  getLicencaByEmpresa: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const isMaster = (ctx.user as any).role === "master_admin";
      const userEmpresaId = (ctx.user as any).empresaId;
      if (!isMaster && userEmpresaId !== input.empresaId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const [lic] = await db.select().from(licencas).where(eq(licencas.empresaId, input.empresaId)).limit(1);
      if (!lic) return null;
      return { ...lic, statusCalculado: calcularStatusLicenca(lic) };
    }),

  criarLicenca: masterAdminProcedure
    .input(z.object({
      empresaId: z.number(),
      planoCod: z.enum(["trial", "basico", "pro", "enterprise"]),
      ciclo: z.enum(["mensal", "trimestral", "semestral", "anual"]).default("mensal"),
      valorContratado: z.string().optional(),
      descontoPercent: z.string().optional(),
      diasTrial: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Verifica se já existe licença para essa empresa
      const [existente] = await db.select().from(licencas).where(eq(licencas.empresaId, input.empresaId)).limit(1);
      if (existente) throw new TRPCError({ code: "CONFLICT", message: "Empresa já possui uma licença. Use 'Atualizar Licença'." });

      const agora = new Date();
      const diasTrial = input.diasTrial ?? 14;
      const dataTrialFim = new Date(agora);
      dataTrialFim.setDate(dataTrialFim.getDate() + diasTrial);

      let dataFim: Date | undefined;
      let status: "trial" | "ativa" = "trial";
      if (input.planoCod !== "trial") {
        status = "ativa";
        dataFim = calcularDataFim(agora, input.ciclo);
      }

      await db.insert(licencas).values({
        empresaId: input.empresaId,
        planoCod: input.planoCod,
        status,
        ciclo: input.ciclo,
        dataInicio: agora,
        dataFim: dataFim ?? null,
        dataTrialFim: input.planoCod === "trial" ? dataTrialFim : null,
        dataProximoVencimento: dataFim ?? dataTrialFim,
        valorContratado: input.valorContratado ?? null,
        descontoPercent: input.descontoPercent ?? "0",
        observacoes: input.observacoes ?? null,
        criadoPor: (ctx.user as any).id,
      });

      return { ok: true, mensagem: `Licença ${input.planoCod.toUpperCase()} criada com sucesso!` };
    }),

  atualizarLicenca: masterAdminProcedure
    .input(z.object({
      empresaId: z.number(),
      planoCod: z.enum(["trial", "basico", "pro", "enterprise"]).optional(),
      status: z.enum(["trial", "ativa", "suspensa", "vencida", "cancelada"]).optional(),
      ciclo: z.enum(["mensal", "trimestral", "semestral", "anual"]).optional(),
      dataFim: z.string().optional(),
      dataTrialFim: z.string().optional(),
      valorContratado: z.string().optional(),
      descontoPercent: z.string().optional(),
      motivoSuspensao: z.string().optional(),
      observacoes: z.string().optional(),
      renovar: z.boolean().optional(), // se true, recalcula dataFim a partir de hoje
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [lic] = await db.select().from(licencas).where(eq(licencas.empresaId, input.empresaId)).limit(1);
      if (!lic) throw new TRPCError({ code: "NOT_FOUND", message: "Licença não encontrada para essa empresa" });

      const updates: any = { updatedAt: new Date(), updatedBy: (ctx.user as any).id };

      if (input.planoCod) updates.planoCod = input.planoCod;
      if (input.status) updates.status = input.status;
      if (input.ciclo) updates.ciclo = input.ciclo;
      if (input.valorContratado !== undefined) updates.valorContratado = input.valorContratado;
      if (input.descontoPercent !== undefined) updates.descontoPercent = input.descontoPercent;
      if (input.motivoSuspensao !== undefined) updates.motivoSuspensao = input.motivoSuspensao;
      if (input.observacoes !== undefined) updates.observacoes = input.observacoes;
      if (input.dataFim) updates.dataFim = new Date(input.dataFim);
      if (input.dataTrialFim) updates.dataTrialFim = new Date(input.dataTrialFim);

      if (input.renovar) {
        const ciclo = input.ciclo ?? lic.ciclo ?? "mensal";
        const novaDataFim = calcularDataFim(new Date(), ciclo);
        updates.dataFim = novaDataFim;
        updates.dataProximoVencimento = novaDataFim;
        updates.status = "ativa";
        updates.dataUltimoPagamento = new Date();
      }

      await db.update(licencas).set(updates).where(eq(licencas.empresaId, input.empresaId));
      return { ok: true, mensagem: "Licença atualizada com sucesso!" };
    }),

  // Converte trial em plano pago
  ativarPlano: masterAdminProcedure
    .input(z.object({
      empresaId: z.number(),
      planoCod: z.enum(["basico", "pro", "enterprise"]),
      ciclo: z.enum(["mensal", "trimestral", "semestral", "anual"]),
      valorContratado: z.string(),
      descontoPercent: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const agora = new Date();
      const dataFim = calcularDataFim(agora, input.ciclo);

      const [lic] = await db.select().from(licencas).where(eq(licencas.empresaId, input.empresaId)).limit(1);

      if (lic) {
        await db.update(licencas).set({
          planoCod: input.planoCod,
          status: "ativa",
          ciclo: input.ciclo,
          dataInicio: agora,
          dataFim,
          dataTrialFim: null,
          dataProximoVencimento: dataFim,
          valorContratado: input.valorContratado,
          descontoPercent: input.descontoPercent ?? "0",
          observacoes: input.observacoes ?? null,
          updatedBy: (ctx.user as any).id,
          updatedAt: new Date(),
        }).where(eq(licencas.empresaId, input.empresaId));
      } else {
        await db.insert(licencas).values({
          empresaId: input.empresaId,
          planoCod: input.planoCod,
          status: "ativa",
          ciclo: input.ciclo,
          dataInicio: agora,
          dataFim,
          dataProximoVencimento: dataFim,
          valorContratado: input.valorContratado,
          descontoPercent: input.descontoPercent ?? "0",
          observacoes: input.observacoes ?? null,
          criadoPor: (ctx.user as any).id,
        });
      }

      return { ok: true, mensagem: `Plano ${input.planoCod.toUpperCase()} ativado com sucesso!` };
    }),

  // ─── COBRANÇAS ─────────────────────────────────────────────────────────────
  listarCobrancas: masterAdminProcedure
    .input(z.object({ empresaId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const query = db
        .select({
          cobranca: cobrancas,
          empresa: { id: empresas.id, nome: empresas.nome },
        })
        .from(cobrancas)
        .leftJoin(empresas, eq(cobrancas.empresaId, empresas.id))
        .orderBy(desc(cobrancas.createdAt));
      if (input.empresaId) {
        return await query.where(eq(cobrancas.empresaId, input.empresaId));
      }
      return await query;
    }),

  criarCobranca: masterAdminProcedure
    .input(z.object({
      empresaId: z.number(),
      planoCod: z.enum(["trial", "basico", "pro", "enterprise"]),
      ciclo: z.enum(["mensal", "trimestral", "semestral", "anual"]),
      periodoInicio: z.string(),
      periodoFim: z.string(),
      valorBruto: z.string(),
      desconto: z.string().optional(),
      valorLiquido: z.string(),
      dataVencimento: z.string(),
      formaPagamento: z.enum(["pix", "boleto", "cartao_credito", "transferencia", "cortesia"]).optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [lic] = await db.select().from(licencas).where(eq(licencas.empresaId, input.empresaId)).limit(1);
      if (!lic) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não possui licença cadastrada" });

      await db.insert(cobrancas).values({
        empresaId: input.empresaId,
        licencaId: lic.id,
        planoCod: input.planoCod,
        ciclo: input.ciclo,
        periodoInicio: new Date(input.periodoInicio),
        periodoFim: new Date(input.periodoFim),
        valorBruto: input.valorBruto,
        desconto: input.desconto ?? "0",
        valorLiquido: input.valorLiquido,
        dataVencimento: new Date(input.dataVencimento),
        formaPagamento: input.formaPagamento ?? null,
        observacoes: input.observacoes ?? null,
        criadoPor: (ctx.user as any).id,
      });

      return { ok: true, mensagem: "Cobrança registrada com sucesso!" };
    }),

  registrarPagamento: masterAdminProcedure
    .input(z.object({
      cobrancaId: z.number(),
      formaPagamento: z.enum(["pix", "boleto", "cartao_credito", "transferencia", "cortesia"]),
      comprovante: z.string().optional(),
      observacoes: z.string().optional(),
      renovarLicenca: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const [cob] = await db.select().from(cobrancas).where(eq(cobrancas.id, input.cobrancaId)).limit(1);
      if (!cob) throw new TRPCError({ code: "NOT_FOUND", message: "Cobrança não encontrada" });

      await db.update(cobrancas).set({
        status: "pago",
        formaPagamento: input.formaPagamento,
        dataPagamento: new Date(),
        comprovante: input.comprovante ?? null,
        observacoes: input.observacoes ?? null,
        updatedAt: new Date(),
      }).where(eq(cobrancas.id, input.cobrancaId));

      // Renova a licença automaticamente
      if (input.renovarLicenca) {
        const [lic] = await db.select().from(licencas).where(eq(licencas.id, cob.licencaId)).limit(1);
        if (lic) {
          const novaDataFim = calcularDataFim(new Date(cob.periodoFim), cob.ciclo);
          await db.update(licencas).set({
            status: "ativa",
            dataFim: novaDataFim,
            dataProximoVencimento: novaDataFim,
            dataUltimoPagamento: new Date(),
            updatedAt: new Date(),
          }).where(eq(licencas.id, cob.licencaId));
        }
      }

      return { ok: true, mensagem: "Pagamento registrado e licença renovada!" };
    }),

  // ─── DASHBOARD DE LICENÇAS ─────────────────────────────────────────────────
  dashboardLicencas: masterAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const todasLicencas = await db
      .select({ licenca: licencas, empresa: { id: empresas.id, nome: empresas.nome } })
      .from(licencas)
      .leftJoin(empresas, eq(licencas.empresaId, empresas.id));

    const agora = new Date();
    const em7dias = new Date(); em7dias.setDate(em7dias.getDate() + 7);
    const em30dias = new Date(); em30dias.setDate(em30dias.getDate() + 30);

    const stats = {
      total: todasLicencas.length,
      trial: todasLicencas.filter(l => l.licenca.planoCod === "trial" && l.licenca.status === "trial").length,
      ativas: todasLicencas.filter(l => l.licenca.status === "ativa").length,
      vencidas: todasLicencas.filter(l => {
        const s = calcularStatusLicenca(l.licenca);
        return s === "vencida";
      }).length,
      suspensas: todasLicencas.filter(l => l.licenca.status === "suspensa").length,
      vencendoEm7dias: todasLicencas.filter(l => {
        const df = l.licenca.dataFim ?? l.licenca.dataTrialFim;
        if (!df) return false;
        const d = new Date(df);
        return d > agora && d <= em7dias;
      }).length,
      vencendoEm30dias: todasLicencas.filter(l => {
        const df = l.licenca.dataFim ?? l.licenca.dataTrialFim;
        if (!df) return false;
        const d = new Date(df);
        return d > agora && d <= em30dias;
      }).length,
      porPlano: {
        trial: todasLicencas.filter(l => l.licenca.planoCod === "trial").length,
        basico: todasLicencas.filter(l => l.licenca.planoCod === "basico").length,
        pro: todasLicencas.filter(l => l.licenca.planoCod === "pro").length,
        enterprise: todasLicencas.filter(l => l.licenca.planoCod === "enterprise").length,
      },
    };

    const alertas = todasLicencas
      .filter(l => {
        const df = l.licenca.dataFim ?? l.licenca.dataTrialFim;
        if (!df) return false;
        const d = new Date(df);
        return d > agora && d <= em30dias;
      })
      .map(l => ({
        empresaId: l.licenca.empresaId,
        empresaNome: l.empresa?.nome ?? "—",
        plano: l.licenca.planoCod,
        dataVencimento: l.licenca.dataFim ?? l.licenca.dataTrialFim,
        diasRestantes: Math.ceil((new Date(l.licenca.dataFim ?? l.licenca.dataTrialFim!).getTime() - agora.getTime()) / 86400000),
      }))
      .sort((a, b) => a.diasRestantes - b.diasRestantes);

    return { stats, alertas };
  }),

  // ─── REGISTRO DE TRIAL PÚBLICO ────────────────────────────────────────────
  // Endpoint público: cria empresa + usuário admin + licença trial em uma transação
  registrarTrial: publicProcedure
    .input(z.object({
      nomeEmpresa: z.string().min(2, "Nome da empresa deve ter ao menos 2 caracteres"),
      cnpj: z.string().optional(),
      cidade: z.string().optional(),
      estado: z.string().max(2).optional(),
      tipoEmpresa: z.enum(["independente", "matriz", "filial"]).default("independente"),
      matrizId: z.number().optional(),
      nomeUsuario: z.string().min(2, "Seu nome deve ter ao menos 2 caracteres"),
      email: z.string().email("E-mail inválido"),
      senha: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
      telefone: z.string().optional(),
      diasTrial: z.number().min(1).max(90).default(14),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // 1. Verificar se e-mail já existe
      const { users } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const [emailExistente] = await db.select().from(users).where(eqOp(users.email, input.email)).limit(1);
      if (emailExistente) {
        throw new TRPCError({ code: "CONFLICT", message: "Este e-mail já está cadastrado. Faça login ou use outro e-mail." });
      }

      // 2. Criar empresa
      const { randomBytes } = await import("crypto");
      const codigoConvite = randomBytes(4).toString("hex").toUpperCase();
      const [novaEmpresa] = await db.insert(empresas).values({
        nome: input.nomeEmpresa,
        cnpj: input.cnpj ?? null,
        cidade: input.cidade ?? null,
        estado: input.estado ?? null,
        email: input.email,
        telefone: input.telefone ?? null,
        tipoEmpresa: input.tipoEmpresa as any,
        matrizId: input.matrizId ?? null,
        codigoConvite,
        ativo: true,
      }).returning();
      if (!novaEmpresa) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar empresa" });

      // 3. Criar usuário admin da empresa
      const bcrypt = await import("bcryptjs");
      const hashedSenha = await bcrypt.hash(input.senha, 10);
      const openId = `local_${Date.now()}_${randomBytes(4).toString("hex")}`;
      const [novoUsuario] = await db.insert(users).values({
        name: input.nomeUsuario,
        email: input.email,
        phone: input.telefone ?? null,
        password: hashedSenha,
        openId,
        role: "admin" as any,
        status: "approved" as any,
        empresaId: novaEmpresa.id,
        loginMethod: "local" as any,
      }).returning();
      if (!novoUsuario) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar usuário" });

      // 4. Criar licença trial
      const agora = new Date();
      const dataTrialFim = new Date(agora);
      dataTrialFim.setDate(dataTrialFim.getDate() + input.diasTrial);
      await db.insert(licencas).values({
        empresaId: novaEmpresa.id,
        planoCod: "trial" as any,
        status: "trial" as any,
        ciclo: "mensal" as any,
        dataInicio: agora,
        dataTrialFim,
        dataProximoVencimento: dataTrialFim,
        criadoPor: novoUsuario.id,
      });

      return {
        ok: true,
        mensagem: `Bem-vindo ao Synapse! Seu trial de ${input.diasTrial} dias está ativo.`,
        empresaId: novaEmpresa.id,
        codigoConvite,
        dataTrialFim: dataTrialFim.toISOString(),
      };
    }),
});
