import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  PackageX,
  Stamp,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  DollarSign,
  MapPin,
  User,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type StatusNf = "pendente" | "entregue" | "devolvida" | "parcial" | "extraviada";

interface NotaFiscal {
  id: number;
  viagemId: number;
  empresaId: number;
  numeroNf: string;
  serie?: string | null;
  chaveAcesso?: string | null;
  destinatario?: string | null;
  cnpjDestinatario?: string | null;
  enderecoEntrega?: string | null;
  cidade?: string | null;
  uf?: string | null;
  valorNf?: string | null;
  pesoKg?: string | null;
  volumes?: number | null;
  status: StatusNf;
  dataCanhoto?: string | null;
  dataEntrega?: string | null;
  recebidoPor?: string | null;
  motivoDevolucao?: string | null;
  observacoes?: string | null;
  ordemEntrega?: number | null;
}

// ─── Configuração de status ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusNf, { label: string; color: string; icon: React.ElementType }> = {
  pendente:   { label: "Pendente",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30",   icon: Clock },
  entregue:   { label: "Entregue",   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  devolvida:  { label: "Devolvida",  color: "bg-red-500/15 text-red-400 border-red-500/30",         icon: XCircle },
  parcial:    { label: "Parcial",    color: "bg-blue-500/15 text-blue-400 border-blue-500/30",      icon: AlertTriangle },
  extraviada: { label: "Extraviada", color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: PackageX },
};

const fmt = (v: string | null | undefined) =>
  v ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

// ─── Formulário de NF ─────────────────────────────────────────────────────────
function FormNf({
  viagemId,
  empresaId,
  nf,
  onClose,
}: {
  viagemId: number;
  empresaId: number;
  nf?: NotaFiscal;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    numeroNf: nf?.numeroNf ?? "",
    serie: nf?.serie ?? "",
    chaveAcesso: nf?.chaveAcesso ?? "",
    destinatario: nf?.destinatario ?? "",
    cnpjDestinatario: nf?.cnpjDestinatario ?? "",
    enderecoEntrega: nf?.enderecoEntrega ?? "",
    cidade: nf?.cidade ?? "",
    uf: nf?.uf ?? "",
    valorNf: nf?.valorNf ?? "",
    pesoKg: nf?.pesoKg ?? "",
    volumes: nf?.volumes?.toString() ?? "",
    ordemEntrega: nf?.ordemEntrega?.toString() ?? "",
    observacoes: nf?.observacoes ?? "",
  });

  const addMutation = trpc.notasFiscais.add.useMutation({
    onSuccess: () => {
      utils.notasFiscais.listByViagem.invalidate({ viagemId });
      utils.notasFiscais.resumoViagem.invalidate({ viagemId });
      toast.success("NF adicionada com sucesso!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.notasFiscais.update.useMutation({
    onSuccess: () => {
      utils.notasFiscais.listByViagem.invalidate({ viagemId });
      toast.success("NF atualizada!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.numeroNf.trim()) return toast.error("Informe o número da NF");
    const payload = {
      empresaId,
      viagemId,
      numeroNf: form.numeroNf.trim(),
      serie: form.serie || undefined,
      chaveAcesso: form.chaveAcesso || undefined,
      destinatario: form.destinatario || undefined,
      cnpjDestinatario: form.cnpjDestinatario || undefined,
      enderecoEntrega: form.enderecoEntrega || undefined,
      cidade: form.cidade || undefined,
      uf: form.uf || undefined,
      valorNf: form.valorNf || undefined,
      pesoKg: form.pesoKg || undefined,
      volumes: form.volumes ? Number(form.volumes) : undefined,
      ordemEntrega: form.ordemEntrega ? Number(form.ordemEntrega) : undefined,
      observacoes: form.observacoes || undefined,
    };
    if (nf) updateMutation.mutate({ ...payload, id: nf.id });
    else addMutation.mutate(payload);
  };

  const loading = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Número da NF *</Label>
          <Input className="mt-1" placeholder="Ex: 12345" value={form.numeroNf} onChange={(e) => set("numeroNf", e.target.value)} />
        </div>
        <div>
          <Label>Série</Label>
          <Input className="mt-1" placeholder="Ex: 1" value={form.serie} onChange={(e) => set("serie", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Chave de Acesso (44 dígitos)</Label>
        <Input className="mt-1 font-mono text-xs" placeholder="00000000000000000000000000000000000000000000" maxLength={44} value={form.chaveAcesso} onChange={(e) => set("chaveAcesso", e.target.value.replace(/\D/g, ""))} />
      </div>

      <Separator />

      <div>
        <Label>Destinatário</Label>
        <Input className="mt-1" placeholder="Nome ou razão social" value={form.destinatario} onChange={(e) => set("destinatario", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>CNPJ/CPF do Destinatário</Label>
          <Input className="mt-1" placeholder="00.000.000/0001-00" value={form.cnpjDestinatario} onChange={(e) => set("cnpjDestinatario", e.target.value)} />
        </div>
        <div>
          <Label>Ordem de Entrega</Label>
          <Input className="mt-1" type="number" placeholder="1, 2, 3..." value={form.ordemEntrega} onChange={(e) => set("ordemEntrega", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Endereço de Entrega</Label>
        <Input className="mt-1" placeholder="Rua, número, bairro" value={form.enderecoEntrega} onChange={(e) => set("enderecoEntrega", e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label>Cidade</Label>
          <Input className="mt-1" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
        </div>
        <div>
          <Label>UF</Label>
          <Input className="mt-1" maxLength={2} placeholder="SP" value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Valor da NF (R$)</Label>
          <Input className="mt-1" type="number" step="0.01" placeholder="0,00" value={form.valorNf} onChange={(e) => set("valorNf", e.target.value)} />
        </div>
        <div>
          <Label>Peso (kg)</Label>
          <Input className="mt-1" type="number" step="0.01" placeholder="0,00" value={form.pesoKg} onChange={(e) => set("pesoKg", e.target.value)} />
        </div>
        <div>
          <Label>Volumes</Label>
          <Input className="mt-1" type="number" placeholder="0" value={form.volumes} onChange={(e) => set("volumes", e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Observações</Label>
        <Textarea className="mt-1" rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Salvando..." : nf ? "Atualizar NF" : "Adicionar NF"}
        </Button>
      </div>
    </div>
  );
}

// ─── Modal de atualização de status ──────────────────────────────────────────
function ModalStatus({ nf, onClose }: { nf: NotaFiscal; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<StatusNf>(nf.status);
  const [dataEntrega, setDataEntrega] = useState(
    nf.dataEntrega ? new Date(nf.dataEntrega).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
  );
  const [dataCanhoto, setDataCanhoto] = useState(
    nf.dataCanhoto ? new Date(nf.dataCanhoto).toISOString().slice(0, 16) : "",
  );
  const [recebidoPor, setRecebidoPor] = useState(nf.recebidoPor ?? "");
  const [motivoDevolucao, setMotivoDevolucao] = useState(nf.motivoDevolucao ?? "");
  const [obs, setObs] = useState(nf.observacoes ?? "");
  const [fotoCanhoto, setFotoCanhoto] = useState("");

  const mutation = trpc.notasFiscais.updateStatus.useMutation({
    onSuccess: () => {
      utils.notasFiscais.listByViagem.invalidate({ viagemId: nf.viagemId });
      utils.notasFiscais.resumoViagem.invalidate({ viagemId: nf.viagemId });
      toast.success("Status atualizado!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    mutation.mutate({
      id: nf.id,
      status,
      dataEntrega: dataEntrega || undefined,
      dataCanhoto: dataCanhoto || undefined,
      recebidoPor: recebidoPor || undefined,
      motivoDevolucao: motivoDevolucao || undefined,
      observacoes: obs || undefined,
      fotoCanhoto: fotoCanhoto || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Status da Entrega</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusNf)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_CONFIG) as StatusNf[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data/Hora da Entrega</Label>
          <Input className="mt-1" type="datetime-local" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
        </div>
        <div>
          <Label>Data do Canhoto</Label>
          <Input className="mt-1" type="datetime-local" value={dataCanhoto} onChange={(e) => setDataCanhoto(e.target.value)} />
        </div>
      </div>

      <div>
        <Label>Recebido por</Label>
        <Input className="mt-1" placeholder="Nome de quem assinou o canhoto" value={recebidoPor} onChange={(e) => setRecebidoPor(e.target.value)} />
      </div>

      {(status === "devolvida" || status === "parcial") && (
        <div>
          <Label>Motivo da Devolução</Label>
          <Textarea className="mt-1" rows={2} placeholder="Descreva o motivo..." value={motivoDevolucao} onChange={(e) => setMotivoDevolucao(e.target.value)} />
        </div>
      )}

      <div>
        <Label>Observações</Label>
        <Textarea className="mt-1" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>

      <div>
        <Label>Foto do Canhoto (URL)</Label>
        <Input className="mt-1" placeholder="Cole a URL da foto do canhoto assinado" value={fotoCanhoto} onChange={(e) => setFotoCanhoto(e.target.value)} />
        {fotoCanhoto && <p className="text-xs text-muted-foreground mt-1">✓ Foto será salva</p>}
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar Status"}
        </Button>
      </div>
    </div>
  );
}

// ─── Card de NF individual ────────────────────────────────────────────────────
function NfCard({ nf, onEdit }: { nf: NotaFiscal; onEdit: (nf: NotaFiscal) => void }) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalCanhoto, setModalCanhoto] = useState(false);
  const [dataCanhoto, setDataCanhoto] = useState(new Date().toISOString().slice(0, 10));
  const [recebidoPor, setRecebidoPor] = useState("");

  const removeMutation = trpc.notasFiscais.remove.useMutation({
    onSuccess: () => {
      utils.notasFiscais.listByViagem.invalidate({ viagemId: nf.viagemId });
      utils.notasFiscais.resumoViagem.invalidate({ viagemId: nf.viagemId });
      toast.success("NF removida");
    },
  });

  const canhotoMutation = trpc.notasFiscais.lancarCanhoto.useMutation({
    onSuccess: () => {
      utils.notasFiscais.listByViagem.invalidate({ viagemId: nf.viagemId });
      utils.notasFiscais.resumoViagem.invalidate({ viagemId: nf.viagemId });
      toast.success("Canhoto lançado! NF marcada como entregue.");
      setModalCanhoto(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const cfg = STATUS_CONFIG[nf.status];
  const Icon = cfg.icon;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Cabeçalho do card */}
      <div className="flex items-center gap-3 p-3">
        {nf.ordemEntrega && (
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {nf.ordemEntrega}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">NF {nf.numeroNf}</span>
            {nf.serie && <span className="text-xs text-muted-foreground">Série {nf.serie}</span>}
            <Badge variant="outline" className={`text-xs ${cfg.color}`}>
              <Icon className="w-3 h-3 mr-1" />
              {cfg.label}
            </Badge>
          </div>
          {nf.destinatario && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{nf.destinatario}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {nf.valorNf && (
            <span className="text-sm font-medium text-emerald-400">{fmt(nf.valorNf)}</span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {nf.cidade && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {nf.cidade}{nf.uf ? ` / ${nf.uf}` : ""}
              </div>
            )}
            {nf.volumes && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Package className="w-3 h-3" />
                {nf.volumes} volume{nf.volumes > 1 ? "s" : ""}
                {nf.pesoKg ? ` · ${Number(nf.pesoKg).toLocaleString("pt-BR")} kg` : ""}
              </div>
            )}
            {nf.recebidoPor && (
              <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                <User className="w-3 h-3" />
                Recebido por: <span className="text-foreground font-medium ml-1">{nf.recebidoPor}</span>
              </div>
            )}
            {nf.dataCanhoto && (
              <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                <Stamp className="w-3 h-3" />
                Canhoto: {new Date(nf.dataCanhoto).toLocaleString("pt-BR")}
              </div>
            )}
            {nf.motivoDevolucao && (
              <div className="col-span-2 text-red-400">
                Motivo devolução: {nf.motivoDevolucao}
              </div>
            )}
            {nf.chaveAcesso && (
              <div className="col-span-2 font-mono text-xs text-muted-foreground break-all">
                Chave: {nf.chaveAcesso}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 flex-wrap pt-1">
            {/* Lançar canhoto rápido */}
            {nf.status !== "entregue" && (
              <Dialog open={modalCanhoto} onOpenChange={setModalCanhoto}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
                    <Stamp className="w-3 h-3" /> Lançar Canhoto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Lançar Canhoto — NF {nf.numeroNf}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Data do Canhoto</Label>
                      <Input className="mt-1" type="date" value={dataCanhoto} onChange={(e) => setDataCanhoto(e.target.value)} />
                    </div>
                    <div>
                      <Label>Recebido por</Label>
                      <Input className="mt-1" placeholder="Nome de quem assinou" value={recebidoPor} onChange={(e) => setRecebidoPor(e.target.value)} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setModalCanhoto(false)}>Cancelar</Button>
                      <Button
                        onClick={() => canhotoMutation.mutate({ id: nf.id, dataCanhoto, recebidoPor: recebidoPor || undefined })}
                        disabled={canhotoMutation.isPending}
                      >
                        {canhotoMutation.isPending ? "Salvando..." : "Confirmar Entrega"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Atualizar status */}
            <Dialog open={modalStatus} onOpenChange={setModalStatus}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Status
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Atualizar Status — NF {nf.numeroNf}</DialogTitle>
                </DialogHeader>
                <ModalStatus nf={nf} onClose={() => setModalStatus(false)} />
              </DialogContent>
            </Dialog>

            {/* Editar */}
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => onEdit(nf)}>
              <Pencil className="w-3 h-3" /> Editar
            </Button>

            {/* Remover */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-red-400 hover:bg-red-500/10"
              onClick={() => {
                if (confirm(`Remover NF ${nf.numeroNf}?`)) removeMutation.mutate({ id: nf.id });
              }}
            >
              <Trash2 className="w-3 h-3" /> Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function NotasFiscaisViagem({
  viagemId,
  empresaId,
  viagemStatus,
}: {
  viagemId: number;
  empresaId: number;
  viagemStatus?: string;
}) {
  const [modalAdd, setModalAdd] = useState(false);
  const [nfEdit, setNfEdit] = useState<NotaFiscal | null>(null);

  const { data: nfs = [], isLoading } = trpc.notasFiscais.listByViagem.useQuery({ viagemId });
  const { data: resumo = [] } = trpc.notasFiscais.resumoViagem.useQuery({ viagemId });

  // Totais do resumo
  const totalNfs = nfs.length;
  const entregues = resumo.find((r) => r.status === "entregue")?.quantidade ?? 0;
  const devolvidas = resumo.find((r) => r.status === "devolvida")?.quantidade ?? 0;
  const pendentes = resumo.find((r) => r.status === "pendente")?.quantidade ?? 0;
  const valorTotal = nfs.reduce((acc, nf) => acc + (Number(nf.valorNf) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Resumo de status */}
      {totalNfs > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Total de NFs</p>
            <p className="text-2xl font-bold">{totalNfs}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Entregues</p>
            <p className="text-2xl font-bold text-emerald-400">{entregues}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-amber-400">{pendentes}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Devolvidas</p>
            <p className="text-2xl font-bold text-red-400">{devolvidas}</p>
          </Card>
        </div>
      )}

      {/* Valor total */}
      {valorTotal > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          Valor total das NFs:{" "}
          <span className="font-semibold text-foreground">
            {valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      )}

      {/* Botão adicionar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Notas Fiscais da Viagem
        </h3>
        <Dialog open={modalAdd} onOpenChange={setModalAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Adicionar NF
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Nota Fiscal</DialogTitle>
            </DialogHeader>
            <FormNf
              viagemId={viagemId}
              empresaId={empresaId}
              onClose={() => setModalAdd(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal de edição */}
      <Dialog open={!!nfEdit} onOpenChange={(o) => !o && setNfEdit(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar NF {nfEdit?.numeroNf}</DialogTitle>
          </DialogHeader>
          {nfEdit && (
            <FormNf
              viagemId={viagemId}
              empresaId={empresaId}
              nf={nfEdit}
              onClose={() => setNfEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Lista de NFs */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Carregando notas fiscais...</p>
      ) : nfs.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma NF vinculada a esta viagem.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Adicionar NF" para começar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {nfs.map((nf) => (
            <NfCard
              key={nf.id}
              nf={nf as NotaFiscal}
              onEdit={(n) => setNfEdit(n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
