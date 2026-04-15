import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { iaAgentes, iaSessoes, iaMensagens, iaConhecimento } from "../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// ─── Prompts padrão dos agentes ──────────────────────────────────────────────
const PROMPTS_PADRAO: Record<string, { nome: string; avatar: string; systemPrompt: string; descricao: string }> = {
  master: {
    nome: "Synapse Master",
    avatar: "🧠",
    descricao: "IA central que coordena todos os agentes e responde sobre o sistema",
    systemPrompt: `Você é o Synapse Master, a inteligência central do sistema Synapse de gestão logística.
Você tem acesso a todos os módulos: Frota, Financeiro, RH, Manutenção, Recepção, WMS e Jurídico.
Responda de forma clara, objetiva e profissional. Quando não souber algo específico, oriente o usuário ao módulo correto.
Sempre que possível, sugira ações práticas baseadas nas informações disponíveis.`,
  },
  financeiro: {
    nome: "Analista Financeiro",
    avatar: "📊",
    descricao: "Especialista em custos, DRE, contas a pagar/receber e análise financeira",
    systemPrompt: `Você é um analista financeiro especializado em logística e transporte.
Você analisa custos por km, DRE, contas a pagar e receber, adiantamentos e margens de lucro.
Forneça análises precisas, identifique tendências e sugira otimizações de custo.`,
  },
  frota: {
    nome: "Gestor de Frota",
    avatar: "🚛",
    descricao: "Especialista em veículos, rotas, checklists e gestão operacional de frota",
    systemPrompt: `Você é um especialista em gestão de frotas de transporte.
Você conhece sobre veículos, checklists, rotas, consumo de combustível e eficiência operacional.
Ajude a otimizar rotas, reduzir custos de combustível e garantir a conformidade dos veículos.`,
  },
  motorista: {
    nome: "Suporte ao Motorista",
    avatar: "👨‍✈️",
    descricao: "Assistente para dúvidas operacionais, procedimentos e suporte aos motoristas",
    systemPrompt: `Você é um assistente de suporte para motoristas e equipe operacional.
Você responde dúvidas sobre procedimentos, documentação (CNH, CRLV, MOPP), regras de trânsito e legislação de transporte.
Use linguagem simples e direta. Seja empático e prestativo.`,
  },
  manutencao: {
    nome: "Especialista em Manutenção",
    avatar: "🔧",
    descricao: "Especialista em manutenção preventiva, corretiva e gestão de pneus",
    systemPrompt: `Você é um especialista em manutenção de veículos pesados e logística.
Você conhece sobre manutenção preventiva, corretiva, gestão de pneus, diagnóstico de problemas mecânicos e planejamento de revisões.
Ajude a criar planos de manutenção, interpretar alertas e reduzir custos com reparos.`,
  },
  juridico: {
    nome: "Assistente Jurídico",
    avatar: "⚖️",
    descricao: "Especialista em legislação de transporte, ANTT, multas e compliance",
    systemPrompt: `Você é um assistente jurídico especializado em transporte rodoviário de cargas.
Você conhece a legislação da ANTT, CTB, normas de segurança, multas, habilitações e contratos de transporte.
IMPORTANTE: Sempre recomende consultar um advogado para casos específicos e complexos.`,
  },
  recepcao: {
    nome: "Assistente de Recepção",
    avatar: "📦",
    descricao: "Especialista em recebimento de mercadorias, conferência e gestão de docas",
    systemPrompt: `Você é um especialista em recepção e conferência de mercadorias.
Você conhece sobre processos de recebimento, conferência de notas fiscais, gestão de docas e identificação de divergências.
Ajude a otimizar o processo de recebimento e garantir a rastreabilidade das mercadorias.`,
  },
  wms: {
    nome: "Gestor de Armazém",
    avatar: "🏭",
    descricao: "Especialista em WMS, gestão de estoque, localização e movimentações",
    systemPrompt: `Você é um especialista em gestão de armazéns e estoque (WMS).
Você conhece sobre organização de armazéns, endereçamento de produtos, controle de estoque, inventários, picking e expedição.
Ajude a otimizar o layout do armazém, reduzir perdas e melhorar a eficiência das operações.`,
  },
};

