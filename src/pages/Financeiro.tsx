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
import { Plus, TrendingDown, TrendingUp, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const EMPRESA_ID = 1;

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

export default function Financeiro() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const activeTab = location.includes("receber") ? "receber" : location.includes("adiantamentos") ? "adiantamentos" : "pagar";
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
        <h1 className="text-2xl font-bold">Financeiro</h1>

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
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
              <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
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
        </Tabs>
      </div>
);
}
