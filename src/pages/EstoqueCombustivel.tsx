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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuel, Plus, TrendingUp, TrendingDown, Droplets, AlertTriangle, DollarSign, BarChart3, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;
const CAPACIDADE_DIESEL = 10000;
const CAPACIDADE_ARLA = 2000;

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function GaugeTanque({ litros, capacidade, tipo, custoMedio }: { litros: number; capacidade: number; tipo: string; custoMedio?: number }) {
  const pct = Math.min(100, Math.max(0, (litros / capacidade) * 100));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const color = pct <= 15 ? "#ef4444" : pct <= 30 ? "#f59e0b" : "#22c55e";
  const status = pct <= 15 ? "Crítico" : pct <= 30 ? "Baixo" : pct <= 70 ? "Normal" : "Cheio";
  const statusColor = pct <= 15 ? "bg-red-100 text-red-700" : pct <= 30 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="14" />
          <circle
            cx="80" cy="80" r={radius} fill="none"
            stroke={color} strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
          <span className="text-xs text-muted-foreground">{tipo}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">{litros.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} L</p>
        <p className="text-xs text-muted-foreground">de {capacidade.toLocaleString("pt-BR")} L</p>
        <Badge className={`mt-1 text-xs ${statusColor}`}>{status}</Badge>
        {custoMedio !== undefined && custoMedio > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Custo médio: <span className="font-semibold text-foreground">R$ {custoMedio.toFixed(3)}/L</span>
          </p>
        )}
      </div>
    </div>
  );
}