// ─── Motor local gratuito ────────────────────────────────────────────────────
function processarMensagemLocal(
  mensagem: string,
  setor: string,
  instrucoes?: string | null,
): string {
  const msg = mensagem.toLowerCase();

  const respostasSetor: Record<string, Record<string, string>> = {
    financeiro: {
      "custo": "Para analisar custos, acesse Financeiro → DRE por Placa. Lá você encontra o custo por km e a margem de lucro por viagem.",
      "conta": "As contas a pagar e receber estão no módulo Financeiro. Filtre por status (pendente, pago, vencido) e categoria.",
      "dre": "O DRE está disponível em Financeiro → Relatórios. Ele consolida receitas, despesas e lucro por período.",
      "adiantamento": "Os adiantamentos para motoristas são gerenciados em Financeiro → Adiantamentos.",
    },
    frota: {
      "veiculo": "Os veículos estão em Frota → Veículos. Veja status, KM atual, motorista vinculado e documentação.",
      "checklist": "Os checklists estão em Frota → Checklists. É obrigatório preencher antes de cada viagem.",
      "combustivel": "O controle de abastecimento está em Frota → Abastecimentos.",
    },
    manutencao: {
      "manutencao": "As manutenções estão em Manutenção → Histórico. Registre preventivas e corretivas com custo e próxima revisão.",
      "pneu": "O controle de pneus está em Manutenção → Pneus.",
      "revisao": "Para planejar revisões, acesse Manutenção → Preventivas.",
    },
    recepcao: {
      "recebimento": "Para registrar um recebimento, acesse Recepção → Novo Recebimento.",
      "conferencia": "A conferência de itens é feita em Recepção → Recebimentos → selecione o recebimento → Conferir Itens.",
      "doca": "As docas são configuradas em Recepção → Docas.",
      "divergencia": "Divergências são registradas durante a conferência. Acesse Recepção → Divergências.",
    },
    wms: {
      "estoque": "O estoque atual está em WMS → Estoque. Filtre por produto e armazém.",
      "produto": "Os produtos são cadastrados em WMS → Produtos.",
      "movimentacao": "As movimentações estão em WMS → Movimentações.",
      "armazem": "Os armazéns são configurados em WMS → Armazéns.",
    },
  };

  const respostasGerais: Record<string, string> = {
    "ola": "Olá! Como posso ajudar você hoje?",
    "ajuda": "Posso ajudar com dúvidas sobre o sistema, procedimentos operacionais e análise de informações. O que você precisa?",
    "erro": "Se você está encontrando um erro: 1) Recarregue a página, 2) Verifique os campos obrigatórios, 3) Verifique sua conexão.",
    "relatorio": "Os relatórios estão disponíveis em cada módulo. Acesse o módulo desejado e procure pela opção 'Relatórios' ou 'Exportar'.",
  };

  const respostasDoSetor = respostasSetor[setor] ?? {};
  for (const [chave, resposta] of Object.entries(respostasDoSetor)) {
    if (msg.includes(chave)) return resposta;
  }

  for (const [chave, resposta] of Object.entries(respostasGerais)) {
    if (msg.includes(chave)) return resposta;
  }

  // Verificar instruções personalizadas
  if (instrucoes) {
    const linhas = instrucoes.split("\n").filter(l => l.trim());
    for (const linha of linhas) {
      if (linha.includes(":")) {
        const [gatilho, resposta] = linha.split(":").map(s => s.trim());
        if (gatilho && resposta && msg.includes(gatilho.toLowerCase())) return resposta;
      }
    }
  }

  const respostasPadrao = [
    `Entendi sua pergunta. Para obter informações mais precisas, acesse o módulo correspondente no menu lateral ou reformule sua pergunta com mais detalhes.`,
    `Posso ajudar com isso! Acesse o módulo correspondente no menu lateral para realizar essa operação. Precisa de orientação sobre algum passo específico?`,
    `Boa pergunta! Para isso, você pode acessar o módulo relevante no sistema. Se precisar de ajuda específica, descreva melhor o que você precisa fazer.`,
  ];
  return respostasPadrao[Math.floor(Math.random() * respostasPadrao.length)];
}

