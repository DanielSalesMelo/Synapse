import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Plus, UserCheck, Users, DoorOpen, DoorClosed, Search, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-700", em_atendimento: "bg-yellow-100 text-yellow-700",
  finalizado: "bg-green-100 text-green-700", cancelado: "bg-red-100 text-red-700",
};

export default function Recepcionista() {
  const [tab, setTab] = useState("visitas");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showNewVisitante, setShowNewVisitante] = useState(false);
  const [showNewVisita, setShowNewVisita] = useState(false);

  const dashboard = trpc.recepcionista.dashboard.useQuery();
  const visitantesQ = trpc.recepcionista.listVisitantes.useQuery({ search });
  const visitasQ = trpc.recepcionista.listVisitas.useQuery({ status: statusFilter === "todos" ? undefined : statusFilter, search });

  const createVisitante = trpc.recepcionista.createVisitante.useMutation({ onSuccess: () => { visitantesQ.refetch(); setShowNewVisitante(false); toast.success("Visitante cadastrado!"); } });
  const createVisita = trpc.recepcionista.createVisita.useMutation({ onSuccess: () => { visitasQ.refetch(); dashboard.refetch(); setShowNewVisita(false); toast.success("Visita agendada!"); } });
  const registrarEntrada = trpc.recepcionista.registrarEntrada.useMutation({ onSuccess: () => { visitasQ.refetch(); dashboard.refetch(); toast.success("Entrada registrada!"); } });
  const registrarSaida = trpc.recepcionista.registrarSaida.useMutation({ onSuccess: () => { visitasQ.refetch(); dashboard.refetch(); toast.success("Saída registrada!"); } });

  const [visitanteForm, setVisitanteForm] = useState({ nome: "", documento: "", telefone: "", email: "", empresa: "" });
  const [visitaForm, setVisitaForm] = useState({ visitanteId: 0, motivo: "", setor: "", pessoaContato: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="h-6 w-6" />Recepcionista</h1><p className="text-muted-foreground">Controle de visitantes e visitas</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Visitantes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.totalVisitantes ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CalendarCheck className="h-4 w-4" />Visitas Hoje</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.visitasHoje ?? 0}</div></CardContent></Card>
        <Card className="border-yellow-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">Em Atendimento</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{dashboard.data?.emAtendimento ?? 0}</div></CardContent></Card>
        <Card className="border-blue-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">Agendados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{dashboard.data?.agendados ?? 0}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="visitas">Visitas</TabsTrigger><TabsTrigger value="visitantes">Visitantes</TabsTrigger></TabsList>

        <TabsContent value="visitas" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="agendado">Agendado</SelectItem><SelectItem value="em_atendimento">Em Atendimento</SelectItem><SelectItem value="finalizado">Finalizado</SelectItem></SelectContent></Select>
            <Dialog open={showNewVisita} onOpenChange={setShowNewVisita}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Visita</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Agendar Visita</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createVisita.mutate(visitaForm); }} className="space-y-3">
                  <div><Label>Visitante *</Label><Select value={visitaForm.visitanteId.toString()} onValueChange={v => setVisitaForm(p => ({ ...p, visitanteId: Number(v) }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{visitantesQ.data?.map(v => (<SelectItem key={v.id} value={v.id.toString()}>{v.nome} {v.documento ? `(${v.documento})` : ""}</SelectItem>))}</SelectContent></Select></div>
                  <div><Label>Motivo *</Label><Input value={visitaForm.motivo} onChange={e => setVisitaForm(p => ({ ...p, motivo: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Setor</Label><Input value={visitaForm.setor} onChange={e => setVisitaForm(p => ({ ...p, setor: e.target.value }))} /></div>
                    <div><Label>Pessoa de Contato</Label><Input value={visitaForm.pessoaContato} onChange={e => setVisitaForm(p => ({ ...p, pessoaContato: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createVisita.isPending}>Agendar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Visitante</TableHead><TableHead>Motivo</TableHead><TableHead>Setor</TableHead><TableHead>Contato</TableHead><TableHead>Status</TableHead><TableHead>Crachá</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{visitasQ.data?.map((v: any) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.visitante?.nome || `#${v.visitanteId}`}</TableCell>
                <TableCell>{v.motivo}</TableCell>
                <TableCell>{v.setor || "—"}</TableCell>
                <TableCell>{v.pessoaContato || "—"}</TableCell>
                <TableCell><Badge className={STATUS_COLORS[v.status] || ""}>{v.status.replace("_", " ")}</Badge></TableCell>
                <TableCell>{v.cracha || "—"}</TableCell>
                <TableCell className="space-x-1">
                  {v.status === "agendado" && <Button size="sm" className="bg-green-600" onClick={() => registrarEntrada.mutate({ id: v.id })}><DoorOpen className="h-3 w-3 mr-1" />Entrada</Button>}
                  {v.status === "em_atendimento" && <Button size="sm" className="bg-red-600" onClick={() => registrarSaida.mutate({ id: v.id })}><DoorClosed className="h-3 w-3 mr-1" />Saída</Button>}
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="visitantes" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar visitantes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Dialog open={showNewVisitante} onOpenChange={setShowNewVisitante}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Visitante</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Cadastrar Visitante</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createVisitante.mutate(visitanteForm); }} className="space-y-3">
                  <div><Label>Nome *</Label><Input value={visitanteForm.nome} onChange={e => setVisitanteForm(p => ({ ...p, nome: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Documento</Label><Input value={visitanteForm.documento} onChange={e => setVisitanteForm(p => ({ ...p, documento: e.target.value }))} placeholder="CPF/RG" /></div>
                    <div><Label>Telefone</Label><Input value={visitanteForm.telefone} onChange={e => setVisitanteForm(p => ({ ...p, telefone: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Email</Label><Input value={visitanteForm.email} onChange={e => setVisitanteForm(p => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Empresa</Label><Input value={visitanteForm.empresa} onChange={e => setVisitanteForm(p => ({ ...p, empresa: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createVisitante.isPending}>Cadastrar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Documento</TableHead><TableHead>Telefone</TableHead><TableHead>Email</TableHead><TableHead>Empresa</TableHead></TableRow></TableHeader>
            <TableBody>{visitantesQ.data?.map(v => (<TableRow key={v.id}><TableCell className="font-medium">{v.nome}</TableCell><TableCell>{v.documento || "—"}</TableCell><TableCell>{v.telefone || "—"}</TableCell><TableCell>{v.email || "—"}</TableCell><TableCell>{v.empresa || "—"}</TableCell></TableRow>))}</TableBody>
          </Table></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
