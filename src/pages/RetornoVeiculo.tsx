import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Truck, MapPin, CheckCircle2, AlertTriangle, Fuel, Wrench, Zap, Volume2, FileText } from "lucide-react";
import { useViewAs } from "@/contexts/ViewAsContext";

const CHECKLIST_ITENS = [
  { key: "combustivelReserva", label: "Combustível/ARLA na reserva", icon: Fuel },
  { key: "lampada", label: "Lâmpada queimada", icon: Zap },
  { key: "limpezaInterna", label: "Limpeza interna do baú pendente", icon: Truck },
  { key: "dificuldadeMotor", label: "Dificuldade para funcionar o motor", icon: Wrench },
  { key: "pneusMurchos", label: "Pneus murchos ou carecas", icon: AlertTriangle },
  { key: "ruidoEstranho", label: "Ruído estranho no veículo", icon: Volume2 },
  { key: "avariaVeiculo", label: "Avaria no veículo", icon: AlertTriangle },
  { key: "documentosEmDia", label: "Documentos em dia", icon: FileText },
];

export default function RetornoVeiculo() {
  const { t } = useTranslation();
  const [viagemId, setViagemId] = useState("");
  const [kmChegada, setKmChegada] = useState("");
  const [teveProblema, setTeveProblema] = useState("nao");
  const [voltouComCarga, setVoltouComCarga] = useState("nao");
  const [observacoes, setObservacoes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const { data: emAndamento, refetch: refetchViagens } = trpc.viagens.list.useQuery({
    empresaId: 1,
    status: "em_andamento",
  });

  const registrarRetorno = trpc.viagens.update.useMutation({
    onSuccess: () => {
      toast.success("Retorno registrado com sucesso!");
      setViagemId("");
      setKmChegada("");
      setTeveProblema("nao");
      setVoltouComCarga("nao");
      setObservacoes("");
      setChecklist({});
      refetchViagens();
    },
    onError: (e) => toast.error(e.message),
  });

  const viagemSelecionada = (emAndamento ?? []).find(v => String(v.id) === viagemId);
  const problemasChecklist = Object.entries(checklist).filter(([, v]) => v).map(([k]) => k);

  const handleSubmit = () => {
    if (!viagemId || !kmChegada) {
      toast.error("Selecione a viagem e informe o KM de chegada");
      return;
    }
    const observacoesChecklist = problemasChecklist.length > 0
      ? `Problemas no checklist: ${problemasChecklist.join(", ")}. ${observacoes}`
      : observacoes;

    registrarRetorno.mutate({
      id: parseInt(viagemId),
      status: "concluida",
      kmChegada: parseFloat(kmChegada),
      dataChegada: new Date().toISOString(),
      teveProblema: teveProblema === "sim",
      voltouComCarga: voltouComCarga === "sim",
      observacoesChegada: observacoesChecklist || undefined,
    });
  };

  return (
<div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            Retorno de Veículo
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registrar a chegada do veículo com checklist de inspeção
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário principal */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados do Retorno</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Selecione a Viagem em Andamento *</Label>
                  <Select value={viagemId} onValueChange={setViagemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a viagem" />
                    </SelectTrigger>
                    <SelectContent>
                      {(emAndamento ?? []).map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.veiculoPlaca ?? `Viagem #${v.id}`}
                          {v.motoristaNome ? ` — ${v.motoristaNome}` : ""}
                          {v.destino ? ` → ${v.destino}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(emAndamento ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma viagem em andamento no momento.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>KM de Chegada *</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 125680"
                    value={kmChegada}
                    onChange={e => setKmChegada(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teve Problema?</Label>
                    <Select value={teveProblema} onValueChange={setTeveProblema}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Voltou com Carga?</Label>
                    <Select value={voltouComCarga} onValueChange={setVoltouComCarga}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações da Chegada</Label>
                  <Textarea
                    placeholder="Observações sobre a chegada..."
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Checklist de Retorno */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Checklist de Retorno
                </CardTitle>
                <p className="text-xs text-muted-foreground">Marque os itens que apresentam problema:</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CHECKLIST_ITENS.map(item => {
                    const Icon = item.icon;
                    const ativo = checklist[item.key] ?? false;
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          ativo ? "border-red-200 bg-red-50" : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Icon className={`h-4 w-4 ${ativo ? "text-red-500" : "text-muted-foreground"}`} />
                          <span className={ativo ? "text-red-700 font-medium" : ""}>{item.label}</span>
                        </div>
                        <Switch
                          checked={ativo}
                          onCheckedChange={v => setChecklist(p => ({ ...p, [item.key]: v }))}
                        />
                      </div>
                    );
                  })}
                </div>

                {problemasChecklist.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {problemasChecklist.length} problema(s) identificado(s) no checklist
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={registrarRetorno.isPending || !viagemId || !kmChegada}
              className="w-full"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {registrarRetorno.isPending ? "Registrando..." : "Registrar Retorno"}
            </Button>
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">
            {/* Detalhes da viagem selecionada */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3">Detalhes da Viagem</p>
                {viagemSelecionada ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{viagemSelecionada.veiculoPlaca}</span>
                    </div>
                    {viagemSelecionada.motoristaNome && (
                      <div className="text-muted-foreground">{viagemSelecionada.motoristaNome}</div>
                    )}
                    {viagemSelecionada.destino && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {viagemSelecionada.destino}
                      </div>
                    )}
                    {viagemSelecionada.kmSaida && (
                      <div className="text-muted-foreground">KM Saída: {Number(viagemSelecionada.kmSaida).toLocaleString("pt-BR")}</div>
                    )}
                    {kmChegada && viagemSelecionada.kmSaida && (
                      <div className="text-green-600 font-medium">
                        KM Rodado: {(parseFloat(kmChegada) - Number(viagemSelecionada.kmSaida)).toLocaleString("pt-BR")} km
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Selecione uma viagem para ver os detalhes</p>
                )}
              </CardContent>
            </Card>

            {/* Veículos em viagem */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                  Veículos em Viagem ({(emAndamento ?? []).length})
                </p>
                {(emAndamento ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum veículo em viagem</p>
                ) : (
                  <div className="space-y-2">
                    {(emAndamento ?? []).map(v => (
                      <div key={v.id} className="p-2 rounded border bg-muted/30 text-xs">
                        <div className="font-medium">{v.veiculoPlaca}</div>
                        {v.motoristaNome && <div className="text-muted-foreground">{v.motoristaNome}</div>}
                        {v.destino && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {v.destino}
                          </div>
                        )}
                        <Badge className={`mt-1 text-xs ${v.tipo === "entrega" ? "bg-cyan-500/10 text-cyan-700" : "bg-blue-500/10 text-blue-700"}`}>
                          {v.tipo === "entrega" ? "Entrega" : "Viagem"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
);
}
