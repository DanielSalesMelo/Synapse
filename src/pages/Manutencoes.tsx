import { useTranslation } from 'react-i18next';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo } from "react";
import { Plus, Wrench, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";


const TIPO_LABELS: Record<string, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  revisao: "Revisão",
  pneu: "Pneu",
  eletrica: "Elétrica",
  funilaria: "Funilaria",
  outro: "Outro",
};

const TIPO_COLORS: Record<string, string> = {
  preventiva: "bg-green-100 text-green-700",
  corretiva: "bg-red-100 text-red-700",
  revisao: "bg-blue-100 text-blue-700",
  pneu: "bg-yellow-100 text-yellow-700",
  eletrica: "bg-purple-100 text-purple-700",
  funilaria: "bg-orange-100 text-orange-700",
  outro: "bg-gray-100 text-gray-700",
};

function formatCurrency(v: any) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ManutencaoForm({ veiculos, onSave, onClose }: {
  veiculos: any[];
  onSave: (d: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    veiculoId: "",
    data: new Date().toISOString().split("T")[0],
    tipo: "corretiva",
    descricao: "",
    empresa: "",
    valor: "",
    kmAtual: "",
    proximaManutencaoKm: "",
    proximaManutencaoData: "",
    observacoes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.veiculoId) { toast.error("Selecione um veículo"); return; }
    if (!form.descricao) { toast.error("Informe a descrição do serviço"); return; }
    onSave({
      empresaId: EMPRESA_ID,
      veiculoId: Number(form.veiculoId),
      data: form.data,
      tipo: form.tipo,
      descricao: form.descricao,
      empresa: form.empresa || undefined,
      valor: form.valor || null,
      kmAtual: form.kmAtual ? Number(form.kmAtual) : null,
      proximaManutencaoKm: form.proximaManutencaoKm ? Number(form.proximaManutencaoKm) : null,
      proximaManutencaoData: form.proximaManutencaoData || null,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Veículo *</Label>
          <Select value={form.veiculoId} onValueChange={v => setForm(f => ({ ...f, veiculoId: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              {veiculos.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Oficina / Empresa</Label>
          <Input value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} placeholder="Nome da oficina..." />
        </div>
        <div className="col-span-full space-y-1.5">
          <Label>Descrição do Serviço *</Label>
          <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} required />
        </div>
        <div className="space-y-1.5">
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>KM Atual</Label>
          <Input type="number" value={form.kmAtual} onChange={e => setForm(f => ({ ...f, kmAtual: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Próxima Manutenção (KM)</Label>
          <Input type="number" value={form.proximaManutencaoKm} onChange={e => setForm(f => ({ ...f, proximaManutencaoKm: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Próxima Manutenção (Data)</Label>
          <Input type="date" value={form.proximaManutencaoData} onChange={e => setForm(f => ({ ...f, proximaManutencaoData: e.target.value }))} />
        </div>
        <div className="col-span-full space-y-1.5">
          <Label>Observações</Label>
          <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Registrar</Button>
      </div>
    </form>
  );
}

export default function Manutencoes() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const utils = trpc.useUtils();

  // Filtros
  const [filtroVeiculo, setFiltroVeiculo] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroOficina, setFiltroOficina] = useState("");

  const { data: lista = [], isLoading } = trpc.frota.manutencoes.list.useQuery({ empresaId: EMPRESA_ID, limit: 500 });
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });

  const createMut = trpc.frota.manutencoes.create.useMutation({
    onSuccess: () => { utils.frota.manutencoes.list.invalidate(); setOpen(false); toast.success("Manutenção registrada!"); },
    onError: (e) => toast.error(e.message),
  });

  const veiculoMap = Object.fromEntries(veiculos.map((v: any) => [v.id, v.placa]));

  // Aplicar filtros
  const listaFiltrada = useMemo(() => {
    return lista.filter((m: any) => {
      if (filtroVeiculo !== "todos" && String(m.veiculoId) !== filtroVeiculo) return false;
      if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
      if (filtroDataInicio && new Date(m.data) < new Date(filtroDataInicio)) return false;
      if (filtroDataFim && new Date(m.data) > new Date(filtroDataFim + "T23:59:59")) return false;
      if (filtroOficina && !(m.empresa ?? "").toLowerCase().includes(filtroOficina.toLowerCase())) return false;
      return true;
    });
  }, [lista, filtroVeiculo, filtroTipo, filtroDataInicio, filtroDataFim, filtroOficina]);

  const totalFiltrado = listaFiltrada.reduce((acc: number, m: any) => acc + (Number(m.valor) || 0), 0);
  const totalMes = lista
    .filter((m: any) => new Date(m.data).getMonth() === new Date().getMonth() && new Date(m.data).getFullYear() === new Date().getFullYear())
    .reduce((acc: number, m: any) => acc + (Number(m.valor) || 0), 0);

  const filtrosAtivos = [filtroVeiculo !== "todos", filtroTipo !== "todos", !!filtroDataInicio, !!filtroDataFim, !!filtroOficina].filter(Boolean).length;

  function limparFiltros() {
    setFiltroVeiculo("todos");
    setFiltroTipo("todos");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroOficina("");
  }

  return (
<div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-6 w-6 text-primary" />
              Manutenções
            </h1>
            <p className="text-sm text-muted-foreground">
              {listaFiltrada.length} de {lista.length} registros
              {filtrosAtivos > 0 && <span className="ml-1 text-primary">({filtrosAtivos} filtro{filtrosAtivos > 1 ? "s" : ""} ativo{filtrosAtivos > 1 ? "s" : ""})</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={filtrosAtivos > 0 ? "border-primary text-primary" : ""}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filtros
              {filtrosAtivos > 0 && <Badge className="ml-1.5 h-4 w-4 p-0 text-xs flex items-center justify-center bg-primary text-primary-foreground">{filtrosAtivos}</Badge>}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Nova Manutenção</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Registrar Manutenção</DialogTitle></DialogHeader>
                <ManutencaoForm veiculos={veiculos} onSave={d => createMut.mutate(d)} onClose={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Veículo</Label>
                  <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os veículos</SelectItem>
                      {veiculos.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Oficina</Label>
                  <Input
                    className="h-8 text-sm"
                    placeholder="Buscar por oficina..."
                    value={filtroOficina}
                    onChange={e => setFiltroOficina(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data início</Label>
                  <Input className="h-8 text-sm" type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data fim</Label>
                  <Input className="h-8 text-sm" type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} />
                </div>
                <div className="flex items-end">
                  {filtrosAtivos > 0 && (
                    <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-8 text-xs text-muted-foreground">
                      <X className="h-3 w-3 mr-1" />Limpar filtros
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Gasto no mês</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalMes)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total histórico</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(lista.reduce((acc: number, m: any) => acc + (Number(m.valor) || 0), 0))}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Registros filtrados</p>
            <p className="text-xl font-bold mt-1">{listaFiltrada.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total filtrado</p>
            <p className="text-xl font-bold mt-1 text-primary">{formatCurrency(totalFiltrado)}</p>
          </CardContent></Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="hidden sm:table-cell">Oficina</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="hidden lg:table-cell">KM</TableHead>
                    <TableHead className="hidden lg:table-cell">Próx. KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : listaFiltrada.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      {filtrosAtivos > 0 ? "Nenhum resultado para os filtros selecionados" : "Nenhuma manutenção registrada"}
                    </TableCell></TableRow>
                  ) : listaFiltrada.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">{new Date(m.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium text-sm">{veiculoMap[m.veiculoId] ?? m.veiculoId}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${TIPO_COLORS[m.tipo] ?? ""}`}>{TIPO_LABELS[m.tipo] ?? m.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-48 truncate hidden md:table-cell">{m.descricao}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{m.empresa ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(m.valor)}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{m.kmAtual ? Number(m.kmAtual).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{m.proximaManutencaoKm ? Number(m.proximaManutencaoKm).toLocaleString("pt-BR") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
);
}
