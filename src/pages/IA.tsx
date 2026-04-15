import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Brain, Send, Loader2, Bot, BarChart3, Truck, Wrench, Scale,
  Sparkles, MessageSquare, RefreshCw, ChevronDown
} from "lucide-react";

type AgentId = "synapse" | "analista" | "motorista" | "manutencao" | "juridico";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AGENT_ICONS: Record<AgentId, React.ReactNode> = {
  synapse: <Brain className="w-5 h-5" />,
  analista: <BarChart3 className="w-5 h-5" />,
  motorista: <Truck className="w-5 h-5" />,
  manutencao: <Wrench className="w-5 h-5" />,
  juridico: <Scale className="w-5 h-5" />,
};

const AGENT_COLORS: Record<AgentId, string> = {
  synapse: "from-blue-500 to-cyan-500",
  analista: "from-green-500 to-emerald-500",
  motorista: "from-orange-500 to-amber-500",
  manutencao: "from-red-500 to-rose-500",
  juridico: "from-purple-500 to-violet-500",
};

const AGENT_SUGGESTIONS: Record<AgentId, string[]> = {
  synapse: [
    "Como está o desempenho geral da minha frota?",
    "Quais documentos estão vencendo?",
    "Mostre um resumo das viagens do mês",
  ],
  analista: [
    "Qual é o custo por km da minha frota?",
    "Como melhorar a margem de lucro?",
    "Analise as despesas do último mês",
  ],
  motorista: [
    "Como preencher o checklist corretamente?",
    "O que fazer em caso de acidente?",
    "Quais documentos preciso carregar?",
  ],
  manutencao: [
    "Quando devo fazer a próxima revisão?",
    "Quais veículos precisam de manutenção urgente?",
    "Crie um plano de manutenção preventiva",
  ],
  juridico: [
    "Quais são as regras do RNTRC?",
    "Como contestar uma multa de trânsito?",
    "O que é o TAC e como funciona?",
  ],
};

export default function IA() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("synapse");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: agentes } = trpc.ia.listarAgentes.useQuery();
  const chatMutation = trpc.ia.chat.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Mensagem de boas-vindas ao trocar de agente
    const agent = agentes?.find(a => a.id === selectedAgent);
    if (agent) {
      setMessages([{
        role: "assistant",
        content: `Olá! Eu sou o **${agent.nome}** ${agent.icone}\n\n${agent.descricao}. Como posso ajudar você hoje?`,
        timestamp: new Date(),
      }]);
    }
  }, [selectedAgent, agentes]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setIsTyping(true);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage, timestamp: new Date() },
    ];
    setMessages(newMessages);

    try {
      const history = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const result = await chatMutation.mutateAsync({
        message: userMessage,
        agent: selectedAgent,
        history,
      });

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: result.reply, timestamp: new Date() },
      ]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao contatar a IA");
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem. Verifique se a chave da API OpenAI está configurada no servidor.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    const agent = agentes?.find(a => a.id === selectedAgent);
    if (agent) {
      setMessages([{
        role: "assistant",
        content: `Conversa reiniciada! Sou o **${agent.nome}** ${agent.icone}. Como posso ajudar?`,
        timestamp: new Date(),
      }]);
    }
  };

  const currentAgent = agentes?.find(a => a.id === selectedAgent);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0a0a0f]">
      {/* Sidebar de Agentes */}
      <div className="w-64 border-r border-white/5 flex flex-col bg-white/2">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white/80">Agentes IA</span>
          </div>
          <p className="text-xs text-white/30">Escolha um especialista</p>
        </div>

        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {agentes?.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id as AgentId)}
              className={`w-full text-left p-3 rounded-xl transition-all duration-200 group ${
                selectedAgent === agent.id
                  ? "bg-white/10 border border-white/10"
                  : "hover:bg-white/5 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AGENT_COLORS[agent.id as AgentId]} flex items-center justify-center text-white flex-shrink-0`}>
                  {AGENT_ICONS[agent.id as AgentId]}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${selectedAgent === agent.id ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                    {agent.nome}
                  </p>
                  <p className="text-xs text-white/30 truncate">{agent.icone}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-white/5">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-xs text-blue-300/80 font-medium mb-1">Powered by</p>
            <p className="text-xs text-blue-400">OpenAI GPT-4o Mini</p>
          </div>
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header do Chat */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-3">
            {currentAgent && (
              <>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AGENT_COLORS[selectedAgent]} flex items-center justify-center text-white shadow-lg`}>
                  {AGENT_ICONS[selectedAgent]}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{currentAgent.nome}</h2>
                  <p className="text-xs text-white/40">{currentAgent.descricao}</p>
                </div>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-white/40 hover:text-white/70 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Limpar
          </Button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AGENT_COLORS[selectedAgent]} flex items-center justify-center text-white flex-shrink-0 mt-0.5`}>
                  {AGENT_ICONS[selectedAgent]}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm"
                  : "bg-white/5 border border-white/10 text-white/90 rounded-tl-sm"
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
                <p className={`text-xs mt-1.5 ${msg.role === "user" ? "text-white/50" : "text-white/30"}`}>
                  {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${AGENT_COLORS[selectedAgent]} flex items-center justify-center text-white flex-shrink-0`}>
                {AGENT_ICONS[selectedAgent]}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sugestões */}
        {messages.length <= 1 && (
          <div className="px-6 pb-3">
            <p className="text-xs text-white/30 mb-2">Sugestões:</p>
            <div className="flex flex-wrap gap-2">
              {AGENT_SUGGESTIONS[selectedAgent].map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s)}
                  className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/60 hover:text-white/80 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-6 pt-2">
          <div className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={`Pergunte ao ${currentAgent?.nome ?? "Synapse AI"}...`}
              disabled={isTyping}
              className="flex-1 bg-transparent border-0 text-white placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`bg-gradient-to-r ${AGENT_COLORS[selectedAgent]} hover:opacity-90 text-white rounded-xl px-4 h-10 transition-all`}
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-white/20 text-center mt-2">
            IA pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
