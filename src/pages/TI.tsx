import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Plus, Monitor, Headphones, AlertCircle, CheckCircle2, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-red-100 text-red-700", em_andamento: "bg-yellow-100 text-yellow-700",
  aguardando: "bg-blue-100 text-blue-700", resolvido: "bg-green-100 text-green-700",
  fechado: "bg-gray-100 text-gray-700",
};
const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700", media: "bg-blue-100 text-blue-700",
  alta: "bg-orange-100 text-orange-700", critica: "bg-red-100 text-red-700",
};

export default function TI() {
  const [tab, setTab] = useState("tickets");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showNew, setShowNew] = useState(false);
  const [showNewAtivo, setShowNewAtivo] = useState(false);

  const dashboard = trpc.ti.dashboard.useQuery();
  const ticketsQ = trpc.ti.listTickets.useQuery({ search, status: statusFilter === "todos" ? undefined : statusFilter });
  const ativosQ = trpc.ti.listAtivos.useQuery({ search });

  const createTicket = trpc.ti.createTicket.useMutation({ onSuccess: () => { ticketsQ.refetch(); dashboard.refetch(); setShowNew(false); toast.success("Ticket aberto!"); } });
  const updateStatus = trpc.ti.updateTicketStatus.useMutation({ onSuccess: () => { ticketsQ.refetch(); dashboard.refetch(); toast.success("Status atualizado!"); } });
  const createAtivo = trpc.ti.createAtivo.useMutation({ onSuccess: () => { ativosQ.refetch(); dashboard.refetch(); setShowNewAtivo(false); toast.success("Ativo cadastrado!"); } });

  const [ticketForm, setTicketForm] = useState({ titulo: "", descricao: "", categoria: "outro" as const, prioridade: "media" as const });
  const [ativoForm, setAtivoForm] = useState({ tipo: "", marca: "", modelo: "", patrimonio: "", serial: "", setor: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Monitor className="h-6 w-6" />TI & Suporte</h1><p className="text-muted-foreground">Tickets de suporte e gestão de ativos</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Tickets</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.tickets?.total ?? 0}</div></CardContent></Card>
        <Card className="border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Abertos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{dashboard.data?.tickets?.abertos ?? 0}</div></CardContent></Card>
        <Card className="border-yellow-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">Em Andamento</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{dashboard.data?.tickets?.emAndamento ?? 0}</div></CardContent></Card>
        <Card className="border-green-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">Resolvidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{dashboard.data?.tickets?.resolvidos ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ativos TI</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.ativos?.total ?? 0}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="tickets"><Headphones className="h-4 w-4 mr-1" />Tickets</TabsTrigger><TabsTrigger value="ativos"><Wrench className="h-4 w-4 mr-1" />Ativos</TabsTrigger></TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="resolvido">Resolvido</SelectItem></SelectContent></Select>
            <Dialog open={showNew} onOpenChange={setShowNew}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Ticket</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Novo Ticket</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createTicket.mutate(ticketForm); }} className="space-y-3">
                  <div><Label>Título *</Label><Input value={ticketForm.titulo} onChange={e => setTicketForm(p => ({ ...p, titulo: e.target.value }))} required /></div>
                  <div><Label>Descrição *</Label><Textarea value={ticketForm.descricao} onChange={e => setTicketForm(p => ({ ...p, descricao: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Categoria</Label><Select value={ticketForm.categoria} onValueChange={v => setTicketForm(p => ({ ...p, categoria: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hardware">Hardware</SelectItem><SelectItem value="software">Software</SelectItem><SelectItem value="rede">Rede</SelectItem><SelectItem value="acesso">Acesso</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="impressora">Impressora</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
                    <div><Label>Prioridade</Label><Select value={ticketForm.prioridade} onValueChange={v => setTicketForm(p => ({ ...p, prioridade: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="critica">Crítica</SelectItem></SelectContent></Select></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createTicket.isPending}>Abrir Ticket</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Protocolo</TableHead><TableHead>Título</TableHead><TableHead>Categoria</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{ticketsQ.data?.map(t => (<TableRow key={t.id}><TableCell className="font-mono text-sm">{t.protocolo}</TableCell><TableCell className="font-medium">{t.titulo}</TableCell><TableCell><Badge variant="outline">{t.categoria}</Badge></TableCell><TableCell><Badge className={PRIORIDADE_COLORS[t.prioridade] || ""}>{t.prioridade}</Badge></TableCell><TableCell><Badge className={STATUS_COLORS[t.status] || ""}>{t.status.replace("_", " ")}</Badge></TableCell><TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell><Select value={t.status} onValueChange={v => updateStatus.mutate({ id: t.id, status: v as any })}><SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="aguardando">Aguardando</SelectItem><SelectItem value="resolvido">Resolvido</SelectItem><SelectItem value="fechado">Fechado</SelectItem></SelectContent></Select></TableCell></TableRow>))}</TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="ativos" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar ativos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Dialog open={showNewAtivo} onOpenChange={setShowNewAtivo}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Ativo</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Cadastrar Ativo</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createAtivo.mutate(ativoForm); }} className="space-y-3">
                  <div><Label>Tipo *</Label><Input value={ativoForm.tipo} onChange={e => setAtivoForm(p => ({ ...p, tipo: e.target.value }))} placeholder="Notebook, Desktop, Impressora..." required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Marca</Label><Input value={ativoForm.marca} onChange={e => setAtivoForm(p => ({ ...p, marca: e.target.value }))} /></div>
                    <div><Label>Modelo</Label><Input value={ativoForm.modelo} onChange={e => setAtivoForm(p => ({ ...p, modelo: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Patrimônio</Label><Input value={ativoForm.patrimonio} onChange={e => setAtivoForm(p => ({ ...p, patrimonio: e.target.value }))} /></div>
                    <div><Label>Serial</Label><Input value={ativoForm.serial} onChange={e => setAtivoForm(p => ({ ...p, serial: e.target.value }))} /></div>
                  </div>
                  <div><Label>Setor</Label><Input value={ativoForm.setor} onChange={e => setAtivoForm(p => ({ ...p, setor: e.target.value }))} /></div>
                  <Button type="submit" className="w-full" disabled={createAtivo.isPending}>Cadastrar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Patrimônio</TableHead><TableHead>Tipo</TableHead><TableHead>Marca/Modelo</TableHead><TableHead>Serial</TableHead><TableHead>Setor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>{ativosQ.data?.map(a => (<TableRow key={a.id}><TableCell className="font-mono">{a.patrimonio || "—"}</TableCell><TableCell className="font-medium">{a.tipo}</TableCell><TableCell>{[a.marca, a.modelo].filter(Boolean).join(" ") || "—"}</TableCell><TableCell className="text-xs">{a.serial || "—"}</TableCell><TableCell>{a.setor || "—"}</TableCell><TableCell><Badge className={a.status === "ativo" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{a.status}</Badge></TableCell></TableRow>))}</TableBody>
          </Table></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
