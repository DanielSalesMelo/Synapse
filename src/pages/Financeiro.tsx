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
const MOCK_FLUXO: any[] = [];
const MOCK_CONCILIACAO: any[] = [];
const MOCK_DRE: any[] = [];

export default function Financeiro() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [tab, setTab] = useState("visao-geral");
  const [showNovoPagar, setShowNovoPagar] = useState(false);
  const [showNovoReceber, setShowNovoReceber] = useState(false);

  // TRPC
  const { data: resumo } = trpc.financeiro.pagar.resumo.useQuery({ empresaId: EMPRESA_ID });
  const { data: pagar = [] } = trpc.financeiro.pagar.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: receber = [] } = trpc.financeiro.receber.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: funcionarios = [] } = trpc.funcionarios.list.useQuery({ empresaId: EMPRESA_ID });

  const utils = trpc.useContext();
  const createPagar = trpc.financeiro.pagar.create.useMutation({
    onSuccess: () => {
      toast.success("Conta a pagar registrada!");
      setShowNovoPagar(false);
      utils.financeiro.pagar.list.invalidate();
      utils.financeiro.pagar.resumo.invalidate();
    }
  });
  const createReceber = trpc.financeiro.receber.create.useMutation({
    onSuccess: () => {
      toast.success("Conta a receber registrada!");
      setShowNovoReceber(false);
      utils.financeiro.receber.list.invalidate();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Financeiro
          </h1>
          <p className="text-muted-foreground text-sm">Contas a Pagar · Receber · Fluxo de Caixa · DRE</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNovoPagar} onOpenChange={setShowNovoPagar}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Conta a Pagar</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
              <ContaPagarForm veiculos={veiculos} funcionarios={funcionarios} onSave={d => createPagar.mutate(d)} onClose={() => setShowNovoPagar(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={showNovoReceber} onOpenChange={setShowNovoReceber}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Conta a Receber</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Nova Conta a Receber</DialogTitle></DialogHeader>
              <ContaReceberForm onSave={d => createReceber.mutate(d)} onClose={() => setShowNovoReceber(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Total Pendente</p>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(resumo?.pendente)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Total Vencido</p>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(resumo?.vencido)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Pago no Mês</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo?.pagoMes)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Próximos Vencimentos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {pagar.slice(0, 5).map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="py-2">
                          <p className="text-sm font-medium">{p.descricao}</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.dataVencimento).toLocaleDateString()}</p>
                        </TableCell>
                        <TableCell className="text-right py-2 font-bold">{formatCurrency(p.valor)}</TableCell>
                        <TableCell className="text-right py-2"><Badge className={STATUS_PAGAR_COLORS[p.status]}>{p.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {pagar.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhuma conta pendente</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Contas a Receber</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {receber.slice(0, 5).map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="py-2">
                          <p className="text-sm font-medium">{r.descricao}</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.dataVencimento).toLocaleDateString()}</p>
                        </TableCell>
                        <TableCell className="text-right py-2 font-bold">{formatCurrency(r.valor)}</TableCell>
                        <TableCell className="text-right py-2"><Badge className={STATUS_RECEBER_COLORS[r.status]}>{r.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {receber.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum recebimento pendente</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pagar" className="mt-4">
          <Card>
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
                {pagar.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.dataVencimento).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{p.descricao}</TableCell>
                    <TableCell className="capitalize">{p.categoria}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(p.valor)}</TableCell>
                    <TableCell><Badge className={STATUS_PAGAR_COLORS[p.status]}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="receber" className="mt-4">
          <Card>
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
                {receber.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.dataVencimento).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell>{r.cliente || "—"}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(r.valor)}</TableCell>
                    <TableCell><Badge className={STATUS_RECEBER_COLORS[r.status]}>{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="fluxo" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Fluxo de Caixa Realizado</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_FLUXO.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(f.data).toLocaleDateString()}</TableCell>
                      <TableCell>{f.descricao}</TableCell>
                      <TableCell><Badge variant={f.tipo === "entrada" ? "default" : "destructive"}>{f.tipo}</Badge></TableCell>
                      <TableCell className={`text-right font-bold ${f.tipo === "entrada" ? "text-green-600" : "text-red-600"}`}>{formatCurrency(f.valor)}</TableCell>
                    </TableRow>
                  ))}
                  {MOCK_FLUXO.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum dado de fluxo de caixa disponível</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="mt-4">
          <Card>
            <CardHeader><CardTitle>DRE — Demonstrativo de Resultados</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {MOCK_DRE.map((d, i) => (
                  <div key={i} className={`flex justify-between p-2 rounded ${d.valor < 0 ? "bg-red-50" : "bg-green-50"}`}>
                    <span className="font-medium">{d.categoria}</span>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(d.valor)}</p>
                      <p className="text-xs text-muted-foreground">{d.percentual}%</p>
                    </div>
                  </div>
                ))}
                {MOCK_DRE.length === 0 && <div className="text-center text-muted-foreground py-8">Nenhum dado de DRE disponível</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
