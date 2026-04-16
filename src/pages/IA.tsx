import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain, Send, Plus, MessageSquare, BookOpen,
  Sparkles, ChevronRight, Loader2, User, Zap, Lock,
  Bot, RefreshCw, BarChart3, Truck, Wrench, Scale,
  Package, Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

type Mensagem = { role: "user" | "assistant"; conteudo: string; tokens?: number; modoLocal?: boolean };

const AVATAR_MAP: Record<string, string> = {
  master: "🧠", financeiro: "📊", frota: "🚛", motorista: "👨‍✈️",
  manutencao: "🔧", juridico: "⚖️", recepcao: "📦", wms: "🏭",
};

const ICON_MAP: Record<string, React.ReactNode> = {
  master: <Brain className="h-4 w-4" />,
  financeiro: <BarChart3 className="h-4 w-4" />,
  frota: <Truck className="h-4 w-4" />,
  motorista: <User className="h-4 w-4" />,
  manutencao: <Wrench className="h-4 w-4" />,
  juridico: <Scale className="h-4 w-4" />,
  recepcao: <Package className="h-4 w-4" />,
  wms: <Warehouse className="h-4 w-4" />,
};

const GRADIENT_MAP: Record<string, string> = {
  master: "from-blue-500 to-cyan-500",
  financeiro: "from-green-500 to-emerald-500",
  frota: "from-orange-500 to-amber-500",
  motorista: "from-purple-500 to-violet-500",
  manutencao: "from-red-500 to-rose-500",
  juridico: "from-indigo-500 to-blue-500",
  recepcao: "from-yellow-500 to-orange-500",
  wms: "from-teal-500 to-cyan-500",
};

const SUGESTOES: Record<string, string[]> = {
  master: ["Como está o desempenho geral da frota?", "Quais documentos estão vencendo?", "Mostre um resumo do mês"],
  financeiro: ["Qual é o custo por km?", "Como melhorar a margem de lucro?", "Analise as despesas do mês"],
  frota: ["Quais veículos precisam de atenção?", "Como otimizar as rotas?", "Status da frota hoje"],
  motorista: ["Como preencher o checklist?", "O que fazer em caso de acidente?", "Quais documentos preciso?"],
  manutencao: ["Quando fazer a próxima revisão?", "Quais veículos precisam de manutenção?", "Crie um plano preventivo"],
  juridico: ["Quais são as regras do RNTRC?", "Como contestar uma multa?", "O que é o TAC?"],
  recepcao: ["Como registrar um recebimento?", "Quais são os status possíveis?", "Como conferir itens?"],
  wms: ["Como fazer um inventário?", "Quais produtos estão abaixo do mínimo?", "Como registrar uma entrada?"],
};

