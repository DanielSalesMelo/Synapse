import { useTranslation } from 'react-i18next';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useMemo, useEffect } from "react";
import { Plus, Fuel, Droplets, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";


const COMBUSTIVEL_LABELS: Record<string, string> = {
  diesel: "Diesel",
  arla: "ARLA 32",
  gasolina: "Gasolina",
  etanol: "Etanol",
  gas: "Gás",
  outro: "Outro",
};

const COMBUSTIVEL_COLORS: Record<string, string> = {
  diesel: "bg-gray-100 text-gray-700",
  arla: "bg-blue-100 text-blue-700",
  gasolina: "bg-yellow-100 text-yellow-700",
  etanol: "bg-green-100 text-green-700",
  gas: "bg-orange-100 text-orange-700",
  outro: "bg-purple-100 text-purple-700",
};

function formatCurrency(v: any) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AbastecimentoForm({ veiculos, motoristas, veiculosEmViagem, onSave, onClose }: {
  veiculos: any[];
  motoristas: any[];
  veiculosEmViagem: any[];
  onSave: (d: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    veiculoId: "",
    motoristaId: "",
    data: new Date().toISOString().split("T")[0],
    tipoCombustivel: "diesel",
    quantidade: "",
    valorUnitario: "",
    valorTotal: "",
    kmAtual: "",
    local: "",
    tipoAbastecimento: "interno",
    observacoes: "",
    notaFiscal: "",
  });

  // IDs dos veículos em viagem
  const idsEmViagem = useMemo(() => new Set(veiculosEmViagem.map(v => v.veiculoId)), [veiculosEmViagem]);

  // Filtrar veículos: interno = na base (não estão em viagem), externo = em viagem
  const veiculosFiltrados = useMemo(() => {
    if (form.tipoAbastecimento === "externo") {
      return veiculos.filter(v => idsEmViagem.has(v.id));
    }
    return veiculos.filter(v => !idsEmViagem.has(v.id));
  }, [veiculos, idsEmViagem, form.tipoAbastecimento]);

  // Auto-preencher motorista quando seleciona veículo em viagem
  function handleVeiculoChange(veiculoId: string) {
    const vEmViagem = veiculosEmViagem.find(v => v.veiculoId === Number(veiculoId));
    setForm(f => ({
      ...f,
      veiculoId,
      motoristaId: vEmViagem?.motoristaId ? String(vEmViagem.motoristaId) : f.motoristaId,
    }));
  }

  // Calcular valorTotal automaticamente quando quantidade ou valorUnitario mudarem
  useEffect(() => {
    const q = parseFloat(form.quantidade);
    const v = parseFloat(form.valorUnitario);
    if (!isNaN(q) && !isNaN(v) && q > 0 && v > 0) {
      setForm(f => ({ ...f, valorTotal: (q * v).toFixed(2) }));
    }
  }, [form.quantidade, form.valorUnitario]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.veiculoId) { toast.error("Selecione um veículo"); return; }
    onSave({
      empresaId: EMPRESA_ID,
      veiculoId: Number(form.veiculoId),
      motoristaId: form.motoristaId ? Number(form.motoristaId) : null,
      data: form.data,
      tipoCombustivel: form.tipoCombustivel,
      quantidade: form.quantidade,
      valorUnitario: form.valorUnitario || null,
      valorTotal: form.valorTotal || null,
      kmAtual: form.kmAtual ? Number(form.kmAtual) : null,
      local: form.local || undefined,
      tipoAbastecimento: form.tipoAbastecimento as "interno" | "externo",
      observacoes: form.observacoes || undefined,
      notaFiscal: form.notaFiscal || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Veículo * {form.tipoAbastecimento === "externo" ? <span className="text-xs text-muted-foreground">(em viagem)</span> : <span className="text-xs text-muted-foreground">(na base)</span>}</Label>
          <Select value={form.veiculoId} onValueChange={handleVeiculoChange}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              {veiculosFiltrados.length === 0 && <SelectItem value="none" disabled>Nenhum veículo {form.tipoAbastecimento === "externo" ? "em viagem" : "na base"}</SelectItem>}
              {veiculosFiltrados.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Motorista</Label>
          <Select value={form.motoristaId || "none"} onValueChange={v => setForm(f => ({ ...f, motoristaId: v === "none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não informado</SelectItem>
              {motoristas.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Combustível *</Label>
          <Select value={form.tipoCombustivel} onValueChange={v => setForm(f => ({ ...f, tipoCombustivel: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(COMBUSTIVEL_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Quantidade (L) *</Label>
          <Input type="number" step="0.01" value={form.quantidade}
            onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Valor Unitário (R$/L)</Label>
          <Input type="number" step="0.001" value={form.valorUnitario}
            onChange={e => setForm(f => ({ ...f, valorUnitario: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Valor Total</Label>
          <Input type="number" step="0.01" value={form.valorTotal}
            onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente (quantidade × valor unitário)</p>
        </div>
        <div className="space-y-1.5">
          <Label>KM Atual</Label>
          <Input type="number" value={form.kmAtual} onChange={e => setForm(f => ({ ...f, kmAtual: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Local / Posto</Label>
          {form.tipoAbastecimento === "externo" ? (
            <Select value={form.local || "__custom__"} onValueChange={v => setForm(f => ({ ...f, local: v === "__custom__" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o posto..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">Outro (digitar)</SelectItem>
                <SelectItem value="Ipiranga">Ipiranga</SelectItem>
                <SelectItem value="BR Petrobras">BR Petrobras</SelectItem>
                <SelectItem value="Shell">Shell</SelectItem>
                <SelectItem value="Ale">Ale</SelectItem>
                <SelectItem value="Raízen">Raízen</SelectItem>
                <SelectItem value="Rodoil">Rodoil</SelectItem>
                <SelectItem value="Charrua">Charrua</SelectItem>
                <SelectItem value="Cosan">Cosan</SelectItem>
                <SelectItem value="Dislub Equador">Dislub Equador</SelectItem>
                <SelectItem value="Gran Petro">Gran Petro</SelectItem>
                <SelectItem value="Rede Sim">Rede Sim</SelectItem>
                <SelectItem value="Total Energies">Total Energies</SelectItem>
                <SelectItem value="Sabbá">Sabbá</SelectItem>
                <SelectItem value="Potencial">Potencial</SelectItem>
                <SelectItem value="Petrosul">Petrosul</SelectItem>
                <SelectItem value="Taurus">Taurus</SelectItem>
                <SelectItem value="Bandeira Branca">Bandeira Branca</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} placeholder="Tanque interno" />
          )}
          {form.tipoAbastecimento === "externo" && form.local === "" && (
            <Input className="mt-1" value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} placeholder="Digite o nome do posto..." />
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={form.tipoAbastecimento} onValueChange={v => setForm(f => ({ ...f, tipoAbastecimento: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="interno">Tanque interno</SelectItem>
              <SelectItem value="externo">Posto externo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nota Fiscal</Label>
          <Input placeholder="Nº da NF" value={form.notaFiscal} onChange={e => setForm(f => ({ ...f, notaFiscal: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Input placeholder="Observações..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Registrar</Button>
      </div>
    </form>
  );
}

export default function Abastecimentos() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    veiculoId: "",
    motoristaId: "",
    tipoCombustivel: "",
    tipoAbastecimento: "",
    dataInicio: "",
    dataFim: "",
  });
  const utils = trpc.useUtils();

  const queryInput = useMemo(() => ({
    empresaId: EMPRESA_ID,
    veiculoId: filtros.veiculoId ? Number(filtros.veiculoId) : undefined,
    motoristaId: filtros.motoristaId ? Number(filtros.motoristaId) : undefined,
    tipoCombustivel: filtros.tipoCombustivel as any || undefined,
    tipoAbastecimento: filtros.tipoAbastecimento as any || undefined,
    dataInicio: filtros.dataInicio || undefined,
    dataFim: filtros.dataFim || undefined,
    limit: 200,
  }), [filtros]);

  const { data: lista = [], isLoading } = trpc.frota.abastecimentos.list.useQuery(queryInput);
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: motoristas = [] } = trpc.funcionarios.listMotoristas.useQuery({ empresaId: EMPRESA_ID });
  const { data: tanque } = trpc.frota.tanque.saldoAtual.useQuery({ empresaId: EMPRESA_ID });
  const { data: veiculosEmViagem = [] } = trpc.viagens.veiculosEmViagem.useQuery({ empresaId: EMPRESA_ID });

  const createMut = trpc.frota.abastecimentos.create.useMutation({
    onSuccess: () => { utils.frota.abastecimentos.list.invalidate(); setOpen(false); toast.success("Abastecimento registrado!"); },
    onError: (e) => toast.error(e.message),
  });

  const veiculoMap = Object.fromEntries(veiculos.map(v => [v.id, v.placa]));
  const motoristaMap = Object.fromEntries(motoristas.map(m => [m.id, m.nome]));
  const filtrosAtivos = Object.values(filtros).filter(Boolean).length;

  const totalMes = lista
    .filter(a => new Date(a.data).getMonth() === new Date().getMonth())
    .reduce((acc, a) => acc + (Number(a.valorTotal) || 0), 0);
  const totalFiltrado = lista.reduce((acc, a) => acc + (Number(a.valorTotal) || 0), 0);
  const totalLitros = lista.reduce((acc, a) => acc + (Number(a.quantidade) || 0), 0);

  function limparFiltros() {
    setFiltros({ veiculoId: "", motoristaId: "", tipoCombustivel: "", tipoAbastecimento: "", dataInicio: "", dataFim: "" });
  }

  return (
<div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Abastecimentos</h1>
            <p className="text-sm text-muted-foreground">{lista.length} registros</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Abastecimento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Registrar Abastecimento</DialogTitle></DialogHeader>
              <AbastecimentoForm veiculos={veiculos} motoristas={motoristas} veiculosEmViagem={veiculosEmViagem} onSave={d => createMut.mutate(d)} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Gasto no mês</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(totalMes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total filtrado</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(totalFiltrado)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Litros filtrados</p>
              <p className="text-xl font-bold mt-1">{totalLitros.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Registros filtrados</p>
              <p className="text-xl font-bold mt-1">{lista.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {filtrosAtivos > 0 && (
                <Badge className="text-xs bg-primary/10 text-primary">{filtrosAtivos} ativo(s)</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Veículo</Label>
                <Select value={filtros.veiculoId || "todos"} onValueChange={v => setFiltros(f => ({ ...f, veiculoId: v === "todos" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {veiculos.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motorista</Label>
                <Select value={filtros.motoristaId || "todos"} onValueChange={v => setFiltros(f => ({ ...f, motoristaId: v === "todos" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {motoristas.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Combustível</Label>
                <Select value={filtros.tipoCombustivel || "todos"} onValueChange={v => setFiltros(f => ({ ...f, tipoCombustivel: v === "todos" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="arla">ARLA 32</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="gas">GLP/GNV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={filtros.tipoAbastecimento || "todos"} onValueChange={v => setFiltros(f => ({ ...f, tipoAbastecimento: v === "todos" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="interno">Interno</SelectItem>
                    <SelectItem value="externo">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" className="h-8 text-xs" value={filtros.dataInicio} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" className="h-8 text-xs" value={filtros.dataFim} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))} />
              </div>
            </div>
            {filtrosAtivos > 0 && (
              <Button variant="ghost" size="sm" className="mt-3 text-xs text-muted-foreground" onClick={limparFiltros}>
                <X className="h-3 w-3 mr-1" />Limpar filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead className="text-right">Qtd (L)</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Local</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : lista.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Fuel className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhum abastecimento registrado
                    </TableCell></TableRow>
                  ) : lista.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{new Date(a.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium text-sm">{veiculoMap[a.veiculoId] ?? a.veiculoId}</TableCell>
                      <TableCell className="text-sm">{a.motoristaId ? (motoristaMap[a.motoristaId] ?? "—") : "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${COMBUSTIVEL_COLORS[a.tipoCombustivel] ?? ""}`}>
                          {COMBUSTIVEL_LABELS[a.tipoCombustivel] ?? a.tipoCombustivel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{Number(a.quantidade).toFixed(1)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(a.valorTotal)}</TableCell>
                      <TableCell className="text-sm">{a.kmAtual ? Number(a.kmAtual).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.local ?? "—"}</TableCell>
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
