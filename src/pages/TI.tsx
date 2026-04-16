import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import {
  Plus, Monitor, Headphones, AlertCircle, CheckCircle2, Search,
  Wrench, Cpu, HardDrive, Server, Key, Shield, ShoppingCart,
  Network, Activity, AlertTriangle, Clock, User, Building2,
  Thermometer, Battery, Wifi, Package, FileText, ExternalLink,
  RefreshCw, TrendingUp, Eye, Edit, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Cores de status e prioridade ──────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  em_andamento: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  aguardando: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolvido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  fechado: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};
const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-orange-100 text-orange-700",
  critica: "bg-red-100 text-red-700",
};
const SAUDE_COLORS: Record<string, string> = {
  otimo: "text-green-600",
  bom: "text-blue-600",
  atencao: "text-yellow-600",
  critico: "text-red-600",
};

// ─── Dados mockados para demonstração visual ────────────────────────────────
const MOCK_ATIVOS = [
  { id: 1, nome: "DESKTOP-FIN01", tipo: "Desktop", marca: "Dell", modelo: "OptiPlex 7090", setor: "Financeiro", so: "Windows 11 Pro", cpu_uso: 45, ram_uso: 62, disco_saude: 94, temperatura: 52, anydesk: "123 456 789", status: "online" },
  { id: 2, nome: "NOTE-DIR01", tipo: "Notebook", marca: "Lenovo", modelo: "ThinkPad X1", setor: "Diretoria", so: "Windows 11 Pro", cpu_uso: 28, ram_uso: 41, disco_saude: 88, temperatura: 48, anydesk: "987 654 321", status: "online" },
  { id: 3, nome: "SERVER-ERP01", tipo: "Servidor", marca: "HP", modelo: "ProLiant DL380", setor: "TI", so: "Windows Server 2022", cpu_uso: 71, ram_uso: 83, disco_saude: 76, temperatura: 68, anydesk: "—", status: "atencao" },
  { id: 4, nome: "DESKTOP-OP02", tipo: "Desktop", marca: "Dell", modelo: "OptiPlex 5090", setor: "Operacional", so: "Windows 10 Pro", cpu_uso: 15, ram_uso: 34, disco_saude: 55, temperatura: 44, anydesk: "456 123 789", status: "critico" },
  { id: 5, nome: "NOTE-VND01", tipo: "Notebook", marca: "HP", modelo: "EliteBook 840", setor: "Vendas", so: "Windows 11 Pro", cpu_uso: 33, ram_uso: 58, disco_saude: 91, temperatura: 50, anydesk: "321 654 987", status: "online" },
];

const MOCK_LICENCAS = [
  { id: 1, software: "Microsoft 365", tipo: "Assinatura", total: 50, usadas: 47, expiracao: "2025-12-31", custo_mensal: 2350 },
  { id: 2, software: "Adobe Creative Cloud", tipo: "Assinatura", total: 5, usadas: 5, expiracao: "2025-08-15", custo_mensal: 750 },
  { id: 3, software: "AutoCAD 2024", tipo: "Perpétua", total: 3, usadas: 2, expiracao: "—", custo_mensal: 0 },
  { id: 4, software: "Antivírus Corporativo", tipo: "Assinatura", total: 80, usadas: 73, expiracao: "2025-06-30", custo_mensal: 480 },
];

const MOCK_ACESSOS = [
  { id: 1, maquina: "DESKTOP-FIN01", setor: "Financeiro", anydesk: "123 456 789", teamviewer: "—", responsavel: "Ana Lima", ultima_sessao: "2025-04-15 14:32" },
  { id: 2, maquina: "SERVER-ERP01", setor: "TI", anydesk: "—", teamviewer: "TV-8821-4453", responsavel: "Carlos TI", ultima_sessao: "2025-04-16 08:10" },
  { id: 3, maquina: "NOTE-DIR01", setor: "Diretoria", anydesk: "987 654 321", teamviewer: "—", responsavel: "João Silva", ultima_sessao: "2025-04-14 16:45" },
];