export default function IA() {
  const { user } = useAuth();
  
  const [tab, setTab] = useState("chat");
  const [agenteAtivo, setAgenteAtivo] = useState<any>(null);
  const [sessaoId, setSessaoId] = useState<number | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [novoConhecimento, setNovoConhecimento] = useState({ titulo: "", conteudo: "", categoria: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: agentes = [] } = trpc.ia.listAgentes.useQuery();
  const criarSessao = trpc.ia.criarSessao.useMutation();
  const enviarMsg = trpc.ia.enviarMensagem.useMutation();
  const { data: conhecimentos = [], refetch: refetchConhecimento } = trpc.ia.listConhecimento.useQuery({});
  const addConhecimento = trpc.ia.addConhecimento.useMutation({
    onSuccess: () => {
      toast.success("Conhecimento adicionado!");
      setNovoConhecimento({ titulo: "", conteudo: "", categoria: "" });
      refetchConhecimento();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteConhecimento = trpc.ia.deleteConhecimento.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetchConhecimento(); },
  });
  const inicializar = trpc.ia.inicializarAgentes.useMutation({
    onSuccess: (r) => toast({ title: r.message }),
  });

  // Selecionar primeiro agente automaticamente
  useEffect(() => {
    if (agentes.length > 0 && !agenteAtivo) {
      selecionarAgente(agentes[0]);
    }
  }, [agentes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const selecionarAgente = (agente: any) => {
    setAgenteAtivo(agente);
    setMensagens([]);
    setSessaoId(null);
    const avatar = agente.avatar || AVATAR_MAP[agente.setor] || "🤖";
    setMensagens([{
      role: "assistant",
      conteudo: `Olá! Sou o ${agente.nome} ${avatar}\n\n${agente.descricao}. Como posso ajudar você hoje?`,
    }]);
  };

  const limparChat = () => {
    if (agenteAtivo) {
      setSessaoId(null);
      selecionarAgente(agenteAtivo);
    }
  };

  const enviar = async () => {
    if (!input.trim() || enviando || !agenteAtivo) return;
    const texto = input.trim();
    setInput("");
    setEnviando(true);
    setMensagens(prev => [...prev, { role: "user", conteudo: texto }]);

    try {
      let sid = sessaoId;
      if (!sid) {
        const s = await criarSessao.mutateAsync({ agenteId: agenteAtivo.id, titulo: texto.slice(0, 50) });
        sid = s.id;
        setSessaoId(sid);
      }
      const res = await enviarMsg.mutateAsync({ sessaoId: sid, agenteId: agenteAtivo.id, mensagem: texto });
      setMensagens(prev => [...prev, { role: "assistant", conteudo: res.resposta, tokens: res.tokens, modoLocal: res.modoLocal }]);
    } catch (e: any) {
      setMensagens(prev => [...prev, { role: "assistant", conteudo: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  };

  const isAdmin = user?.role === "admin" || user?.role === "master_admin";
  const setor = agenteAtivo?.setor ?? "master";
  const gradient = GRADIENT_MAP[setor] ?? "from-blue-500 to-cyan-500";
  const icon = ICON_MAP[setor] ?? <Brain className="h-4 w-4" />;
  const sugestoes = SUGESTOES[setor] ?? [];

  return (
    <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Synapse AI
              <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                <Zap className="h-3 w-3 mr-1" /> Beta
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Assistentes inteligentes para cada setor do seu negócio
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => inicializar.mutate()}>
              <Sparkles className="h-4 w-4" />
              Inicializar Agentes
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="chat" className="gap-2"><MessageSquare className="h-4 w-4" /> Chat</TabsTrigger>
            <TabsTrigger value="agentes" className="gap-2"><Bot className="h-4 w-4" /> Agentes</TabsTrigger>
            {isAdmin && <TabsTrigger value="conhecimento" className="gap-2"><BookOpen className="h-4 w-4" /> Conhecimento</TabsTrigger>}
          </TabsList>

          {/* ─── Chat ─── */}
          <TabsContent value="chat" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
              {/* Lista de agentes */}
              <div className="lg:col-span-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agentes</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {agentes.map((ag: any) => (
                    <button
                      key={ag.id}
                      onClick={() => selecionarAgente(ag)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors text-sm ${
                        agenteAtivo?.id === ag.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${GRADIENT_MAP[ag.setor] ?? gradient} flex items-center justify-center text-white shrink-0 text-sm`}>
                        {ag.avatar || AVATAR_MAP[ag.setor] || "🤖"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-xs">{ag.nome}</p>
                        {ag.isMaster && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-primary border-primary/30">Master</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat principal */}
              <div className="lg:col-span-3 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
                {/* Header do chat */}
                <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
                  {agenteAtivo && (
                    <>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg text-lg`}>
                        {agenteAtivo.avatar || AVATAR_MAP[agenteAtivo.setor] || "🤖"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{agenteAtivo.nome}</p>
                        <p className="text-xs text-muted-foreground">{agenteAtivo.descricao}</p>
                      </div>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-green-600 border-green-500/20 bg-green-500/10">Online</Badge>
                    <Button variant="ghost" size="sm" onClick={limparChat} className="h-8 w-8 p-0">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {mensagens.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-3xl mb-3 shadow-lg`}>
                        {agenteAtivo?.avatar || "🤖"}
                      </div>
                      <p className="font-medium text-foreground">{agenteAtivo?.nome ?? "Synapse AI"}</p>
                      <p className="text-sm mt-1 max-w-xs">{agenteAtivo?.descricao}</p>
                      <p className="text-xs mt-4 opacity-60">Digite uma mensagem para começar</p>
                    </div>
                  )}
                  {mensagens.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white shrink-0 mt-0.5 text-sm`}>
                          {agenteAtivo?.avatar || "🤖"}
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>
                        {msg.modoLocal && (
                          <p className="text-[10px] opacity-50 mt-1 flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Modo local — sem custo
                          </p>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {enviando && (
                    <div className="flex gap-3 justify-start">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white shrink-0 text-sm`}>
                        {agenteAtivo?.avatar || "🤖"}
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                        <div className="flex gap-1 items-center h-5">
                          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Sugestões */}
                {mensagens.length <= 1 && sugestoes.length > 0 && (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
                    <div className="flex flex-wrap gap-2">
                      {sugestoes.map((s, i) => (
                        <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                          className="text-xs px-3 py-1.5 bg-muted hover:bg-accent border border-border rounded-full text-muted-foreground hover:text-foreground transition-all">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-border shrink-0">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder={`Pergunte ao ${agenteAtivo?.nome ?? "Synapse AI"}...`}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
                      disabled={enviando}
                      className="flex-1"
                    />
                    <Button onClick={enviar} disabled={!input.trim() || enviando} size="icon"
                      className={`bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0`}>
                      {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    Enter para enviar · IA pode cometer erros, verifique informações importantes
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Agentes ─── */}
          <TabsContent value="agentes" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agentes.map((ag: any) => (
                <div key={ag.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GRADIENT_MAP[ag.setor] ?? gradient} flex items-center justify-center text-2xl shadow-lg`}>
                      {ag.avatar || AVATAR_MAP[ag.setor] || "🤖"}
                    </div>
                    {ag.isMaster && (
                      <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">Master</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">{ag.nome}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ag.descricao}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{ag.usarIaExterna ? "OpenAI" : "Local"}</Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">{ag.setor}</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-4 gap-2 text-xs"
                    onClick={() => { selecionarAgente(ag); setTab("chat"); }}>
                    <MessageSquare className="h-3 w-3" />
                    Conversar
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ─── Base de Conhecimento ─── */}
          {isAdmin && (
            <TabsContent value="conhecimento" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Adicionar Conhecimento
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Título *</label>
                      <Input placeholder="Ex: Procedimento de checklist" value={novoConhecimento.titulo}
                        onChange={e => setNovoConhecimento(n => ({ ...n, titulo: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Categoria</label>
                      <Input placeholder="Ex: Operacional, Financeiro, RH" value={novoConhecimento.categoria}
                        onChange={e => setNovoConhecimento(n => ({ ...n, categoria: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Conteúdo *</label>
                      <Textarea
                        placeholder="Descreva o conhecimento que os agentes devem aprender. Use o formato 'palavra-chave: resposta' para criar respostas automáticas."
                        value={novoConhecimento.conteudo}
                        onChange={e => setNovoConhecimento(n => ({ ...n, conteudo: e.target.value }))}
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                    <Button className="w-full gap-2"
                      disabled={!novoConhecimento.titulo || !novoConhecimento.conteudo || addConhecimento.isPending}
                      onClick={() => addConhecimento.mutate({
                        titulo: novoConhecimento.titulo,
                        conteudo: novoConhecimento.conteudo,
                        categoria: novoConhecimento.categoria || undefined,
                      })}>
                      {addConhecimento.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Adicionar à Base
                    </Button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Base de Conhecimento ({(conhecimentos as any[]).length})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {(conhecimentos as any[]).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum conhecimento adicionado ainda</p>
                        <p className="text-xs mt-1">Adicione informações para os agentes aprenderem</p>
                      </div>
                    ) : (
                      (conhecimentos as any[]).map((c: any) => (
                        <div key={c.id} className="border border-border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{c.titulo}</p>
                              {c.categoria && <Badge variant="secondary" className="text-xs mt-1">{c.categoria}</Badge>}
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.conteudo}</p>
                            </div>
                            <Button size="sm" variant="ghost"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 h-7 w-7 p-0"
                              onClick={() => deleteConhecimento.mutate({ id: c.id })}>
                              ×
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h4 className="font-medium text-sm text-primary flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" /> Como funciona o aprendizado
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Os agentes usam a base de conhecimento para responder perguntas específicas da sua empresa.
                  Use o formato <code className="bg-muted px-1 rounded">palavra-chave: resposta</code> para criar respostas automáticas.
                  Para ativar respostas com IA real (OpenAI), configure a chave <code className="bg-muted px-1 rounded">OPENAI_API_KEY</code> no Railway
                  e ative "Usar IA Externa" nas configurações do agente.
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>
    </div>
  );
}
