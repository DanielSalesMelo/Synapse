import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import OpenAI from "openai";

// ─── Cliente OpenAI ────────────────────────────────────────────────────────────
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "OPENAI_API_KEY não configurada no servidor." });
  return new OpenAI({ apiKey });
}

// ─── Prompts dos Agentes ───────────────────────────────────────────────────────
const AGENT_PROMPTS: Record<string, string> = {
  synapse: `Você é o Synapse AI, assistente inteligente de gestão de logística e frota.
Você tem acesso ao contexto completo do sistema Synapse e pode ajudar com:
- Análise de frota e veículos
- Gestão de motoristas e funcionários
- Controle financeiro (contas a pagar/receber)
- Análise de viagens e rotas
- Checklists e manutenção preventiva
- Relatórios e indicadores (KPIs)
- Alertas de vencimento (CNH, licenciamento, documentos)
- Sugestões de otimização de custos
Responda sempre em português brasileiro, de forma clara, objetiva e profissional.
Quando não tiver dados suficientes, peça mais informações ao usuário.`,

  analista: `Você é o Analista Financeiro do Synapse, especialista em análise de custos de transporte e logística.
Foque em:
- Custo por km rodado
- DRE por veículo/motorista
- Análise de rentabilidade por rota
- Identificação de desperdícios
- Benchmarks do setor de transporte
- Projeções e tendências financeiras
Use linguagem técnica mas acessível. Sempre apresente números e percentuais quando possível.`,

  motorista: `Você é o assistente de suporte para motoristas do Synapse.
Ajude com:
- Dúvidas sobre checklists e procedimentos
- Informações sobre viagens e rotas
- Documentação necessária
- Regras de trânsito e segurança
- Registro de ocorrências
Seja direto, simples e prático. O motorista precisa de respostas rápidas.`,

  manutencao: `Você é o especialista em manutenção preventiva e corretiva de frota do Synapse.
Auxilie com:
- Planos de manutenção preventiva
- Diagnóstico de problemas mecânicos
- Controle de pneus e peças
- Histórico de manutenções
- Alertas de revisão por km/tempo
- Estimativas de custo de reparo
Priorize sempre a segurança e a prevenção de falhas.`,

  juridico: `Você é o assistente jurídico e de compliance do Synapse para transporte de cargas.
Auxilie com:
- Legislação de transporte (ANTT, RNTRC, TAC)
- Multas e infrações de trânsito
- Contratos de transporte
- Seguro obrigatório DPVAT e RCTR-C
- Documentação de carga (CTE, MDF-e)
- Compliance trabalhista para motoristas
Sempre indique que decisões jurídicas devem ser validadas por um advogado.`,
};

// ─── Tipos de Agente ───────────────────────────────────────────────────────────
const agentTypes = ["synapse", "analista", "motorista", "manutencao", "juridico"] as const;
type AgentType = typeof agentTypes[number];

