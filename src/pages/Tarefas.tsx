import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, Calendar, MessageSquare,
  MoreHorizontal, Trash2, Edit, CheckCircle2, Circle, Loader2,
  GripVertical, AlertCircle, ArrowUp, ArrowRight, ArrowDown,
  Kanban, List, User,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Priority = "critica" | "alta" | "media" | "baixa";
type Status = "backlog" | "a_fazer" | "em_andamento" | "revisao" | "concluido";
type ViewMode = "kanban" | "list";

interface Tarefa {
  id: number;
  titulo: string;
  descricao?: string;
  status: Status;
  prioridade: Priority;
  responsavelNome?: string;
  responsavelNomeReal?: string;
  prazo?: string;
  tags: string[];
  totalComentarios?: number;
  progresso?: number;
  projetoNome?: string;
  projetoCor?: string;
  sprint?: string;
  estimativaHoras?: number;
}

const COLUMNS: { id: Status; label: string; color: string; icon: React.ReactNode }[] = [
  { id: "backlog",      label: "Backlog",      color: "text-slate-400",  icon: <Circle className="h-3.5 w-3.5" /> },
  { id: "a_fazer",      label: "A Fazer",      color: "text-blue-400",   icon: <Circle className="h-3.5 w-3.5" /> },
  { id: "em_andamento", label: "Em Andamento", color: "text-yellow-400", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  { id: "revisao",      label: "Revisao",      color: "text-purple-400", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  { id: "concluido",    label: "Concluido",    color: "text-green-400",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: React.ReactNode }> = {
  critica: { label: "Critica", color: "text-red-500 bg-red-500/10 border-red-500/20",         icon: <ArrowUp className="h-3 w-3" /> },
  alta:    { label: "Alta",    color: "text-orange-500 bg-orange-500/10 border-orange-500/20", icon: <ArrowUp className="h-3 w-3" /> },
  media:   { label: "Media",   color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", icon: <ArrowRight className="h-3 w-3" /> },
  baixa:   { label: "Baixa",   color: "text-slate-400 bg-slate-500/10 border-slate-500/20",    icon: <ArrowDown className="h-3 w-3" /> },
};

function TaskCard({ tarefa, onEdit, onDelete, dragHandleProps }: {
  tarefa: Tarefa; onEdit: (t: Tarefa) => void; onDelete: (id: number) => void; dragHandleProps?: any;
}) {
  const prio = PRIORITY_CONFIG[tarefa.prioridade] ?? PRIORITY_CONFIG.media;
  const prazoDate = tarefa.prazo ? parseISO(tarefa.prazo) : null;
  const isOverdue = prazoDate && isValid(prazoDate) && prazoDate < new Date();
  const tags: string[] = Array.isArray(tarefa.tags) ? tarefa.tags : [];
  return (
    <div className="group bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-default">
      <div className="flex items-start gap-2 mb-2">
        {dragHandleProps && (
          <button {...dragHandleProps} className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0">
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <p className="text-sm font-medium text-foreground flex-1 leading-snug line-clamp-2">{tarefa.titulo}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onEdit(tarefa)}><Edit className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(tarefa.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {tarefa.projetoNome && (
        <div className="flex items-center gap-1 mb-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tarefa.projetoCor || "#6366f1" }} />
          <span className="text-[10px] text-muted-foreground truncate">{tarefa.projetoNome}</span>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.slice(0, 3).map((tag) => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>)}
          {tags.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{tags.length - 3}</span>}
        </div>
      )}
      <div className="flex items-center justify-between mt-2 gap-2">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 gap-0.5 ${prio.color}`}>{prio.icon}{prio.label}</Badge>
        <div className="flex items-center gap-2 text-muted-foreground">
          {(tarefa.totalComentarios ?? 0) > 0 && <span className="flex items-center gap-0.5 text-[10px]"><MessageSquare className="h-3 w-3" />{tarefa.totalComentarios}</span>}
          {prazoDate && isValid(prazoDate) && (
            <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? "text-red-400" : ""}`}>
              <Calendar className="h-3 w-3" />{format(prazoDate, "dd/MM", { locale: ptBR })}
            </span>
          )}
          {(tarefa.responsavelNomeReal || tarefa.responsavelNome) && (
            <span className="flex items-center gap-0.5 text-[10px]"><User className="h-3 w-3" />{(tarefa.responsavelNomeReal || tarefa.responsavelNome || "").split(" ")[0]}</span>
          )}
        </div>
      </div>
      {(tarefa.progresso ?? 0) > 0 && (
        <div className="mt-2"><div className="h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${tarefa.progresso}%` }} /></div></div>
      )}
    </div>
  );
}

function SortableCard({ tarefa, onEdit, onDelete }: { tarefa: Tarefa; onEdit: (t: Tarefa) => void; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return <div ref={setNodeRef} style={style} {...attributes}><TaskCard tarefa={tarefa} onEdit={onEdit} onDelete={onDelete} dragHandleProps={listeners} /></div>;
}

function KanbanColumn({ column, tarefas, onEdit, onDelete, onAddNew }: {
  column: typeof COLUMNS[number]; tarefas: Tarefa[]; onEdit: (t: Tarefa) => void; onDelete: (id: number) => void; onAddNew: (status: Status) => void;
}) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px] flex-1 bg-muted/30 rounded-xl border border-border">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className={`flex items-center gap-1.5 ${column.color}`}>
          {column.icon}
          <span className="text-xs font-semibold text-foreground">{column.label}</span>
          <span className="ml-1 text-[10px] bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground font-medium">{tarefas.length}</span>
        </div>
        <button onClick={() => onAddNew(column.id)} className="text-muted-foreground hover:text-foreground transition-colors"><Plus className="h-3.5 w-3.5" /></button>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[120px] overflow-y-auto max-h-[calc(100vh-280px)]">
        <SortableContext items={tarefas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tarefas.map((tarefa) => <SortableCard key={tarefa.id} tarefa={tarefa} onEdit={onEdit} onDelete={onDelete} />)}
        </SortableContext>
        {tarefas.length === 0 && <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40"><Circle className="h-8 w-8 mb-2" /><p className="text-xs">Nenhuma tarefa</p></div>}
      </div>
    </div>
  );
}

function TaskFormDialog({ open, onClose, initialStatus, editTarefa, onSuccess }: {
  open: boolean; onClose: () => void; initialStatus?: Status; editTarefa?: Tarefa | null; onSuccess: () => void;
}) {
  const [titulo, setTitulo] = useState(editTarefa?.titulo || "");
  const [descricao, setDescricao] = useState(editTarefa?.descricao || "");
  const [status, setStatus] = useState<Status>(editTarefa?.status || initialStatus || "backlog");
  const [prioridade, setPrioridade] = useState<Priority>(editTarefa?.prioridade || "media");
  const [prazo, setPrazo] = useState(editTarefa?.prazo ? editTarefa.prazo.slice(0, 10) : "");
  const [tagsInput, setTagsInput] = useState((editTarefa?.tags || []).join(", "));
  const [sprint, setSprint] = useState(editTarefa?.sprint || "");
  const utils = trpc.useUtils();
  const createMutation = trpc.tarefas.create.useMutation({
    onSuccess: () => { toast.success("Tarefa criada!"); utils.tarefas.list.invalidate(); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.tarefas.update.useMutation({
    onSuccess: () => { toast.success("Tarefa atualizada!"); utils.tarefas.list.invalidate(); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const handleSubmit = () => {
    if (!titulo.trim()) { toast.error("Informe o titulo"); return; }
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (editTarefa) {
      updateMutation.mutate({ id: editTarefa.id, titulo, descricao, status, prioridade, prazo: prazo || null, tags, sprint: sprint || undefined });
    } else {
      createMutation.mutate({ titulo, descricao, status, prioridade, prazo: prazo || undefined, tags, sprint: sprint || undefined });
    }
  };
  const isPending = createMutation.isPending || updateMutation.isPending;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editTarefa ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Titulo *</label>
            <Input placeholder="Titulo da tarefa..." value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descricao</label>
            <Textarea placeholder="Descreva a tarefa..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridade</label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Priority)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo</label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Sprint</label>
              <Input placeholder="Sprint 3..." value={sprint} onChange={(e) => setSprint(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (separadas por virgula)</label>
            <Input placeholder="backend, bug, frontend..." value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editTarefa ? "Salvar" : "Criar Tarefa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ListView({ tarefas, onEdit, onDelete }: { tarefas: Tarefa[]; onEdit: (t: Tarefa) => void; onDelete: (id: number) => void }) {
  return (
    <div className="space-y-1">
      {tarefas.map((tarefa) => {
        const prio = PRIORITY_CONFIG[tarefa.prioridade] ?? PRIORITY_CONFIG.media;
        const prazoDate = tarefa.prazo ? parseISO(tarefa.prazo) : null;
        const isOverdue = prazoDate && isValid(prazoDate) && prazoDate < new Date();
        const col = COLUMNS.find((c) => c.id === tarefa.status);
        return (
          <div key={tarefa.id} className="group flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/30 transition-all">
            <div className={`shrink-0 ${col?.color}`}>{col?.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{tarefa.titulo}</p>
              {tarefa.projetoNome && <p className="text-[11px] text-muted-foreground truncate">{tarefa.projetoNome}</p>}
            </div>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 gap-0.5 shrink-0 ${prio.color}`}>{prio.icon}{prio.label}</Badge>
            {prazoDate && isValid(prazoDate) && (
              <span className={`text-[11px] shrink-0 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>{format(prazoDate, "dd/MM/yy", { locale: ptBR })}</span>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(tarefa)} className="text-muted-foreground hover:text-foreground p-1"><Edit className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDelete(tarefa.id)} className="text-muted-foreground hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        );
      })}
      {tarefas.length === 0 && <div className="text-center py-16 text-muted-foreground"><Kanban className="h-12 w-12 mx-auto mb-3 opacity-30" /><p className="text-sm">Nenhuma tarefa encontrada</p></div>}
    </div>
  );
}

export default function Tarefas() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarefa, setEditTarefa] = useState<Tarefa | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>("backlog");
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const utils = trpc.useUtils();
  const { data: tarefasRaw = [], isLoading } = trpc.tarefas.list.useQuery({});
  const deleteMutation = trpc.tarefas.delete.useMutation({
    onSuccess: () => { toast.success("Tarefa excluida"); utils.tarefas.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const moveStatusMutation = trpc.tarefas.moveStatus.useMutation({
    onSuccess: () => utils.tarefas.list.invalidate(),
    onError: (e) => toast.error("Erro ao mover: " + e.message),
  });

  const tarefas: Tarefa[] = useMemo(() => (tarefasRaw as any[]).map((t) => ({ ...t, tags: Array.isArray(t.tags) ? t.tags : [] })), [tarefasRaw]);
  const filtered = useMemo(() => tarefas.filter((t) => {
    if (search && !t.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "all" && t.prioridade !== filterPriority) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  }), [tarefas, search, filterPriority, filterStatus]);
  const byStatus = useMemo(() => {
    const map: Record<Status, Tarefa[]> = { backlog: [], a_fazer: [], em_andamento: [], revisao: [], concluido: [] };
    for (const t of filtered) { if (map[t.status]) map[t.status].push(t); }
    return map;
  }, [filtered]);
  const activeTarefa = useMemo(() => tarefas.find((t) => t.id === activeId), [tarefas, activeId]);

  const handleDragStart = useCallback((event: DragStartEvent) => setActiveId(Number(event.active.id)), []);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = Number(active.id);
    const overId = String(over.id);
    let targetStatus: Status | null = null;
    if (COLUMNS.some((c) => c.id === overId)) {
      targetStatus = overId as Status;
    } else {
      const overTask = tarefas.find((t) => t.id === Number(overId));
      if (overTask) targetStatus = overTask.status;
    }
    if (!targetStatus) return;
    const currentTask = tarefas.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === targetStatus) return;
    moveStatusMutation.mutate({ id: taskId, status: targetStatus });
  }, [tarefas, moveStatusMutation]);

  const handleEdit = useCallback((t: Tarefa) => { setEditTarefa(t); setDialogOpen(true); }, []);
  const handleDelete = useCallback((id: number) => { if (confirm("Excluir esta tarefa?")) deleteMutation.mutate({ id }); }, [deleteMutation]);
  const handleAddNew = useCallback((status: Status) => { setEditTarefa(null); setNewTaskStatus(status); setDialogOpen(true); }, []);

  const stats = useMemo(() => ({
    total: tarefas.length,
    concluidas: tarefas.filter((t) => t.status === "concluido").length,
    emAndamento: tarefas.filter((t) => t.status === "em_andamento").length,
    criticas: tarefas.filter((t) => t.prioridade === "critica" && t.status !== "concluido").length,
  }), [tarefas]);

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Gerencie e acompanhe o progresso das tarefas</p>
        </div>
        <Button size="sm" onClick={() => { setEditTarefa(null); setNewTaskStatus("backlog"); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",        value: stats.total,       color: "text-foreground" },
          { label: "Em Andamento", value: stats.emAndamento, color: "text-yellow-400" },
          { label: "Concluidas",   value: stats.concluidas,  color: "text-green-400" },
          { label: "Criticas",     value: stats.criticas,    color: "text-red-400" },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as any)}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todas</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {viewMode === "list" && (
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              {COLUMNS.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setViewMode("kanban")} className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Kanban"><Kanban className="h-4 w-4" /></button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} title="Lista"><List className="h-4 w-4" /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando tarefas...</div>
      ) : viewMode === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
            {COLUMNS.map((col) => <KanbanColumn key={col.id} column={col} tarefas={byStatus[col.id] || []} onEdit={handleEdit} onDelete={handleDelete} onAddNew={handleAddNew} />)}
          </div>
          <DragOverlay>
            {activeTarefa && <div className="rotate-2 opacity-90 shadow-2xl"><TaskCard tarefa={activeTarefa} onEdit={() => {}} onDelete={() => {}} /></div>}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="flex-1 overflow-y-auto"><ListView tarefas={filtered} onEdit={handleEdit} onDelete={handleDelete} /></div>
      )}

      {dialogOpen && (
        <TaskFormDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditTarefa(null); }} initialStatus={newTaskStatus} editTarefa={editTarefa} onSuccess={() => {}} />
      )}
    </div>
  );
}
