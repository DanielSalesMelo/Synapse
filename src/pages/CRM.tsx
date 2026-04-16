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
import { Plus, Users, Target, TrendingUp, Search, GripVertical, HeartHandshake, FileText, Star, Phone, Mail, Building2, ArrowUpRight, DollarSign, BarChart3, CheckCircle2, Clock, Award } from "lucide-react";
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" />CRM & Vendas</h1>
          <p className="text-muted-foreground text-sm">Clientes · Leads · Funil de Vendas · Propostas · Pós-Venda</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Clientes", value: dashboard.data?.clientes?.total ?? 0, icon: Users, color: "text-blue-600 bg-blue-50", sub: null },
          { label: "Leads Ativos", value: dashboard.data?.leads?.total ?? 0, icon: Target, color: "text-purple-600 bg-purple-50", sub: `${dashboard.data?.leads?.novos ?? 0} novos` },
          { label: "Leads Ganhos", value: dashboard.data?.leads?.ganhos ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50", sub: null },
          { label: "Negociações", value: dashboard.data?.negociacoes?.total ?? 0, icon: BarChart3, color: "text-orange-600 bg-orange-50", sub: null },
          { label: "Taxa de Conversão", value: `${dashboard.data?.leads?.total ? Math.round(((dashboard.data?.leads?.ganhos ?? 0) / dashboard.data.leads.total) * 100) : 0}%`, icon: TrendingUp, color: "text-cyan-600 bg-cyan-50", sub: null },
          { label: "Ticket Médio", value: `R$ ${(dashboard.data?.negociacoes?.valorTotal ?? 0) > 0 ? ((dashboard.data?.negociacoes?.valorTotal ?? 0) / (dashboard.data?.negociacoes?.total ?? 1)).toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "0"}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50", sub: null },
        ].map((kpi, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium leading-snug">{kpi.label}</p>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" />{kpi.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="clientes"><Users className="h-3.5 w-3.5 mr-1" />Clientes</TabsTrigger>
          <TabsTrigger value="leads"><Target className="h-3.5 w-3.5 mr-1" />Leads</TabsTrigger>
          <TabsTrigger value="funil"><BarChart3 className="h-3.5 w-3.5 mr-1" />Funil de Vendas</TabsTrigger>
          <TabsTrigger value="propostas"><FileText className="h-3.5 w-3.5 mr-1" />Propostas</TabsTrigger>
          <TabsTrigger value="posVenda"><HeartHandshake className="h-3.5 w-3.5 mr-1" />Pós-Venda</TabsTrigger>
        </TabsList>

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

        {/* ── PROPOSTAS ── */}
        <TabsContent value="propostas" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Propostas comerciais com aceite digital e controle de validade.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Proposta</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 1, titulo: "Contrato de Frete Mensal", cliente: "Transportes ABC", valor: 45000, status: "aguardando", validade: "2025-04-30", criada: "2025-04-10" },
              { id: 2, titulo: "Serviços Logísticos Q2", cliente: "Distribuidora Sul", valor: 128000, status: "aceita", validade: "2025-05-15", criada: "2025-04-05" },
              { id: 3, titulo: "Transporte Refrigerado", cliente: "Frigorífico Norte", valor: 32000, status: "recusada", validade: "2025-04-20", criada: "2025-04-01" },
              { id: 4, titulo: "Frota Dedicada Anual", cliente: "Indústria XYZ", valor: 520000, status: "em_revisao", validade: "2025-05-30", criada: "2025-04-12" },
            ].map(p => {
              const statusColors: Record<string, string> = {
                aguardando: "bg-yellow-100 text-yellow-700",
                aceita: "bg-green-100 text-green-700",
                recusada: "bg-red-100 text-red-700",
                em_revisao: "bg-blue-100 text-blue-700",
              };
              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{p.titulo}</CardTitle>
                      <Badge className={`text-xs ${statusColors[p.status]}`}>{p.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{p.cliente}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">{p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                    <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                      <span>Criada: {new Date(p.criada).toLocaleDateString("pt-BR")}</span>
                      <span>Validade: {new Date(p.validade).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1 h-7 text-xs"><FileText className="h-3 w-3 mr-1" />Ver PDF</Button>
                      {p.status === "aguardando" && <Button size="sm" className="flex-1 h-7 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Aceite Digital</Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── PÓS-VENDA ── */}
        <TabsContent value="posVenda" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Acompanhamento de satisfação e fidelização de clientes.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Follow-up</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" />NPS — Net Promoter Score</CardTitle></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">72</div>
                <p className="text-sm text-muted-foreground mt-1">Zona de Excelência (≥ 70)</p>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 text-center p-2 rounded-lg bg-green-50">
                    <p className="text-lg font-bold text-green-600">68%</p>
                    <p className="text-xs text-muted-foreground">Promotores</p>
                  </div>
                  <div className="flex-1 text-center p-2 rounded-lg bg-yellow-50">
                    <p className="text-lg font-bold text-yellow-600">18%</p>
                    <p className="text-xs text-muted-foreground">Neutros</p>
                  </div>
                  <div className="flex-1 text-center p-2 rounded-lg bg-red-50">
                    <p className="text-lg font-bold text-red-600">14%</p>
                    <p className="text-xs text-muted-foreground">Detratores</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Follow-ups Pendentes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { cliente: "Transportes ABC", tipo: "Ligança", data: "Hoje 14:00", prioridade: "alta" },
                  { cliente: "Distribuidora Sul", tipo: "E-mail", data: "Amanhã 09:00", prioridade: "normal" },
                  { cliente: "Indústria XYZ", tipo: "Reunião", data: "20/04 10:00", prioridade: "alta" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{f.cliente}</p>
                      <p className="text-xs text-muted-foreground">{f.tipo} — {f.data}</p>
                    </div>
                    <Badge className={`text-xs ${f.prioridade === "alta" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{f.prioridade}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
