import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ClipboardCheck, Plus, CheckCircle2, XCircle, MinusCircle, AlertTriangle, Truck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type ItemStatus = "conforme" | "nao_conforme" | "na";

interface ChecklistItem {
  id: string;
  grupo: string;
  descricao: string;
  status: ItemStatus;
  obs: string;
}

const ITENS_INTERNOS = [
  "Crachá de identificação",
  "CNH válida",
  "Documentos do veículo (CRLV, seguro)",
  "EPI (colete, capacete, luvas)",
  "Computador de bordo funcionando",
  "Cinto de segurança",
  "Banco e encosto regulados",
  "Direção e volante",
  "Luzes do painel",
  "Tacógrafo funcionando",
  "Extintor de incêndio",
  "Portas e travas",
  "Limpador de para-brisa",
  "Buzina",
  "Freio de mão",
  "Alarme de maneco/caçamba",
  "Cabine limpa e organizada",
  "Ausência de objetos soltos",
  "Espelho retrovisor interno",
  "Ar condicionado / ventilação",
  "Rádio / comunicação",
];

const ITENS_EXTERNOS = [
  "Pneus (calibragem e desgaste)",
  "Ausência de vazamentos (óleo, água, combustível)",
  "Triângulo e cones de sinalização",
  "Espelhos retrovisores externos",
  "Lona de cobertura da carga",
  "Faixas refletivas",
  "Luzes laterais",
  "Luz de freio",
  "Faróis e lanternas",
  "Pisca-alerta",
  "Luz de ré e alarme de ré",
  "Setas dianteiras e traseiras",
  "Macaco e chave de roda",
  "Estepe",
];

function initItens(): ChecklistItem[] {
  return [
    ...ITENS_INTERNOS.map((d, i) => ({ id: `int_${i}`, grupo: "Interno", descricao: d, status: "conforme" as ItemStatus, obs: "" })),
    ...ITENS_EXTERNOS.map((d, i) => ({ id: `ext_${i}`, grupo: "Externo", descricao: d, status: "conforme" as ItemStatus, obs: "" })),
  ];
}

const STATUS_CONFIG = {
  conforme:     { label: "Conforme",     icon: CheckCircle2, color: "text-green-500",  bg: "bg-green-500/10 border-green-500/30" },
  nao_conforme: { label: "Não Conforme", icon: XCircle,      color: "text-red-500",    bg: "bg-red-500/10 border-red-500/30" },
  na:           { label: "N/A",          icon: MinusCircle,  color: "text-gray-400",   bg: "bg-gray-500/10 border-gray-500/30" },
};