export default function TI() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showNew, setShowNew] = useState(false);
  const [showNewAtivo, setShowNewAtivo] = useState(false);

  const dashboard = trpc.ti.dashboard.useQuery();
  const ticketsQ = trpc.ti.listTickets.useQuery({
    search,
    status: statusFilter === "todos" ? undefined : statusFilter,
  });
  const ativosQ = trpc.ti.listAtivos.useQuery({ search });

  const createTicket = trpc.ti.createTicket.useMutation({
    onSuccess: () => { ticketsQ.refetch(); dashboard.refetch(); setShowNew(false); toast.success("Ticket aberto com sucesso!"); },
  });
  const updateStatus = trpc.ti.updateTicketStatus.useMutation({
    onSuccess: () => { ticketsQ.refetch(); dashboard.refetch(); toast.success("Status atualizado!"); },
  });
  const createAtivo = trpc.ti.createAtivo.useMutation({
    onSuccess: () => { ativosQ.refetch(); dashboard.refetch(); setShowNewAtivo(false); toast.success("Ativo cadastrado!"); },
  });

  const [ticketForm, setTicketForm] = useState({
    titulo: "", descricao: "", categoria: "outro" as const, prioridade: "media" as const,
  });
  const [ativoForm, setAtivoForm] = useState({
    tipo: "", marca: "", modelo: "", patrimonio: "", serial: "", setor: "",
  });

  const totalAtivos = ativosQ.data?.length ?? MOCK_ATIVOS.length;
  const ativosOnline = MOCK_ATIVOS.filter((a) => a.status === "online").length;
  const ativosAtencao = MOCK_ATIVOS.filter((a) => a.status === "atencao").length;
  const ativosCriticos = MOCK_ATIVOS.filter((a) => a.status === "critico").length;

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            TI & Infraestrutura
          </h1>
          <p className="text-muted-foreground text-sm">
            ITSM · ITAM · Monitoramento · Acessos Remotos · Licenças
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { dashboard.refetch(); ativosQ.refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />Atualizar
          </Button>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Chamado</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Abrir Novo Chamado</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createTicket.mutate(ticketForm); }} className="space-y-4">
                <div><Label>Título *</Label><Input value={ticketForm.titulo} onChange={(e) => setTicketForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Descreva o problema brevemente" required /></div>
                <div><Label>Descrição detalhada *</Label><Textarea value={ticketForm.descricao} onChange={(e) => setTicketForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o problema com o máximo de detalhes possível..." rows={4} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Categoria</Label>
                    <Select value={ticketForm.categoria} onValueChange={(v) => setTicketForm((p) => ({ ...p, categoria: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hardware">Hardware</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="rede">Rede / Internet</SelectItem>
                        <SelectItem value="acesso">Acesso / Senha</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="impressora">Impressora</SelectItem>
                        <SelectItem value="servidor">Servidor</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Prioridade</Label>
                    <Select value={ticketForm.prioridade} onValueChange={(v) => setTicketForm((p) => ({ ...p, prioridade: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">🟢 Baixa</SelectItem>
                        <SelectItem value="media">🔵 Média</SelectItem>
                        <SelectItem value="alta">🟠 Alta</SelectItem>
                        <SelectItem value="critica">🔴 Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createTicket.isPending}>
                  {createTicket.isPending ? "Abrindo..." : "Abrir Chamado"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── KPIs Principais ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="col-span-1"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Chamados Abertos</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold text-red-600">{dashboard.data?.tickets?.abertos ?? 3}</div></CardContent></Card>
        <Card className="col-span-1"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Em Andamento</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold text-yellow-600">{dashboard.data?.tickets?.emAndamento ?? 5}</div></CardContent></Card>
        <Card className="col-span-1"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Resolvidos Hoje</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold text-green-600">{dashboard.data?.tickets?.resolvidos ?? 8}</div></CardContent></Card>
        <Card className="col-span-1"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Total Ativos</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold">{totalAtivos}</div></CardContent></Card>
        <Card className="col-span-1 border-green-200"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-green-600">Online</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold text-green-600">{ativosOnline}</div></CardContent></Card>
        <Card className="col-span-1 border-yellow-200"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-yellow-600">Atenção</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold text-yellow-600">{ativosAtencao}</div></CardContent></Card>
        <Card className="col-span-1 border-red-200"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-red-600">Críticos</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold text-red-600">{ativosCriticos}</div></CardContent></Card>
        <Card className="col-span-1"><CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs text-muted-foreground">Licenças</CardTitle></CardHeader><CardContent className="px-3 pb-3"><div className="text-2xl font-bold">{MOCK_LICENCAS.length}</div></CardContent></Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard"><Activity className="h-4 w-4 mr-1" />Visão Geral</TabsTrigger>
          <TabsTrigger value="tickets"><Headphones className="h-4 w-4 mr-1" />Chamados</TabsTrigger>
          <TabsTrigger value="inventario"><HardDrive className="h-4 w-4 mr-1" />Inventário</TabsTrigger>
          <TabsTrigger value="monitoramento"><Cpu className="h-4 w-4 mr-1" />Monitoramento</TabsTrigger>
          <TabsTrigger value="acessos"><Key className="h-4 w-4 mr-1" />Acessos Remotos</TabsTrigger>
          <TabsTrigger value="licencas"><Shield className="h-4 w-4 mr-1" />Licenças</TabsTrigger>
          <TabsTrigger value="compras"><ShoppingCart className="h-4 w-4 mr-1" />Compras de TI</TabsTrigger>
        </TabsList>

        {/* ── VISÃO GERAL ── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Alertas de Hardware</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {MOCK_ATIVOS.filter((a) => a.status !== "online").map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${a.status === "critico" ? "bg-red-500" : "bg-yellow-500"}`} />
                      <span className="text-sm font-medium">{a.nome}</span>
                      <Badge variant="outline" className="text-xs">{a.setor}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.disco_saude < 70 ? `Disco: ${a.disco_saude}%` : `CPU: ${a.cpu_uso}%`}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" />Chamados Recentes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(ticketsQ.data ?? []).slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{t.titulo}</p>
                      <p className="text-xs text-muted-foreground">{t.protocolo}</p>
                    </div>
                    <Badge className={`text-xs ${PRIORIDADE_COLORS[t.prioridade] ?? ""}`}>{t.prioridade}</Badge>
                  </div>
                ))}
                {(ticketsQ.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado recente</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── CHAMADOS ── */}
        <TabsContent value="tickets" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar chamados..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aberto em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ticketsQ.data ?? []).map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.protocolo}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{t.titulo}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.categoria}</Badge></TableCell>
                    <TableCell><Badge className={`text-xs ${PRIORIDADE_COLORS[t.prioridade] ?? ""}`}>{t.prioridade}</Badge></TableCell>
                    <TableCell><Badge className={`text-xs ${STATUS_COLORS[t.status] ?? ""}`}>{t.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as any })}>
                        <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aberto">Aberto</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="aguardando">Aguardando</SelectItem>
                          <SelectItem value="resolvido">Resolvido</SelectItem>
                          <SelectItem value="fechado">Fechado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {(ticketsQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum chamado encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── INVENTÁRIO ── */}
        <TabsContent value="inventario" className="space-y-4 mt-4">
          <div className="flex gap-2 justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar ativos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={showNewAtivo} onOpenChange={setShowNewAtivo}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Cadastrar Ativo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Cadastrar Novo Ativo</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createAtivo.mutate(ativoForm); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Tipo *</Label><Input value={ativoForm.tipo} onChange={(e) => setAtivoForm((p) => ({ ...p, tipo: e.target.value }))} placeholder="Desktop, Notebook, Servidor..." required /></div>
                    <div><Label>Setor *</Label><Input value={ativoForm.setor} onChange={(e) => setAtivoForm((p) => ({ ...p, setor: e.target.value }))} placeholder="Financeiro, TI..." required /></div>
                    <div><Label>Marca</Label><Input value={ativoForm.marca} onChange={(e) => setAtivoForm((p) => ({ ...p, marca: e.target.value }))} placeholder="Dell, HP, Lenovo..." /></div>
                    <div><Label>Modelo</Label><Input value={ativoForm.modelo} onChange={(e) => setAtivoForm((p) => ({ ...p, modelo: e.target.value }))} placeholder="OptiPlex 7090..." /></div>
                    <div><Label>Patrimônio</Label><Input value={ativoForm.patrimonio} onChange={(e) => setAtivoForm((p) => ({ ...p, patrimonio: e.target.value }))} placeholder="PAT-001" /></div>
                    <div><Label>Serial / S/N</Label><Input value={ativoForm.serial} onChange={(e) => setAtivoForm((p) => ({ ...p, serial: e.target.value }))} placeholder="SN123456" /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createAtivo.isPending}>Cadastrar Ativo</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Hostname</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Sistema Operacional</TableHead>
                  <TableHead>AnyDesk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_ATIVOS.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm font-medium">{a.nome}</TableCell>
                    <TableCell><Badge variant="outline">{a.tipo}</Badge></TableCell>
                    <TableCell className="text-sm">{a.marca} {a.modelo}</TableCell>
                    <TableCell><Badge variant="secondary">{a.setor}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.so}</TableCell>
                    <TableCell className="font-mono text-xs">{a.anydesk}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${a.status === "online" ? "text-green-600" : a.status === "atencao" ? "text-yellow-600" : "text-red-600"}`}>
                        <div className={`h-2 w-2 rounded-full ${a.status === "online" ? "bg-green-500" : a.status === "atencao" ? "bg-yellow-500" : "bg-red-500"}`} />
                        {a.status === "online" ? "Online" : a.status === "atencao" ? "Atenção" : "Crítico"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── MONITORAMENTO ── */}
        <TabsContent value="monitoramento" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MOCK_ATIVOS.map((a) => (
              <Card key={a.id} className={`border-l-4 ${a.status === "online" ? "border-l-green-500" : a.status === "atencao" ? "border-l-yellow-500" : "border-l-red-500"}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">{a.nome}</CardTitle>
                    <Badge variant="outline" className="text-xs">{a.setor}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.marca} {a.modelo} · {a.so}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />CPU</span>
                      <span className={a.cpu_uso > 80 ? "text-red-600 font-bold" : "text-muted-foreground"}>{a.cpu_uso}%</span>
                    </div>
                    <Progress value={a.cpu_uso} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1"><Server className="h-3 w-3" />RAM</span>
                      <span className={a.ram_uso > 85 ? "text-red-600 font-bold" : "text-muted-foreground"}>{a.ram_uso}%</span>
                    </div>
                    <Progress value={a.ram_uso} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />Saúde do Disco</span>
                      <span className={a.disco_saude < 70 ? "text-red-600 font-bold" : a.disco_saude < 85 ? "text-yellow-600" : "text-muted-foreground"}>{a.disco_saude}%</span>
                    </div>
                    <Progress value={a.disco_saude} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" />{a.temperatura}°C</span>
                    {a.anydesk !== "—" && (
                      <span className="flex items-center gap-1 font-mono"><Key className="h-3 w-3" />{a.anydesk}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── ACESSOS REMOTOS ── */}
        <TabsContent value="acessos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Credenciais de acesso remoto centralizadas e auditadas.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Adicionar Acesso</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>AnyDesk ID</TableHead>
                  <TableHead>TeamViewer</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Última Sessão</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_ACESSOS.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{a.maquina}</TableCell>
                    <TableCell><Badge variant="secondary">{a.setor}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{a.anydesk}</TableCell>
                    <TableCell className="font-mono text-sm">{a.teamviewer}</TableCell>
                    <TableCell className="text-sm">{a.responsavel}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.ultima_sessao}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />Conectar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── LICENÇAS ── */}
        <TabsContent value="licencas" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Controle de licenças de software, alertas de expiração e otimização de custos.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Adicionar Licença</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_LICENCAS.map((l) => {
              const uso = Math.round((l.usadas / l.total) * 100);
              const expirandoEm30 = l.expiracao !== "—" && new Date(l.expiracao) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              return (
                <Card key={l.id} className={expirandoEm30 ? "border-orange-300" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{l.software}</CardTitle>
                      {expirandoEm30 && <Badge className="bg-orange-100 text-orange-700 text-xs">Expirando em breve</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{l.tipo} · Expira: {l.expiracao}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Uso: {l.usadas} / {l.total} licenças</span>
                      <span className={uso > 90 ? "text-red-600 font-bold" : "text-muted-foreground"}>{uso}%</span>
                    </div>
                    <Progress value={uso} className="h-2" />
                    {l.custo_mensal > 0 && (
                      <p className="text-xs text-muted-foreground">Custo mensal: R$ {l.custo_mensal.toLocaleString("pt-BR")}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── COMPRAS DE TI ── */}
        <TabsContent value="compras" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Gestão de requisições e compras de hardware, software e periféricos.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Requisição</Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Módulo de Compras de TI</p>
                <p className="text-sm mt-1">Crie requisições de compra de hardware e software com aprovação por fluxo.</p>
                <Button className="mt-4" size="sm"><Plus className="h-4 w-4 mr-2" />Criar Primeira Requisição</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
