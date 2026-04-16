import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  PackageCheck, Plus, Search, Truck, Calendar, AlertCircle,
  CheckCircle2, Clock, XCircle, Eye, Package, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG = {
  aguardando: { label: "Aguardando", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  em_conferencia: { label: "Em Conferência", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Package },
  concluido: { label: "Concluído", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  divergencia: { label: "Divergência", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: XCircle },
};

export default function Recepcao() {
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [openNovo, setOpenNovo] = useState(false);
  const [form, setForm] = useState({
    fornecedor: "", notaFiscal: "", transportadora: "", doca: "",
    previsaoChegada: "", observacoes: "",
  });

  const { data: recebimentos = [], refetch } = trpc.recepcao.list.useQuery({
    status: statusFilter !== "todos" ? statusFilter as any : undefined,
    search: search || undefined,
  });

  const criar = trpc.recepcao.create.useMutation({
    onSuccess: () => {
      toast.success("Recebimento criado com sucesso!");
      setOpenNovo(false);
      setForm({ fornecedor: "", notaFiscal: "", transportadora: "", doca: "", previsaoChegada: "", observacoes: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const iniciarConferencia = trpc.recepcao.iniciarConferencia.useMutation({
    onSuccess: () => { toast.success("Conferência iniciada!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const concluir = trpc.recepcao.concluir.useMutation({
    onSuccess: () => { toast.success("Recebimento concluído!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const stats = {
    total: recebimentos.length,
    aguardando: recebimentos.filter(r => r.status === "aguardando").length,
    emConferencia: recebimentos.filter(r => r.status === "em_conferencia").length,
    divergencias: recebimentos.filter(r => r.status === "divergencia").length,
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <PackageCheck className="h-6 w-6 text-primary" />
              Recepção de Mercadorias
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie o recebimento e conferência de mercadorias
            </p>
          </div>
          <Dialog open={openNovo} onOpenChange={setOpenNovo}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Recebimento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Recebimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Fornecedor *</label>
                    <Input placeholder="Nome do fornecedor" value={form.fornecedor}
                      onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nota Fiscal</label>
                    <Input placeholder="Nº da NF" value={form.notaFiscal}
                      onChange={e => setForm(f => ({ ...f, notaFiscal: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Transportadora</label>
                    <Input placeholder="Nome da transportadora" value={form.transportadora}
                      onChange={e => setForm(f => ({ ...f, transportadora: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Doca</label>
                    <Input placeholder="Ex: Doca 1" value={form.doca}
                      onChange={e => setForm(f => ({ ...f, doca: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Previsão de Chegada</label>
                  <Input type="datetime-local" value={form.previsaoChegada}
                    onChange={e => setForm(f => ({ ...f, previsaoChegada: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Observações</label>
                  <Input placeholder="Observações adicionais" value={form.observacoes}
                    onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={() => criar.mutate({
                  fornecedor: form.fornecedor,
                  notaFiscal: form.notaFiscal || undefined,
                  transportadora: form.transportadora || undefined,
                  doca: form.doca || undefined,
                  previsaoChegada: form.previsaoChegada ? new Date(form.previsaoChegada) : undefined,
                  observacoes: form.observacoes || undefined,
                })} disabled={!form.fornecedor || criar.isPending}>
                  {criar.isPending ? "Criando..." : "Criar Recebimento"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: Package, color: "text-foreground" },
            { label: "Aguardando", value: stats.aguardando, icon: Clock, color: "text-yellow-600" },
            { label: "Em Conferência", value: stats.emConferencia, icon: PackageCheck, color: "text-blue-600" },
            { label: "Divergências", value: stats.divergencias, icon: AlertCircle, color: "text-red-600" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por fornecedor, NF ou transportadora..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="em_conferencia">Em Conferência</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="divergencia">Divergência</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {recebimentos.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <PackageCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum recebimento encontrado</p>
              <p className="text-sm mt-1">Crie um novo recebimento para começar</p>
            </div>
          ) : (
            recebimentos.map(rec => {
              const statusCfg = STATUS_CONFIG[rec.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.aguardando;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={rec.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{rec.fornecedor}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {rec.notaFiscal && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" /> NF {rec.notaFiscal}
                            </span>
                          )}
                          {rec.transportadora && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Truck className="h-3 w-3" /> {rec.transportadora}
                            </span>
                          )}
                          {rec.doca && (
                            <span className="text-xs text-muted-foreground">{rec.doca}</span>
                          )}
                        </div>
                        {rec.previsaoChegada && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Previsão: {format(new Date(rec.previsaoChegada), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`gap-1 text-xs ${statusCfg.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                      {rec.status === "aguardando" && (
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => iniciarConferencia.mutate({ id: rec.id })}>
                          Iniciar Conferência
                        </Button>
                      )}
                      {rec.status === "em_conferencia" && (
                        <Button size="sm" className="text-xs h-7"
                          onClick={() => concluir.mutate({ id: rec.id })}>
                          Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                  {rec.observacoes && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                      {rec.observacoes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
    </div>
  );
}
