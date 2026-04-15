import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DollarSign,
  Truck,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Fuel,
  Utensils,
  ParkingCircle,
  Package,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Scale,
  Search,
} from "lucide-react";

const EMPRESA_ID = 1;

type StatusAcerto = "aberto" | "em_analise" | "fechado" | "pago";

const STATUS_CONFIG: Record<StatusAcerto, { label: string; color: string; icon: React.ElementType }> = {
  aberto:     { label: "Aberto",      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",    icon: Clock },
  em_analise: { label: "Em Análise",  color: "bg-blue-500/15 text-blue-400 border-blue-500/30",       icon: AlertCircle },
  fechado:    { label: "Fechado",     color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  pago:       { label: "Pago",        color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: Banknote },
};

const fmt = (v: string | number | null | undefined) => {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const n = (v: string) => Number(v) || 0;

// ─── Cálculo do saldo em tempo real ──────────────────────────────────────────
function calcSaldo(form: {
  freteRecebido: string;
  adiantamentoConcedido: string;
  despesasPedagio: string;
  despesasCombustivel: string;
  despesasAlimentacao: string;
  despesasEstacionamento: string;
  despesasOutras: string;
  valorDevolvido: string;
  valorComissao: string;
}) {
  const totalDespesas =
    n(form.despesasPedagio) +
    n(form.despesasCombustivel) +
    n(form.despesasAlimentacao) +
    n(form.despesasEstacionamento) +
    n(form.despesasOutras);

  const saldo =
    n(form.freteRecebido) -
    n(form.adiantamentoConcedido) -
    totalDespesas -
    n(form.valorDevolvido) +
    n(form.valorComissao);

  return { totalDespesas, saldo };
}

// ─── Formulário de Acerto ─────────────────────────────────────────────────────
function FormAcerto({
  viagemId,
  empresaId,
  acerto,
  onClose,
}: {
  viagemId: number;
  empresaId: number;
  acerto?: any;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: viagem } = trpc.viagens.getById
    ? trpc.viagens.getById.useQuery({ id: viagemId })
    : { data: null };

  const [form, setForm] = useState({
    motoristaId: acerto?.motoristaId?.toString() ?? "",
    dataAcerto: acerto?.dataAcerto ?? new Date().toISOString().slice(0, 10),
    adiantamentoConcedido: acerto?.adiantamentoConcedido ?? "0",
    freteRecebido: acerto?.freteRecebido ?? "0",
    despesasPedagio: acerto?.despesasPedagio ?? "0",
    despesasCombustivel: acerto?.despesasCombustivel ?? "0",
    despesasAlimentacao: acerto?.despesasAlimentacao ?? "0",
    despesasEstacionamento: acerto?.despesasEstacionamento ?? "0",
    despesasOutras: acerto?.despesasOutras ?? "0",
    descricaoOutras: acerto?.descricaoOutras ?? "",
    valorDevolvido: acerto?.valorDevolvido ?? "0",
    percentualComissao: acerto?.percentualComissao ?? "0",
    valorComissao: acerto?.valorComissao ?? "0",
    observacoes: acerto?.observacoes ?? "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Calcula comissão automaticamente quando percentual muda
  useEffect(() => {
    if (n(form.percentualComissao) > 0 && n(form.freteRecebido) > 0) {
      const comissao = (n(form.freteRecebido) * n(form.percentualComissao)) / 100;
      setForm((f) => ({ ...f, valorComissao: comissao.toFixed(2) }));
    }
  }, [form.percentualComissao, form.freteRecebido]);

  const { totalDespesas, saldo } = calcSaldo(form);

  const createMutation = trpc.acertosCarga.create.useMutation({
    onSuccess: () => {
      utils.acertosCarga.list.invalidate({ empresaId });
      utils.acertosCarga.getByViagem.invalidate({ viagemId });
      toast.success("Acerto criado com sucesso!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.acertosCarga.update.useMutation({
    onSuccess: () => {
      utils.acertosCarga.list.invalidate({ empresaId });
      utils.acertosCarga.getByViagem.invalidate({ viagemId });
      toast.success("Acerto atualizado!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const payload = {
      empresaId,
      viagemId,
      motoristaId: form.motoristaId ? Number(form.motoristaId) : undefined,
      dataAcerto: form.dataAcerto || undefined,
      adiantamentoConcedido: form.adiantamentoConcedido,
      freteRecebido: form.freteRecebido,
      despesasPedagio: form.despesasPedagio,
      despesasCombustivel: form.despesasCombustivel,
      despesasAlimentacao: form.despesasAlimentacao,
      despesasEstacionamento: form.despesasEstacionamento,
      despesasOutras: form.despesasOutras,
      descricaoOutras: form.descricaoOutras || undefined,
      valorDevolvido: form.valorDevolvido,
      percentualComissao: form.percentualComissao,
      valorComissao: form.valorComissao,
      observacoes: form.observacoes || undefined,
    };
    if (acerto) updateMutation.mutate({ ...payload, id: acerto.id });
    else createMutation.mutate(payload);
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Dados gerais */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data do Acerto</Label>
          <Input className="mt-1" type="date" value={form.dataAcerto} onChange={(e) => set("dataAcerto", e.target.value)} />
        </div>
        <div>
          <Label>Viagem</Label>
          <Input className="mt-1" value={`#${viagemId}`} disabled />
        </div>
      </div>

      <Separator />

      {/* ─── O que o motorista levou ─── */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-amber-400">
          <ArrowUpRight className="w-4 h-4" />
          O que o motorista levou
        </h3>
        <div>
          <Label>Adiantamento Concedido (R$)</Label>
          <Input className="mt-1" type="number" step="0.01" min="0" value={form.adiantamentoConcedido} onChange={(e) => set("adiantamentoConcedido", e.target.value)} />
        </div>
      </div>

      <Separator />

      {/* ─── O que o motorista recebeu ─── */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-emerald-400">
          <ArrowDownLeft className="w-4 h-4" />
          O que o motorista recebeu em campo
        </h3>
        <div>
          <Label>Frete / Dinheiro Recebido dos Clientes (R$)</Label>
          <Input className="mt-1" type="number" step="0.01" min="0" value={form.freteRecebido} onChange={(e) => set("freteRecebido", e.target.value)} />
        </div>
      </div>

      <Separator />

      {/* ─── Despesas ─── */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-red-400">
          <Receipt className="w-4 h-4" />
          Despesas em campo
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="flex items-center gap-1"><Package className="w-3 h-3" /> Pedágio (R$)</Label>
            <Input className="mt-1" type="number" step="0.01" min="0" value={form.despesasPedagio} onChange={(e) => set("despesasPedagio", e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Fuel className="w-3 h-3" /> Combustível (R$)</Label>
            <Input className="mt-1" type="number" step="0.01" min="0" value={form.despesasCombustivel} onChange={(e) => set("despesasCombustivel", e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1"><Utensils className="w-3 h-3" /> Alimentação (R$)</Label>
            <Input className="mt-1" type="number" step="0.01" min="0" value={form.despesasAlimentacao} onChange={(e) => set("despesasAlimentacao", e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1"><ParkingCircle className="w-3 h-3" /> Estacionamento (R$)</Label>
            <Input className="mt-1" type="number" step="0.01" min="0" value={form.despesasEstacionamento} onChange={(e) => set("despesasEstacionamento", e.target.value)} />
          </div>
          <div>
            <Label className="flex items-center gap-1"><MoreHorizontal className="w-3 h-3" /> Outras (R$)</Label>
            <Input className="mt-1" type="number" step="0.01" min="0" value={form.despesasOutras} onChange={(e) => set("despesasOutras", e.target.value)} />
          </div>
          <div>
            <Label>Descrição das outras</Label>
            <Input className="mt-1" placeholder="Ex: borracharia, lavagem..." value={form.descricaoOutras} onChange={(e) => set("descricaoOutras", e.target.value)} />
          </div>
        </div>
        <div className="mt-2 text-sm text-right text-red-400 font-medium">
          Total despesas: {fmt(totalDespesas)}
        </div>
      </div>

      <Separator />

      {/* ─── Devoluções e comissão ─── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-blue-400">Valor Devolvido pelo Motorista (R$)</Label>
          <Input className="mt-1" type="number" step="0.01" min="0" value={form.valorDevolvido} onChange={(e) => set("valorDevolvido", e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Troco ou dinheiro não gasto</p>
        </div>
        <div>
          <Label className="text-purple-400">Comissão do Motorista (%)</Label>
          <Input className="mt-1" type="number" step="0.01" min="0" max="100" value={form.percentualComissao} onChange={(e) => set("percentualComissao", e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">
            Valor: {fmt(form.valorComissao)}
          </p>
        </div>
      </div>

      {/* ─── Resumo do saldo ─── */}
      <div className={`rounded-xl border-2 p-4 ${saldo >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            <span className="font-semibold">Saldo Final do Motorista</span>
          </div>
          <span className={`text-2xl font-bold ${saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmt(saldo)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>+ Frete recebido: <b className="text-foreground">{fmt(form.freteRecebido)}</b></span>
          <span>- Adiantamento: <b className="text-foreground">{fmt(form.adiantamentoConcedido)}</b></span>
          <span>- Total despesas: <b className="text-foreground">{fmt(totalDespesas)}</b></span>
          <span>- Devolvido: <b className="text-foreground">{fmt(form.valorDevolvido)}</b></span>
          {n(form.valorComissao) > 0 && (
            <span>+ Comissão: <b className="text-foreground">{fmt(form.valorComissao)}</b></span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {saldo > 0
            ? "A empresa deve pagar este valor ao motorista."
            : saldo < 0
            ? "O motorista deve devolver este valor à empresa."
            : "Acerto zerado — sem saldo a pagar ou receber."}
        </p>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea className="mt-1" rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Salvando..." : acerto ? "Atualizar Acerto" : "Criar Acerto"}
        </Button>
      </div>
    </div>
  );
}

// ─── Card de Acerto ───────────────────────────────────────────────────────────
function AcertoCard({ acerto, onEdit }: { acerto: any; onEdit: (a: any) => void }) {
  const utils = trpc.useUtils();
  const cfg = STATUS_CONFIG[acerto.status as StatusAcerto] ?? STATUS_CONFIG.aberto;
  const Icon = cfg.icon;
  const saldo = Number(acerto.saldoFinal) || 0;

  const updateStatusMutation = trpc.acertosCarga.updateStatus.useMutation({
    onSuccess: () => {
      utils.acertosCarga.list.invalidate({ empresaId: acerto.empresaId });
      toast.success("Status atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.acertosCarga.remove.useMutation({
    onSuccess: () => {
      utils.acertosCarga.list.invalidate({ empresaId: acerto.empresaId });
      toast.success("Acerto removido");
    },
  });

  const totalDespesas =
    n(acerto.despesasPedagio) +
    n(acerto.despesasCombustivel) +
    n(acerto.despesasAlimentacao) +
    n(acerto.despesasEstacionamento) +
    n(acerto.despesasOutras);

  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 p-2 rounded-lg bg-muted">
              <Scale className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">Viagem #{acerto.viagemId}</span>
                <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {cfg.label}
                </Badge>
              </div>
              {acerto.dataAcerto && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Data: {new Date(acerto.dataAcerto).toLocaleDateString("pt-BR")}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ArrowDownLeft className="w-3 h-3" />
                  Recebido: {fmt(acerto.freteRecebido)}
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <ArrowUpRight className="w-3 h-3" />
                  Adiant.: {fmt(acerto.adiantamentoConcedido)}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <Receipt className="w-3 h-3" />
                  Despesas: {fmt(totalDespesas)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 space-y-1">
            <p className={`text-lg font-bold ${saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(saldo)}
            </p>
            <p className="text-xs text-muted-foreground">saldo final</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t">
          {acerto.status === "aberto" && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={() => updateStatusMutation.mutate({ id: acerto.id, status: "em_analise" })}
            >
              <AlertCircle className="w-3 h-3" /> Analisar
            </Button>
          )}
          {acerto.status === "em_analise" && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => updateStatusMutation.mutate({ id: acerto.id, status: "fechado" })}
            >
              <CheckCircle2 className="w-3 h-3" /> Fechar Acerto
            </Button>
          )}
          {acerto.status === "fechado" && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              onClick={() => updateStatusMutation.mutate({ id: acerto.id, status: "pago" })}
            >
              <Banknote className="w-3 h-3" /> Marcar como Pago
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onEdit(acerto)}>
            <Pencil className="w-3 h-3" /> Editar
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 text-xs gap-1 text-red-400 hover:bg-red-500/10"
            onClick={() => {
              if (confirm(`Remover acerto da viagem #${acerto.viagemId}?`))
                removeMutation.mutate({ id: acerto.id });
            }}
          >
            <Trash2 className="w-3 h-3" /> Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AcertoCarga() {
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [acertoEdit, setAcertoEdit] = useState<any | null>(null);
  const [viagemSelecionada, setViagemSelecionada] = useState<number | null>(null);
  const [modalViagem, setModalViagem] = useState(false);

  const { data: acertos = [], isLoading } = trpc.acertosCarga.list.useQuery({
    empresaId: EMPRESA_ID,
    status: statusFiltro !== "todos" ? (statusFiltro as StatusAcerto) : undefined,
  });

  const { data: viagens = [] } = trpc.viagens.list.useQuery({ empresaId: EMPRESA_ID });

  // Filtro por busca (viagem ID)
  const acertosFiltrados = acertos.filter((a) => {
    if (!busca) return true;
    return String(a.viagemId).includes(busca);
  });

  // KPIs
  const totalAbertos = acertos.filter((a) => a.status === "aberto").length;
  const totalFechados = acertos.filter((a) => a.status === "fechado").length;
  const totalPagos = acertos.filter((a) => a.status === "pago").length;
  const saldoTotal = acertos.reduce((acc, a) => acc + (Number(a.saldoFinal) || 0), 0);
  const saldoPendente = acertos
    .filter((a) => a.status !== "pago")
    .reduce((acc, a) => acc + (Number(a.saldoFinal) || 0), 0);

  const handleNovoAcerto = (viagemId: number) => {
    setViagemSelecionada(viagemId);
    setModalViagem(false);
    setAcertoEdit(null);
    setModalAberto(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" />
            Acerto de Carga
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fechamento financeiro da carga — o que o motorista levou, recebeu e deve prestar contas
          </p>
        </div>
        <Button className="gap-2" onClick={() => setModalViagem(true)}>
          <Plus className="w-4 h-4" /> Novo Acerto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total de Acertos</p>
          <p className="text-2xl font-bold mt-1">{acertos.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Em Aberto</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{totalAbertos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fechados</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{totalFechados}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pagos</p>
          <p className="text-2xl font-bold mt-1 text-purple-400">{totalPagos}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Saldo Pendente</p>
          <p className={`text-xl font-bold mt-1 ${saldoPendente >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmt(saldoPendente)}
          </p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar viagem #..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "todos", label: "Todos" },
            { value: "aberto", label: "Abertos" },
            { value: "em_analise", label: "Em Análise" },
            { value: "fechado", label: "Fechados" },
            { value: "pago", label: "Pagos" },
          ].map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={statusFiltro === f.value ? "default" : "outline"}
              onClick={() => setStatusFiltro(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando acertos...</p>
      ) : acertosFiltrados.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <Scale className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum acerto de carga encontrado.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie um acerto para cada viagem concluída para fechar as contas com o motorista.
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setModalViagem(true)}>
            <Plus className="w-4 h-4" /> Criar Primeiro Acerto
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {acertosFiltrados.map((acerto) => (
            <AcertoCard
              key={acerto.id}
              acerto={acerto}
              onEdit={(a) => {
                setAcertoEdit(a);
                setViagemSelecionada(a.viagemId);
                setModalAberto(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal: selecionar viagem */}
      <Dialog open={modalViagem} onOpenChange={setModalViagem}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Viagem para Acerto</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Selecione a viagem que deseja fazer o acerto de carga:</p>
            {viagens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma viagem encontrada.</p>
            ) : (
              viagens.map((v: any) => (
                <button
                  key={v.id}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  onClick={() => handleNovoAcerto(v.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">#{v.id} — {v.veiculoPlaca ?? "Veículo"}</span>
                      {(v.origem || v.destino) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {v.origem ?? "?"} → {v.destino ?? "?"}
                        </p>
                      )}
                      {v.motoristaNome && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" /> {v.motoristaNome}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">{v.status}</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: formulário de acerto */}
      <Dialog open={modalAberto} onOpenChange={(o) => { if (!o) { setModalAberto(false); setAcertoEdit(null); setViagemSelecionada(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {acertoEdit ? `Editar Acerto — Viagem #${viagemSelecionada}` : `Novo Acerto — Viagem #${viagemSelecionada}`}
            </DialogTitle>
          </DialogHeader>
          {viagemSelecionada && (
            <FormAcerto
              viagemId={viagemSelecionada}
              empresaId={EMPRESA_ID}
              acerto={acertoEdit}
              onClose={() => { setModalAberto(false); setAcertoEdit(null); setViagemSelecionada(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
