import { useTranslation } from 'react-i18next';
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapView } from "@/components/Map";
import {
  Route, MapPin, Clock, Fuel, DollarSign, TrendingUp, Save,
  ArrowRight, Navigation, AlertTriangle, Truck, Calculator, RotateCcw,
  History
} from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtKm(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " km";
}

function fmtTempo(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h}h ${m}min`;
}

interface RotaInfo {
  index: number;
  summary: string;
  distanceKm: number;
  durationSec: number;
  hasTolls: boolean;
  warnings: string[];
}

const ROUTE_COLORS = ["#2563eb", "#16a34a", "#ea580c"];

export default function SimuladorViagem() {
  const { t } = useTranslation();
  // Map refs
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const renderersRef = useRef<google.maps.DirectionsRenderer[]>([]);
  const autocompleteOrigemRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteDestinoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const origemInputRef = useRef<HTMLInputElement>(null);
  const destinoInputRef = useRef<HTMLInputElement>(null);

  // State
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [rotas, setRotas] = useState<RotaInfo[]>([]);
  const [rotaSelecionada, setRotaSelecionada] = useState(0);
  const [calculando, setCalculando] = useState(false);
  const [idaVolta, setIdaVolta] = useState(false);
  const [veiculoId, setVeiculoId] = useState("");
  const [pedagioManual, setPedagioManual] = useState("");
  const [outrosCustos, setOutrosCustos] = useState("");
  const [freteTotal, setFreteTotal] = useState("");
  const [diasViagem, setDiasViagem] = useState("1");
  const [precoDiesel, setPrecoDiesel] = useState("");
  const [showHistorico, setShowHistorico] = useState(false);
  const [showSalvar, setShowSalvar] = useState(false);
  const [descricaoSalvar, setDescricaoSalvar] = useState("");
  const [mapReady, setMapReady] = useState(false);

  // Data
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: simulacoes = [] } = trpc.frota.listSimulacoes.useQuery({ empresaId: EMPRESA_ID });
  const { data: custoMedioTanque } = trpc.frota.tanque.custoMedio.useQuery({ empresaId: EMPRESA_ID });

  const custoViagemQuery = trpc.frota.calcularCustoViagem.useQuery(
    {
      empresaId: EMPRESA_ID,
      veiculoId: veiculoId ? Number(veiculoId) : 0,
      distanciaKm: rotas[rotaSelecionada]
        ? (idaVolta ? rotas[rotaSelecionada].distanceKm * 2 : rotas[rotaSelecionada].distanceKm)
        : 0,
      freteTotal: Number(freteTotal) || 0,
      diasViagem: Number(diasViagem) || 1,
      pedagioEstimado: Number(pedagioManual) || 0,
      outrosCustos: Number(outrosCustos) || 0,
      precoDiesel: precoDiesel ? Number(precoDiesel) : (custoMedioTanque?.diesel.custoMedio || null),
    },
    {
      enabled: rotas.length > 0 && !!veiculoId && Number(veiculoId) > 0,
    }
  );

  const salvarMutation = trpc.frota.salvarSimulacao.useMutation({
    onSuccess: () => {
      toast.success("Simulação salva com sucesso!");
      setShowSalvar(false);
      setDescricaoSalvar("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Initialize Google Maps services
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    directionsServiceRef.current = new google.maps.DirectionsService();
    setMapReady(true);
  }, []);

  // Setup autocomplete after map is ready — aceita qualquer tipo de local (empresas, endereços, cidades, etc.)
  useEffect(() => {
    if (!mapReady || !window.google) return;

    if (origemInputRef.current && !autocompleteOrigemRef.current) {
      autocompleteOrigemRef.current = new google.maps.places.Autocomplete(origemInputRef.current, {
        componentRestrictions: { country: "br" },
        fields: ["formatted_address", "name", "geometry"],
      });
      autocompleteOrigemRef.current.addListener("place_changed", () => {
        const place = autocompleteOrigemRef.current?.getPlace();
        if (place?.formatted_address) setOrigem(place.formatted_address);
        else if (place?.name) setOrigem(place.name);
      });
    }

    if (destinoInputRef.current && !autocompleteDestinoRef.current) {
      autocompleteDestinoRef.current = new google.maps.places.Autocomplete(destinoInputRef.current, {
        componentRestrictions: { country: "br" },
        fields: ["formatted_address", "name", "geometry"],
      });
      autocompleteDestinoRef.current.addListener("place_changed", () => {
        const place = autocompleteDestinoRef.current?.getPlace();
        if (place?.formatted_address) setDestino(place.formatted_address);
        else if (place?.name) setDestino(place.name);
      });
    }
  }, [mapReady]);

  // Calculate routes
  const calcularRotas = useCallback(() => {
    if (!directionsServiceRef.current || !mapRef.current) {
      toast.error("Mapa ainda carregando, aguarde...");
      return;
    }
    const o = origemInputRef.current?.value || origem;
    const d = destinoInputRef.current?.value || destino;
    if (!o || !d) {
      toast.error("Informe origem e destino");
      return;
    }

    setCalculando(true);
    setRotas([]);

    // Clear previous renderers
    renderersRef.current.forEach(r => r.setMap(null));
    renderersRef.current = [];

    directionsServiceRef.current.route(
      {
        origin: o,
        destination: d,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        region: "br",
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (result, status) => {
        setCalculando(false);
        if (status !== "OK" || !result) {
          toast.error("Não foi possível calcular a rota. Verifique os endereços.");
          return;
        }

        const routeInfos: RotaInfo[] = result.routes.slice(0, 3).map((route, idx) => {
          const leg = route.legs[0];
          const distKm = (leg.distance?.value || 0) / 1000;
          const durSec = leg.duration?.value || 0;

          // Check for tolls in warnings and step instructions
          const hasTolls = !!(
            route.warnings?.some(w =>
              w.toLowerCase().includes("toll") || w.toLowerCase().includes("pedágio")
            ) ||
            leg.steps?.some(s =>
              s.instructions?.toLowerCase().includes("toll") ||
              s.instructions?.toLowerCase().includes("pedágio")
            )
          );

          return {
            index: idx,
            summary: route.summary || `Rota ${idx + 1}`,
            distanceKm: Math.round(distKm * 10) / 10,
            durationSec: durSec,
            hasTolls,
            warnings: route.warnings || [],
          };
        });

        setRotas(routeInfos);
        setRotaSelecionada(0);
        setOrigem(o);
        setDestino(d);

        // Render all routes on map
        routeInfos.forEach((_, idx) => {
          const renderer = new google.maps.DirectionsRenderer({
            map: mapRef.current!,
            directions: result,
            routeIndex: idx,
            polylineOptions: {
              strokeColor: ROUTE_COLORS[idx] || "#888",
              strokeWeight: idx === 0 ? 6 : 4,
              strokeOpacity: idx === 0 ? 1 : 0.5,
            },
            suppressMarkers: idx > 0,
            suppressInfoWindows: idx > 0,
          });
          renderersRef.current.push(renderer);
        });
      }
    );
  }, [origem, destino]);

  // Highlight selected route
  useEffect(() => {
    renderersRef.current.forEach((renderer, idx) => {
      renderer.setOptions({
        polylineOptions: {
          strokeColor: ROUTE_COLORS[idx] || "#888",
          strokeWeight: idx === rotaSelecionada ? 6 : 3,
          strokeOpacity: idx === rotaSelecionada ? 1 : 0.35,
        },
      });
    });
  }, [rotaSelecionada]);

  const limpar = () => {
    renderersRef.current.forEach(r => r.setMap(null));
    renderersRef.current = [];
    setRotas([]);
    setOrigem("");
    setDestino("");
    setVeiculoId("");
    setPedagioManual("");
    setOutrosCustos("");
    setFreteTotal("");
    setDiasViagem("1");
    setPrecoDiesel("");
    setIdaVolta(false);
    if (origemInputRef.current) origemInputRef.current.value = "";
    if (destinoInputRef.current) destinoInputRef.current.value = "";
  };

  const custoData = custoViagemQuery.data;
  const rotaAtual = rotas[rotaSelecionada];
  const distanciaFinal = rotaAtual ? (idaVolta ? rotaAtual.distanceKm * 2 : rotaAtual.distanceKm) : 0;
  const tempoFinal = rotaAtual ? (idaVolta ? rotaAtual.durationSec * 2 : rotaAtual.durationSec) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Route className="w-6 h-6 text-blue-500" />
            Simulador de Viagem
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Calcule rotas reais, custos e rentabilidade antes de aceitar uma viagem
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistorico(true)} className="gap-1">
            <History className="w-4 h-4" /> Histórico
          </Button>
          {rotas.length > 0 && (
            <Button variant="outline" size="sm" onClick={limpar} className="gap-1">
              <RotateCcw className="w-4 h-4" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Formulário de Rota */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-4 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-green-500" /> Origem
              </Label>
              <Input
                ref={origemInputRef}
                placeholder="Cidade, endereço ou empresa..."
                defaultValue={origem}
                onChange={e => setOrigem(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="lg:col-span-1 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="lg:col-span-4 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" /> Destino
              </Label>
              <Input
                ref={destinoInputRef}
                placeholder="Cidade, endereço ou empresa..."
                defaultValue={destino}
                onChange={e => setDestino(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="lg:col-span-3 flex gap-2">
              <Button
                onClick={calcularRotas}
                disabled={calculando}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {calculando ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Calculando...
                  </span>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" /> Calcular Rotas
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Opções */}
          <div className="flex items-center gap-6 mt-3 pt-3 border-t">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={idaVolta}
                onChange={e => setIdaVolta(e.target.checked)}
                className="rounded border-gray-300"
              />
              Ida e Volta
            </label>
            {custoMedioTanque && custoMedioTanque.diesel.custoMedio > 0 && (
              <span className="text-xs text-muted-foreground">
                Custo médio do tanque: <strong className="text-foreground">R$ {custoMedioTanque.diesel.custoMedio.toFixed(3)}/L</strong>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rotas encontradas */}
      {rotas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Route className="w-5 h-5" />
            {rotas.length} rota{rotas.length > 1 ? "s" : ""} encontrada{rotas.length > 1 ? "s" : ""}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {origem} → {destino}
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rotas.map((rota, idx) => (
              <Card
                key={idx}
                className={`cursor-pointer transition-all ${
                  rotaSelecionada === idx
                    ? "ring-2 ring-blue-500 shadow-lg"
                    : "hover:shadow-md opacity-75"
                }`}
                onClick={() => setRotaSelecionada(idx)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: ROUTE_COLORS[idx] }}
                      />
                      <span className="font-semibold text-sm">Rota {idx + 1}</span>
                    </div>
                    {rotaSelecionada === idx && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Selecionada</Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground truncate" title={rota.summary}>
                    via {rota.summary}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Distância</p>
                        <p className="font-bold text-sm">
                          {fmtKm(idaVolta ? rota.distanceKm * 2 : rota.distanceKm)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tempo</p>
                        <p className="font-bold text-sm">
                          {fmtTempo(idaVolta ? rota.durationSec * 2 : rota.durationSec)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 text-xs p-1.5 rounded ${
                    rota.hasTolls
                      ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
                      : "text-green-600 bg-green-50 dark:bg-green-950/30"
                  }`}>
                    {rota.hasTolls ? (
                      <><AlertTriangle className="w-3 h-3" /> Rota com pedágio</>
                    ) : (
                      <><Navigation className="w-3 h-3" /> Sem pedágio detectado</>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Cálculo de custos */}
      {rotas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Cálculo de Custos — Rota {rotaSelecionada + 1} {idaVolta ? "(Ida e Volta)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <Label>Veículo *</Label>
                <Select value={veiculoId} onValueChange={setVeiculoId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.placa} {v.modelo ? `— ${v.modelo}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor do Frete (R$)</Label>
                <Input
                  type="number" step="0.01" placeholder="0,00"
                  value={freteTotal} onChange={e => setFreteTotal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dias de Viagem</Label>
                <Input
                  type="number" min="1"
                  value={diasViagem} onChange={e => setDiasViagem(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preço Diesel (R$/L)</Label>
                <Input
                  type="number" step="0.001"
                  placeholder={custoMedioTanque?.diesel.custoMedio ? `Tanque: ${custoMedioTanque.diesel.custoMedio.toFixed(3)}` : "0,000"}
                  value={precoDiesel} onChange={e => setPrecoDiesel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pedágio (R$)</Label>
                <Input
                  type="number" step="0.01" placeholder="Manual"
                  value={pedagioManual} onChange={e => setPedagioManual(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Outros Custos (R$)</Label>
                <Input
                  type="number" step="0.01" placeholder="0,00"
                  value={outrosCustos} onChange={e => setOutrosCustos(e.target.value)}
                />
              </div>
            </div>

            {/* Resultado do cálculo */}
            {custoData && veiculoId && (
              <div className="mt-4 space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                    <Navigation className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Distância</p>
                    <p className="text-lg font-bold text-blue-600">{fmtKm(distanciaFinal)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                    <p className="text-xs text-muted-foreground">Tempo Est.</p>
                    <p className="text-lg font-bold text-orange-600">{fmtTempo(tempoFinal)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                    <Fuel className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
                    <p className="text-xs text-muted-foreground">Litros</p>
                    <p className="text-lg font-bold text-yellow-600">{custoData.litrosNecessarios} L</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 text-center">
                    <DollarSign className="w-4 h-4 mx-auto mb-1 text-red-500" />
                    <p className="text-xs text-muted-foreground">Custo Total</p>
                    <p className="text-lg font-bold text-red-600">{fmt(custoData.custoTotal)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 text-center">
                    <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
                    <p className="text-xs text-muted-foreground">Lucro Est.</p>
                    <p className={`text-lg font-bold ${custoData.lucroEstimado >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(custoData.lucroEstimado)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{
                    backgroundColor: custoData.classificacao === "otimo" ? "rgba(34,197,94,0.1)" :
                      custoData.classificacao === "bom" ? "rgba(59,130,246,0.1)" :
                      custoData.classificacao === "atencao" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)"
                  }}>
                    <Truck className="w-4 h-4 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Margem</p>
                    <p className="text-lg font-bold">{custoData.margemPercent}%</p>
                    <Badge className={`text-xs ${
                      custoData.classificacao === "otimo" ? "bg-green-100 text-green-700" :
                      custoData.classificacao === "bom" ? "bg-blue-100 text-blue-700" :
                      custoData.classificacao === "atencao" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>
                      {custoData.classificacao === "otimo" ? "Ótimo" :
                       custoData.classificacao === "bom" ? "Bom" :
                       custoData.classificacao === "atencao" ? "Atenção" : "Prejuízo"}
                    </Badge>
                  </div>
                </div>

                {/* Detalhamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm font-semibold">Detalhamento de Custos</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Combustível ({custoData.litrosNecessarios}L x R$ {custoData.precoDieselUsado?.toFixed(3)})</span>
                        <span className="font-medium">{fmt(custoData.custoCombustivel)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diárias Motorista ({diasViagem} dia{Number(diasViagem) > 1 ? "s" : ""})</span>
                        <span className="font-medium">{fmt(custoData.custoDiariasMotorista)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diárias Ajudantes</span>
                        <span className="font-medium">{fmt(custoData.custoDiariasAjudantes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pedágio (manual)</span>
                        <span className="font-medium">{fmt(custoData.pedagioEstimado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outros custos</span>
                        <span className="font-medium">{fmt(custoData.outrosCustos)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Total de Custos</span>
                        <span className="text-red-600">{fmt(custoData.custoTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-sm font-semibold">Resumo Financeiro</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Frete</span>
                        <span className="font-medium text-green-600">{fmt(custoData.freteTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">(-) Custos</span>
                        <span className="font-medium text-red-600">{fmt(custoData.custoTotal)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Lucro Estimado</span>
                        <span className={custoData.lucroEstimado >= 0 ? "text-green-600" : "text-red-600"}>
                          {fmt(custoData.lucroEstimado)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margem</span>
                        <span className="font-bold">{custoData.margemPercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Consumo médio veículo</span>
                        <span>{custoData.mediaConsumoVeiculo} km/L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Custo por km</span>
                        <span className="font-medium">
                          {distanciaFinal > 0 ? fmt(custoData.custoTotal / distanciaFinal) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Receita por km</span>
                        <span className="font-medium">
                          {distanciaFinal > 0 ? fmt(custoData.freteTotal / distanciaFinal) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão salvar */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowSalvar(true)}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4" /> Salvar Simulação
                  </Button>
                </div>
              </div>
            )}

            {!veiculoId && rotas.length > 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Selecione um veículo acima para calcular os custos da viagem</p>
                <p className="text-xs mt-1">O cálculo usa o consumo médio cadastrado do veículo</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapa */}
      <Card className="overflow-hidden">
        <MapView
          className="h-[400px] lg:h-[500px]"
          initialCenter={{ lat: -15.77, lng: -47.92 }}
          initialZoom={4}
          onMapReady={handleMapReady}
        />
      </Card>

      {/* Dialog Salvar */}
      <Dialog open={showSalvar} onOpenChange={setShowSalvar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Simulação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Frete SP → RJ - Carga de aço"
                value={descricaoSalvar}
                onChange={e => setDescricaoSalvar(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <p><strong>{origem}</strong> → <strong>{destino}</strong></p>
              <p className="mt-1">{fmtKm(distanciaFinal)} | Custo: {custoData ? fmt(custoData.custoTotal) : "—"} | Lucro: {custoData ? fmt(custoData.lucroEstimado) : "—"}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowSalvar(false)}>Cancelar</Button>
            <Button
              disabled={!descricaoSalvar || salvarMutation.isPending}
              onClick={() => {
                if (!custoData) return;
                salvarMutation.mutate({
                  empresaId: EMPRESA_ID,
                  veiculoId: Number(veiculoId) || undefined,
                  descricao: descricaoSalvar,
                  origem,
                  destino,
                  distanciaKm: distanciaFinal,
                  valorFrete: Number(freteTotal) || 0,
                  custoTotal: custoData.custoTotal,
                  margemBruta: custoData.lucroEstimado,
                  margemPct: custoData.margemPercent,
                  detalhes: JSON.stringify({
                    rotaIndex: rotaSelecionada,
                    rotaSummary: rotaAtual?.summary,
                    tempoEstimado: tempoFinal,
                    litros: custoData.litrosNecessarios,
                    idaVolta,
                    hasTolls: rotaAtual?.hasTolls,
                  }),
                  observacoes: undefined,
                });
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {salvarMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico */}
      <Dialog open={showHistorico} onOpenChange={setShowHistorico}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Simulações Salvas
            </DialogTitle>
          </DialogHeader>
          {simulacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma simulação salva ainda</p>
              <p className="text-xs mt-1">Calcule uma rota e salve para ver aqui</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96 space-y-2">
              {simulacoes.map((s: any) => (
                <div key={s.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{s.descricao}</p>
                    <Badge className={`text-xs ${
                      Number(s.margemPct) >= 30 ? "bg-green-100 text-green-700" :
                      Number(s.margemPct) >= 15 ? "bg-blue-100 text-blue-700" :
                      Number(s.margemPct) >= 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>
                      {Number(s.margemPct).toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    {s.origem && s.destino && <span className="font-medium">{s.origem} → {s.destino}</span>}
                    <span>{fmtKm(Number(s.distanciaKm))}</span>
                    <span>Frete: {fmt(Number(s.valorFrete))}</span>
                    <span>Custo: {fmt(Number(s.custoTotal))}</span>
                    <span className={Number(s.margemBruta) >= 0 ? "text-green-600" : "text-red-600"}>
                      Lucro: {fmt(Number(s.margemBruta))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(s.createdAt).toLocaleDateString("pt-BR")} {s.createdBy ? `por ${s.createdBy}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
