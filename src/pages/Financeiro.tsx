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
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, TrendingDown, TrendingUp, Wallet, CheckCircle2, AlertCircle, DollarSign, BarChart3, RefreshCw, Banknote, PieChart, FileSpreadsheet, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useViewAs } from "@/contexts/ViewAsContext";


function formatCurrency(v: any) {
  if (!v && v !== 0) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function ContaPagarForm({ veiculos, funcionarios, onSave, onClose }: {
  veiculos: any[];
  funcionarios: any[];
  onSave: (d: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    descricao: "",
    categoria: "outro",
    valor: "",
    dataVencimento: new Date().toISOString().split("T")[0],
    dataPagamento: "",
    status: "pendente",
    fornecedor: "",
    veiculoId: "",
    funcionarioId: "",
    observacoes: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      empresaId: EMPRESA_ID,
      descricao: form.descricao,
      categoria: form.categoria as any,
      valor: form.valor,
      dataVencimento: form.dataVencimento,
      dataPagamento: form.dataPagamento || null,
      status: form.status as any,
      fornecedor: form.fornecedor || undefined,
      veiculoId: form.veiculoId ? Number(form.veiculoId) : null,
      funcionarioId: form.funcionarioId ? Number(form.funcionarioId) : null,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label>Descrição *</Label>
          <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIA_PAGAR.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valor (R$) *</Label>
          <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento *</Label>
          <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.status === "pago" && (
          <div className="space-y-1.5">
            <Label>Data de Pagamento</Label>
            <Input type="date" value={form.dataPagamento} onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Fornecedor</Label>
          <Input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Veículo (opcional)</Label>
          <Select value={form.veiculoId || "none"} onValueChange={v => setForm(f => ({ ...f, veiculoId: v === "none" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {veiculos.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Registrar</Button>
      </div>
    </form>
  );
}

function ContaReceberForm({ onSave, onClose }: { onSave: (d: any) => void; onClose: () => void }) {
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
      categoria: form.categoria as any,
      valor: form.valor,
      dataVencimento: form.dataVencimento,
      dataRecebimento: form.dataRecebimento || null,
      status: form.status as any,
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
          <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIA_RECEBER.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valor (R$) *</Label>
          <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento *</Label>
          <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
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
          <Input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Nº CTE</Label>
          <Input value={form.cteNumero} onChange={e => setForm(f => ({ ...f, cteNumero: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">Registrar</Button>
      </div>
    </form>
  );
}

// ─── Mock data para Fluxo de Caixa ─────────────────────────────────────────
const MOCK_FLUXO = [
  { data: "2025-04-01", descricao: "Recebimento Frete ABC", tipo: "entrada", valor: 12500, saldo: 45200 },
  { data: "2025-04-02", descricao: "Combustível Posto BR", tipo: "saida", valor: 3200, saldo: 42000 },
  { data: "2025-04-03", descricao: "Manutenção Veículo KJH-1234", tipo: "saida", valor: 1800, saldo: 40200 },
  { data: "2025-04-04", descricao: "Recebimento CTE-00892", tipo: "entrada", valor: 8700, saldo: 48900 },
  { data: "2025-04-05", descricao: "Salários Motoristas", tipo: "saida", valor: 15600, saldo: 33300 },
  { data: "2025-04-07", descricao: "Recebimento Frete XYZ", tipo: "entrada", valor: 22000, saldo: 55300 },
  { data: "2025-04-08", descricao: "Pedágio Mensal", tipo: "saida", valor: 2100, saldo: 53200 },
];

const MOCK_CONCILIACAO = [
  { id: 1, data: "2025-04-15", descricao: "Dep. Transportes ABC", valorBanco: 12500, valorSistema: 12500, status: "conciliado" },
  { id: 2, data: "2025-04-14", descricao: "Deb. Posto Ipiranga", valorBanco: -3200, valorSistema: -3200, status: "conciliado" },
  { id: 3, data: "2025-04-13", descricao: "Dep. Logística Sul", valorBanco: 8700, valorSistema: null, status: "pendente" },
  { id: 4, data: "2025-04-12", descricao: "Deb. Manutenção", valorBanco: -1850, valorSistema: -1800, status: "divergente" },
  { id: 5, data: "2025-04-11", descricao: "Dep. Frete Nacional", valorBanco: 22000, valorSistema: 22000, status: "conciliado" },
];

const MOCK_DRE = [
  { categoria: "Receita Bruta de Fretes", valor: 185000, tipo: "receita" },
  { categoria: "Deduções (Impostos s/ Serviço)", valor: -9250, tipo: "deducao" },
  { categoria: "Receita Líquida", valor: 175750, tipo: "subtotal" },
  { categoria: "Combustível", valor: -42000, tipo: "custo" },
  { categoria: "Manutenção", valor: -18500, tipo: "custo" },
  { categoria: "Pneus", valor: -8200, tipo: "custo" },
  { categoria: "Pedágios", valor: -12400, tipo: "custo" },
  { categoria: "Lucro Bruto", valor: 94650, tipo: "subtotal" },
  { categoria: "Salários e Encargos", valor: -48200, tipo: "despesa" },
  { categoria: "Despesas Administrativas", valor: -8500, tipo: "despesa" },
  { categoria: "Depreciação de Frota", valor: -12000, tipo: "despesa" },
  { categoria: "EBITDA", valor: 25950, tipo: "resultado" },
];

const CONCIL_COLORS: Record<string, string> = {
  conciliado: "bg-green-100 text-green-700",
  pendente: "bg-yellow-100 text-yellow-700",
  divergente: "bg-red-100 text-red-700",
};

export default function Financeiro() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { t } = useTranslation();
  const [location] = useLocation();
  const activeTab = location.includes("receber") ? "receber" : location.includes("adiantamentos") ? "adiantamentos" : location.includes("fluxo") ? "fluxo" : location.includes("conciliacao") ? "conciliacao" : location.includes("dre") ? "dre" : "pagar";
  const [openPagar, setOpenPagar] = useState(false);
  const [openReceber, setOpenReceber] = useState(false);
  const utils = trpc.useUtils();

  const { data: contasPagar = [], isLoading: loadingPagar } = trpc.financeiro.pagar.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: contasReceber = [], isLoading: loadingReceber } = trpc.financeiro.receber.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: resumoPagar } = trpc.financeiro.pagar.resumo.useQuery({ empresaId: EMPRESA_ID });
  const { data: resumoReceber } = trpc.financeiro.receber.resumo.useQuery({ empresaId: EMPRESA_ID });
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: funcionarios = [] } = trpc.funcionarios.list.useQuery({ empresaId: EMPRESA_ID });

  const createPagarMut = trpc.financeiro.pagar.create.useMutation({
    onSuccess: () => { utils.financeiro.pagar.list.invalidate(); setOpenPagar(false); toast.success("Conta registrada!"); },
    onError: (e) => toast.error(e.message),
  });
  const createReceberMut = trpc.financeiro.receber.create.useMutation({
    onSuccess: () => { utils.financeiro.receber.list.invalidate(); setOpenReceber(false); toast.success("Conta registrada!"); },
    onError: (e) => toast.error(e.message),
  });
  const marcarPagoMut = trpc.financeiro.pagar.update.useMutation({
    onSuccess: () => { utils.financeiro.pagar.list.invalidate(); toast.success("Marcado como pago!"); },
    onError: (e) => toast.error(e.message),
  });

  return (
<div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" />Financeiro</h1>
            <p className="text-muted-foreground text-sm">Contas · Fluxo de Caixa · Conciliação Bancária · DRE · Adiantamentos</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <p className="text-xs text-muted-foreground">A Pagar</p>
              </div>
              <p className="text-xl font-bold">{formatCurrency(resumoPagar?.pendente)}</p>
              {(resumoPagar?.vencido ?? 0) > 0 && (
                <p className="text-xs text-red-500 mt-1">+ {formatCurrency(resumoPagar?.vencido)} vencido</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">A Receber</p>
              </div>
              <p className="text-xl font-bold">{formatCurrency(resumoReceber?.pendente)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                <p className="text-xs text-muted-foreground">Pago no mês</p>
              </div>
              <p className="text-xl font-bold">{formatCurrency(resumoPagar?.pagoMes)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-purple-500" />
                <p className="text-xs text-muted-foreground">Saldo projetado</p>
              </div>
              <p className={`text-xl font-bold ${((resumoReceber?.pendente ?? 0) - (resumoPagar?.pendente ?? 0)) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency((resumoReceber?.pendente ?? 0) - (resumoPagar?.pendente ?? 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="pagar"><TrendingDown className="h-3.5 w-3.5 mr-1" />A Pagar</TabsTrigger>
              <TabsTrigger value="receber"><TrendingUp className="h-3.5 w-3.5 mr-1" />A Receber</TabsTrigger>
              <TabsTrigger value="fluxo"><Banknote className="h-3.5 w-3.5 mr-1" />Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="conciliacao"><Receipt className="h-3.5 w-3.5 mr-1" />Conciliação</TabsTrigger>
              <TabsTrigger value="dre"><PieChart className="h-3.5 w-3.5 mr-1" />DRE</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Dialog open={openPagar} onOpenChange={setOpenPagar}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />A Pagar</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
                  <ContaPagarForm veiculos={veiculos} funcionarios={funcionarios} onSave={d => createPagarMut.mutate(d)} onClose={() => setOpenPagar(false)} />
                </DialogContent>
              </Dialog>
              <Dialog open={openReceber} onOpenChange={setOpenReceber}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />A Receber</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
                  <ContaReceberForm onSave={d => createReceberMut.mutate(d)} onClose={() => setOpenReceber(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="pagar">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingPagar ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                      ) : contasPagar.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta registrada</TableCell></TableRow>
                      ) : contasPagar.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-sm">{c.descricao}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.categoria}</TableCell>
                          <TableCell className="text-sm">{c.fornecedor ?? "—"}</TableCell>
                          <TableCell className="text-sm">{new Date(c.dataVencimento).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{formatCurrency(c.valor)}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${STATUS_PAGAR_COLORS[c.status] ?? ""}`}>{c.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {c.status === "pendente" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => marcarPagoMut.mutate({
                                  id: c.id,
                                  status: "pago",
                                  dataPagamento: new Date().toISOString().split("T")[0],
                                })}>
                                Pagar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receber">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>CTE</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingReceber ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                      ) : contasReceber.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta registrada</TableCell></TableRow>
                      ) : contasReceber.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-sm">{c.descricao}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.categoria}</TableCell>
                          <TableCell className="text-sm">{c.cliente ?? "—"}</TableCell>
                          <TableCell className="text-sm">{c.cteNumero ?? "—"}</TableCell>
                          <TableCell className="text-sm">{new Date(c.dataVencimento).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{formatCurrency(c.valor)}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${STATUS_RECEBER_COLORS[c.status] ?? ""}`}>{c.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── FLUXO DE CAIXA ── */}
          <TabsContent value="fluxo" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4" />Fluxo de Caixa — Abril/2025</CardTitle></CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo Acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_FLUXO.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(f.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium text-sm">{f.descricao}</TableCell>
                      <TableCell><Badge className={`text-xs ${f.tipo === "entrada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{f.tipo}</Badge></TableCell>
                      <TableCell className={`text-right font-bold text-sm ${f.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>
                        {f.tipo === "entrada" ? "+" : "-"}{formatCurrency(f.valor)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(f.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── CONCILIAÇÃO BANCÁRIA ── */}
          <TabsContent value="conciliacao" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-muted-foreground">Conciliação automática entre extrato bancário e lançamentos do sistema.</p>
              <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Importar Extrato OFX</Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Banco</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CONCILIACAO.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(c.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium text-sm">{c.descricao}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${(c.valorBanco ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(c.valorBanco)}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${c.valorSistema === null ? "text-muted-foreground" : (c.valorSistema ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{c.valorSistema !== null ? formatCurrency(c.valorSistema) : "—"}</TableCell>
                      <TableCell className="text-sm">
                        {c.valorSistema !== null ? (
                          <span className={Math.abs(c.valorBanco - (c.valorSistema ?? 0)) > 0 ? "text-red-600 font-bold" : "text-green-600"}>
                            {formatCurrency(c.valorBanco - (c.valorSistema ?? 0))}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell><Badge className={`text-xs ${CONCIL_COLORS[c.status]}`}>{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── DRE ── */}
          <TabsContent value="dre" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-muted-foreground">Demonstrativo de Resultado do Exercício — Abril/2025</p>
              <Button size="sm" variant="outline"><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel</Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">% Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DRE.map((d, i) => (
                    <TableRow key={i} className={d.tipo === "subtotal" || d.tipo === "resultado" ? "font-bold bg-muted/30" : ""}>
                      <TableCell className={`text-sm ${d.tipo === "resultado" ? "text-primary" : d.tipo === "subtotal" ? "font-semibold" : ""}`}>
                        {d.tipo === "custo" || d.tipo === "despesa" || d.tipo === "deducao" ? (
                          <span className="pl-4">{d.categoria}</span>
                        ) : d.categoria}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${d.valor >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(Math.abs(d.valor))}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {Math.abs(Math.round((d.valor / 185000) * 100))}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
);
}
