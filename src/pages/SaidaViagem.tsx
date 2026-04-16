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
import { Send, MapPin, Truck, User, Clock, CheckCircle2, Play, Square, Info } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { useViewAs } from "@/contexts/ViewAsContext";

export default function SaidaViagem() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    veiculoId: "",
    cavaloCopladoId: "",
    motoristaId: "",
    ajudante1Id: "",
    ajudante2Id: "",
    ajudante3Id: "",
    kmSaida: "",
    origem: "",
    destino: "",
    tipoCarga: "",
    pesoCarga: "",
    adiantamento: "",
    observacoes: "",
  });
  const [sucesso, setSucesso] = useState(false);

  const { data: veiculos } = trpc.veiculos.list.useQuery({ empresaId: 1 });
  const { data: cavalosData } = trpc.veiculos.listCavalos.useQuery({ empresaId: 1 });
  const { data: funcionarios } = trpc.funcionarios.list.useQuery({ empresaId: 1 });
  const { data: emAndamento, refetch } = trpc.viagens.list.useQuery({
    empresaId: 1,
    tipo: "viagem",
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
  const ajudantes = (funcionarios ?? []).filter(f => f.funcao === "ajudante");
  const cavalos = cavalosData ?? [];
  const carretas = (veiculos ?? []).filter(v => v.tipo !== "cavalo");
  const veiculoSelecionado = (veiculos ?? []).find(v => String(v.id) === form.veiculoId);
  const isCarreta = veiculoSelecionado?.tipo === "carreta";

  const criarViagem = trpc.viagens.create.useMutation({
    onSuccess: () => {
      toast.success("Saída de viagem registrada!");
      setSucesso(true);
      setForm({ veiculoId: "", cavaloCopladoId: "", motoristaId: "", ajudante1Id: "", ajudante2Id: "", ajudante3Id: "", kmSaida: "", origem: "", destino: "", tipoCarga: "", pesoCarga: "", adiantamento: "", observacoes: "" });
      refetch();
      setTimeout(() => setSucesso(false), 3000);
    },
    onError: (e) => toast.error(e.message),
  });

  const registrarChegada = trpc.viagens.update.useMutation({
    onSuccess: () => { toast.success("Chegada registrada!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.veiculoId || !form.motoristaId || !form.kmSaida) {
      toast.error("Veículo, motorista e KM de saída são obrigatórios");
      return;
    }
    if (isCarreta && !form.cavaloCopladoId) {
      toast.error("Selecione o cavalo (caminhão trator) para esta carreta");
      return;
    }
    criarViagem.mutate({
      empresaId: 1,
      tipo: "viagem",
      veiculoId: parseInt(form.veiculoId),
      cavaloPrincipalId: form.cavaloCopladoId ? parseInt(form.cavaloCopladoId) : undefined,
      motoristaId: parseInt(form.motoristaId),
      ajudante1Id: form.ajudante1Id ? parseInt(form.ajudante1Id) : undefined,
      ajudante2Id: form.ajudante2Id ? parseInt(form.ajudante2Id) : undefined,
      ajudante3Id: form.ajudante3Id ? parseInt(form.ajudante3Id) : undefined,
      kmSaida: parseFloat(form.kmSaida),
      origem: form.origem || undefined,
      destino: form.destino || undefined,
      tipoCarga: form.tipoCarga || undefined,
      pesoCarga: form.pesoCarga || undefined,
      adiantamento: form.adiantamento || undefined,
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
            <Send className="h-6 w-6 text-primary" />
            Saída de Viagem
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Viagem longa — com pernoite ou múltiplos dias
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registrar Nova Viagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Veículo e Cavalo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Veículo *</Label>
                    <Select value={form.veiculoId} onValueChange={v => setForm(p => ({ ...p, veiculoId: v, cavaloCopladoId: "", kmSaida: "" }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {carretas.map(v => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.placa} — {v.modelo ?? v.tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cavalo obrigatório para carreta, opcional para outros */}
                  {(isCarreta || cavalos.length > 0) && (
                    <div className={`space-y-2 ${isCarreta ? "p-3 rounded-lg border border-orange-200 bg-orange-500/5" : ""}`}>
                      <Label className={isCarreta ? "flex items-center gap-1.5 text-orange-700" : ""}>
                        {isCarreta && <Truck className="h-3.5 w-3.5" />}
                        Cavalo (Caminhão Trator){isCarreta ? " *" : " (opcional)"}
                      </Label>
                      <Select value={form.cavaloCopladoId} onValueChange={v => setForm(p => ({ ...p, cavaloCopladoId: v === "__none__" ? "" : v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder={isCarreta ? "Selecione o cavalo acoplado" : "Selecione o cavalo (opcional)"} />
                        </SelectTrigger>
                        <SelectContent>
                          {!isCarreta && <SelectItem value="__none__">Nenhum</SelectItem>}
                          {cavalos.map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.placa} — {v.modelo ?? "Cavalo"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isCarreta && <p className="text-xs text-orange-600">Carreta selecionada — informe o cavalo trator acoplado</p>}
                    </div>
                  )}
                </div>

                {/* Motorista */}
                <div className="space-y-2">
                  <Label>Motorista *</Label>
                  <Select value={form.motoristaId} onValueChange={v => setForm(p => ({ ...p, motoristaId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um motorista" />
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

                {/* Ajudantes */}
                {ajudantes.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="space-y-2">
                        <Label className="text-xs">Ajudante {n}</Label>
                        <Select
                          value={(form as any)[`ajudante${n}Id`] || "__none__"}
                          onValueChange={v => setForm(p => ({ ...p, [`ajudante${n}Id`]: v === "__none__" ? "" : v }))}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Opcional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum</SelectItem>
                            {ajudantes.map(a => (
                              <SelectItem key={a.id} value={String(a.id)}>
                                {a.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}

                {/* KM e Rota */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      KM de Saída *
                      {fetchingKm && <span className="text-xs text-muted-foreground">(buscando...)</span>}
                    </Label>
                    <Input
                      type="number"
                      placeholder={fetchingKm ? "Buscando KM anterior..." : "Ex: 125430"}
                      value={form.kmSaida}
                      onChange={e => setForm(p => ({ ...p, kmSaida: e.target.value }))}
                      disabled={fetchingKm}
                    />
                    {ultimoKmData?.kmAtual && form.kmSaida && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Info className="h-3 w-3" />
                        Último KM: {ultimoKmData.kmAtual.toLocaleString("pt-BR")} km
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Origem</Label>
                    <PlacesAutocomplete
                      value={form.origem}
                      onChange={v => setForm(p => ({ ...p, origem: v }))}
                      placeholder="Cidade, endereço ou empresa..."
                      iconColor="text-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destino</Label>
                    <PlacesAutocomplete
                      value={form.destino}
                      onChange={v => setForm(p => ({ ...p, destino: v }))}
                      placeholder="Cidade, endereço ou empresa..."
                      iconColor="text-red-500"
                    />
                  </div>
                </div>

                {/* Carga e Financeiro */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Carga</Label>
                    <Input
                      placeholder="Ex: Carga seca..."
                      value={form.tipoCarga}
                      onChange={e => setForm(p => ({ ...p, tipoCarga: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso (kg)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 15000"
                      value={form.pesoCarga}
                      onChange={e => setForm(p => ({ ...p, pesoCarga: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adiantamento (R$)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 500.00"
                      value={form.adiantamento}
                      onChange={e => setForm(p => ({ ...p, adiantamento: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Informações adicionais sobre a viagem..."
                    value={form.observacoes}
                    onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={criarViagem.isPending}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {criarViagem.isPending ? "Registrando..." : "Registrar Saída de Viagem"}
                </Button>

                {sucesso && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Viagem registrada com sucesso!
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
                    <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 text-xs">Viagem Longa</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data/Hora</span>
                    <span className="font-medium text-xs">{agora}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Viagens em andamento */}
            {(emAndamento ?? []).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5 text-blue-600" />
                    Veículos em Viagem ({emAndamento!.length})
                  </p>
                  <div className="space-y-2">
                    {emAndamento!.map((v: any) => (
                      <div key={v.id} className="p-2 rounded border bg-muted/30 text-xs space-y-1">
                        <div className="font-medium">{v.veiculoPlaca}</div>
                        {v.motoristaNome && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {v.motoristaNome}
                          </div>
                        )}
                        {v.destino && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {v.destino}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
);
}