// ─── Router de IA ─────────────────────────────────────────────────────────────
export const iaRouter = router({

  listAgentes: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;

    const agentes = await db.select().from(iaAgentes)
      .where(and(eq(iaAgentes.empresaId, empresaId), eq(iaAgentes.ativo, true), isNull(iaAgentes.deletedAt)))
      .orderBy(iaAgentes.isMaster, iaAgentes.nome);

    if (agentes.length === 0) {
      return Object.entries(PROMPTS_PADRAO).map(([setor, info], idx) => ({
        id: -(idx + 1),
        empresaId,
        setor,
        nome: info.nome,
        avatar: info.avatar,
        descricao: info.descricao,
        systemPrompt: info.systemPrompt,
        instrucoes: null as string | null,
        contextoEmpresa: null as string | null,
        temperatura: "0.7",
        modelo: "local",
        ativo: true,
        isMaster: setor === "master",
        usarIaExterna: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null as Date | null,
      }));
    }
    return agentes;
  }),

  inicializarAgentes: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;

    const existentes = await db.select({ id: iaAgentes.id }).from(iaAgentes)
      .where(and(eq(iaAgentes.empresaId, empresaId), isNull(iaAgentes.deletedAt)));
    if (existentes.length > 0) return { message: "Agentes já inicializados", count: existentes.length };

    await db.insert(iaAgentes).values(
      Object.entries(PROMPTS_PADRAO).map(([setor, info]) => ({
        empresaId,
        setor: setor as any,
        nome: info.nome,
        avatar: info.avatar,
        descricao: info.descricao,
        systemPrompt: info.systemPrompt,
        isMaster: setor === "master",
        usarIaExterna: false,
      }))
    );
    return { message: "Agentes inicializados", count: Object.keys(PROMPTS_PADRAO).length };
  }),

  configurarAgente: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      setor: z.string().optional(),
      nome: z.string().optional(),
      avatar: z.string().optional(),
      descricao: z.string().optional(),
      systemPrompt: z.string().optional(),
      instrucoes: z.string().optional(),
      contextoEmpresa: z.string().optional(),
      usarIaExterna: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      if (input.id && input.id > 0) {
        await db.update(iaAgentes).set({
          nome: input.nome,
          avatar: input.avatar,
          descricao: input.descricao,
          systemPrompt: input.systemPrompt,
          instrucoes: input.instrucoes,
          contextoEmpresa: input.contextoEmpresa,
          usarIaExterna: input.usarIaExterna,
          updatedAt: new Date(),
        }).where(and(eq(iaAgentes.id, input.id), eq(iaAgentes.empresaId, empresaId)));
        return { success: true, message: "Agente atualizado" };
      } else {
        const padrao = PROMPTS_PADRAO[input.setor ?? "custom"];
        const [novo] = await db.insert(iaAgentes).values({
          empresaId,
          setor: (input.setor ?? "custom") as any,
          nome: input.nome ?? padrao?.nome ?? "Novo Agente",
          avatar: input.avatar ?? padrao?.avatar ?? "🤖",
          descricao: input.descricao ?? padrao?.descricao,
          systemPrompt: input.systemPrompt ?? padrao?.systemPrompt ?? "Você é um assistente do sistema Synapse.",
          instrucoes: input.instrucoes,
          contextoEmpresa: input.contextoEmpresa,
          usarIaExterna: input.usarIaExterna ?? false,
        }).returning();
        return { success: true, message: "Agente criado", agente: novo };
      }
    }),

  criarSessao: protectedProcedure
    .input(z.object({ agenteId: z.number(), titulo: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [sessao] = await db.insert(iaSessoes).values({
        empresaId: ctx.user.empresaId!,
        usuarioId: ctx.user.id,
        agenteId: input.agenteId,
        titulo: input.titulo ?? "Nova conversa",
      }).returning();
      return sessao;
    }),

  listSessoes: protectedProcedure
    .input(z.object({ agenteId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(iaSessoes.usuarioId, ctx.user.id), isNull(iaSessoes.deletedAt)];
      if (input.agenteId) conditions.push(eq(iaSessoes.agenteId, input.agenteId));
      return db.select().from(iaSessoes).where(and(...conditions)).orderBy(desc(iaSessoes.updatedAt)).limit(20);
    }),

  getMensagens: protectedProcedure
    .input(z.object({ sessaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(iaMensagens).where(eq(iaMensagens.sessaoId, input.sessaoId)).orderBy(iaMensagens.createdAt);
    }),

  enviarMensagem: protectedProcedure
    .input(z.object({
      sessaoId: z.number(),
      agenteId: z.number(),
      mensagem: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const empresaId = ctx.user.empresaId!;

      await db.insert(iaMensagens).values({ sessaoId: input.sessaoId, empresaId, role: "user", conteudo: input.mensagem });

      let agenteConfig: { systemPrompt: string; instrucoes?: string | null; setor: string; usarIaExterna: boolean };

      if (input.agenteId < 0) {
        const setores = Object.keys(PROMPTS_PADRAO);
        const setor = setores[Math.abs(input.agenteId) - 1] ?? "master";
        const padrao = PROMPTS_PADRAO[setor]!;
        agenteConfig = { ...padrao, setor, instrucoes: null, usarIaExterna: false };
      } else {
        const [agente] = await db.select().from(iaAgentes)
          .where(and(eq(iaAgentes.id, input.agenteId), eq(iaAgentes.empresaId, empresaId))).limit(1);
        if (!agente) throw new TRPCError({ code: "NOT_FOUND" });
        agenteConfig = { systemPrompt: agente.systemPrompt, instrucoes: agente.instrucoes, setor: agente.setor, usarIaExterna: agente.usarIaExterna };
      }

      const historico = await db.select({ role: iaMensagens.role, conteudo: iaMensagens.conteudo })
        .from(iaMensagens).where(eq(iaMensagens.sessaoId, input.sessaoId))
        .orderBy(desc(iaMensagens.createdAt)).limit(10);

      let resposta: string;
      let tokens = 0;
      let modoLocal = true;

      if (agenteConfig.usarIaExterna && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("...")) {
        try {
          const { default: OpenAI } = await import("openai");
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const messages: any[] = [
            { role: "system", content: agenteConfig.systemPrompt + (agenteConfig.instrucoes ? `\n\nInstruções:\n${agenteConfig.instrucoes}` : "") },
            ...historico.reverse().map(h => ({ role: h.role, content: h.conteudo })),
            { role: "user", content: input.mensagem },
          ];
          const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages, max_tokens: 500, temperature: 0.7 });
          resposta = completion.choices[0]?.message?.content ?? "Não foi possível gerar uma resposta.";
          tokens = completion.usage?.total_tokens ?? 0;
          modoLocal = false;
        } catch {
          resposta = processarMensagemLocal(input.mensagem, agenteConfig.setor, agenteConfig.instrucoes);
        }
      } else {
        resposta = processarMensagemLocal(input.mensagem, agenteConfig.setor, agenteConfig.instrucoes);
      }

      await db.insert(iaMensagens).values({ sessaoId: input.sessaoId, empresaId, role: "assistant", conteudo: resposta, tokens });
      await db.update(iaSessoes).set({ updatedAt: new Date() }).where(eq(iaSessoes.id, input.sessaoId));

      return { resposta, tokens, modoLocal };
    }),

  // Manter compatibilidade com o chat antigo (OpenAI direto)
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(2000),
      agent: z.enum(["synapse", "analista", "motorista", "manutencao", "juridico"]).default("synapse"),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).default([]),
    }))
    .mutation(async ({ input }) => {
      const agentMap: Record<string, string> = {
        synapse: "master", analista: "financeiro", motorista: "motorista",
        manutencao: "manutencao", juridico: "juridico",
      };
      const setor = agentMap[input.agent] ?? "master";
      const padrao = PROMPTS_PADRAO[setor]!;

      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && !apiKey.includes("...")) {
        try {
          const { default: OpenAI } = await import("openai");
          const openai = new OpenAI({ apiKey });
          const messages: any[] = [
            { role: "system", content: padrao.systemPrompt },
            ...input.history.map(h => ({ role: h.role, content: h.content })),
            { role: "user", content: input.message },
          ];
          const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages, max_tokens: 1000, temperature: 0.7 });
          return { reply: completion.choices[0]?.message?.content ?? "Sem resposta.", agent: input.agent, tokensUsed: completion.usage?.total_tokens ?? 0 };
        } catch { /* fallback */ }
      }
      return { reply: processarMensagemLocal(input.message, setor, null), agent: input.agent, tokensUsed: 0 };
    }),

  listarAgentes: protectedProcedure.query(() => {
    return Object.entries(PROMPTS_PADRAO).map(([id, info]) => ({
      id, nome: info.nome, descricao: info.descricao, icone: info.avatar,
    }));
  }),

  listConhecimento: adminProcedure
    .input(z.object({ agenteId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(iaConhecimento.empresaId, ctx.user.empresaId!), isNull(iaConhecimento.deletedAt), eq(iaConhecimento.ativo, true)];
      if (input.agenteId) conditions.push(eq(iaConhecimento.agenteId, input.agenteId));
      return db.select().from(iaConhecimento).where(and(...conditions)).orderBy(desc(iaConhecimento.createdAt));
    }),

  addConhecimento: adminProcedure
    .input(z.object({
      agenteId: z.number().optional(),
      titulo: z.string().min(3),
      conteudo: z.string().min(10),
      categoria: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [novo] = await db.insert(iaConhecimento).values({
        empresaId: ctx.user.empresaId!,
        agenteId: input.agenteId,
        titulo: input.titulo,
        conteudo: input.conteudo,
        categoria: input.categoria,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        createdBy: ctx.user.id,
      }).returning();
      return novo;
    }),

  deleteConhecimento: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(iaConhecimento).set({ deletedAt: new Date() })
        .where(and(eq(iaConhecimento.id, input.id), eq(iaConhecimento.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  dashboardUso: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [s] = await db.select({ total: sql<number>`count(*)` }).from(iaSessoes).where(and(eq(iaSessoes.empresaId, empresaId), isNull(iaSessoes.deletedAt)));
    const [m] = await db.select({ total: sql<number>`count(*)` }).from(iaMensagens).where(eq(iaMensagens.empresaId, empresaId));
    const [c] = await db.select({ total: sql<number>`count(*)` }).from(iaConhecimento).where(and(eq(iaConhecimento.empresaId, empresaId), isNull(iaConhecimento.deletedAt)));
    return { totalSessoes: s.total, totalMensagens: m.total, totalConhecimento: c.total, modoAtual: "gratuito" };
  }),
});
