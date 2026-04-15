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
import { Plus, Users, Target, TrendingUp, Search, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_LEAD_COLORS: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700", qualificado: "bg-purple-100 text-purple-700",
  em_negociacao: "bg-yellow-100 text-yellow-700", proposta_enviada: "bg-orange-100 text-orange-700",
  ganho: "bg-green-100 text-green-700", perdido: "bg-red-100 text-red-700",
};

export default function CRM() {
  const [tab, setTab] = useState("clientes");
  const [search, setSearch] = useState("");
  const [showNewCliente, setShowNewCliente] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const [showNewFunil, setShowNewFunil] = useState(false);
  const [selectedFunil, setSelectedFunil] = useState<number | null>(null);
  const [showNewNeg, setShowNewNeg] = useState(false);
  const [newNegEtapa, setNewNegEtapa] = useState<number | null>(null);

  const dashboard = trpc.crm.dashboard.useQuery();
  const clientesQ = trpc.crm.listClientes.useQuery({ search });
  const leadsQ = trpc.crm.listLeads.useQuery({ search });
  const funisQ = trpc.crm.listFunis.useQuery();
  const funilCompleto = trpc.crm.getFunilCompleto.useQuery({ funilId: selectedFunil! }, { enabled: !!selectedFunil });

  const createCliente = trpc.crm.createCliente.useMutation({ onSuccess: () => { clientesQ.refetch(); dashboard.refetch(); setShowNewCliente(false); toast.success("Cliente criado!"); } });
  const createLead = trpc.crm.createLead.useMutation({ onSuccess: () => { leadsQ.refetch(); dashboard.refetch(); setShowNewLead(false); toast.success("Lead criado!"); } });
  const createFunil = trpc.crm.createFunil.useMutation({ onSuccess: (f) => { funisQ.refetch(); setSelectedFunil(f.id); setShowNewFunil(false); toast.success("Funil criado!"); } });
  const createNeg = trpc.crm.createNegociacao.useMutation({ onSuccess: () => { funilCompleto.refetch(); setShowNewNeg(false); toast.success("Negociação criada!"); } });
  const moveNeg = trpc.crm.moveNegociacao.useMutation({ onSuccess: () => { funilCompleto.refetch(); } });

  const [clienteForm, setClienteForm] = useState({ nome: "", cnpjCpf: "", email: "", telefone: "", segmento: "" });
  const [leadForm, setLeadForm] = useState({ nome: "", email: "", telefone: "", empresa: "", origem: "", valorEstimado: "" });
  const [funilForm, setFunilForm] = useState({ nome: "", descricao: "" });
  const [negForm, setNegForm] = useState({ titulo: "", valor: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Gestão de Relacionamento com Clientes</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.clientes?.total ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.leads?.total ?? 0}</div><p className="text-xs text-green-600">{dashboard.data?.leads?.novos ?? 0} novos</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Leads Ganhos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{dashboard.data?.leads?.ganhos ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Negociações</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.negociacoes?.total ?? 0}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="clientes">Clientes</TabsTrigger><TabsTrigger value="leads">Leads</TabsTrigger><TabsTrigger value="funil">Funil de Vendas</TabsTrigger></TabsList>

        {/* CLIENTES */}
        <TabsContent value="clientes" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Dialog open={showNewCliente} onOpenChange={setShowNewCliente}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createCliente.mutate(clienteForm); }} className="space-y-3">
                  <div><Label>Nome *</Label><Input value={clienteForm.nome} onChange={e => setClienteForm(p => ({ ...p, nome: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>CNPJ/CPF</Label><Input value={clienteForm.cnpjCpf} onChange={e => setClienteForm(p => ({ ...p, cnpjCpf: e.target.value }))} /></div>
                    <div><Label>Segmento</Label><Input value={clienteForm.segmento} onChange={e => setClienteForm(p => ({ ...p, segmento: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Email</Label><Input value={clienteForm.email} onChange={e => setClienteForm(p => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Telefone</Label><Input value={clienteForm.telefone} onChange={e => setClienteForm(p => ({ ...p, telefone: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createCliente.isPending}>Salvar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ/CPF</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Segmento</TableHead></TableRow></TableHeader>
            <TableBody>{clientesQ.data?.map(c => (<TableRow key={c.id}><TableCell className="font-medium">{c.nome}</TableCell><TableCell>{c.cnpjCpf || "—"}</TableCell><TableCell>{c.email || "—"}</TableCell><TableCell>{c.telefone || "—"}</TableCell><TableCell>{c.segmento || "—"}</TableCell></TableRow>))}</TableBody>
          </Table></Card>
        </TabsContent>

        {/* LEADS */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Dialog open={showNewLead} onOpenChange={setShowNewLead}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Lead</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createLead.mutate(leadForm); }} className="space-y-3">
                  <div><Label>Nome *</Label><Input value={leadForm.nome} onChange={e => setLeadForm(p => ({ ...p, nome: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Email</Label><Input value={leadForm.email} onChange={e => setLeadForm(p => ({ ...p, email: e.target.value }))} /></div>
                    <div><Label>Telefone</Label><Input value={leadForm.telefone} onChange={e => setLeadForm(p => ({ ...p, telefone: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Empresa</Label><Input value={leadForm.empresa} onChange={e => setLeadForm(p => ({ ...p, empresa: e.target.value }))} /></div>
                    <div><Label>Valor Estimado</Label><Input value={leadForm.valorEstimado} onChange={e => setLeadForm(p => ({ ...p, valorEstimado: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createLead.isPending}>Salvar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Empresa</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Valor Est.</TableHead></TableRow></TableHeader>
            <TableBody>{leadsQ.data?.map(l => (<TableRow key={l.id}><TableCell className="font-medium">{l.nome}</TableCell><TableCell>{l.empresa || "—"}</TableCell><TableCell>{l.email || "—"}</TableCell><TableCell><Badge className={STATUS_LEAD_COLORS[l.status] || ""}>{l.status}</Badge></TableCell><TableCell>{l.valorEstimado || "—"}</TableCell></TableRow>))}</TableBody>
          </Table></Card>
        </TabsContent>

        {/* FUNIL DE VENDAS (Kanban) */}
        <TabsContent value="funil" className="space-y-4">
          <div className="flex gap-2 items-center">
            <Select value={selectedFunil?.toString() || ""} onValueChange={v => setSelectedFunil(Number(v))}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Selecione um funil" /></SelectTrigger>
              <SelectContent>{funisQ.data?.map(f => (<SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>))}</SelectContent>
            </Select>
            <Dialog open={showNewFunil} onOpenChange={setShowNewFunil}><DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" />Novo Funil</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Novo Funil</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createFunil.mutate(funilForm); }} className="space-y-3">
                  <div><Label>Nome *</Label><Input value={funilForm.nome} onChange={e => setFunilForm(p => ({ ...p, nome: e.target.value }))} required /></div>
                  <Button type="submit" className="w-full">Criar Funil</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {selectedFunil && funilCompleto.data && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {funilCompleto.data.etapas.map(etapa => {
                const negs = funilCompleto.data!.negociacoes.filter(n => n.etapaId === etapa.id);
                return (
                  <div key={etapa.id} className="min-w-[280px] bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.cor || "#3b82f6" }} />
                        <h3 className="font-semibold text-sm">{etapa.nome}</h3>
                        <Badge variant="secondary" className="text-xs">{negs.length}</Badge>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setNewNegEtapa(etapa.id); setShowNewNeg(true); }}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <div className="space-y-2">
                      {negs.map(neg => (
                        <Card key={neg.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <p className="font-medium text-sm">{neg.titulo}</p>
                            {neg.valor && neg.valor !== "0" && <p className="text-xs text-green-600 font-semibold mt-1">R$ {neg.valor}</p>}
                            {neg.probabilidade && <div className="mt-2"><div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${neg.probabilidade}%` }} /></div><p className="text-xs text-muted-foreground mt-0.5">{neg.probabilidade}%</p></div>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Dialog open={showNewNeg} onOpenChange={setShowNewNeg}>
            <DialogContent><DialogHeader><DialogTitle>Nova Negociação</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); if (selectedFunil && newNegEtapa) createNeg.mutate({ funilId: selectedFunil, etapaId: newNegEtapa, ...negForm }); }} className="space-y-3">
                <div><Label>Título *</Label><Input value={negForm.titulo} onChange={e => setNegForm(p => ({ ...p, titulo: e.target.value }))} required /></div>
                <div><Label>Valor</Label><Input value={negForm.valor} onChange={e => setNegForm(p => ({ ...p, valor: e.target.value }))} placeholder="0.00" /></div>
                <Button type="submit" className="w-full" disabled={createNeg.isPending}>Criar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