// ─── Router de IA ──────────────────────────────────────────────────────────────
export const iaRouter = router({

  // Chat com agente IA
  chat: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(2000),
      agent: z.enum(agentTypes).default("synapse"),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).max(20).default([]),
      context: z.object({
        empresaId: z.number().optional(),
        totalVeiculos: z.number().optional(),
        totalMotoristas: z.number().optional(),
        viagensAtivas: z.number().optional(),
        alertas: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const openai = getOpenAIClient();
      const systemPrompt = AGENT_PROMPTS[input.agent];

      // Adicionar contexto do sistema se disponível
      let contextInfo = "";
      if (input.context) {
        const ctx = input.context;
        contextInfo = "\n\n[CONTEXTO DO SISTEMA]\n";
        if (ctx.totalVeiculos !== undefined) contextInfo += `- Total de veículos: ${ctx.totalVeiculos}\n`;
        if (ctx.totalMotoristas !== undefined) contextInfo += `- Total de motoristas: ${ctx.totalMotoristas}\n`;
        if (ctx.viagensAtivas !== undefined) contextInfo += `- Viagens ativas: ${ctx.viagensAtivas}\n`;
        if (ctx.alertas?.length) contextInfo += `- Alertas ativos: ${ctx.alertas.join(", ")}\n`;
      }

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt + contextInfo },
        ...input.history.map(h => ({ role: h.role, content: h.content } as OpenAI.Chat.ChatCompletionMessageParam)),
        { role: "user", content: input.message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content ?? "Não consegui gerar uma resposta. Tente novamente.";

      return {
        reply,
        agent: input.agent,
        tokensUsed: completion.usage?.total_tokens ?? 0,
      };
    }),

  // Análise automática de dados da empresa
  analisarEmpresa: protectedProcedure
    .input(z.object({
      empresaId: z.number(),
      dados: z.object({
        totalVeiculos: z.number(),
        veiculosAtivos: z.number(),
        totalMotoristas: z.number(),
        viagensUltimos30Dias: z.number(),
        receitaUltimos30Dias: z.number(),
        despesaUltimos30Dias: z.number(),
        multasAbertas: z.number(),
        documentosVencendo: z.number(),
        kmMedioMensal: z.number().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const openai = getOpenAIClient();
      const { dados } = input;

      const lucro = dados.receitaUltimos30Dias - dados.despesaUltimos30Dias;
      const margemLucro = dados.receitaUltimos30Dias > 0
        ? ((lucro / dados.receitaUltimos30Dias) * 100).toFixed(1)
        : "0";
      const taxaOcupacao = dados.totalVeiculos > 0
        ? ((dados.veiculosAtivos / dados.totalVeiculos) * 100).toFixed(1)
        : "0";

      const prompt = `Analise os seguintes dados operacionais de uma empresa de transporte/logística e forneça:
1. Um diagnóstico geral (3-4 frases)
2. Principais pontos de atenção (máximo 3)
3. Recomendações prioritárias (máximo 3)
4. Uma nota de desempenho geral de 0 a 10

DADOS:
- Frota total: ${dados.totalVeiculos} veículos (${dados.veiculosAtivos} ativos = ${taxaOcupacao}% de ocupação)
- Motoristas: ${dados.totalMotoristas}
- Viagens nos últimos 30 dias: ${dados.viagensUltimos30Dias}
- Receita: R$ ${dados.receitaUltimos30Dias.toLocaleString("pt-BR")}
- Despesa: R$ ${dados.despesaUltimos30Dias.toLocaleString("pt-BR")}
- Lucro: R$ ${lucro.toLocaleString("pt-BR")} (margem: ${margemLucro}%)
- Multas abertas: ${dados.multasAbertas}
- Documentos vencendo em 30 dias: ${dados.documentosVencendo}
${dados.kmMedioMensal ? `- KM médio mensal por veículo: ${dados.kmMedioMensal.toLocaleString("pt-BR")} km` : ""}

Responda em formato JSON com as chaves: diagnostico, pontos_atencao (array), recomendacoes (array), nota (número).`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AGENT_PROMPTS.analista },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return {
          diagnostico: parsed.diagnostico ?? "Análise não disponível.",
          pontos_atencao: parsed.pontos_atencao ?? [],
          recomendacoes: parsed.recomendacoes ?? [],
          nota: parsed.nota ?? 5,
          tokensUsed: completion.usage?.total_tokens ?? 0,
        };
      } catch {
        return {
          diagnostico: raw,
          pontos_atencao: [],
          recomendacoes: [],
          nota: 5,
          tokensUsed: completion.usage?.total_tokens ?? 0,
        };
      }
    }),

  // Gerar relatório automático
  gerarRelatorio: protectedProcedure
    .input(z.object({
      tipo: z.enum(["mensal", "semanal", "viagem", "motorista", "veiculo"]),
      dados: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      const openai = getOpenAIClient();

      const tipoLabels: Record<string, string> = {
        mensal: "relatório mensal de operações",
        semanal: "relatório semanal de operações",
        viagem: "relatório de viagem",
        motorista: "relatório de desempenho de motorista",
        veiculo: "relatório de desempenho de veículo",
      };

      const prompt = `Gere um ${tipoLabels[input.tipo]} profissional e detalhado com base nos dados abaixo.
O relatório deve ter: resumo executivo, análise detalhada, indicadores-chave e conclusão.
Dados: ${JSON.stringify(input.dados, null, 2)}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AGENT_PROMPTS.analista },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.6,
      });

      return {
        relatorio: completion.choices[0]?.message?.content ?? "Não foi possível gerar o relatório.",
        tokensUsed: completion.usage?.total_tokens ?? 0,
      };
    }),

  // Sugestão de manutenção preventiva
  sugerirManutencao: protectedProcedure
    .input(z.object({
      veiculo: z.object({
        placa: z.string(),
        modelo: z.string(),
        ano: z.number(),
        kmAtual: z.number(),
        ultimaRevisao: z.string().optional(),
        kmUltimaRevisao: z.number().optional(),
        historicoManutencoes: z.array(z.object({
          tipo: z.string(),
          data: z.string(),
          km: z.number(),
        })).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const openai = getOpenAIClient();
      const { veiculo } = input;

      const kmDesdeRevisao = veiculo.kmUltimaRevisao
        ? veiculo.kmAtual - veiculo.kmUltimaRevisao
        : null;

      const prompt = `Analise o histórico de manutenção do veículo abaixo e forneça recomendações de manutenção preventiva.

VEÍCULO: ${veiculo.modelo} (${veiculo.ano}) - Placa: ${veiculo.placa}
KM Atual: ${veiculo.kmAtual.toLocaleString("pt-BR")} km
${veiculo.ultimaRevisao ? `Última revisão: ${veiculo.ultimaRevisao}` : "Sem registro de última revisão"}
${kmDesdeRevisao !== null ? `KM desde última revisão: ${kmDesdeRevisao.toLocaleString("pt-BR")} km` : ""}
${veiculo.historicoManutencoes?.length ? `Histórico: ${JSON.stringify(veiculo.historicoManutencoes)}` : "Sem histórico registrado"}

Responda em JSON com: urgentes (array de manutenções necessárias agora), proximas (array de próximas manutenções), estimativa_custo_total (número em R$), observacoes (string).`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AGENT_PROMPTS.manutencao },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return {
          urgentes: parsed.urgentes ?? [],
          proximas: parsed.proximas ?? [],
          estimativa_custo_total: parsed.estimativa_custo_total ?? 0,
          observacoes: parsed.observacoes ?? "",
          tokensUsed: completion.usage?.total_tokens ?? 0,
        };
      } catch {
        return { urgentes: [], proximas: [], estimativa_custo_total: 0, observacoes: raw, tokensUsed: 0 };
      }
    }),

  // Listar agentes disponíveis
  listarAgentes: protectedProcedure
    .query(() => {
      return [
        { id: "synapse", nome: "Synapse AI", descricao: "Assistente geral de gestão de frota e logística", icone: "🧠" },
        { id: "analista", nome: "Analista Financeiro", descricao: "Especialista em custos, DRE e análise financeira", icone: "📊" },
        { id: "motorista", nome: "Suporte ao Motorista", descricao: "Assistente para dúvidas operacionais dos motoristas", icone: "🚛" },
        { id: "manutencao", nome: "Especialista em Manutenção", descricao: "Diagnóstico e planos de manutenção preventiva", icone: "🔧" },
        { id: "juridico", nome: "Assistente Jurídico", descricao: "Legislação de transporte, multas e compliance", icone: "⚖️" },
      ];
    }),
});
