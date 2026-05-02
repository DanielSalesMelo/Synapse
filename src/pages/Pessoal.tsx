import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Crown,
  Flag,
  KanbanSquare,
  Megaphone,
  Sparkles,
  Target,
} from "lucide-react";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function toCurrency(value: unknown) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateLabel(value: unknown) {
  if (!value) return "Sem data";
  return new Date(String(value)).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: Array<number | null> = [];

  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);

  return cells;
}

export default function Pessoal() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [today] = useState(new Date());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const isMaster = user?.role === "master_admin" || user?.role === "ti_master";

  const { data: dashboard } = trpc.master.dashboard.useQuery(undefined, { enabled: isMaster });
  const { data: tasks = [] } = trpc.master.listTasks.useQuery(undefined, { enabled: isMaster });
  const { data: events = [] } = trpc.master.listEvents.useQuery(undefined, { enabled: isMaster });
  const { data: reminders = [] } = trpc.master.listReminders.useQuery(undefined, { enabled: isMaster });
  const { data: financial = [] } = trpc.master.listFinancial.useQuery(undefined, { enabled: isMaster });
  const { data: campaigns = [] } = trpc.master.listCampaigns.useQuery(undefined, { enabled: isMaster });
  const { data: clients = [] } = trpc.master.listClients.useQuery(undefined, { enabled: isMaster });
  const { data: leads = [] } = trpc.master.listLeads.useQuery(undefined, { enabled: isMaster });

  const monthCells = useMemo(() => getMonthGrid(year, month), [year, month]);

  const calendarEvents = useMemo(() => {
    const mapped: Record<string, Array<{ tipo: string; titulo: string; detalhe: string }>> = {};
    const append = (key: string, item: { tipo: string; titulo: string; detalhe: string }) => {
      if (!mapped[key]) mapped[key] = [];
      mapped[key].push(item);
    };

    (events as any[]).forEach((event) => {
      if (!event.inicio) return;
      append(dayKey(event.inicio), {
        tipo: "evento",
        titulo: event.titulo,
        detalhe: `${event.area || "agenda"}${event.local ? ` • ${event.local}` : ""}`,
      });
    });

    (reminders as any[]).forEach((reminder) => {
      if (!reminder.lembrarEm) return;
      append(dayKey(reminder.lembrarEm), {
        tipo: "lembrete",
        titulo: reminder.titulo,
        detalhe: reminder.descricao || "Lembrete pessoal",
      });
    });

    return mapped;
  }, [events, reminders]);

  const selectedKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
  const selectedItems = calendarEvents[selectedKey] || [];
  const focusTasks = (tasks as any[]).filter((task) => task.status !== "concluida").slice(0, 5);
  const urgentFinancial = (financial as any[])
    .filter((item) => item.status !== "pago" && item.status !== "recebido" && item.status !== "cancelado")
    .slice(0, 4);
  const hotCampaigns = (campaigns as any[]).slice(0, 3);

  if (!isMaster) {
    return (
      <div className="space-y-6">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
            <CardDescription>Esta área pessoal é exclusiva do Master Admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Voltar para o dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.14),_transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.82))] p-6 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.05)_35%,transparent_70%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit border-white/20 bg-white/10 text-white">
              <Crown className="mr-1 h-3.5 w-3.5" />
              Espaço Pessoal do Daniel
            </Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Central pessoal com visão executiva do seu dia</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">
                Sua operação pessoal, clientes e Synapse reunidos em um só lugar para decidir rápido, priorizar melhor e não perder prazos.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-200">Foco do dia</p>
              <p className="mt-2 text-lg font-semibold">{(dashboard as any)?.focoDoDia || "Organizar prioridades"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-200">Tarefas ativas</p>
              <p className="mt-2 text-lg font-semibold">{(dashboard as any)?.tasks?.abertas ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-200">A receber</p>
              <p className="mt-2 text-lg font-semibold">{toCurrency((dashboard as any)?.financial?.receitas)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-200">Clientes ativos</p>
              <p className="mt-2 text-lg font-semibold">{(dashboard as any)?.clients?.ativos ?? 0}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <KanbanSquare className="h-4 w-4 text-blue-500" />
              O que fazer agora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {focusTasks.length ? focusTasks.map((task: any) => (
              <div key={task.id} className="rounded-xl border bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{task.titulo}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{task.prioridade}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{task.area} • {task.periodo || "sem período"}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Nenhuma tarefa ativa cadastrada.</p>}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-emerald-500" />
              Financeiro pessoal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentFinancial.length ? urgentFinancial.map((item: any) => (
              <div key={item.id} className="rounded-xl border bg-background/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.descricao}</p>
                  <span className="text-sm font-semibold">{toCurrency(item.valor)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.tipo} • vence {toDateLabel(item.vencimento)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Nenhum lançamento pendente.</p>}
          </CardContent>
        </Card>

        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-violet-500" />
              Marketing & clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Campanhas</p>
                <p className="text-xl font-semibold">{(campaigns as any[]).length}</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">Leads</p>
                <p className="text-xl font-semibold">{(leads as any[]).length}</p>
              </div>
            </div>
            {hotCampaigns.length ? hotCampaigns.map((campaign: any) => (
              <div key={campaign.id} className="rounded-xl border bg-background/70 p-3">
                <p className="text-sm font-medium">{campaign.nome}</p>
                <p className="mt-1 text-xs text-muted-foreground">{campaign.plataforma} • {campaign.status}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada ainda.</p>}
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-amber-500" />
              Saúde do workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Compromissos de hoje</p>
              <p className="text-xl font-semibold">{(dashboard as any)?.events?.hoje ?? 0}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Lembretes hoje</p>
              <p className="text-xl font-semibold">{(dashboard as any)?.reminders?.hoje ?? 0}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Clientes ativos</p>
              <p className="text-xl font-semibold">{(clients as any[]).filter((client: any) => client.status === "ativo").length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Calendário pessoal
                </CardTitle>
                <CardDescription>Agenda, lembretes e compromissos da sua rotina.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  if (month === 0) {
                    setMonth(11);
                    setYear((current) => current - 1);
                  } else {
                    setMonth((current) => current - 1);
                  }
                }}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  if (month === 11) {
                    setMonth(0);
                    setYear((current) => current + 1);
                  } else {
                    setMonth((current) => current + 1);
                  }
                }}>Próximo</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{MESES[month]} de {year}</h2>
              <Badge variant="outline">{Object.keys(calendarEvents).length} dias com atividade</Badge>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
              {DIAS.map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthCells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="h-20 rounded-2xl border border-dashed border-border/50" />;
                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const items = calendarEvents[key] || [];
                const isSelected = selectedDay === day;
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    className={`h-20 rounded-2xl border p-2 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                      {items.length > 0 && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{items.length}</span>}
                    </div>
                    <div className="mt-2 space-y-1">
                      {items.slice(0, 2).map((item, itemIndex) => (
                        <div key={`${key}-${itemIndex}`} className="truncate rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {item.titulo}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              Detalhes do dia
            </CardTitle>
            <CardDescription>{selectedDay} de {MESES[month]} de {year}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {selectedItems.length ? selectedItems.map((item, index) => (
              <div key={`${item.tipo}-${index}`} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.titulo}</p>
                  <Badge variant="outline" className="capitalize">{item.tipo}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{item.detalhe}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed p-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">Nada programado neste dia</p>
                <p className="mt-1 text-xs text-muted-foreground">Use a Central do Daniel para cadastrar compromissos e lembretes.</p>
              </div>
            )}

            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Leitura rápida da sua rotina</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {focusTasks.length
                  ? `Hoje sua melhor sequência é fechar ${focusTasks[0]?.titulo || "a tarefa principal"}, acompanhar ${hotCampaigns[0]?.nome || "suas campanhas"} e verificar ${urgentFinancial.length} lançamento(s) financeiro(s).`
                  : "Cadastre as primeiras tarefas do seu dia para eu te mostrar uma sequência clara de execução."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/master/painel")}>
                <Crown className="mr-2 h-4 w-4" />
                Abrir Central do Daniel
              </Button>
              <Button variant="outline" onClick={() => navigate("/ia")}>
                <Brain className="mr-2 h-4 w-4" />
                Falar com a IA
              </Button>
              <Button variant="outline" onClick={() => navigate("/gestao/calendario")}>
                <Flag className="mr-2 h-4 w-4" />
                Calendário operacional
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
