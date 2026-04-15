import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Truck, ClipboardCheck, Camera, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  saida_registrada: "bg-blue-100 text-blue-700", em_viagem: "bg-purple-100 text-purple-700",
  retorno_registrado: "bg-yellow-100 text-yellow-700", em_conferencia: "bg-orange-100 text-orange-700",
  aguardando_motorista: "bg-cyan-100 text-cyan-700", finalizado: "bg-green-100 text-green-700",
};
const STATUS_LABELS: Record<string, string> = {
  saida_registrada: "Saída Registrada", em_viagem: "Em Viagem",
  retorno_registrado: "Aguardando Conferência", em_conferencia: "Em Conferência",
  aguardando_motorista: "Aguardando Motorista", finalizado: "Finalizado",
};

export default function ConferenciaVeiculos() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showSaida, setShowSaida] = useState(false);
  const [showConferencia, setShowConferencia] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  const dashboard = trpc.conferencia.dashboard.useQuery();
  const lista = trpc.conferencia.list.useQuery({ status: statusFilter === "todos" ? undefined : statusFilter });
  const detalhes = trpc.conferencia.getDetalhes.useQuery({ id: selectedId! }, { enabled: !!selectedId && showDetalhes });
  const veiculos = trpc.veiculos.list.useQuery({ search: "", page: 1, limit: 200 });

  const registrarSaida = trpc.conferencia.registrarSaida.useMutation({ onSuccess: () => { lista.refetch(); dashboard.refetch(); setShowSaida(false); toast.success("Saída registrada!"); } });
  const registrarRetorno = trpc.conferencia.registrarRetorno.useMutation({ onSuccess: () => { lista.refetch(); dashboard.refetch(); toast.success("Retorno registrado!"); } });
  const realizarConferencia = trpc.conferencia.realizarConferencia.useMutation({ onSuccess: () => { lista.refetch(); dashboard.refetch(); setShowConferencia(false); toast.success("Conferência realizada!"); } });
  const confirmarMotorista = trpc.conferencia.confirmarMotorista.useMutation({ onSuccess: () => { lista.refetch(); dashboard.refetch(); toast.success("Motorista confirmou!"); } });

  const [saidaForm, setSaidaForm] = useState({ veiculoId: 0, kmSaida: "", observacoesSaida: "" });
  const [confForm, setConfForm] = useState({
    id: 0, cargaOk: true, cargaObservacoes: "", avariasEncontradas: false, avariasDescricao: "",
    batidasEncontradas: false, batidasDescricao: "", pneusOk: true, pneusObservacoes: "",
    limpezaOk: true, documentosOk: true, nivelCombustivel: "", observacoesConferencia: "",
  });

  const veiculosList = (veiculos.data as any)?.items || veiculos.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6" />Conferência de Veículos</h1><p className="text-muted-foreground">Controle de saída, retorno e conferência de veículos</p></div>
        <Dialog open={showSaida} onOpenChange={setShowSaida}><DialogTrigger asChild><Button><ArrowRight className="h-4 w-4 mr-2" />Registrar Saída</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Registrar Saída de Veículo</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); registrarSaida.mutate(saidaForm); }} className="space-y-3">
              <div><Label>Veículo *</Label><Select value={saidaForm.veiculoId.toString()} onValueChange={v => setSaidaForm(p => ({ ...p, veiculoId: Number(v) }))}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(veiculosList as any[])?.map((v: any) => (<SelectItem key={v.id} value={v.id.toString()}>{v.placa} - {v.modelo}</SelectItem>))}</SelectContent></Select></div>
              <div><Label>KM Saída</Label><Input value={saidaForm.kmSaida} onChange={e => setSaidaForm(p => ({ ...p, kmSaida: e.target.value }))} /></div>
              <div><Label>Observações</Label><Textarea value={saidaForm.observacoesSaida} onChange={e => setSaidaForm(p => ({ ...p, observacoesSaida: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={registrarSaida.isPending}>Registrar Saída</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.total ?? 0}</div></CardContent></Card>
        <Card className="border-blue-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">Em Viagem</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{dashboard.data?.emViagem ?? 0}</div></CardContent></Card>
        <Card className="border-yellow-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">Aguard. Conferência</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{dashboard.data?.aguardandoConferencia ?? 0}</div></CardContent></Card>
        <Card className="border-orange-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Com Avarias</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{dashboard.data?.comAvarias ?? 0}</div></CardContent></Card>
        <Card className="border-green-200"><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">Finalizados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{dashboard.data?.finalizados ?? 0}</div></CardContent></Card>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="saida_registrada">Saída Registrada</SelectItem><SelectItem value="retorno_registrado">Aguard. Conferência</SelectItem><SelectItem value="aguardando_motorista">Aguard. Motorista</SelectItem><SelectItem value="finalizado">Finalizado</SelectItem></SelectContent></Select>
      </div>

      {/* Tabela */}
      <Card><Table><TableHeader><TableRow><TableHead>Veículo</TableHead><TableHead>Status</TableHead><TableHead>KM Saída</TableHead><TableHead>KM Retorno</TableHead><TableHead>Avarias</TableHead><TableHead>Batidas</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
        <TableBody>{lista.data?.map((c: any) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">#{c.veiculoId}</TableCell>
            <TableCell><Badge className={STATUS_COLORS[c.status] || ""}>{STATUS_LABELS[c.status] || c.status}</Badge></TableCell>
            <TableCell>{c.kmSaida || "—"}</TableCell>
            <TableCell>{c.kmRetorno || "—"}</TableCell>
            <TableCell>{c.avariasEncontradas ? <Badge className="bg-orange-100 text-orange-700">Sim</Badge> : "Não"}</TableCell>
            <TableCell>{c.batidasEncontradas ? <Badge className="bg-red-100 text-red-700">Sim</Badge> : "Não"}</TableCell>
            <TableCell className="text-xs">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</TableCell>
            <TableCell className="space-x-1">
              {c.status === "saida_registrada" && <Button size="sm" variant="outline" onClick={() => registrarRetorno.mutate({ id: c.id })}><ArrowLeft className="h-3 w-3 mr-1" />Retorno</Button>}
              {c.status === "retorno_registrado" && <Button size="sm" onClick={() => { setConfForm(p => ({ ...p, id: c.id })); setShowConferencia(true); }}><ClipboardCheck className="h-3 w-3 mr-1" />Conferir</Button>}
              {c.status === "aguardando_motorista" && <Button size="sm" className="bg-green-600" onClick={() => confirmarMotorista.mutate({ id: c.id, confirma: true })}><CheckCircle2 className="h-3 w-3 mr-1" />Confirmar</Button>}
              <Button size="sm" variant="ghost" onClick={() => { setSelectedId(c.id); setShowDetalhes(true); }}><Eye className="h-3 w-3" /></Button>
            </TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></Card>

      {/* Modal Conferência */}
      <Dialog open={showConferencia} onOpenChange={setShowConferencia}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Realizar Conferência</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); realizarConferencia.mutate(confForm); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><input type="checkbox" checked={confForm.cargaOk} onChange={e => setConfForm(p => ({ ...p, cargaOk: e.target.checked }))} /><Label>Carga OK</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={confForm.pneusOk} onChange={e => setConfForm(p => ({ ...p, pneusOk: e.target.checked }))} /><Label>Pneus OK</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={confForm.limpezaOk} onChange={e => setConfForm(p => ({ ...p, limpezaOk: e.target.checked }))} /><Label>Limpeza OK</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={confForm.documentosOk} onChange={e => setConfForm(p => ({ ...p, documentosOk: e.target.checked }))} /><Label>Documentos OK</Label></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><input type="checkbox" checked={confForm.avariasEncontradas} onChange={e => setConfForm(p => ({ ...p, avariasEncontradas: e.target.checked }))} className="accent-orange-600" /><Label className="text-orange-600">Avarias Encontradas</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={confForm.batidasEncontradas} onChange={e => setConfForm(p => ({ ...p, batidasEncontradas: e.target.checked }))} className="accent-red-600" /><Label className="text-red-600">Batidas Encontradas</Label></div>
            </div>
            {confForm.avariasEncontradas && <div><Label>Descrição das Avarias</Label><Textarea value={confForm.avariasDescricao} onChange={e => setConfForm(p => ({ ...p, avariasDescricao: e.target.value }))} /></div>}
            {confForm.batidasEncontradas && <div><Label>Descrição das Batidas</Label><Textarea value={confForm.batidasDescricao} onChange={e => setConfForm(p => ({ ...p, batidasDescricao: e.target.value }))} /></div>}
            <div><Label>Nível de Combustível</Label><Input value={confForm.nivelCombustivel} onChange={e => setConfForm(p => ({ ...p, nivelCombustivel: e.target.value }))} placeholder="Ex: 3/4, 50%, Cheio" /></div>
            <div><Label>Observações Gerais</Label><Textarea value={confForm.observacoesConferencia} onChange={e => setConfForm(p => ({ ...p, observacoesConferencia: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={realizarConferencia.isPending}>Finalizar Conferência</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Detalhes da Conferência</DialogTitle></DialogHeader>
          {detalhes.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[detalhes.data.status] || ""}>{STATUS_LABELS[detalhes.data.status]}</Badge></div>
                <div><span className="text-muted-foreground">KM Saída:</span> {detalhes.data.kmSaida || "—"}</div>
                <div><span className="text-muted-foreground">KM Retorno:</span> {detalhes.data.kmRetorno || "—"}</div>
                <div><span className="text-muted-foreground">Carga OK:</span> {detalhes.data.cargaOk ? "Sim" : "Não"}</div>
                <div><span className="text-muted-foreground">Avarias:</span> {detalhes.data.avariasEncontradas ? <span className="text-orange-600 font-semibold">Sim - {detalhes.data.avariasDescricao}</span> : "Não"}</div>
                <div><span className="text-muted-foreground">Batidas:</span> {detalhes.data.batidasEncontradas ? <span className="text-red-600 font-semibold">Sim - {detalhes.data.batidasDescricao}</span> : "Não"}</div>
                <div><span className="text-muted-foreground">Motorista Confirmou:</span> {detalhes.data.motoristaConfirmou ? "Sim" : "Pendente"}</div>
              </div>
              {detalhes.data.fotos?.length > 0 && (
                <div><h3 className="font-semibold text-sm mb-2">Fotos ({detalhes.data.fotos.length})</h3>
                  <div className="grid grid-cols-3 gap-2">{detalhes.data.fotos.map((f: any) => (<div key={f.id} className="aspect-square bg-muted rounded-lg flex items-center justify-center"><Camera className="h-6 w-6 text-muted-foreground" /><span className="text-xs">{f.tipo}</span></div>))}</div>
                </div>
              )}
              {detalhes.data.itens?.length > 0 && (
                <div><h3 className="font-semibold text-sm mb-2">Checklist</h3>
                  <div className="space-y-1">{detalhes.data.itens.map((i: any) => (<div key={i.id} className="flex items-center gap-2 text-sm"><span className={i.conforme ? "text-green-600" : i.conforme === false ? "text-red-600" : "text-muted-foreground"}>{i.conforme ? "✓" : i.conforme === false ? "✗" : "○"}</span>{i.item}{i.observacao && <span className="text-xs text-muted-foreground">({i.observacao})</span>}</div>))}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
