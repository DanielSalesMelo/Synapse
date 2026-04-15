import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  PackageX,
  Stamp,
  Truck,
  MapPin,
  DollarSign,
  Package,
  User,
  Filter,
} from "lucide-react";
import { NotasFiscaisViagem } from "@/components/NotasFiscaisViagem";

const EMPRESA_ID = 1;

type StatusNf = "pendente" | "entregue" | "devolvida" | "parcial" | "extraviada";

const STATUS_CONFIG: Record<StatusNf, { label: string; color: string; icon: React.ElementType }> = {
  pendente:   { label: "Pendente",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30",   icon: Clock },
  entregue:   { label: "Entregue",   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  devolvida:  { label: "Devolvida",  color: "bg-red-500/15 text-red-400 border-red-500/30",         icon: XCircle },
  parcial:    { label: "Parcial",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",      icon: AlertTriangle },
  extraviada: { label: "Extraviada", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: PackageX },
};

const fmt = (v: string | null | undefined) =>
  v ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

export default function NotasFiscais() {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [viagemSelecionada, setViagemSelecionada] = useState<number | null>(null);
  const [modalViagem, setModalViagem] = useState(false);

  const { data: nfs = [], isLoading } = trpc.notasFiscais.listByEmpresa.useQuery({
    empresaId: EMPRESA_ID,
    status: statusFiltro !== "todos" ? (statusFiltro as StatusNf) : undefined,
  });

  const { data: viagens = [] } = trpc.viagens.list.useQuery({ empresaId: EMPRESA_ID });

  // Filtro por busca
  const nfsFiltradas = nfs.filter((nf) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      nf.numeroNf.toLowerCase().includes(q) ||
      nf.destinatario?.toLowerCase().includes(q) ||
      nf.cidade?.toLowerCase().includes(q) ||
      nf.chaveAcesso?.includes(q)
    );
  });

  // Totais
  const totais = {
    total: nfs.length,
    entregues: nfs.filter((n) => n.status === "entregue").length,
    pendentes: nfs.filter((n) => n.status === "pendente").length,
    devolvidas: nfs.filter((n) => n.status === "devolvida").length,
    valorTotal: nfs.reduce((acc, n) => acc + (Number(n.valorNf) || 0), 0),
  };

  const taxaEntrega = totais.total > 0
    ? Math.round((totais.entregues / totais.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Notas Fiscais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rastreamento de entregas por NF — status, canhoto e devoluções
          </p>
        </div>
        <Button
          onClick={() => setModalViagem(true)}
          className="gap-2"
        >
          <Truck className="w-4 h-4" />
          Gerenciar por Viagem
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total de NFs</p>
          <p className="text-2xl font-bold mt-1">{totais.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Entregues</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{totais.entregues}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{totais.pendentes}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Devolvidas</p>
          <p className="text-2xl font-bold mt-1 text-red-400">{totais.devolvidas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Taxa de Entrega</p>
          <p className={`text-2xl font-bold mt-1 ${taxaEntrega >= 90 ? "text-emerald-400" : taxaEntrega >= 70 ? "text-amber-400" : "text-red-400"}`}>
            {taxaEntrega}%
          </p>
        </Card>
      </div>

      {/* Valor total */}
      {totais.valorTotal > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2">
          <DollarSign className="w-4 h-4" />
          Valor total das NFs:{" "}
          <span className="font-semibold text-foreground">
            {totais.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por NF, destinatário, cidade ou chave..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "todos", label: "Todas" },
            { value: "pendente", label: "Pendentes" },
            { value: "entregue", label: "Entregues" },
            { value: "devolvida", label: "Devolvidas" },
            { value: "parcial", label: "Parciais" },
            { value: "extraviada", label: "Extraviadas" },
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

      {/* Tabela de NFs */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando notas fiscais...</p>
      ) : nfsFiltradas.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma nota fiscal encontrada.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione NFs dentro de cada viagem para rastrear as entregas.
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setModalViagem(true)}>
            <Truck className="w-4 h-4" /> Selecionar Viagem
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {nfsFiltradas.map((nf) => {
            const cfg = STATUS_CONFIG[nf.status as StatusNf] ?? STATUS_CONFIG.pendente;
            const Icon = cfg.icon;
            return (
              <Card key={nf.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 p-2 rounded-lg bg-muted">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">NF {nf.numeroNf}</span>
                          {nf.serie && <span className="text-xs text-muted-foreground">Série {nf.serie}</span>}
                          <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                        {nf.destinatario && (
                          <p className="text-sm text-muted-foreground mt-0.5">{nf.destinatario}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {nf.cidade && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {nf.cidade}{nf.uf ? `/${nf.uf}` : ""}
                            </span>
                          )}
                          {nf.volumes && (
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {nf.volumes} vol.{nf.pesoKg ? ` · ${Number(nf.pesoKg).toLocaleString("pt-BR")} kg` : ""}
                            </span>
                          )}
                          {nf.recebidoPor && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {nf.recebidoPor}
                            </span>
                          )}
                          {nf.dataCanhoto && (
                            <span className="flex items-center gap-1">
                              <Stamp className="w-3 h-3" />
                              Canhoto: {new Date(nf.dataCanhoto).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {nf.valorNf && (
                        <p className="font-semibold text-emerald-400 text-sm">{fmt(nf.valorNf)}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Viagem #{nf.viagemId}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: selecionar viagem para gerenciar NFs */}
      <Dialog open={modalViagem} onOpenChange={setModalViagem}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Viagem para Gerenciar NFs</DialogTitle>
          </DialogHeader>
          {viagemSelecionada ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Viagem #{viagemSelecionada}
                </p>
                <Button variant="outline" size="sm" onClick={() => setViagemSelecionada(null)}>
                  Trocar viagem
                </Button>
              </div>
              <NotasFiscaisViagem
                viagemId={viagemSelecionada}
                empresaId={EMPRESA_ID}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Selecione uma viagem para adicionar ou gerenciar as NFs:</p>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {viagens.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma viagem encontrada.</p>
                ) : (
                  viagens.map((v: any) => (
                    <button
                      key={v.id}
                      className="w-full text-left p-3 rounded-lg border hover:border-primary/40 hover:bg-muted/30 transition-colors"
                      onClick={() => setViagemSelecionada(v.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">#{v.id} — {v.veiculoPlaca ?? "Veículo"}</span>
                          {(v.origem || v.destino) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {v.origem ?? "?"} → {v.destino ?? "?"}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {v.status}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
