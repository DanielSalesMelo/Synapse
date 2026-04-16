import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Search, Filter, Calendar, Clock, Flag, Users, BarChart3,
  CheckCircle2, Circle, AlertCircle, ChevronRight, MoreHorizontal,
  MessageSquare, Paperclip, Tag, Zap, Target, TrendingUp, ListTodo,
  Kanban, LayoutGrid, List, Timer, Star, ArrowUp, ArrowRight, ArrowDown,
  User, X, Edit, Trash2, Eye,
} from "lucide-react";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Priority = "critica" | "alta" | "media" | "baixa";
type Status = "backlog" | "a_fazer" | "em_andamento" | "revisao" | "concluido";

interface Tarefa {
  id: number;
  titulo: string;
  descricao?: string;
  status: Status;
  prioridade: Priority;
  responsavel: string;
  prazo?: string;
  tags: string[];
  comentarios: number;
  anexos: number;
  progresso: number;
  projeto?: string;
  sprint?: string;
  estimativa?: number; // horas
  criado: string;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const TAREFAS_MOCK: Tarefa[] = [
  { id: 1, titulo: "Implementar módulo de pagamentos InfinitePay", descricao: "Integrar API de pagamentos com split automático por empresa", status: "em_andamento", prioridade: "critica", responsavel: "Daniel", prazo: "2026-04-20", tags: ["backend", "integração"], comentarios: 5, anexos: 2, progresso: 65, projeto: "Synapse v7", sprint: "Sprint 3", estimativa: 16, criado: "2026-04-10" },
  { id: 2, titulo: "Redesign do módulo de RH", descricao: "Atualizar interface com People Analytics e novos gráficos", status: "a_fazer", prioridade: "alta", responsavel: "Carlos", prazo: "2026-04-25", tags: ["frontend", "ux"], comentarios: 2, anexos: 1, progresso: 0, projeto: "Synapse v7", sprint: "Sprint 3", estimativa: 8, criado: "2026-04-12" },
  { id: 3, titulo: "Corrigir bug de duplicação no menu", descricao: "Menu lateral aparecendo duas vezes em algumas rotas", status: "concluido", prioridade: "alta", responsavel: "Daniel", prazo: "2026-04-16", tags: ["bug", "frontend"], comentarios: 3, anexos: 0, progresso: 100, projeto: "Synapse v7", sprint: "Sprint 2", estimativa: 2, criado: "2026-04-15" },
  { id: 4, titulo: "Criar migration para tabelas CRM/TI/WMS", descricao: "52 tabelas faltando nas migrations do banco de dados", status: "concluido", prioridade: "critica", responsavel: "Daniel", prazo: "2026-04-16", tags: ["backend", "banco"], comentarios: 1, anexos: 0, progresso: 100, projeto: "Synapse v7", sprint: "Sprint 2", estimativa: 4, criado: "2026-04-15" },
  { id: 5, titulo: "Módulo de Marketing com automações", descricao: "Campanhas multi-canal, e-mail marketing e segmentação de leads", status: "backlog", prioridade: "media", responsavel: "Ana", prazo: "2026-05-01", tags: ["frontend", "marketing"], comentarios: 0, anexos: 0, progresso: 0, projeto: "Synapse v7", sprint: "Sprint 4", estimativa: 24, criado: "2026-04-14" },
  { id: 6, titulo: "Integração com Winthor — novas rotinas", descricao: "Adicionar rotinas de faturamento e expedição do Winthor", status: "revisao", prioridade: "alta", responsavel: "Lucas", prazo: "2026-04-22", tags: ["integração", "winthor"], comentarios: 4, anexos: 3, progresso: 85, projeto: "Synapse v7", sprint: "Sprint 3", estimativa: 12, criado: "2026-04-11" },
  { id: 7, titulo: "Sistema de notificações em tempo real", descricao: "WebSocket para notificações push de chamados e mensagens", status: "a_fazer", prioridade: "media", responsavel: "Pedro", prazo: "2026-04-28", tags: ["backend", "websocket"], comentarios: 1, anexos: 0, progresso: 10, projeto: "Synapse v7", sprint: "Sprint 3", estimativa: 10, criado: "2026-04-13" },
  { id: 8, titulo: "Documentação técnica da API", descricao: "Swagger/OpenAPI para todos os endpoints do backend", status: "backlog", prioridade: "baixa", responsavel: "Ana", prazo: "2026-05-10", tags: ["docs"], comentarios: 0, anexos: 0, progresso: 0, projeto: "Synapse v7", sprint: "Sprint 4", estimativa: 6, criado: "2026-04-14" },
];

const COLUNAS: { id: Status; label: string; cor: string; icon: React.ReactNode }[] = [
  { id: "backlog", label: "Backlog", cor: "border-gray-400", icon: <Circle className="h-4 w-4 text-gray-400" /> },
  { id: "a_fazer", label: "A Fazer", cor: "border-blue-400", icon: <ListTodo className="h-4 w-4 text-blue-400" /> },
  { id: "em_andamento", label: "Em Andamento", cor: "border-yellow-400", icon: <Timer className="h-4 w-4 text-yellow-400" /> },
  { id: "revisao", label: "Revisão", cor: "border-purple-400", icon: <Eye className="h-4 w-4 text-purple-400" /> },
  { id: "concluido", label: "Concluído", cor: "border-green-400", icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
];

const PRIORIDADE_CONFIG: Record<Priority, { label: string; cor: string; icon: React.ReactNode }> = {
  critica: { label: "Crítica", cor: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle className="h-3 w-3" /> },
  alta: { label: "Alta", cor: "bg-orange-100 text-orange-700 border-orange-200", icon: <ArrowUp className="h-3 w-3" /> },
  media: { label: "Média", cor: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <ArrowRight className="h-3 w-3" /> },
  baixa: { label: "Baixa", cor: "bg-blue-100 text-blue-700 border-blue-200", icon: <ArrowDown className="h-3 w-3" /> },
};

// ─── CARD DE TAREFA ───────────────────────────────────────────────────────────
function TarefaCard({ tarefa, onClick }: { tarefa: Tarefa; onClick: () => void }) {
  const prio = PRIORIDADE_CONFIG[tarefa.prioridade];
  const isAtrasada = tarefa.prazo && new Date(tarefa.prazo) < new Date() && tarefa.status !== "concluido";

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${prio.cor}`}>
          {prio.icon}{prio.label}
        </span>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent">
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Título */}
      <p className="text-sm font-medium text-foreground leading-tight mb-2">{tarefa.titulo}</p>

      {/* Tags */}
      {tarefa.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tarefa.tags.map((tag) => (
            <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Progresso */}
      {tarefa.progresso > 0 && tarefa.status !== "concluido" && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{tarefa.progresso}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${tarefa.progresso}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
              {tarefa.responsavel.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {tarefa.prazo && (
            <span className={`text-[10px] flex items-center gap-0.5 ${isAtrasada ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3" />
              {new Date(tarefa.prazo).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {tarefa.comentarios > 0 && (
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{tarefa.comentarios}</span>
          )}
          {tarefa.anexos > 0 && (
            <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{tarefa.anexos}</span>
          )}
          {tarefa.estimativa && (
            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{tarefa.estimativa}h</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DE TAREFA ──────────────────────────────────────────────────────────
function TarefaModal({ tarefa, onClose }: { tarefa: Tarefa; onClose: () => void }) {
  const [novoComentario, setNovoComentario] = useState("");
  const prio = PRIORIDADE_CONFIG[tarefa.prioridade];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${prio.cor}`}>
                {prio.icon}{prio.label}
              </span>
              {tarefa.sprint && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{tarefa.sprint}</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-foreground">{tarefa.titulo}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Descrição */}
          {tarefa.descricao && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Descrição</h3>
              <p className="text-sm text-muted-foreground">{tarefa.descricao}</p>
            </div>
          )}

          {/* Detalhes em grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Responsável</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {tarefa.responsavel.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{tarefa.responsavel}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Prazo</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {tarefa.prazo ? new Date(tarefa.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Estimativa</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {tarefa.estimativa ? `${tarefa.estimativa}h` : "Não definida"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Projeto</p>
              <p className="text-sm font-medium">{tarefa.projeto ?? "—"}</p>
            </div>
          </div>

          {/* Progresso */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Progresso</span>
              <span className="text-muted-foreground">{tarefa.progresso}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${tarefa.progresso}%` }} />
            </div>
          </div>

          {/* Tags */}
          {tarefa.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tarefa.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Comentários */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Comentários ({tarefa.comentarios})</h3>
            <div className="space-y-3 mb-3">
              {tarefa.comentarios > 0 && (
                <div className="flex gap-3">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">DA</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">Daniel</span>
                      <span className="text-[10px] text-muted-foreground">há 2h</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Iniciando a implementação. Vou usar a API v2 do InfinitePay com suporte a split.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary/20 text-primary">EU</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Adicionar comentário..."
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  className="text-sm"
                />
                <Button size="sm" disabled={!novoComentario.trim()}>Enviar</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NOVA TAREFA FORM ─────────────────────────────────────────────────────────
function NovaTarefaForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ titulo: "", descricao: "", prioridade: "media", responsavel: "", prazo: "", tags: "", estimativa: "", projeto: "Synapse v7", sprint: "Sprint 3" });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Título *</label>
        <Input placeholder="Descreva a tarefa..." value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Descrição</label>
        <Textarea placeholder="Detalhes da tarefa..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Prioridade</label>
          <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="critica">🔴 Crítica</SelectItem>
              <SelectItem value="alta">🟠 Alta</SelectItem>
              <SelectItem value="media">🟡 Média</SelectItem>
              <SelectItem value="baixa">🔵 Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Responsável</label>
          <Input placeholder="Nome do responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Prazo</label>
          <Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Estimativa (horas)</label>
          <Input type="number" placeholder="Ex: 8" value={form.estimativa} onChange={(e) => setForm({ ...form, estimativa: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Projeto</label>
          <Input value={form.projeto} onChange={(e) => setForm({ ...form, projeto: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Sprint</label>
          <Input value={form.sprint} onChange={(e) => setForm({ ...form, sprint: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Tags (separadas por vírgula)</label>
        <Input placeholder="frontend, bug, integração..." value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!form.titulo.trim()}>
          <Plus className="h-4 w-4 mr-2" />Criar Tarefa
        </Button>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Tarefas() {
  const [view, setView] = useState<"kanban" | "lista" | "sprint">("kanban");
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Status | "todos">("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<Priority | "todos">("todos");
  const [tarefaSelecionada, setTarefaSelecionada] = useState<Tarefa | null>(null);
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);

  const tarefasFiltradas = TAREFAS_MOCK.filter((t) => {
    const matchSearch = !search || t.titulo.toLowerCase().includes(search.toLowerCase()) || t.tags.some((tag) => tag.includes(search.toLowerCase()));
    const matchStatus = filtroStatus === "todos" || t.status === filtroStatus;
    const matchPrio = filtroPrioridade === "todos" || t.prioridade === filtroPrioridade;
    return matchSearch && matchStatus && matchPrio;
  });

  // KPIs
  const total = TAREFAS_MOCK.length;
  const concluidas = TAREFAS_MOCK.filter((t) => t.status === "concluido").length;
  const emAndamento = TAREFAS_MOCK.filter((t) => t.status === "em_andamento").length;
  const atrasadas = TAREFAS_MOCK.filter((t) => t.prazo && new Date(t.prazo) < new Date() && t.status !== "concluido").length;
  const horasTotal = TAREFAS_MOCK.reduce((acc, t) => acc + (t.estimativa ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Gestão de Tarefas
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie projetos, sprints e tarefas da equipe</p>
        </div>
        <Dialog open={novaTarefaOpen} onOpenChange={setNovaTarefaOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
            </DialogHeader>
            <NovaTarefaForm onClose={() => setNovaTarefaOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: total, icon: <ListTodo className="h-4 w-4" />, color: "text-foreground" },
          { label: "Concluídas", value: concluidas, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-green-600" },
          { label: "Em Andamento", value: emAndamento, icon: <Timer className="h-4 w-4" />, color: "text-yellow-600" },
          { label: "Atrasadas", value: atrasadas, icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600" },
          { label: "Horas Estimadas", value: `${horasTotal}h`, icon: <Clock className="h-4 w-4" />, color: "text-blue-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 mb-1 ${kpi.color}`}>
                {kpi.icon}
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de ferramentas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroPrioridade} onValueChange={(v) => setFiltroPrioridade(v as any)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="critica">🔴 Crítica</SelectItem>
            <SelectItem value="alta">🟠 Alta</SelectItem>
            <SelectItem value="media">🟡 Média</SelectItem>
            <SelectItem value="baixa">🔵 Baixa</SelectItem>
          </SelectContent>
        </Select>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {[
            { id: "kanban", icon: <Kanban className="h-4 w-4" />, label: "Kanban" },
            { id: "lista", icon: <List className="h-4 w-4" />, label: "Lista" },
            { id: "sprint", icon: <Zap className="h-4 w-4" />, label: "Sprint" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === v.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.icon}{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* KANBAN VIEW */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS.map((col) => {
            const colTarefas = tarefasFiltradas.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-72">
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.cor}`}>
                  {col.icon}
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="ml-auto bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                    {colTarefas.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colTarefas.map((t) => (
                    <TarefaCard key={t.id} tarefa={t} onClick={() => setTarefaSelecionada(t)} />
                  ))}
                  <button
                    onClick={() => setNovaTarefaOpen(true)}
                    className="w-full flex items-center gap-2 p-2 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar tarefa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA VIEW */}
      {view === "lista" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tarefa</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Prioridade</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Responsável</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Prazo</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {tarefasFiltradas.map((t) => {
                  const col = COLUNAS.find((c) => c.id === t.status)!;
                  const prio = PRIORIDADE_CONFIG[t.prioridade];
                  const isAtrasada = t.prazo && new Date(t.prazo) < new Date() && t.status !== "concluido";
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setTarefaSelecionada(t)}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{t.titulo}</p>
                          <div className="flex gap-1 mt-1">
                            {t.tags.map((tag) => (
                              <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs">{col.icon}{col.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${prio.cor}`}>
                          {prio.icon}{prio.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                              {t.responsavel.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{t.responsavel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${isAtrasada ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          {t.prazo ? new Date(t.prazo).toLocaleDateString("pt-BR") : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${t.progresso}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{t.progresso}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* SPRINT VIEW */}
      {view === "sprint" && (
        <div className="space-y-6">
          {["Sprint 2", "Sprint 3", "Sprint 4"].map((sprint) => {
            const sprintTarefas = tarefasFiltradas.filter((t) => t.sprint === sprint);
            if (sprintTarefas.length === 0) return null;
            const concl = sprintTarefas.filter((t) => t.status === "concluido").length;
            const progresso = Math.round((concl / sprintTarefas.length) * 100);
            return (
              <Card key={sprint}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{sprint}</CardTitle>
                        <p className="text-xs text-muted-foreground">{sprintTarefas.length} tarefas · {concl} concluídas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${progresso}%` }} />
                        </div>
                        <span className="text-sm font-medium">{progresso}%</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sprintTarefas.map((t) => (
                      <TarefaCard key={t.id} tarefa={t} onClick={() => setTarefaSelecionada(t)} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de detalhe */}
      {tarefaSelecionada && (
        <TarefaModal tarefa={tarefaSelecionada} onClose={() => setTarefaSelecionada(null)} />
      )}
    </div>
  );
}
