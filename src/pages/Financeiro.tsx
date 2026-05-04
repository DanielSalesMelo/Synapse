import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, BarChart3, CheckCircle2, DollarSign, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";

function formatCurrency(v: unknown) {
  const value = Number(v ?? 0);
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(v: unknown) {
  if (!v) return "—";
  return new Date(String(v)).toLocaleDateString("pt-BR");
}

const STATUS_PAGAR_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  pago: "bg-green-100 text-green-700",
  vencido: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
};
const STATUS_RECEBER_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  recebido: "bg-green-100 text-green-700",
  vencido: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
};

const CATEGORIA_PAGAR = ["combustivel", "manutencao", "salario", "freelancer", "pedagio", "seguro", "ipva", "licenciamento", "pneu", "outro"];
const CATEGORIA_RECEBER = ["frete", "cte", "devolucao", "outro"];

function ContaPagarForm({ veiculos, onSave, onClose }: {
  veiculos: any[];
  onSave: (d: any) => void;
  onClose: () => void;
}) {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [form, setForm] = useState({
    descricao: "",
    categoria: "outro",
    valor: "",
    dataVencimento: new Date().toISOString().split("T")[0],
    dataPagamento: "",
    status: "pendente",
    fornecedor: "",
    veiculoId: "",
    observacoes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      empresaId: EMPRESA_ID,
      descricao: form.descricao,
      categoria: form.categoria,
      valor: form.valor,
      dataVencimento: form.dataVencimento,
      dataPagamento: form.dataPagamento || null,
      status: form.status,
      fornecedor: form.fornecedor || undefined,
      veiculoId: form.veiculoId ? Number(form.veiculoId) : null,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Descrição *</Label>
          <Input value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIA_PAGAR.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valor *</Label>
          <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento *</Label>
          <Input type="date" value={form.dataVencimento} onChange={(e) => setForm((p) => ({ ...p, dataVencimento: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Fornecedor</Label>
          <Input value={form.fornecedor} onChange={(e) => setForm((p) => ({ ...p, fornecedor: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Veículo</Label>
          <Select value={form.veiculoId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, veiculoId: v === "none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {veiculos.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Observações</Label>
          <Input value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Salvar conta</Button>
      </div>
    </form>
  );
}

function ContaReceberForm({ onSave, onClose }: { onSave: (d: any) => void; onClose: () => void }) {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [form, setForm] = useState({
    descricao: "",
    categoria: "frete",
    valor: "",
    dataVencimento: new Date().toISOString().split("T")[0],
    dataRecebimento: "",
    status: "pendente",
    cliente: "",
    cteNumero: "",
    observacoes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      empresaId: EMPRESA_ID,
      descricao: form.descricao,
      categoria: form.categoria,
      valor: form.valor,
      dataVencimento: form.dataVencimento,
      dataRecebimento: form.dataRecebimento || null,
      status: form.status,
      cliente: form.cliente || undefined,
      cteNumero: form.cteNumero || undefined,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Descrição *</Label>
          <Input value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIA_RECEBER.map((c) => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valor *</Label>
          <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento *</Label>
          <Input type="date" value={form.dataVencimento} onChange={(e) => setForm((p) => ({ ...p, dataVencimento: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Input value={form.cliente} onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>CTE</Label>
          <Input value={form.cteNumero} onChange={(e) => setForm((p) => ({ ...p, cteNumero: e.target.value }))} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Observações</Label>
          <Input value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Salvar conta</Button>
      </div>
    </form>
  );
}

export default function Financeiro() {
  const { effectiveEmpresaId: EMPRESA_ID, viewAs, isSimulating } = useViewAs();
  const [tab, setTab] = useState("visao-geral");
  const [showNovoPagar, setShowNovoPagar] = useState(false);
  const [showNovoReceber, setShowNovoReceber] = useState(false);
  const [searchPagar, setSearchPagar] = useState("");
  const [searchReceber, setSearchReceber] = useState("");
  const [statusPagarFiltro, setStatusPagarFiltro] = useState<"todos" | "pendente" | "pago" | "vencido" | "cancelado">("todos");
  const [statusReceberFiltro, setStatusReceberFiltro] = useState<"todos" | "pendente" | "recebido" | "vencido" | "cancelado">("todos");

  const pagarResumoQ = trpc.financeiro.pagar.resumo.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const receberResumoQ = trpc.financeiro.receber.resumo.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const dashboardQ = trpc.financeiro.dashboard.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const projecaoQ = trpc.financeiro.projecaoFluxo.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const pagarQ = trpc.financeiro.pagar.list.useQuery({ empresaId: EMPRESA_ID, limit: 100 }, { enabled: !!EMPRESA_ID }) as any;
  const receberQ = trpc.financeiro.receber.list.useQuery({ empresaId: EMPRESA_ID, limit: 100 }, { enabled: !!EMPRESA_ID }) as any;
  const dreQ = trpc.financeiro.drePorPlaca.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const veiculosQ = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;

  const pagar = pagarQ.data ?? [];
  const receber = receberQ.data ?? [];
  const veiculos = veiculosQ.data ?? [];
  const dashboard = dashboardQ.data;
  const projecao = projecaoQ.data;

  const utils = trpc.useContext();
  const createPagar = trpc.financeiro.pagar.create.useMutation({
    onSuccess: () => {
      toast.success("Conta a pagar registrada.");
      setShowNovoPagar(false);
      utils.financeiro.pagar.list.invalidate();
      utils.financeiro.pagar.resumo.invalidate();
      utils.financeiro.dashboard.invalidate();
      utils.financeiro.drePorPlaca.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const createReceber = trpc.financeiro.receber.create.useMutation({
    onSuccess: () => {
      toast.success("Conta a receber registrada.");
      setShowNovoReceber(false);
      utils.financeiro.receber.list.invalidate();
      utils.financeiro.receber.resumo.invalidate();
      utils.financeiro.dashboard.invalidate();
      utils.financeiro.drePorPlaca.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const fluxoRows = useMemo(() => {
    const saidas = pagar
      .filter((item: any) => item.status === "pago" && item.dataPagamento)
      .map((item: any) => ({
        id: `p-${item.id}`,
        data: item.dataPagamento,
        descricao: item.descricao,
        tipo: "saida",
        categoria: item.categoria,
        valor: Number(item.valor),
      }));
    const entradas = receber
      .filter((item: any) => item.status === "recebido" && item.dataRecebimento)
      .map((item: any) => ({
        id: `r-${item.id}`,
        data: item.dataRecebimento,
        descricao: item.descricao,
        tipo: "entrada",
        categoria: item.categoria,
        valor: Number(item.valor),
      }));
    return [...entradas, ...saidas].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [pagar, receber]);

  const dreRows = useMemo(() => {
    const receitas = new Map<number, number>();
    const despesas = new Map<number, number>();
    const kms = new Map<number, number>();

    for (const row of dreQ.data?.receitas ?? []) {
      const veiculoId = Number((row as any).veiculoId);
      receitas.set(veiculoId, Number((row as any).total_receita ?? 0));
    }
    for (const row of dreQ.data?.despesas ?? []) {
      const veiculoId = Number((row as any).veiculoId);
      despesas.set(veiculoId, (despesas.get(veiculoId) ?? 0) + Number((row as any).total_despesa ?? 0));
    }
    for (const row of dreQ.data?.kmRodado ?? []) {
      const veiculoId = Number((row as any).veiculoId);
      kms.set(veiculoId, Number((row as any).total_km ?? 0));
    }

    const ids = new Set<number>([...receitas.keys(), ...despesas.keys(), ...kms.keys()]);
    return [...ids].map((veiculoId) => {
      const veiculo = veiculos.find((item: any) => item.id === veiculoId);
      const receita = receitas.get(veiculoId) ?? 0;
      const despesa = despesas.get(veiculoId) ?? 0;
      const km = kms.get(veiculoId) ?? 0;
      const lucro = receita - despesa;
      return {
        veiculoId,
        placa: veiculo?.placa ?? `#${veiculoId}`,
        receita,
        despesa,
        lucro,
        km,
        custoKm: km > 0 ? despesa / km : 0,
        margem: receita > 0 ? (lucro / receita) * 100 : 0,
      };
    }).sort((a, b) => b.lucro - a.lucro);
  }, [dreQ.data, veiculos]);

  const agingPagar = useMemo(() => {
    const buckets = { vencidas: 0, hojea7: 0, dias8a30: 0, acima30: 0 };
    const hoje = new Date();
    for (const item of pagar) {
      if (item.status === "pago" || item.status === "cancelado") continue;
      const diff = Math.ceil((new Date(item.dataVencimento).getTime() - hoje.getTime()) / 86400000);
      if (diff < 0) buckets.vencidas += Number(item.valor);
      else if (diff <= 7) buckets.hojea7 += Number(item.valor);
      else if (diff <= 30) buckets.dias8a30 += Number(item.valor);
      else buckets.acima30 += Number(item.valor);
    }
    return buckets;
  }, [pagar]);

  const agingReceber = useMemo(() => {
    const buckets = { vencidas: 0, hojea7: 0, dias8a30: 0, acima30: 0 };
    const hoje = new Date();
    for (const item of receber) {
      if (item.status === "recebido" || item.status === "cancelado") continue;
      const diff = Math.ceil((new Date(item.dataVencimento).getTime() - hoje.getTime()) / 86400000);
      if (diff < 0) buckets.vencidas += Number(item.valor);
      else if (diff <= 7) buckets.hojea7 += Number(item.valor);
      else if (diff <= 30) buckets.dias8a30 += Number(item.valor);
      else buckets.acima30 += Number(item.valor);
    }
    return buckets;
  }, [receber]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Financeiro
          </h1>
          <p className="text-muted-foreground text-sm">Contas a pagar, contas a receber, fluxo realizado e DRE por veículo.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">Empresa ativa: #{EMPRESA_ID}</Badge>
            {isSimulating && viewAs.empresaNome ? (
              <Badge className="bg-blue-600 text-white">Visualizando como: {viewAs.empresaNome}</Badge>
            ) : (
              <Badge variant="secondary">Visão da empresa do usuário logado</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNovoPagar} onOpenChange={setShowNovoPagar}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Conta a Pagar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
              <ContaPagarForm veiculos={veiculos} onSave={(d) => createPagar.mutate(d)} onClose={() => setShowNovoPagar(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={showNovoReceber} onOpenChange={setShowNovoReceber}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Conta a Receber</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
              <ContaReceberForm onSave={(d) => createReceber.mutate(d)} onClose={() => setShowNovoReceber(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Contas a Pagar</p>
              <TrendingDown className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(pagarResumoQ.data?.pendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(pagarResumoQ.data?.vencido)} vencido</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Contas a Receber</p>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(receberResumoQ.data?.pendente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(receberResumoQ.data?.recebidoMes)} recebido no mês</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Saldo Projetado</p>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <p className={`text-2xl font-bold ${(dashboard?.saldoProjetado ?? 0) >= 0 ? "text-blue-700" : "text-red-600"}`}>
              {formatCurrency(dashboard?.saldoProjetado)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Receber menos pagar</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Lucro do Mês</p>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(dashboard?.lucroMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">Margem {Number(dashboard?.margemMes ?? 0).toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground font-medium mb-1">Receber em 7 dias</p><p className="text-xl font-bold text-green-700">{formatCurrency(projecao?.receber?.dias7)}</p><p className="text-xs text-muted-foreground mt-1">Curto prazo</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground font-medium mb-1">Pagar em 7 dias</p><p className="text-xl font-bold text-red-600">{formatCurrency(projecao?.pagar?.dias7)}</p><p className="text-xs text-muted-foreground mt-1">Compromissos imediatos</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground font-medium mb-1">Receber em 30 dias</p><p className="text-xl font-bold">{formatCurrency(projecao?.receber?.dias30)}</p><p className="text-xs text-muted-foreground mt-1">Janela projetada</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground font-medium mb-1">Pagar em 30 dias</p><p className="text-xl font-bold">{formatCurrency(projecao?.pagar?.dias30)}</p><p className="text-xs text-muted-foreground mt-1">Planejamento financeiro</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="pagar">Pagar</TabsTrigger>
          <TabsTrigger value="receber">Receber</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Próximos compromissos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {pagar.slice(0, 5).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="py-2">
                          <p className="text-sm font-medium">{p.descricao}</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.dataVencimento).toLocaleDateString("pt-BR")}</p>
                        </TableCell>
                        <TableCell className="py-2 text-right font-bold">{formatCurrency(p.valor)}</TableCell>
                        <TableCell className="py-2 text-right"><Badge className={STATUS_PAGAR_COLORS[p.status]}>{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {pagar.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhuma conta a pagar cadastrada.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Alertas financeiros</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 text-red-500" />Contas vencidas</div>
                  <span className="font-semibold">{dashboard?.alertas?.contasVencidas ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-sm"><ArrowUpCircle className="h-4 w-4 text-orange-500" />Recebimentos vencidos</div>
                  <span className="font-semibold">{dashboard?.alertas?.contasReceberVencidas ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-sm"><ArrowDownCircle className="h-4 w-4 text-blue-500" />Adiantamentos em aberto</div>
                  <span className="font-semibold">{dashboard?.alertas?.adiantamentosPendentes ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" />Frete do mês</div>
                  <span className="font-semibold">{formatCurrency(dashboard?.totalFreteMes)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging de contas a pagar</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-red-50 text-red-700 p-3"><p className="text-xs font-medium">Vencidas</p><p className="text-lg font-bold">{formatCurrency(agingPagar.vencidas)}</p></div>
                <div className="rounded-lg bg-amber-50 text-amber-700 p-3"><p className="text-xs font-medium">0 a 7 dias</p><p className="text-lg font-bold">{formatCurrency(agingPagar.hojea7)}</p></div>
                <div className="rounded-lg bg-blue-50 text-blue-700 p-3"><p className="text-xs font-medium">8 a 30 dias</p><p className="text-lg font-bold">{formatCurrency(agingPagar.dias8a30)}</p></div>
                <div className="rounded-lg bg-slate-50 text-slate-700 p-3"><p className="text-xs font-medium">Acima de 30</p><p className="text-lg font-bold">{formatCurrency(agingPagar.acima30)}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Aging de contas a receber</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-red-50 text-red-700 p-3"><p className="text-xs font-medium">Vencidas</p><p className="text-lg font-bold">{formatCurrency(agingReceber.vencidas)}</p></div>
                <div className="rounded-lg bg-amber-50 text-amber-700 p-3"><p className="text-xs font-medium">0 a 7 dias</p><p className="text-lg font-bold">{formatCurrency(agingReceber.hojea7)}</p></div>
                <div className="rounded-lg bg-blue-50 text-blue-700 p-3"><p className="text-xs font-medium">8 a 30 dias</p><p className="text-lg font-bold">{formatCurrency(agingReceber.dias8a30)}</p></div>
                <div className="rounded-lg bg-slate-50 text-slate-700 p-3"><p className="text-xs font-medium">Acima de 30</p><p className="text-lg font-bold">{formatCurrency(agingReceber.acima30)}</p></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pagar" className="mt-4">
          <Card>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b">
              <Input placeholder="Buscar pagar..." value={searchPagar} onChange={(e) => setSearchPagar(e.target.value)} />
              <Select value={statusPagarFiltro} onValueChange={(v: any) => setStatusPagarFiltro(v)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground flex items-center">{pagarFiltrado.length} registro(s)</div>
            </div>
            <div className="md:hidden space-y-3 p-4">
              {pagarFiltrado.map((p: any) => (
                <div key={p.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.categoria}</p>
                    </div>
                    <Badge className={STATUS_PAGAR_COLORS[p.status]}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Vencimento</span><span>{formatDate(p.dataVencimento)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Fornecedor</span><span>{p.fornecedor || "—"}</span></div>
                  <div className="text-lg font-bold">{formatCurrency(p.valor)}</div>
                </div>
              ))}
              {pagarFiltrado.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma conta a pagar para o filtro atual.</p>}
            </div>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagarFiltrado.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.dataVencimento).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{p.descricao}</TableCell>
                    <TableCell className="capitalize">{p.categoria}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(p.valor)}</TableCell>
                    <TableCell><Badge className={STATUS_PAGAR_COLORS[p.status]}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {pagarFiltrado.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta a pagar para o filtro atual.</TableCell></TableRow>}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="receber" className="mt-4">
          <Card>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 border-b">
              <Input placeholder="Buscar receber..." value={searchReceber} onChange={(e) => setSearchReceber(e.target.value)} />
              <Select value={statusReceberFiltro} onValueChange={(v: any) => setStatusReceberFiltro(v)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground flex items-center">{receberFiltrado.length} registro(s)</div>
            </div>
            <div className="md:hidden space-y-3 p-4">
              {receberFiltrado.map((r: any) => (
                <div key={r.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{r.descricao}</p>
                      <p className="text-xs text-muted-foreground">{r.cliente || "Sem cliente vinculado"}</p>
                    </div>
                    <Badge className={STATUS_RECEBER_COLORS[r.status]}>{r.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Vencimento</span><span>{formatDate(r.dataVencimento)}</span></div>
                  <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Categoria</span><span className="capitalize">{r.categoria}</span></div>
                  <div className="text-lg font-bold">{formatCurrency(r.valor)}</div>
                </div>
              ))}
              {receberFiltrado.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma conta a receber para o filtro atual.</p>}
            </div>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receberFiltrado.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.dataVencimento).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell>{r.cliente || "—"}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(r.valor)}</TableCell>
                    <TableCell><Badge className={STATUS_RECEBER_COLORS[r.status]}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {receberFiltrado.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conta a receber para o filtro atual.</TableCell></TableRow>}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fluxo" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Fluxo de Caixa Realizado</CardTitle></CardHeader>
            <CardContent>
              <div className="md:hidden space-y-3">
                {fluxoRows.map((row) => (
                  <div key={row.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{row.descricao}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(row.data)} · {row.categoria}</p>
                      </div>
                      <Badge variant={row.tipo === "entrada" ? "default" : "secondary"}>{row.tipo === "entrada" ? "Entrada" : "Saída"}</Badge>
                    </div>
                    <div className={`text-lg font-bold mt-3 ${row.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>{formatCurrency(row.valor)}</div>
                  </div>
                ))}
                {fluxoRows.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum pagamento ou recebimento realizado ainda.</p>}
              </div>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fluxoRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{new Date(row.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{row.descricao}</TableCell>
                      <TableCell className="capitalize">{row.categoria}</TableCell>
                      <TableCell>
                        <Badge variant={row.tipo === "entrada" ? "default" : "secondary"}>
                          {row.tipo === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${row.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(row.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {fluxoRows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum pagamento ou recebimento realizado ainda.</TableCell></TableRow>}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="mt-4">
          <Card>
            <CardHeader><CardTitle>DRE por veículo</CardTitle></CardHeader>
            <CardContent>
              <div className="md:hidden space-y-3">
                {dreRows.map((row) => (
                  <div key={row.veiculoId} className="rounded-xl border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{row.placa}</p>
                      <Badge variant="outline">{row.margem.toFixed(1)}%</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-muted-foreground">Receita</p><p className="font-semibold">{formatCurrency(row.receita)}</p></div>
                      <div><p className="text-muted-foreground">Despesa</p><p className="font-semibold">{formatCurrency(row.despesa)}</p></div>
                      <div><p className="text-muted-foreground">Lucro</p><p className={`font-semibold ${row.lucro >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(row.lucro)}</p></div>
                      <div><p className="text-muted-foreground">Custo/KM</p><p className="font-semibold">{formatCurrency(row.custoKm)}</p></div>
                    </div>
                  </div>
                ))}
                {dreRows.length === 0 && <p className="text-center text-muted-foreground py-8">Sem dados suficientes para gerar o DRE por veículo.</p>}
              </div>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Despesa</TableHead>
                    <TableHead>Lucro</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Custo/KM</TableHead>
                    <TableHead>Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dreRows.map((row) => (
                    <TableRow key={row.veiculoId}>
                      <TableCell className="font-medium">{row.placa}</TableCell>
                      <TableCell>{formatCurrency(row.receita)}</TableCell>
                      <TableCell>{formatCurrency(row.despesa)}</TableCell>
                      <TableCell className={row.lucro >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{formatCurrency(row.lucro)}</TableCell>
                      <TableCell>{row.km.toLocaleString("pt-BR")} km</TableCell>
                      <TableCell>{formatCurrency(row.custoKm)}</TableCell>
                      <TableCell>{row.margem.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {dreRows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem dados suficientes para gerar o DRE por veículo.</TableCell></TableRow>}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
  const pagarFiltrado = useMemo(() => {
    const term = searchPagar.trim().toLowerCase();
    return pagar.filter((item: any) => {
      const statusOk = statusPagarFiltro === "todos" || item.status === statusPagarFiltro;
      const textOk = !term || [item.descricao, item.categoria, item.fornecedor]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(term));
      return statusOk && textOk;
    });
  }, [pagar, searchPagar, statusPagarFiltro]);

  const receberFiltrado = useMemo(() => {
    const term = searchReceber.trim().toLowerCase();
    return receber.filter((item: any) => {
      const statusOk = statusReceberFiltro === "todos" || item.status === statusReceberFiltro;
      const textOk = !term || [item.descricao, item.cliente, item.categoria, item.cteNumero]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(term));
      return statusOk && textOk;
    });
  }, [receber, searchReceber, statusReceberFiltro]);
