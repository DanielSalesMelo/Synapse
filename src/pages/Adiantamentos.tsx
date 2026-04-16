import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Wallet, Plus, Clock, CheckCircle2,
  TrendingDown, User
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente:  { label: "Pendente",  color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  acertado:  { label: "Acertado",  color: "bg-green-500/10 text-green-500 border-green-500/20" },
  cancelado: { label: "Cancelado", color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

function fmt(v: number | string | null | undefined) {
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Adiantamentos() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    funcionarioId: "",
    valor: "",
    formaPagamento: "dinheiro",
    data: new Date().toISOString().split("T")[0],
    observacoes: "",
  });

  const { data: adiantamentos, refetch } = trpc.financeiro.adiantamentos.list.useQuery({ empresaId: 1 });
  const { data: funcionarios } = trpc.funcionarios.list.useQuery({ empresaId: 1 });

  const criarMutation = trpc.financeiro.adiantamentos.create.useMutation({
    onSuccess: () => {
      toast.success("Adiantamento registrado com sucesso!");
      setOpen(false);
      setForm({ funcionarioId: "", valor: "", formaPagamento: "dinheiro", data: new Date().toISOString().split("T")[0], observacoes: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const motoristas = funcionarios?.filter(f => f.funcao === "motorista") ?? [];
  const totalPendente = adiantamentos
    ?.filter(a => a.status !== "acertado" && a.status !== "cancelado")
    .reduce((s, a) => s + Number(a.valor), 0) ?? 0;
  const totalAcertado = adiantamentos
    ?.filter(a => a.status === "acertado")
    .reduce((s, a) => s + Number(a.valor), 0) ?? 0;
  const emAberto = adiantamentos?.filter(a => a.status === "pendente").length ?? 0;

  function handleSubmit() {
    if (!form.funcionarioId || !form.valor) {
      toast.error("Preencha o motorista e o valor do adiantamento");
      return;
    }
    criarMutation.mutate({
      empresaId: 1,
      funcionarioId: Number(form.funcionarioId),
      valor: form.valor.replace(",", "."),
      formaPagamento: form.formaPagamento as "dinheiro" | "pix" | "transferencia" | "cartao",
      data: form.data,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
<div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Adiantamentos de Viagem
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Controle de dinheiro entregue ao motorista antes da viagem
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Adiantamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Adiantamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Motorista *</Label>
                  <Select value={form.funcionarioId} onValueChange={v => setForm(f => ({ ...f, funcionarioId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                    <SelectContent>
                      {motoristas.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor R$ *</Label>
                    <Input
                      placeholder="0,00"
                      value={form.valor}
                      onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Destino, carga, informações adicionais..."
                    value={form.observacoes}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={2}
                  />
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={criarMutation.isPending}>
                  {criarMutation.isPending ? "Salvando..." : "Registrar Adiantamento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{emAberto}</p>
                <p className="text-xs text-muted-foreground">Pendentes de acerto</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{fmt(totalPendente)}</p>
                <p className="text-xs text-muted-foreground">Total pendente</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{fmt(totalAcertado)}</p>
                <p className="text-xs text-muted-foreground">Total acertado</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Histórico de Adiantamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {!adiantamentos || adiantamentos.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">Nenhum adiantamento registrado</p>
                <p className="text-xs text-muted-foreground">Clique em "Novo Adiantamento" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adiantamentos.map(a => {
                  const status = STATUS_LABELS[a.status ?? "pendente"] ?? { label: a.status, color: "" };
                  const dataFmt = a.data ? new Date(a.data).toLocaleDateString("pt-BR") : "—";
                  return (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Funcionário #{a.funcionarioId}</p>
                          <p className="text-xs text-muted-foreground">
                            {dataFmt} · {a.formaPagamento}
                            {a.observacoes ? ` · ${a.observacoes}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-semibold text-foreground">{fmt(a.valor)}</p>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
);
}
