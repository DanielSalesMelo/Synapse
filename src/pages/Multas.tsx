import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Search, FileText, DollarSign, Star } from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  pago: "bg-green-100 text-green-800 border-green-300",
  recorrido: "bg-blue-100 text-blue-800 border-blue-300",
  cancelado: "bg-gray-100 text-gray-600 border-gray-300",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  recorrido: "Recorrido",
  cancelado: "Cancelado",
};

export default function Multas() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [form, setForm] = useState({
    veiculoId: "",
    motoristaId: "",
    data: new Date().toISOString().split("T")[0],
    local: "",
    descricao: "",
    numeroAuto: "",
    pontos: "0",
    valor: "",
    vencimento: "",
    status: "pendente" as "pendente" | "pago" | "recorrido" | "cancelado",
    responsavel: "motorista" as "motorista" | "empresa",
    observacoes: "",
  });

  const { data: stats } = trpc.multas.stats.useQuery({ empresaId: EMPRESA_ID });
  const { data: multas = [], refetch } = trpc.multas.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: motoristas = [] } = trpc.funcionarios.listMotoristas.useQuery({ empresaId: EMPRESA_ID });

  const createMutation = trpc.multas.create.useMutation({
    onSuccess: () => {
      toast.success("Multa registrada com sucesso!");
      setModalOpen(false);
      setForm({ veiculoId: "", motoristaId: "", data: new Date().toISOString().split("T")[0], local: "", descricao: "", numeroAuto: "", pontos: "0", valor: "", vencimento: "", status: "pendente", responsavel: "motorista", observacoes: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.multas.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.veiculoId) { toast.error("Selecione o veículo"); return; }
    if (!form.descricao) { toast.error("Informe a descrição da infração"); return; }
    if (!form.valor || Number(form.valor) <= 0) { toast.error("Informe o valor da multa"); return; }
    createMutation.mutate({
      empresaId: EMPRESA_ID,
      veiculoId: Number(form.veiculoId),
      motoristaId: form.motoristaId ? Number(form.motoristaId) : null,
      data: form.data,
      local: form.local || undefined,
      descricao: form.descricao,
      numeroAuto: form.numeroAuto || undefined,
      pontos: Number(form.pontos) || 0,
      valor: Number(form.valor),
      vencimento: form.vencimento || undefined,
      status: form.status,
      responsavel: form.responsavel,
      observacoes: form.observacoes || undefined,
    });
  };

  const multasFiltradas = multas.filter((m: any) => {
    const matchBusca = !busca || 
      m.veiculoPlaca?.toLowerCase().includes(busca.toLowerCase()) ||
      m.motoristaNome?.toLowerCase().includes(busca.toLowerCase()) ||
      m.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      m.numeroAuto?.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || m.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
<div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            Multas de Trânsito
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as multas da frota</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Multa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Nova Multa</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label>Veículo *</Label>
                <Select value={form.veiculoId} onValueChange={(v) => setForm(f => ({ ...f, veiculoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.placa} — {v.modelo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Motorista Responsável</Label>
                <Select value={form.motoristaId} onValueChange={(v) => setForm(f => ({ ...f, motoristaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não identificado</SelectItem>
                    {motoristas.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data da Infração *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data de Vencimento</Label>
                <Input type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Descrição da Infração *</Label>
                <Input placeholder="Ex: Excesso de velocidade 20-50% acima do limite" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Nº do Auto de Infração</Label>
                <Input placeholder="Ex: AA123456789" value={form.numeroAuto} onChange={e => setForm(f => ({ ...f, numeroAuto: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Local da Infração</Label>
                <Input placeholder="Ex: BR-040, km 120" value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Valor (R$) *</Label>
                <Input type="number" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Pontos na CNH</Label>
                <Input type="number" placeholder="0" min="0" max="20" value={form.pontos} onChange={e => setForm(f => ({ ...f, pontos: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Responsável pelo Pagamento</Label>
                <Select value={form.responsavel} onValueChange={(v) => setForm(f => ({ ...f, responsavel: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorista">Motorista</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="recorrido">Recorrido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Input placeholder="Observações adicionais" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Registrar Multa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold mt-1">{stats?.total ?? 0}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground/30 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendentes</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">{stats?.pendentes ?? 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-200 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor Pendente</p>
                <p className="text-xl font-bold mt-1 text-red-600">
                  {(stats?.valorPendente ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-200 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Pontos</p>
                <p className="text-2xl font-bold mt-1 text-orange-600">{stats?.totalPontos ?? 0}</p>
              </div>
              <Star className="w-8 h-8 text-orange-200 mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por placa, motorista, descrição..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="recorrido">Recorrido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {multasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma multa encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Veículo</th>
                    <th className="text-left px-4 py-3">Motorista</th>
                    <th className="text-left px-4 py-3">Infração</th>
                    <th className="text-center px-4 py-3">Pontos</th>
                    <th className="text-right px-4 py-3">Valor</th>
                    <th className="text-left px-4 py-3">Vencimento</th>
                    <th className="text-left px-4 py-3">Responsável</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {multasFiltradas.map((m: any) => (
                    <tr key={m.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{m.veiculoPlaca}</span>
                        {m.veiculoModelo && <span className="text-muted-foreground text-xs block">{m.veiculoModelo}</span>}
                      </td>
                      <td className="px-4 py-3">{m.motoristaNome || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate">{m.descricao}</p>
                        {m.numeroAuto && <span className="text-xs text-muted-foreground">Auto: {m.numeroAuto}</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.pontos > 0 ? (
                          <Badge variant="outline" className="border-orange-300 text-orange-700">{m.pontos} pts</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(m.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {m.vencimento ? (
                          <span className={new Date(m.vencimento) < new Date() && m.status === "pendente" ? "text-red-600 font-medium" : ""}>
                            {new Date(m.vencimento).toLocaleDateString("pt-BR")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={m.responsavel === "motorista" ? "border-blue-300 text-blue-700" : "border-purple-300 text-purple-700"}>
                          {m.responsavel === "motorista" ? "Motorista" : "Empresa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border text-xs ${statusColors[m.status] || ""}`}>
                          {statusLabels[m.status] || m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {m.status === "pendente" && (
                          <Button size="sm" variant="outline" className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: m.id, status: "pago" })}>
                            Marcar Pago
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
);
}
