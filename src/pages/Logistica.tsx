import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Headphones, Package, Plus, Route, Shield, Truck } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: unknown) {
  const value = Number(v ?? 0);
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_VIAGEM: Record<string, string> = {
  planejada: "bg-blue-100 text-blue-700",
  em_andamento: "bg-yellow-100 text-yellow-700",
  concluida: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
};

const STATUS_CARREGAMENTO: Record<string, string> = {
  montando: "bg-gray-100 text-gray-700",
  pronto: "bg-blue-100 text-blue-700",
  em_rota: "bg-yellow-100 text-yellow-700",
  retornado: "bg-orange-100 text-orange-700",
  encerrado: "bg-green-100 text-green-700",
};

const STATUS_SAC: Record<string, string> = {
  aberto: "bg-red-100 text-red-700",
  em_andamento: "bg-yellow-100 text-yellow-700",
  aguardando_cliente: "bg-blue-100 text-blue-700",
  resolvido: "bg-green-100 text-green-700",
  fechado: "bg-gray-100 text-gray-700",
};

export default function Logistica() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [tab, setTab] = useState("dashboard");
  const [showNovaViagem, setShowNovaViagem] = useState(false);
  const [showNovoCarregamento, setShowNovoCarregamento] = useState(false);
  const [showNovoChamado, setShowNovoChamado] = useState(false);
  const [showNovaLicenca, setShowNovaLicenca] = useState(false);

  const [viagemForm, setViagemForm] = useState({
    veiculoId: "",
    motoristaId: "",
    tipo: "viagem",
    origem: "",
    destino: "",
    dataSaida: "",
    freteTotal: "",
    descricaoCarga: "",
  });
  const [carregamentoForm, setCarregamentoForm] = useState({
    data: new Date().toISOString().split("T")[0],
    veiculoId: "",
    motoristaId: "",
    rotaDescricao: "",
    observacoes: "",
  });
  const [chamadoForm, setChamadoForm] = useState({
    clienteNome: "",
    clienteEmail: "",
    clienteTelefone: "",
    assunto: "",
    descricao: "",
    prioridade: "media",
  });
  const [licencaForm, setLicencaForm] = useState({
    tipo: "",
    numero: "",
    orgaoEmissor: "",
    descricao: "",
  });

  const viagensQ = trpc.viagens.list.useQuery({ empresaId: EMPRESA_ID, limit: 50 }, { enabled: !!EMPRESA_ID }) as any;
  const resumoViagensQ = trpc.viagens.resumoFinanceiro.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const carregamentosQ = trpc.carregamentos.list.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const veiculosQ = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const motoristasQ = trpc.funcionarios.listMotoristas.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const dashboardSacQ = trpc.logistica.dashboardSac.useQuery() as any;
  const chamadosQ = trpc.logistica.listChamados.useQuery({}) as any;
  const licencasQ = trpc.logistica.listLicencas.useQuery({}) as any;

  const utils = trpc.useContext();
  const createViagem = trpc.viagens.create.useMutation({
    onSuccess: () => {
      toast.success("Viagem criada.");
      setShowNovaViagem(false);
      utils.viagens.list.invalidate();
      utils.viagens.resumoFinanceiro.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateViagemStatus = trpc.viagens.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status da viagem atualizado.");
      utils.viagens.list.invalidate();
      utils.viagens.resumoFinanceiro.invalidate();
    },
  });
  const createCarregamento = trpc.carregamentos.create.useMutation({
    onSuccess: () => {
      toast.success("Carregamento criado.");
      setShowNovoCarregamento(false);
      utils.carregamentos.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const marcarCarregamentoPronto = trpc.carregamentos.marcarPronto.useMutation({
    onSuccess: () => utils.carregamentos.list.invalidate(),
  });
  const registrarSaida = trpc.carregamentos.registrarSaida.useMutation({
    onSuccess: () => utils.carregamentos.list.invalidate(),
  });
  const registrarRetorno = trpc.carregamentos.registrarRetorno.useMutation({
    onSuccess: () => utils.carregamentos.list.invalidate(),
  });
  const encerrarCarregamento = trpc.carregamentos.encerrar.useMutation({
    onSuccess: () => utils.carregamentos.list.invalidate(),
  });
  const createChamado = trpc.logistica.createChamado.useMutation({
    onSuccess: () => {
      toast.success("Chamado SAC criado.");
      setShowNovoChamado(false);
      utils.logistica.listChamados.invalidate();
      utils.logistica.dashboardSac.invalidate();
    },
  });
  const createLicenca = trpc.logistica.createLicenca.useMutation({
    onSuccess: () => {
      toast.success("Licença cadastrada.");
      setShowNovaLicenca(false);
      utils.logistica.listLicencas.invalidate();
      utils.logistica.dashboardSac.invalidate();
    },
  });

  const viagens = viagensQ.data ?? [];
  const carregamentos = carregamentosQ.data ?? [];
  const resumoFinanceiro = resumoViagensQ.data ?? [];
  const kpiViagensAtivas = viagens.filter((v: any) => v.status === "em_andamento").length;
  const kpiCarregamentosAbertos = carregamentos.filter((c: any) => ["montando", "pronto", "em_rota"].includes(c.status)).length;
  const kpiLucro = resumoFinanceiro.reduce((sum: number, row: any) => sum + Number(row.totalSaldo ?? 0), 0);

  const handleCreateViagem = (e: React.FormEvent) => {
    e.preventDefault();
    createViagem.mutate({
      empresaId: EMPRESA_ID,
      veiculoId: Number(viagemForm.veiculoId),
      motoristaId: viagemForm.motoristaId ? Number(viagemForm.motoristaId) : null,
      tipo: viagemForm.tipo as any,
      origem: viagemForm.origem || undefined,
      destino: viagemForm.destino || undefined,
      dataSaida: viagemForm.dataSaida || undefined,
      freteTotal: viagemForm.freteTotal || undefined,
      descricaoCarga: viagemForm.descricaoCarga || undefined,
    });
  };

  const handleCreateCarregamento = (e: React.FormEvent) => {
    e.preventDefault();
    const veiculo = (veiculosQ.data ?? []).find((v: any) => String(v.id) === carregamentoForm.veiculoId);
    const motorista = (motoristasQ.data ?? []).find((m: any) => String(m.id) === carregamentoForm.motoristaId);
    createCarregamento.mutate({
      empresaId: EMPRESA_ID,
      data: carregamentoForm.data,
      veiculoId: carregamentoForm.veiculoId ? Number(carregamentoForm.veiculoId) : undefined,
      veiculoPlaca: veiculo?.placa,
      motoristaId: carregamentoForm.motoristaId ? Number(carregamentoForm.motoristaId) : undefined,
      motoristaNome: motorista?.nome,
      rotaDescricao: carregamentoForm.rotaDescricao || undefined,
      observacoes: carregamentoForm.observacoes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Logística
          </h1>
          <p className="text-muted-foreground text-sm">Viagens, carregamentos, SAC e licenças regulatórias.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Viagens</p><p className="text-2xl font-bold">{viagens.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Em andamento</p><p className="text-2xl font-bold">{kpiViagensAtivas}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Carregamentos abertos</p><p className="text-2xl font-bold">{kpiCarregamentosAbertos}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">SAC aberto</p><p className="text-2xl font-bold">{dashboardSacQ.data?.sac?.abertos ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Licenças</p><p className="text-2xl font-bold">{dashboardSacQ.data?.licencas?.total ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Resultado</p><p className={`text-2xl font-bold ${kpiLucro >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(kpiLucro)}</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="viagens"><Route className="h-4 w-4 mr-1" />Viagens</TabsTrigger>
          <TabsTrigger value="carregamentos"><Package className="h-4 w-4 mr-1" />Carregamentos</TabsTrigger>
          <TabsTrigger value="sac"><Headphones className="h-4 w-4 mr-1" />SAC</TabsTrigger>
          <TabsTrigger value="licencas"><Shield className="h-4 w-4 mr-1" />Licenças</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Resumo financeiro de viagens</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {resumoFinanceiro.map((row: any) => (
                  <div key={row.status} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{row.status.replaceAll("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">{row.quantidade} viagem(ns)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(row.totalFrete)}</p>
                      <p className="text-xs text-muted-foreground">Saldo {formatCurrency(row.totalSaldo)}</p>
                    </div>
                  </div>
                ))}
                {resumoFinanceiro.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma viagem registrada ainda.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Alertas operacionais</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  {dashboardSacQ.data?.licencas?.proxVencer ?? 0} licença(s) próximas do vencimento.
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  {dashboardSacQ.data?.sac?.urgentes ?? 0} chamado(s) urgentes no SAC.
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {viagens.filter((v: any) => v.status === "concluida").length} viagem(ns) concluídas.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="viagens" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Gestão operacional e financeira de viagens.</p>
            <Dialog open={showNovaViagem} onOpenChange={setShowNovaViagem}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Viagem</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Criar viagem</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateViagem} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Veículo *</Label><Select value={viagemForm.veiculoId} onValueChange={(v) => setViagemForm((p) => ({ ...p, veiculoId: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{(veiculosQ.data ?? []).map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Motorista</Label><Select value={viagemForm.motoristaId || "none"} onValueChange={(v) => setViagemForm((p) => ({ ...p, motoristaId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{(motoristasQ.data ?? []).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Tipo</Label><Select value={viagemForm.tipo} onValueChange={(v) => setViagemForm((p) => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viagem">Viagem</SelectItem><SelectItem value="entrega">Entrega</SelectItem></SelectContent></Select></div>
                    <div><Label>Data de saída</Label><Input type="date" value={viagemForm.dataSaida} onChange={(e) => setViagemForm((p) => ({ ...p, dataSaida: e.target.value }))} /></div>
                    <div><Label>Origem</Label><Input value={viagemForm.origem} onChange={(e) => setViagemForm((p) => ({ ...p, origem: e.target.value }))} /></div>
                    <div><Label>Destino</Label><Input value={viagemForm.destino} onChange={(e) => setViagemForm((p) => ({ ...p, destino: e.target.value }))} /></div>
                    <div><Label>Frete total</Label><Input type="number" step="0.01" value={viagemForm.freteTotal} onChange={(e) => setViagemForm((p) => ({ ...p, freteTotal: e.target.value }))} /></div>
                    <div className="col-span-2"><Label>Descrição da carga</Label><Textarea rows={3} value={viagemForm.descricaoCarga} onChange={(e) => setViagemForm((p) => ({ ...p, descricaoCarga: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createViagem.isPending}>Salvar viagem</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Veículo</TableHead><TableHead>Rota</TableHead><TableHead>Motorista</TableHead><TableHead>Frete</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {viagens.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.veiculoPlaca || "—"}</TableCell>
                    <TableCell>{[v.origem, v.destino].filter(Boolean).join(" → ") || "Sem rota"}</TableCell>
                    <TableCell>{v.motoristaNome || "—"}</TableCell>
                    <TableCell>{formatCurrency(v.freteTotal)}</TableCell>
                    <TableCell><Badge className={STATUS_VIAGEM[v.status] ?? ""}>{v.status.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {v.status === "planejada" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateViagemStatus.mutate({ id: v.id, status: "em_andamento" })}>Iniciar</Button>}
                        {v.status === "em_andamento" && <Button size="sm" className="h-7 text-xs" onClick={() => updateViagemStatus.mutate({ id: v.id, status: "concluida", dataChegada: new Date().toISOString() })}>Concluir</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {viagens.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma viagem cadastrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="carregamentos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Montagem, despacho e encerramento de carregamentos.</p>
            <Dialog open={showNovoCarregamento} onOpenChange={setShowNovoCarregamento}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Carregamento</Button></DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Criar carregamento</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateCarregamento} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Data *</Label><Input type="date" value={carregamentoForm.data} onChange={(e) => setCarregamentoForm((p) => ({ ...p, data: e.target.value }))} required /></div>
                    <div><Label>Veículo</Label><Select value={carregamentoForm.veiculoId || "none"} onValueChange={(v) => setCarregamentoForm((p) => ({ ...p, veiculoId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{(veiculosQ.data ?? []).map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Motorista</Label><Select value={carregamentoForm.motoristaId || "none"} onValueChange={(v) => setCarregamentoForm((p) => ({ ...p, motoristaId: v === "none" ? "" : v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{(motoristasQ.data ?? []).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Rota</Label><Input value={carregamentoForm.rotaDescricao} onChange={(e) => setCarregamentoForm((p) => ({ ...p, rotaDescricao: e.target.value }))} /></div>
                    <div className="col-span-2"><Label>Observações</Label><Textarea rows={3} value={carregamentoForm.observacoes} onChange={(e) => setCarregamentoForm((p) => ({ ...p, observacoes: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createCarregamento.isPending}>Salvar carregamento</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Data</TableHead><TableHead>Veículo</TableHead><TableHead>Motorista</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {carregamentos.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.numero}</TableCell>
                    <TableCell>{new Date(c.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{c.veiculoPlaca || "—"}</TableCell>
                    <TableCell>{c.motoristaNome || "—"}</TableCell>
                    <TableCell><Badge className={STATUS_CARREGAMENTO[c.status] ?? ""}>{c.status.replaceAll("_", " ")}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.status === "montando" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => marcarCarregamentoPronto.mutate({ id: c.id })}>Marcar pronto</Button>}
                        {c.status === "pronto" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => registrarSaida.mutate({ id: c.id, dataSaida: new Date().toISOString() })}>Registrar saída</Button>}
                        {c.status === "em_rota" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => registrarRetorno.mutate({ id: c.id, dataRetorno: new Date().toISOString() })}>Registrar retorno</Button>}
                        {c.status === "retornado" && <Button size="sm" className="h-7 text-xs" onClick={() => encerrarCarregamento.mutate({ id: c.id })}>Encerrar</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {carregamentos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum carregamento cadastrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="sac" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Atendimento operacional e acompanhamento de reclamações.</p>
            <Dialog open={showNovoChamado} onOpenChange={setShowNovoChamado}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Chamado</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Abrir chamado SAC</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createChamado.mutate(chamadoForm as any); }} className="space-y-3">
                  <div><Label>Cliente *</Label><Input value={chamadoForm.clienteNome} onChange={(e) => setChamadoForm((p) => ({ ...p, clienteNome: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Email</Label><Input value={chamadoForm.clienteEmail} onChange={(e) => setChamadoForm((p) => ({ ...p, clienteEmail: e.target.value }))} /></div>
                    <div><Label>Telefone</Label><Input value={chamadoForm.clienteTelefone} onChange={(e) => setChamadoForm((p) => ({ ...p, clienteTelefone: e.target.value }))} /></div>
                  </div>
                  <div><Label>Assunto *</Label><Input value={chamadoForm.assunto} onChange={(e) => setChamadoForm((p) => ({ ...p, assunto: e.target.value }))} required /></div>
                  <div><Label>Descrição *</Label><Textarea rows={3} value={chamadoForm.descricao} onChange={(e) => setChamadoForm((p) => ({ ...p, descricao: e.target.value }))} required /></div>
                  <div><Label>Prioridade</Label><Select value={chamadoForm.prioridade} onValueChange={(v) => setChamadoForm((p) => ({ ...p, prioridade: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
                  <Button type="submit" className="w-full" disabled={createChamado.isPending}>Salvar chamado</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Protocolo</TableHead><TableHead>Cliente</TableHead><TableHead>Assunto</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {(chamadosQ.data ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.protocolo}</TableCell>
                    <TableCell className="font-medium">{c.clienteNome}</TableCell>
                    <TableCell>{c.assunto}</TableCell>
                    <TableCell><Badge className={STATUS_SAC[c.status] ?? ""}>{c.status.replaceAll("_", " ")}</Badge></TableCell>
                  </TableRow>
                ))}
                {(chamadosQ.data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum chamado SAC registrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="licencas" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Licenças regulatórias da operação.</p>
            <Dialog open={showNovaLicenca} onOpenChange={setShowNovaLicenca}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Licença</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Cadastrar licença</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createLicenca.mutate(licencaForm as any); }} className="space-y-3">
                  <div><Label>Tipo *</Label><Input value={licencaForm.tipo} onChange={(e) => setLicencaForm((p) => ({ ...p, tipo: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Número</Label><Input value={licencaForm.numero} onChange={(e) => setLicencaForm((p) => ({ ...p, numero: e.target.value }))} /></div>
                    <div><Label>Órgão Emissor</Label><Input value={licencaForm.orgaoEmissor} onChange={(e) => setLicencaForm((p) => ({ ...p, orgaoEmissor: e.target.value }))} /></div>
                  </div>
                  <div><Label>Descrição</Label><Textarea rows={3} value={licencaForm.descricao} onChange={(e) => setLicencaForm((p) => ({ ...p, descricao: e.target.value }))} /></div>
                  <Button type="submit" className="w-full" disabled={createLicenca.isPending}>Salvar licença</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Número</TableHead><TableHead>Órgão</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {(licencasQ.data ?? []).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.tipo}</TableCell>
                    <TableCell>{l.numero || "—"}</TableCell>
                    <TableCell>{l.orgaoEmissor || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{l.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {(licencasQ.data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma licença cadastrada.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
