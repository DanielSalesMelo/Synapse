import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Truck, Package, FileText, Plus, Pencil, Trash2,
  CheckCircle2, Clock, Navigation, RotateCcw, Archive,
  Search, ChevronDown, ChevronUp, ArrowRight,
  Weight, Hash, DollarSign, MapPin, User, Calendar,
  AlertCircle, Banknote, ClipboardList, Printer,
} from "lucide-react";
import { gerarRomaneio } from "@/lib/gerarRomaneio";
import { useViewAs } from "@/contexts/ViewAsContext";


type StatusCarg = "montando" | "pronto" | "em_rota" | "retornado" | "encerrado";
type StatusNf = "pendente" | "entregue" | "devolvida" | "parcial" | "extraviada";

const STATUS_CARG: Record<StatusCarg, { label: string; color: string; icon: React.ElementType }> = {
  montando:  { label: "Montando",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30",     icon: Package },
  pronto:    { label: "Pronto",     color: "bg-blue-500/15 text-blue-400 border-blue-500/30",        icon: CheckCircle2 },
  em_rota:   { label: "Em Rota",    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: Navigation },
  retornado: { label: "Retornado",  color: "bg-purple-500/15 text-purple-400 border-purple-500/30",  icon: RotateCcw },
  encerrado: { label: "Encerrado",  color: "bg-muted text-muted-foreground border-border",            icon: Archive },
};

const STATUS_NF: Record<StatusNf, { label: string; color: string }> = {
  pendente:   { label: "Pendente",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  entregue:   { label: "Entregue",   color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  devolvida:  { label: "Devolvida",  color: "bg-red-500/15 text-red-400 border-red-500/30" },
  parcial:    { label: "Parcial",    color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  extraviada: { label: "Extraviada", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
};

const fmt = (v: any) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Formulário de novo carregamento ─────────────────────────────────────────
function FormCarregamento({
  empresaId,
  carg,
  onClose,
}: {
  empresaId: number;
  carg?: any;
  onClose: () => void;
}) {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    data: carg?.data ?? new Date().toISOString().slice(0, 10),
    veiculoPlaca: carg?.veiculoPlaca ?? "",
    motoristaNome: carg?.motoristaNome ?? "",
    ajudanteNome: carg?.ajudanteNome ?? "",
    rotaDescricao: carg?.rotaDescricao ?? "",
    cidadesRota: carg?.cidadesRota ?? "",
    observacoes: carg?.observacoes ?? "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = trpc.carregamentos.create.useMutation({
    onSuccess: () => { utils.carregamentos.list.invalidate({ empresaId }); toast.success("Carregamento criado!"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.carregamentos.update.useMutation({
    onSuccess: () => { utils.carregamentos.list.invalidate({ empresaId }); toast.success("Carregamento atualizado!"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const payload = { empresaId, ...form, cidadesRota: form.cidadesRota || undefined, observacoes: form.observacoes || undefined };
    if (carg) updateMut.mutate({ id: carg.id, ...form });
    else createMut.mutate(payload);
  };

  const loading = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data</Label>
          <Input className="mt-1" type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
        </div>
        <div>
          <Label>Placa do Veículo</Label>
          <Input className="mt-1" placeholder="ABC-1234" value={form.veiculoPlaca} onChange={(e) => set("veiculoPlaca", e.target.value)} />
        </div>
        <div>
          <Label>Motorista</Label>
          <Input className="mt-1" placeholder="Nome do motorista" value={form.motoristaNome} onChange={(e) => set("motoristaNome", e.target.value)} />
        </div>
        <div>
          <Label>Ajudante</Label>
          <Input className="mt-1" placeholder="Nome do ajudante" value={form.ajudanteNome} onChange={(e) => set("ajudanteNome", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Descrição da Rota</Label>
        <Input className="mt-1" placeholder="Ex: Rota Centro / Zona Norte" value={form.rotaDescricao} onChange={(e) => set("rotaDescricao", e.target.value)} />
      </div>
      <div>
        <Label>Cidades da Rota</Label>
        <Input className="mt-1" placeholder="Ex: São Paulo, Guarulhos, Mogi das Cruzes" value={form.cidadesRota} onChange={(e) => set("cidadesRota", e.target.value)} />
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea className="mt-1" rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Salvando..." : carg ? "Atualizar" : "Criar Carregamento"}
        </Button>
      </div>
    </div>
  );
}

// ─── Formulário de item (NF) ──────────────────────────────────────────────────
function FormItem({
  carregamentoId,
  empresaId,
  item,
  onClose,
}: {
  carregamentoId: number;
  empresaId: number;
  item?: any;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    numeroNf: item?.numeroNf ?? "",
    serie: item?.serie ?? "",
    chaveAcesso: item?.chaveAcesso ?? "",
    destinatario: item?.destinatario ?? "",
    cnpjDestinatario: item?.cnpjDestinatario ?? "",
    enderecoEntrega: item?.enderecoEntrega ?? "",
    cidade: item?.cidade ?? "",
    uf: item?.uf ?? "",
    valorNf: item?.valorNf ?? "",
    pesoKg: item?.pesoKg ?? "",
    volumes: item?.volumes?.toString() ?? "",
    descricaoCarga: item?.descricaoCarga ?? "",
    ordemEntrega: item?.ordemEntrega?.toString() ?? "",
    observacoes: item?.observacoes ?? "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const addMut = trpc.carregamentos.addItem.useMutation({
    onSuccess: () => { utils.carregamentos.getById.invalidate({ id: carregamentoId }); toast.success("NF adicionada!"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.carregamentos.updateItem.useMutation({
    onSuccess: () => { utils.carregamentos.getById.invalidate({ id: carregamentoId }); toast.success("NF atualizada!"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    const payload = {
      carregamentoId,
      empresaId,
      numeroNf: form.numeroNf,
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
      descricaoCarga: form.descricaoCarga || undefined,
      ordemEntrega: form.ordemEntrega ? Number(form.ordemEntrega) : undefined,
      observacoes: form.observacoes || undefined,
    };
    if (item) updateMut.mutate({ ...payload, id: item.id });
    else addMut.mutate(payload);
  };

  const loading = addMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Nº NF *</Label>
          <Input className="mt-1" placeholder="000001" value={form.numeroNf} onChange={(e) => set("numeroNf", e.target.value)} />
        </div>
        <div>
          <Label>Série</Label>
          <Input className="mt-1" placeholder="1" value={form.serie} onChange={(e) => set("serie", e.target.value)} />
        </div>
        <div>
          <Label>Ordem Entrega</Label>
          <Input className="mt-1" type="number" min="1" placeholder="1" value={form.ordemEntrega} onChange={(e) => set("ordemEntrega", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Chave de Acesso (44 dígitos)</Label>
        <Input className="mt-1 font-mono text-xs" placeholder="00000000000000000000000000000000000000000000" maxLength={44} value={form.chaveAcesso} onChange={(e) => set("chaveAcesso", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Destinatário</Label>
          <Input className="mt-1" value={form.destinatario} onChange={(e) => set("destinatario", e.target.value)} />
        </div>
        <div>
          <Label>CNPJ / CPF</Label>
          <Input className="mt-1" value={form.cnpjDestinatario} onChange={(e) => set("cnpjDestinatario", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Endereço de Entrega</Label>
        <Input className="mt-1" value={form.enderecoEntrega} onChange={(e) => set("enderecoEntrega", e.target.value)} />
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
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Valor NF (R$)</Label>
          <Input className="mt-1" type="number" step="0.01" min="0" value={form.valorNf} onChange={(e) => set("valorNf", e.target.value)} />
        </div>
        <div>
          <Label>Peso (kg)</Label>
          <Input className="mt-1" type="number" step="0.01" min="0" value={form.pesoKg} onChange={(e) => set("pesoKg", e.target.value)} />
        </div>
        <div>
          <Label>Volumes</Label>
          <Input className="mt-1" type="number" min="0" value={form.volumes} onChange={(e) => set("volumes", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Descrição da Carga</Label>
        <Input className="mt-1" placeholder="Ex: Alimentos, Bebidas, Eletrônicos..." value={form.descricaoCarga} onChange={(e) => set("descricaoCarga", e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading || !form.numeroNf}>
          {loading ? "Salvando..." : item ? "Atualizar NF" : "Adicionar NF"}
        </Button>
      </div>
    </div>
  );
}

// ─── Modal de saída ───────────────────────────────────────────────────────────
function ModalSaida({ carg, onClose }: { carg: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().slice(0, 16));
  const [kmSaida, setKmSaida] = useState("");

  const mut = trpc.carregamentos.registrarSaida.useMutation({
    onSuccess: () => {
      utils.carregamentos.list.invalidate({ empresaId: carg.empresaId });
      utils.carregamentos.getById.invalidate({ id: carg.id });
      toast.success("Saída registrada! Veículo em rota.");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Registrar saída do carregamento <b>{carg.numero}</b> — veículo <b>{carg.veiculoPlaca}</b>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data/Hora de Saída</Label>
          <Input className="mt-1" type="datetime-local" value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} />
        </div>
        <div>
          <Label>KM de Saída</Label>
          <Input className="mt-1" type="number" min="0" placeholder="Ex: 125000" value={kmSaida} onChange={(e) => setKmSaida(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={mut.isPending}
          onClick={() => mut.mutate({ id: carg.id, dataSaida, kmSaida: kmSaida ? Number(kmSaida) : undefined })}
        >
          <Navigation className="w-4 h-4" /> {mut.isPending ? "Registrando..." : "Confirmar Saída"}
        </Button>
      </div>
    </div>
  );
}

// ─── Modal de retorno ─────────────────────────────────────────────────────────
function ModalRetorno({ carg, onClose }: { carg: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [dataRetorno, setDataRetorno] = useState(new Date().toISOString().slice(0, 16));
  const [kmRetorno, setKmRetorno] = useState("");
  const [obs, setObs] = useState("");

  const mut = trpc.carregamentos.registrarRetorno.useMutation({
    onSuccess: () => {
      utils.carregamentos.list.invalidate({ empresaId: carg.empresaId });
      utils.carregamentos.getById.invalidate({ id: carg.id });
      toast.success("Retorno registrado!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Registrar retorno do carregamento <b>{carg.numero}</b>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Data/Hora de Retorno</Label>
          <Input className="mt-1" type="datetime-local" value={dataRetorno} onChange={(e) => setDataRetorno(e.target.value)} />
        </div>
        <div>
          <Label>KM de Retorno</Label>
          <Input className="mt-1" type="number" min="0" placeholder="Ex: 125350" value={kmRetorno} onChange={(e) => setKmRetorno(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea className="mt-1" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          className="gap-2 bg-purple-600 hover:bg-purple-700"
          disabled={mut.isPending}
          onClick={() => mut.mutate({ id: carg.id, dataRetorno, kmRetorno: kmRetorno ? Number(kmRetorno) : undefined, observacoes: obs || undefined })}
        >
          <RotateCcw className="w-4 h-4" /> {mut.isPending ? "Registrando..." : "Confirmar Retorno"}
        </Button>
      </div>
    </div>
  );
}

// ─── Detalhe do carregamento (expandido) ──────────────────────────────────────
function CarregamentoDetalhe({ cargId, empresaId }: { cargId: number; empresaId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.carregamentos.getById.useQuery({ id: cargId });
  const [modalItem, setModalItem] = useState(false);
  const [itemEdit, setItemEdit] = useState<any>(null);
  const [modalStatus, setModalStatus] = useState<any>(null);

  const removeItemMut = trpc.carregamentos.removeItem.useMutation({
    onSuccess: () => { utils.carregamentos.getById.invalidate({ id: cargId }); toast.success("NF removida"); },
  });

  const updateStatusMut = trpc.carregamentos.updateItemStatus.useMutation({
    onSuccess: () => { utils.carregamentos.getById.invalidate({ id: cargId }); toast.success("Status atualizado!"); setModalStatus(null); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando itens...</div>;
  if (!data) return null;

  const itens = data.itens ?? [];

  return (
    <div className="border-t bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Notas Fiscais ({itens.length})
        </h4>
        {(data.status === "montando" || data.status === "pronto") && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setItemEdit(null); setModalItem(true); }}>
            <Plus className="w-3 h-3" /> Adicionar NF
          </Button>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhuma NF adicionada. Clique em "Adicionar NF" para montar a carga.
        </p>
      ) : (
        <div className="space-y-2">
          {itens.map((item: any) => {
            const nfStatus = STATUS_NF[item.status as StatusNf] ?? STATUS_NF.pendente;
            return (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  {item.ordemEntrega && (
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{item.ordemEntrega}.</span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">NF {item.numeroNf}{item.serie ? `-${item.serie}` : ""}</span>
                      <Badge variant="outline" className={`text-xs ${nfStatus.color}`}>{nfStatus.label}</Badge>
                    </div>
                    {item.destinatario && (
                      <p className="text-xs text-muted-foreground truncate">{item.destinatario} — {item.cidade}/{item.uf}</p>
                    )}
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {item.valorNf && <span className="text-emerald-400">{fmt(item.valorNf)}</span>}
                      {item.pesoKg && <span>{Number(item.pesoKg).toFixed(1)} kg</span>}
                      {item.volumes && <span>{item.volumes} vol.</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {data.status === "em_rota" && item.status === "pendente" && (
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => setModalStatus(item)}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Entregar
                    </Button>
                  )}
                  {(data.status === "montando" || data.status === "pronto") && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setItemEdit(item); setModalItem(true); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                        onClick={() => { if (confirm("Remover esta NF?")) removeItemMut.mutate({ id: item.id, carregamentoId: cargId }); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal adicionar/editar item */}
      <Dialog open={modalItem} onOpenChange={(o) => { if (!o) { setModalItem(false); setItemEdit(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{itemEdit ? "Editar NF" : "Adicionar NF ao Carregamento"}</DialogTitle>
          </DialogHeader>
          <FormItem
            carregamentoId={cargId}
            empresaId={empresaId}
            item={itemEdit}
            onClose={() => { setModalItem(false); setItemEdit(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal atualizar status da NF */}
      <Dialog open={!!modalStatus} onOpenChange={(o) => { if (!o) setModalStatus(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atualizar Entrega — NF {modalStatus?.numeroNf}</DialogTitle>
          </DialogHeader>
          {modalStatus && (
            <div className="space-y-3">
              <div>
                <Label>Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["entregue", "devolvida", "parcial", "extraviada"] as StatusNf[]).map((s) => (
                    <button
                      key={s}
                      className={`p-2 rounded-lg border text-xs font-medium transition-colors ${STATUS_NF[s].color} hover:opacity-80`}
                      onClick={() => {
                        updateStatusMut.mutate({
                          id: modalStatus.id,
                          carregamentoId: cargId,
                          status: s,
                          dataCanhoto: s === "entregue" ? new Date().toISOString() : undefined,
                        });
                      }}
                    >
                      {STATUS_NF[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Botão Romaneio (busca itens e gera PDF) ────────────────────────────────
function BotaoRomaneio({ carg }: { carg: any }) {
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const handleRomaneio = async () => {
    setLoading(true);
    try {
      const data = await utils.carregamentos.getById.fetch({ id: carg.id });
      gerarRomaneio({
        numero: carg.numero ?? `#${carg.id}`,
        data: carg.data,
        veiculoPlaca: carg.veiculoPlaca,
        motoristaNome: carg.motoristaNome,
        ajudanteNome: carg.ajudanteNome,
        rotaDescricao: carg.rotaDescricao,
        cidadesRota: carg.cidadesRota,
        totalNfs: carg.totalNfs ?? 0,
        totalVolumes: carg.totalVolumes ?? 0,
        totalPesoKg: carg.totalPesoKg ?? "0",
        totalValorNfs: carg.totalValorNfs ?? "0",
        itens: data?.itens ?? [],
      });
    } catch (e) {
      toast.error("Erro ao gerar romaneio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm" variant="ghost"
      className="h-7 text-xs gap-1 text-blue-400 hover:bg-blue-500/10"
      disabled={loading}
      onClick={handleRomaneio}
    >
      <Printer className="w-3 h-3" /> {loading ? "Gerando..." : "Romaneio"}
    </Button>
  );
}

// ─── Card de carregamento ─────────────────────────────────────────────────────
function CarregamentoCard({ carg, empresaId }: { carg: any; empresaId: number }) {
  const utils = trpc.useUtils();
  const [expandido, setExpandido] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [modalSaida, setModalSaida] = useState(false);
  const [modalRetorno, setModalRetorno] = useState(false);

  const cfg = STATUS_CARG[carg.status as StatusCarg] ?? STATUS_CARG.montando;
  const Icon = cfg.icon;

  const marcarProntoMut = trpc.carregamentos.marcarPronto.useMutation({
    onSuccess: () => { utils.carregamentos.list.invalidate({ empresaId }); toast.success("Carga marcada como pronta!"); },
  });
  const encerrarMut = trpc.carregamentos.encerrar.useMutation({
    onSuccess: () => { utils.carregamentos.list.invalidate({ empresaId }); toast.success("Carregamento encerrado!"); },
  });
  const removeMut = trpc.carregamentos.remove.useMutation({
    onSuccess: () => { utils.carregamentos.list.invalidate({ empresaId }); toast.success("Carregamento removido"); },
  });

  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-0">
        {/* Header do card */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="mt-0.5 p-2 rounded-lg bg-muted">
                <Truck className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{carg.numero ?? `#${carg.id}`}</span>
                  <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                    <Icon className="w-3 h-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {carg.veiculoPlaca && (
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{carg.veiculoPlaca}</span>
                  )}
                  {carg.motoristaNome && (
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{carg.motoristaNome}</span>
                  )}
                  {carg.data && (
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(carg.data).toLocaleDateString("pt-BR")}</span>
                  )}
                  {carg.rotaDescricao && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{carg.rotaDescricao}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs flex-wrap">
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{carg.totalNfs ?? 0} NFs</span>
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" />{carg.totalVolumes ?? 0} vol.</span>
                  <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{Number(carg.totalPesoKg || 0).toFixed(1)} kg</span>
                  <span className="flex items-center gap-1 text-emerald-400"><DollarSign className="w-3 h-3" />{fmt(carg.totalValorNfs)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpandido(!expandido)}>
                {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 flex-wrap mt-3 pt-3 border-t">
            {carg.status === "montando" && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                onClick={() => marcarProntoMut.mutate({ id: carg.id })}
              >
                <CheckCircle2 className="w-3 h-3" /> Marcar como Pronto
              </Button>
            )}
            {carg.status === "pronto" && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => setModalSaida(true)}
              >
                <Navigation className="w-3 h-3" /> Registrar Saída
              </Button>
            )}
            {carg.status === "em_rota" && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={() => setModalRetorno(true)}
              >
                <RotateCcw className="w-3 h-3" /> Registrar Retorno
              </Button>
            )}
            {carg.status === "retornado" && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-muted-foreground/30 text-muted-foreground hover:bg-muted/30"
                onClick={() => { if (confirm("Encerrar este carregamento?")) encerrarMut.mutate({ id: carg.id }); }}
              >
                <Archive className="w-3 h-3" /> Encerrar
              </Button>
            )}
            {(carg.status === "montando" || carg.status === "pronto") && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setModalEdit(true)}>
                <Pencil className="w-3 h-3" /> Editar
              </Button>
            )}
            <BotaoRomaneio carg={carg} />
            {carg.status === "montando" && (
              <Button
                size="sm" variant="ghost"
                className="h-7 text-xs gap-1 text-red-400 hover:bg-red-500/10"
                onClick={() => { if (confirm("Remover este carregamento?")) removeMut.mutate({ id: carg.id }); }}
              >
                <Trash2 className="w-3 h-3" /> Remover
              </Button>
            )}
          </div>
        </div>

        {/* Itens expandidos */}
        {expandido && <CarregamentoDetalhe cargId={carg.id} empresaId={empresaId} />}
      </CardContent>

      {/* Modal editar */}
      <Dialog open={modalEdit} onOpenChange={setModalEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Carregamento {carg.numero}</DialogTitle></DialogHeader>
          <FormCarregamento empresaId={empresaId} carg={carg} onClose={() => setModalEdit(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal saída */}
      <Dialog open={modalSaida} onOpenChange={setModalSaida}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Saída do Veículo</DialogTitle></DialogHeader>
          <ModalSaida carg={carg} onClose={() => setModalSaida(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal retorno */}
      <Dialog open={modalRetorno} onOpenChange={setModalRetorno}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Retorno do Veículo</DialogTitle></DialogHeader>
          <ModalRetorno carg={carg} onClose={() => setModalRetorno(false)} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Carregamento() {
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalNovo, setModalNovo] = useState(false);

  const { data: carregamentosData = [], isLoading } = trpc.carregamentos.list.useQuery({
    empresaId: EMPRESA_ID,
    status: statusFiltro !== "todos" ? (statusFiltro as StatusCarg) : undefined,
  });

  const filtrados = carregamentosData.filter((c: any) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      (c.numero ?? "").toLowerCase().includes(q) ||
      (c.veiculoPlaca ?? "").toLowerCase().includes(q) ||
      (c.motoristaNome ?? "").toLowerCase().includes(q) ||
      (c.rotaDescricao ?? "").toLowerCase().includes(q)
    );
  });

  // KPIs
  const total = carregamentosData.length;
  const montando = carregamentosData.filter((c: any) => c.status === "montando").length;
  const emRota = carregamentosData.filter((c: any) => c.status === "em_rota").length;
  const retornado = carregamentosData.filter((c: any) => c.status === "retornado").length;
  const totalNfs = carregamentosData.reduce((acc: number, c: any) => acc + (Number(c.totalNfs) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            Carregamento / Romaneio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monte a carga, vincule NFs, registre saída e retorno do veículo
          </p>
        </div>
        <Button className="gap-2" onClick={() => setModalNovo(true)}>
          <Plus className="w-4 h-4" /> Novo Carregamento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Montando</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{montando}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Em Rota</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{emRota}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Retornados</p>
          <p className="text-2xl font-bold mt-1 text-purple-400">{retornado}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total de NFs</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{totalNfs}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, placa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "todos", label: "Todos" },
            { value: "montando", label: "Montando" },
            { value: "pronto", label: "Pronto" },
            { value: "em_rota", label: "Em Rota" },
            { value: "retornado", label: "Retornado" },
            { value: "encerrado", label: "Encerrado" },
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
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhum carregamento encontrado.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie um carregamento para começar a montar a carga do veículo.
          </p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setModalNovo(true)}>
            <Plus className="w-4 h-4" /> Criar Primeiro Carregamento
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((c: any) => (
            <CarregamentoCard key={c.id} carg={c} empresaId={EMPRESA_ID} />
          ))}
        </div>
      )}

      {/* Modal novo carregamento */}
      <Dialog open={modalNovo} onOpenChange={setModalNovo}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Carregamento</DialogTitle></DialogHeader>
          <FormCarregamento empresaId={EMPRESA_ID} onClose={() => setModalNovo(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
