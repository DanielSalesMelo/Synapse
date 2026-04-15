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
import { Plus, Headphones, Shield, AlertTriangle, Search, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_SAC_COLORS: Record<string, string> = {
  aberto: "bg-red-100 text-red-700", em_andamento: "bg-yellow-100 text-yellow-700",
  aguardando_cliente: "bg-blue-100 text-blue-700", resolvido: "bg-green-100 text-green-700",
  fechado: "bg-gray-100 text-gray-700",
};
const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700", media: "bg-blue-100 text-blue-700",
  alta: "bg-orange-100 text-orange-700", urgente: "bg-red-100 text-red-700",
};
const STATUS_LICENCA_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700", em_analise: "bg-blue-100 text-blue-700",
  aprovada: "bg-green-100 text-green-700", vencida: "bg-red-100 text-red-700",
  rejeitada: "bg-red-100 text-red-700",
};

export default function Logistica() {
  const [tab, setTab] = useState("sac");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showNewChamado, setShowNewChamado] = useState(false);
  const [showNewLicenca, setShowNewLicenca] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<number | null>(null);
  const [interacaoText, setInteracaoText] = useState("");

  const dashboard = trpc.logistica.dashboardSac.useQuery();
  const chamadosQ = trpc.logistica.listChamados.useQuery({ search, status: statusFilter === "todos" ? undefined : statusFilter });
  const licencasQ = trpc.logistica.listLicencas.useQuery({ status: statusFilter === "todos" ? undefined : statusFilter });
  const chamadoDetalhes = trpc.logistica.getChamado.useQuery({ id: selectedChamado! }, { enabled: !!selectedChamado });

  const createChamado = trpc.logistica.createChamado.useMutation({ onSuccess: () => { chamadosQ.refetch(); dashboard.refetch(); setShowNewChamado(false); toast.success("Chamado aberto!"); } });
  const createLicenca = trpc.logistica.createLicenca.useMutation({ onSuccess: () => { licencasQ.refetch(); dashboard.refetch(); setShowNewLicenca(false); toast.success("Licença cadastrada!"); } });
  const addInteracao = trpc.logistica.addInteracao.useMutation({ onSuccess: () => { chamadoDetalhes.refetch(); setInteracaoText(""); toast.success("Interação adicionada!"); } });
  const updateStatus = trpc.logistica.updateStatusChamado.useMutation({ onSuccess: () => { chamadosQ.refetch(); chamadoDetalhes.refetch(); dashboard.refetch(); toast.success("Status atualizado!"); } });

  const [chamadoForm, setChamadoForm] = useState({ clienteNome: "", clienteEmail: "", clienteTelefone: "", assunto: "", descricao: "", prioridade: "media" as const });
  const [licencaForm, setLicencaForm] = useState({ tipo: "", numero: "", orgaoEmissor: "", descricao: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Headphones className="h-6 w-6" />Logística</h1><p className="text-muted-foreground">SAC, Licenças Regulatórias (ANVISA, VISA)</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total SAC</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.sac?.total ?? 0}</div></CardContent></Card>
        <Card className="border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Abertos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{dashboard.data?.sac?.abertos ?? 0}</div></CardContent></Card>
        <Card className="border-yellow-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">Urgentes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{dashboard.data?.sac?.urgentes ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Licenças</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.licencas?.total ?? 0}</div></CardContent></Card>
        <Card className="border-orange-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Próx. Vencer</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{dashboard.data?.licencas?.proxVencer ?? 0}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="sac"><Headphones className="h-4 w-4 mr-1" />SAC</TabsTrigger><TabsTrigger value="licencas"><Shield className="h-4 w-4 mr-1" />Licenças</TabsTrigger></TabsList>

        <TabsContent value="sac" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar chamados..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="resolvido">Resolvido</SelectItem></SelectContent></Select>
            <Dialog open={showNewChamado} onOpenChange={setShowNewChamado}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Chamado</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Abrir Chamado SAC</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createChamado.mutate(chamadoForm); }} className="space-y-3">
                  <div><Label>Cliente *</Label><Input value={chamadoForm.clienteNome} onChange={e => setChamadoForm(p => ({ ...p, clienteNome: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Email</Label><Input value={chamadoForm.clienteEmail} onChange={e => setChamadoForm(p => ({ ...p, clienteEmail: e.target.value }))} /></div>
                    <div><Label>Telefone</Label><Input value={chamadoForm.clienteTelefone} onChange={e => setChamadoForm(p => ({ ...p, clienteTelefone: e.target.value }))} /></div>
                  </div>
                  <div><Label>Assunto *</Label><Input value={chamadoForm.assunto} onChange={e => setChamadoForm(p => ({ ...p, assunto: e.target.value }))} required /></div>
                  <div><Label>Descrição *</Label><Textarea value={chamadoForm.descricao} onChange={e => setChamadoForm(p => ({ ...p, descricao: e.target.value }))} required /></div>
                  <div><Label>Prioridade</Label><Select value={chamadoForm.prioridade} onValueChange={v => setChamadoForm(p => ({ ...p, prioridade: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
                  <Button type="submit" className="w-full" disabled={createChamado.isPending}>Abrir Chamado</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card><Table><TableHeader><TableRow><TableHead>Protocolo</TableHead><TableHead>Cliente</TableHead><TableHead>Assunto</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                <TableBody>{chamadosQ.data?.map(c => (
                  <TableRow key={c.id} className={selectedChamado === c.id ? "bg-muted/50" : "cursor-pointer hover:bg-muted/30"} onClick={() => setSelectedChamado(c.id)}>
                    <TableCell className="font-mono text-sm">{c.protocolo}</TableCell>
                    <TableCell className="font-medium">{c.clienteNome}</TableCell>
                    <TableCell>{c.assunto}</TableCell>
                    <TableCell><Badge className={PRIORIDADE_COLORS[c.prioridade] || ""}>{c.prioridade}</Badge></TableCell>
                    <TableCell><Badge className={STATUS_SAC_COLORS[c.status] || ""}>{c.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></Card>
            </div>

            {/* Painel de detalhes do chamado */}
            <div>
              {selectedChamado && chamadoDetalhes.data ? (
                <Card><CardHeader><CardTitle className="text-sm flex items-center justify-between">{chamadoDetalhes.data.protocolo}
                  <Select value={chamadoDetalhes.data.status} onValueChange={v => updateStatus.mutate({ id: selectedChamado, status: v as any })}><SelectTrigger className="w-32 h-7"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="aguardando_cliente">Aguardando</SelectItem><SelectItem value="resolvido">Resolvido</SelectItem><SelectItem value="fechado">Fechado</SelectItem></SelectContent></Select>
                </CardTitle></CardHeader><CardContent className="space-y-3">
                  <p className="text-sm">{chamadoDetalhes.data.descricao}</p>
                  <div className="border-t pt-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {chamadoDetalhes.data.interacoes?.map((i: any) => (
                      <div key={i.id} className="bg-muted/50 rounded p-2"><p className="text-sm">{i.conteudo}</p><p className="text-xs text-muted-foreground mt-1">{new Date(i.createdAt).toLocaleString("pt-BR")}</p></div>
                    ))}
                  </div>
                  <form onSubmit={e => { e.preventDefault(); addInteracao.mutate({ chamadoId: selectedChamado, conteudo: interacaoText }); }} className="flex gap-2">
                    <Input value={interacaoText} onChange={e => setInteracaoText(e.target.value)} placeholder="Adicionar interação..." />
                    <Button size="sm" type="submit" disabled={!interacaoText || addInteracao.isPending}><MessageSquare className="h-4 w-4" /></Button>
                  </form>
                </CardContent></Card>
              ) : (
                <Card className="flex items-center justify-center h-64"><p className="text-muted-foreground text-sm">Selecione um chamado</p></Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="licencas" className="space-y-4">
          <div className="flex gap-2">
            <Dialog open={showNewLicenca} onOpenChange={setShowNewLicenca}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Licença</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Cadastrar Licença</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createLicenca.mutate(licencaForm); }} className="space-y-3">
                  <div><Label>Tipo *</Label><Input value={licencaForm.tipo} onChange={e => setLicencaForm(p => ({ ...p, tipo: e.target.value }))} placeholder="ANVISA, VISA, IBAMA..." required /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Número</Label><Input value={licencaForm.numero} onChange={e => setLicencaForm(p => ({ ...p, numero: e.target.value }))} /></div>
                    <div><Label>Órgão Emissor</Label><Input value={licencaForm.orgaoEmissor} onChange={e => setLicencaForm(p => ({ ...p, orgaoEmissor: e.target.value }))} /></div>
                  </div>
                  <div><Label>Descrição</Label><Textarea value={licencaForm.descricao} onChange={e => setLicencaForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                  <Button type="submit" className="w-full" disabled={createLicenca.isPending}>Cadastrar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Número</TableHead><TableHead>Órgão</TableHead><TableHead>Status</TableHead><TableHead>Vencimento</TableHead></TableRow></TableHeader>
            <TableBody>{licencasQ.data?.map(l => (
              <TableRow key={l.id}><TableCell className="font-medium">{l.tipo}</TableCell><TableCell>{l.numero || "—"}</TableCell><TableCell>{l.orgaoEmissor || "—"}</TableCell><TableCell><Badge className={STATUS_LICENCA_COLORS[l.status] || ""}>{l.status}</Badge></TableCell><TableCell className="text-sm">{l.dataVencimento ? new Date(l.dataVencimento).toLocaleDateString("pt-BR") : "—"}</TableCell></TableRow>
            ))}</TableBody>
          </Table></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