function CustoMedioCard({ titulo, dados }: {
  titulo: string;
  dados: {
    custoMedio: number;
    totalComprado: number;
    totalInvestido: number;
    ultimaCompra: { data: string; valorUnitario: number; fornecedor: string | null } | null;
    historicoCompras: { data: string; quantidade: number; valorUnitario: number; valorTotal: number; custoMedio: number; fornecedor: string | null }[];
  } | undefined;
}) {
  if (!dados || dados.totalComprado === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma compra de {titulo} registrada</p>
          <p className="text-xs text-muted-foreground mt-1">Registre uma entrada com valor para calcular o custo médio</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          Custo Médio — {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-green-500/10 text-center min-w-0">
            <p className="text-xs text-muted-foreground truncate">Custo Médio/L</p>
            <p className="text-sm sm:text-base font-bold text-green-600 truncate">R$ {dados.custoMedio.toFixed(3)}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-center min-w-0">
            <p className="text-xs text-muted-foreground truncate">Total Comprado</p>
            <p className="text-sm sm:text-base font-bold text-blue-600 truncate">{dados.totalComprado.toLocaleString("pt-BR")} L</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 text-center min-w-0">
            <p className="text-xs text-muted-foreground truncate">Total Investido</p>
            <p className="text-sm sm:text-base font-bold text-orange-600 truncate">{fmt(dados.totalInvestido)}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-center min-w-0">
            <p className="text-xs text-muted-foreground truncate">Última Compra</p>
            <p className="text-sm sm:text-base font-bold text-purple-600 truncate">
              {dados.ultimaCompra ? `R$ ${dados.ultimaCompra.valorUnitario.toFixed(3)}` : "—"}
            </p>
            {dados.ultimaCompra?.fornecedor && (
              <p className="text-xs text-muted-foreground truncate">{dados.ultimaCompra.fornecedor}</p>
            )}
          </div>
        </div>

        {/* Histórico de compras */}
        {dados.historicoCompras.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico de Compras (últimas {dados.historicoCompras.length})</p>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 pr-3">Data</th>
                    <th className="text-right py-1.5 pr-3">Qtd (L)</th>
                    <th className="text-right py-1.5 pr-3">R$/L</th>
                    <th className="text-right py-1.5 pr-3">Total</th>
                    <th className="text-right py-1.5 pr-3">Custo Médio</th>
                    <th className="text-left py-1.5">Fornecedor</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dados.historicoCompras].reverse().map((c, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="py-1.5 pr-3">{new Date(c.data).toLocaleDateString("pt-BR")}</td>
                      <td className="py-1.5 pr-3 text-right font-medium">{c.quantidade.toLocaleString("pt-BR")}</td>
                      <td className="py-1.5 pr-3 text-right">R$ {c.valorUnitario.toFixed(3)}</td>
                      <td className="py-1.5 pr-3 text-right">{fmt(c.valorTotal)}</td>
                      <td className="py-1.5 pr-3 text-right font-semibold text-green-600">R$ {c.custoMedio.toFixed(3)}</td>
                      <td className="py-1.5 text-muted-foreground truncate max-w-[120px]">{c.fornecedor || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EstoqueCombustivel() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "diesel" as "diesel" | "arla",
    operacao: "entrada" as "entrada" | "saida",
    data: new Date().toISOString().split("T")[0],
    quantidade: "",
    valorUnitario: "",
    fornecedor: "",
    notaFiscal: "",
    observacoes: "",
  });

  const { data: saldo = { diesel: 0, arla: 0 }, refetch: refetchSaldo } =
    trpc.frota.tanque.saldoAtual.useQuery({ empresaId: EMPRESA_ID });

  const { data: custoMedio, refetch: refetchCusto } =
    trpc.frota.tanque.custoMedio.useQuery({ empresaId: EMPRESA_ID });

  const { data: historico = [], refetch: refetchHistorico } =
    trpc.frota.tanque.list.useQuery({ empresaId: EMPRESA_ID, limit: 100 });

  const createMutation = trpc.frota.tanque.create.useMutation({
    onSuccess: () => {
      toast.success("Registrado com sucesso!");
      setModalOpen(false);
      setForm({ tipo: "diesel", operacao: "entrada", data: new Date().toISOString().split("T")[0], quantidade: "", valorUnitario: "", fornecedor: "", notaFiscal: "", observacoes: "" });
      refetchSaldo();
      refetchHistorico();
      refetchCusto();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.quantidade || Number(form.quantidade) <= 0) {
      toast.error("Informe a quantidade em litros");
      return;
    }
    const valorTotal = form.quantidade && form.valorUnitario
      ? String(Number(form.quantidade) * Number(form.valorUnitario))
      : undefined;
    createMutation.mutate({
      empresaId: EMPRESA_ID,
      tipo: form.tipo,
      operacao: form.operacao,
      data: form.data,
      quantidade: form.quantidade,
      valorUnitario: form.valorUnitario || null,
      valorTotal: valorTotal || null,
      fornecedor: form.fornecedor || undefined,
      notaFiscal: form.notaFiscal || undefined,
      observacoes: form.observacoes || undefined,
    });
  };

  const dieselPct = Math.min(100, (saldo.diesel / CAPACIDADE_DIESEL) * 100);
  const arlaPct = Math.min(100, (saldo.arla / CAPACIDADE_ARLA) * 100);

  // Valor do estoque atual baseado no custo médio
  const valorEstoqueDiesel = custoMedio ? saldo.diesel * custoMedio.diesel.custoMedio : 0;
  const valorEstoqueArla = custoMedio ? saldo.arla * custoMedio.arla.custoMedio : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="w-6 h-6 text-orange-500" />
            Estoque de Combustível
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Controle do tanque interno — saldo, custo médio e movimentações</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <Plus className="w-4 h-4" /> Registrar Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Movimentação</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="arla">ARLA 32</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Operação *</Label>
                <Select value={form.operacao} onValueChange={(v) => setForm(f => ({ ...f, operacao: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (compra)</SelectItem>
                    <SelectItem value="saida">Saída (abastecimento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Quantidade (litros) *</Label>
                <Input type="number" placeholder="0,000" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Valor Unitário (R$/L) {form.operacao === "entrada" ? "*" : ""}</Label>
                <Input type="number" step="0.001" placeholder="0,000" value={form.valorUnitario} onChange={e => setForm(f => ({ ...f, valorUnitario: e.target.value }))} />
                {form.operacao === "entrada" && (
                  <p className="text-xs text-muted-foreground">Informe o preço por litro para calcular o custo médio</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Nota Fiscal</Label>
                <Input placeholder="Nº NF" value={form.notaFiscal} onChange={e => setForm(f => ({ ...f, notaFiscal: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Fornecedor</Label>
                <Input placeholder="Nome do fornecedor" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Input placeholder="Observações opcionais" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              {form.quantidade && form.valorUnitario && (
                <div className="col-span-2 p-3 bg-muted rounded-lg text-sm flex justify-between">
                  <span>
                    <span className="font-medium">Valor Total: </span>
                    {(Number(form.quantidade) * Number(form.valorUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  {custoMedio && form.operacao === "entrada" && (
                    <span className="text-muted-foreground">
                      Custo médio atual: R$ {form.tipo === "diesel" ? custoMedio.diesel.custoMedio.toFixed(3) : custoMedio.arla.custoMedio.toFixed(3)}/L
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-orange-500 hover:bg-orange-600 text-white">
                {createMutation.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Valor do estoque */}
      {(valorEstoqueDiesel > 0 || valorEstoqueArla > 0) && (
        <Card className="border-green-200 bg-green-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Valor Estimado do Estoque Atual</p>
                <p className="text-xs text-muted-foreground">Baseado no custo médio ponderado de cada tipo</p>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              {valorEstoqueDiesel > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Diesel</p>
                  <p className="text-lg font-bold text-green-600">{fmt(valorEstoqueDiesel)}</p>
                </div>
              )}
              {valorEstoqueArla > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">ARLA</p>
                  <p className="text-lg font-bold text-green-600">{fmt(valorEstoqueArla)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-green-700">{fmt(valorEstoqueDiesel + valorEstoqueArla)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Diesel</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <GaugeTanque litros={saldo.diesel} capacidade={CAPACIDADE_DIESEL} tipo="Diesel" custoMedio={custoMedio?.diesel.custoMedio} />
            <div className="grid grid-cols-2 gap-3 flex-1 w-full">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="text-lg font-bold text-green-600">{saldo.diesel.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} L</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Capacidade</p>
                <p className="text-lg font-bold text-blue-600">{CAPACIDADE_DIESEL.toLocaleString("pt-BR")} L</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Espaço Livre</p>
                <p className="text-lg font-bold text-red-500">{Math.max(0, CAPACIDADE_DIESEL - saldo.diesel).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} L</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Nível</p>
                <p className="text-lg font-bold text-yellow-600">{dieselPct.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ARLA 32</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <GaugeTanque litros={saldo.arla} capacidade={CAPACIDADE_ARLA} tipo="ARLA 32" custoMedio={custoMedio?.arla.custoMedio} />
            <div className="grid grid-cols-2 gap-3 flex-1 w-full">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="text-lg font-bold text-green-600">{saldo.arla.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} L</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Capacidade</p>
                <p className="text-lg font-bold text-blue-600">{CAPACIDADE_ARLA.toLocaleString("pt-BR")} L</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Espaço Livre</p>
                <p className="text-lg font-bold text-red-500">{Math.max(0, CAPACIDADE_ARLA - saldo.arla).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} L</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Nível</p>
                <p className="text-lg font-bold text-yellow-600">{arlaPct.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta nível crítico */}
      {(dieselPct <= 15 || arlaPct <= 15) && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>Atenção!</strong> {dieselPct <= 15 && "Diesel em nível crítico."} {arlaPct <= 15 && "ARLA 32 em nível crítico."} Providencie abastecimento do tanque.
          </p>
        </div>
      )}

      {/* Custo Médio Ponderado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CustoMedioCard titulo="Diesel" dados={custoMedio?.diesel} />
        <CustoMedioCard titulo="ARLA 32" dados={custoMedio?.arla} />
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Droplets className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4">Data</th>
                    <th className="text-left py-2 pr-4">Tipo</th>
                    <th className="text-left py-2 pr-4">Operação</th>
                    <th className="text-right py-2 pr-4">Quantidade</th>
                    <th className="text-right py-2 pr-4">Valor Unit.</th>
                    <th className="text-right py-2 pr-4">Valor Total</th>
                    <th className="text-left py-2">Fornecedor / Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-4">{new Date(item.data).toLocaleDateString("pt-BR")}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className={item.tipo === "diesel" ? "border-orange-300 text-orange-700" : "border-blue-300 text-blue-700"}>
                          {item.tipo === "diesel" ? "Diesel" : "ARLA 32"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`flex items-center gap-1 ${item.operacao === "entrada" ? "text-green-600" : "text-red-500"}`}>
                          {item.operacao === "entrada" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {item.operacao === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">{Number(item.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 3 })} L</td>
                      <td className="py-2 pr-4 text-right">{item.valorUnitario ? `R$ ${Number(item.valorUnitario).toFixed(3)}` : "—"}</td>
                      <td className="py-2 pr-4 text-right">{item.valorTotal ? Number(item.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                      <td className="py-2 text-muted-foreground text-xs">{item.fornecedor || item.observacoes || "—"}</td>
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