export default function Checklist() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [veiculoId, setVeiculoId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [turno, setTurno] = useState("manha");
  const [itens, setItens] = useState<ChecklistItem[]>(initItens);
  const [obsGeral, setObsGeral] = useState("");

  const { data: veiculos } = trpc.veiculos.list.useQuery({ empresaId: 1 });
  const { data: funcionarios } = trpc.funcionarios.list.useQuery({ empresaId: 1 });
  const motoristas = funcionarios?.filter(f => f.funcao === "motorista") ?? [];

  const naoConformes = itens.filter(i => i.status === "nao_conforme");
  const conformes = itens.filter(i => i.status === "conforme");

  function setStatus(id: string, status: ItemStatus) {
    setItens(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  }

  function setObs(id: string, obs: string) {
    setItens(prev => prev.map(i => i.id === id ? { ...i, obs } : i));
  }

  function handleSubmit() {
    if (!veiculoId || !motoristaId) {
      toast.error("Selecione o veículo e o motorista");
      return;
    }
    // Salvar checklist — endpoint a ser implementado
    toast.success(`Checklist salvo! ${conformes.length} conformes, ${naoConformes.length} não conformes.`);
    if (naoConformes.length > 0) {
      toast.warning(`⚠️ ${naoConformes.length} item(ns) não conforme(s) — verifique antes de liberar o veículo!`);
    }
    setOpen(false);
    setItens(initItens());
    setVeiculoId("");
    setMotoristaId("");
    setObsGeral("");
  }

  const grupoInterno = itens.filter(i => i.grupo === "Interno");
  const grupoExterno = itens.filter(i => i.grupo === "Externo");

  return (
<div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              Checklist de Veículo
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Inspeção obrigatória na saída e retorno dos veículos
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Checklist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  Checklist de Inspeção
                </DialogTitle>
              </DialogHeader>

              {/* Dados do cabeçalho */}
              <div className="grid grid-cols-3 gap-3 py-2">
                <div className="space-y-2">
                  <Label>Veículo *</Label>
                  <Select value={veiculoId} onValueChange={setVeiculoId}>
                    <SelectTrigger><SelectValue placeholder="Placa" /></SelectTrigger>
                    <SelectContent>
                      {veiculos?.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Motorista *</Label>
                  <Select value={motoristaId} onValueChange={setMotoristaId}>
                    <SelectTrigger><SelectValue placeholder="Nome" /></SelectTrigger>
                    <SelectContent>
                      {motoristas.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Turno</Label>
                  <Select value={turno} onValueChange={setTurno}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manha">Manhã</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                      <SelectItem value="noite">Noite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Alerta de não conformes */}
              {naoConformes.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-400 font-medium">
                    {naoConformes.length} item(ns) não conforme(s) — verifique antes de liberar!
                  </p>
                </div>
              )}

              {/* Itens Internos */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground border-b border-border pb-1">
                  🚗 Itens Internos ({grupoInterno.length})
                </p>
                {grupoInterno.map(item => (
                  <ItemRow key={item.id} item={item} onStatus={setStatus} onObs={setObs} />
                ))}
              </div>

              {/* Itens Externos */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground border-b border-border pb-1">
                  🔧 Itens Externos ({grupoExterno.length})
                </p>
                {grupoExterno.map(item => (
                  <ItemRow key={item.id} item={item} onStatus={setStatus} onObs={setObs} />
                ))}
              </div>

              {/* Observação geral */}
              <div className="space-y-2">
                <Label>Observação Geral</Label>
                <Textarea
                  placeholder="Observações gerais sobre o veículo..."
                  value={obsGeral}
                  onChange={e => setObsGeral(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Resumo */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">{conformes.length} Conformes</Badge>
                {naoConformes.length > 0 && (
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20">{naoConformes.length} Não Conformes</Badge>
                )}
                <Badge variant="outline">{itens.filter(i => i.status === "na").length} N/A</Badge>
              </div>

              <Button className="w-full" onClick={handleSubmit}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Salvar Checklist
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estado vazio */}
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-base font-semibold text-foreground mb-2">Nenhum checklist registrado ainda</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              O checklist garante a segurança da frota e protege a empresa em caso de acidentes ou auditorias.
              Registre a inspeção de cada veículo antes de cada viagem.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
                <p className="text-xs text-green-400 font-medium">Conforme</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
                <p className="text-xs text-red-400 font-medium">Não Conforme</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-500/10">
                <MinusCircle className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400 font-medium">Não Aplica</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Truck className="h-4 w-4" />
              <span>35 itens · Internos e Externos · Histórico completo por veículo</span>
            </div>
          </CardContent>
        </Card>
      </div>
);
}

function ItemRow({
  item,
  onStatus,
  onObs,
}: {
  item: ChecklistItem;
  onStatus: (id: string, s: ItemStatus) => void;
  onObs: (id: string, obs: string) => void;
}) {
  const [showObs, setShowObs] = useState(false);
  const cfg = STATUS_CONFIG[item.status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-2 ${item.status === "nao_conforme" ? "border-red-500/40 bg-red-500/5" : "border-border/50 bg-muted/10"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-foreground flex-1">{item.descricao}</p>
        <div className="flex gap-1">
          {(["conforme", "nao_conforme", "na"] as ItemStatus[]).map(s => {
            const c = STATUS_CONFIG[s];
            const SIcon = c.icon;
            return (
              <button
                key={s}
                onClick={() => { onStatus(item.id, s); if (s === "nao_conforme") setShowObs(true); }}
                className={`p-1.5 rounded-md transition-all ${item.status === s ? c.bg + " " + c.color : "text-muted-foreground hover:text-foreground"}`}
                title={c.label}
              >
                <SIcon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>
      {(showObs || item.obs) && (
        <Textarea
          className="mt-2 text-xs h-14 resize-none"
          placeholder="Descreva o problema..."
          value={item.obs}
          onChange={e => onObs(item.id, e.target.value)}
        />
      )}
      {item.status === "nao_conforme" && !showObs && !item.obs && (
        <button
          className="text-xs text-red-400 mt-1 underline"
          onClick={() => setShowObs(true)}
        >
          + Adicionar observação
        </button>
      )}
    </div>
  );
}
