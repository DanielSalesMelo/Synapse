import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Truck, User, CheckCircle2, Play, Square, Info } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";

export default function SaidaEntrega() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    veiculoId: "",
    cavaloPrincipalId: "",
    motoristaId: "",
    kmSaida: "",
    destino: "",
    tipoCarga: "",
    observacoes: "",
  });
  const [sucesso, setSucesso] = useState(false);
  const [kmCarregando, setKmCarregando] = useState(false);

  const { data: veiculos } = trpc.veiculos.list.useQuery({ empresaId: 1 });
  const { data: cavalos } = trpc.veiculos.listCavalos.useQuery({ empresaId: 1 });
  const { data: funcionarios } = trpc.funcionarios.list.useQuery({ empresaId: 1 });
  const { data: emAndamento, refetch } = trpc.viagens.list.useQuery({
    empresaId: 1,
    tipo: "entrega",
    status: "em_andamento",
  });

  // Buscar último KM quando veículo é selecionado
  const { data: ultimoKmData, isFetching: fetchingKm } = trpc.veiculos.getUltimoKm.useQuery(
    { veiculoId: parseInt(form.veiculoId) },
    { enabled: !!form.veiculoId && parseInt(form.veiculoId) > 0 }
  );

  useEffect(() => {
    if (ultimoKmData?.kmAtual && !fetchingKm) {
      setForm(p => ({ ...p, kmSaida: String(ultimoKmData.kmAtual) }));
      toast.info(`KM anterior carregado: ${ultimoKmData.kmAtual.toLocaleString("pt-BR")} km`);
    }
  }, [ultimoKmData, fetchingKm]);

  const motoristas = (funcionarios ?? []).filter(f => f.funcao === "motorista");
  const veiculoSelecionado = (veiculos ?? []).find(v => String(v.id) === form.veiculoId);
  const isCarreta = veiculoSelecionado?.tipo === "carreta";

  const criarViagem = trpc.viagens.create.useMutation({
    onSuccess: () => {
      toast.success("Saída de entrega registrada com sucesso!");
      setSucesso(true);
      setForm({ veiculoId: "", cavaloPrincipalId: "", motoristaId: "", kmSaida: "", destino: "", tipoCarga: "", observacoes: "" });
      refetch();
      setTimeout(() => setSucesso(false), 3000);
    },
    onError: (e) => toast.error(e.message),
  });

  const registrarChegada = trpc.viagens.update.useMutation({
    onSuccess: () => { toast.success("Retorno registrado!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.veiculoId || !form.motoristaId || !form.kmSaida) {
      toast.error("Veículo, motorista e KM de saída são obrigatórios");
      return;
    }
    if (isCarreta && !form.cavaloPrincipalId) {
      toast.error("Selecione o cavalo (caminhão trator) para esta carreta");
      return;
    }
    criarViagem.mutate({
      empresaId: 1,
      tipo: "entrega",
      veiculoId: parseInt(form.veiculoId),
      cavaloPrincipalId: form.cavaloPrincipalId ? parseInt(form.cavaloPrincipalId) : undefined,
      motoristaId: parseInt(form.motoristaId),
      kmSaida: parseFloat(form.kmSaida),
      destino: form.destino || undefined,
      tipoCarga: form.tipoCarga || undefined,
      observacoes: form.observacoes || undefined,
      status: "em_andamento",
      dataSaida: new Date().toISOString(),
    });
  };

  const agora = new Date().toLocaleString("pt-BR");

  return (
<div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Saída de Entrega
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Entrega local — sai e volta no mesmo dia
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registrar Saída</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Veículo *</Label>
                    <Select
                      value={form.veiculoId}
                      onValueChange={v => setForm(p => ({ ...p, veiculoId: v, cavaloPrincipalId: "", kmSaida: "" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {(veiculos ?? []).filter(v => v.tipo !== "cavalo").map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.placa} — {v.modelo ?? v.tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Motorista *</Label>
                    <Select value={form.motoristaId} onValueChange={v => setForm(p => ({ ...p, motoristaId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoristas.map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seleção de cavalo — aparece apenas se for carreta */}
                {isCarreta && (
                  <div className="space-y-2 p-3 rounded-lg border border-orange-200 bg-orange-500/5">
                    <Label className="flex items-center gap-1.5 text-orange-700">
                      <Truck className="h-3.5 w-3.5" />
                      Cavalo (Caminhão Trator) *
                    </Label>
                    <Select
                      value={form.cavaloPrincipalId}
                      onValueChange={v => setForm(p => ({ ...p, cavaloPrincipalId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cavalo acoplado" />
                      </SelectTrigger>
                      <SelectContent>
                        {(cavalos ?? []).map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.placa} — {c.modelo ?? "Cavalo"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-orange-600">Carreta selecionada — informe o cavalo trator acoplado</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      KM de Saída *
                      {fetchingKm && <span className="text-xs text-muted-foreground">(buscando...)</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder={fetchingKm ? "Buscando KM anterior..." : "Ex: 125430"}
                        value={form.kmSaida}
                        onChange={e => setForm(p => ({ ...p, kmSaida: e.target.value }))}
                        disabled={fetchingKm}
                      />
                      {ultimoKmData?.kmAtual && form.kmSaida && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                          <Info className="h-3 w-3" />
                          Último KM registrado: {ultimoKmData.kmAtual.toLocaleString("pt-BR")} km
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Destino
                    </Label>
                    <PlacesAutocomplete
                      value={form.destino}
                      onChange={v => setForm(p => ({ ...p, destino: v }))}
                      placeholder="Cliente, cidade ou endereço..."
                      iconColor="text-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Carga</Label>
                  <Input
                    placeholder="Ex: Carga seca, refrigerada..."
                    value={form.tipoCarga}
                    onChange={e => setForm(p => ({ ...p, tipoCarga: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações sobre a entrega..."
                    value={form.observacoes}
                    onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={criarViagem.isPending || fetchingKm}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {criarViagem.isPending ? "Registrando..." : "Registrar Saída de Entrega"}
                </Button>

                {sucesso && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Saída registrada com sucesso!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumo */}
          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-500/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Resumo da Saída</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge className="bg-cyan-500/10 text-cyan-700 border-cyan-200 text-xs">Entrega Local</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data/Hora</span>
                    <span className="font-medium text-xs">{agora}</span>
                  </div>
                  {veiculoSelecionado && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Veículo</span>
                      <span className="font-medium text-xs">{veiculoSelecionado.placa}</span>
                    </div>
                  )}
                  {form.kmSaida && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">KM Saída</span>
                      <span className="font-medium text-xs">{Number(form.kmSaida).toLocaleString("pt-BR")} km</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-500/5">
              <CardContent className="p-4">
                <p className="text-xs text-yellow-700">
                  <strong>Entrega local:</strong> o veículo sai e retorna no mesmo dia. Use "Saída de Viagem" para viagens longas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Entregas em andamento */}
        {(emAndamento ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-600" />
                Veículos em Entrega ({emAndamento!.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emAndamento!.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        {v.veiculoPlaca ?? `Viagem #${v.id}`}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {v.motoristaNome && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {v.motoristaNome}
                          </span>
                        )}
                        {v.destino && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {v.destino}
                          </span>
                        )}
                        {v.dataSaida && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(v.dataSaida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => registrarChegada.mutate({
                        id: v.id,
                        status: "concluida",
                        dataChegada: new Date().toISOString(),
                      })}
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      Retornou
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
);
}
