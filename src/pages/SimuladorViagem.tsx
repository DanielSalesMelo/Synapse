
import { useTranslation } from 'react-i18next';
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import {
  Route, MapPin, Clock, Fuel, DollarSign, TrendingUp,
  Navigation, AlertTriangle, Truck, Calculator, RotateCcw,
  History, Info, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";
import { cn } from "@/lib/utils";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtKm(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
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
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
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
  
  // Custos Adicionais
  const [consumo, setConsumo] = useState("2.5");
  const [precoCombustivel, setPrecoCombustivel] = useState("5.89");
  const [pedagioManual, setPedagioManual] = useState("0");
  const [outrosCustos, setOutrosCustos] = useState("0");
  const [valorFrete, setValorFrete] = useState("");
  
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Data from TRPC
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const historicoQ = trpc.simulador.listHistory.useQuery(
    { empresaId: EMPRESA_ID, limit: 10 },
    { enabled: !!EMPRESA_ID }
  ) as any;
  const saveSimulation = trpc.simulador.save.useMutation({
    onSuccess: () => {
      historicoQ.refetch?.();
      toast.success("Simulação salva no histórico.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar a simulação."),
    onSettled: () => setSalvando(false),
  });

  // Update consumption when vehicle changes
  useEffect(() => {
    if (veiculoId && veiculos.length > 0) {
      const v = veiculos.find(x => x.id === Number(veiculoId));
      if (v && v.mediaConsumo) {
        setConsumo(v.mediaConsumo.toString());
      }
    }
  }, [veiculoId, veiculos]);

  // Initialize Google Maps services
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    directionsServiceRef.current = new google.maps.DirectionsService();
    setMapReady(true);
    setMapError(null);
  }, []);

  // Setup autocomplete
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
      });
    }
  }, [mapReady]);

  // Calculate routes
  const calcularRotas = useCallback(() => {
    if (!directionsServiceRef.current || !mapRef.current) {
      toast.error("Serviço de mapas não disponível");
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

    renderersRef.current.forEach(r => r.setMap(null));
    renderersRef.current = [];

    directionsServiceRef.current.route(
      {
        origin: o,
        destination: d,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        region: "br",
      },
      (result, status) => {
        setCalculando(false);
        if (status !== "OK" || !result) {
          toast.error("Erro ao calcular rota. Verifique os endereços.");
          return;
        }

        const routeInfos: RotaInfo[] = result.routes.slice(0, 3).map((route, idx) => {
          const leg = route.legs[0];
          return {
            index: idx,
            summary: route.summary || `Rota ${idx + 1}`,
            distanceKm: (leg.distance?.value || 0) / 1000,
            durationSec: leg.duration?.value || 0,
            hasTolls: route.warnings?.some(w => w.toLowerCase().includes("pedágio") || w.toLowerCase().includes("toll")),
            warnings: route.warnings || [],
          };
        });

        setRotas(routeInfos);
        setRotaSelecionada(0);

        routeInfos.forEach((_, idx) => {
          const renderer = new google.maps.DirectionsRenderer({
            map: mapRef.current!,
            directions: result,
            routeIndex: idx,
            polylineOptions: {
              strokeColor: ROUTE_COLORS[idx],
              strokeWeight: idx === 0 ? 6 : 4,
              strokeOpacity: idx === 0 ? 1 : 0.5,
            },
            suppressMarkers: idx > 0,
          });
          renderersRef.current.push(renderer);
        });
      }
    );
  }, [origem, destino]);

  const limpar = () => {
    renderersRef.current.forEach(r => r.setMap(null));
    renderersRef.current = [];
    setRotas([]);
    setOrigem("");
    setDestino("");
    setVeiculoId("");
    if (origemInputRef.current) origemInputRef.current.value = "";
    if (destinoInputRef.current) destinoInputRef.current.value = "";
  };

  const salvarSimulacao = () => {
    const origemAtual = origemInputRef.current?.value || origem;
    const destinoAtual = destinoInputRef.current?.value || destino;
    if (!EMPRESA_ID) {
      toast.error("Selecione uma empresa antes de salvar.");
      return;
    }
    if (!origemAtual || !destinoAtual) {
      toast.error("Informe origem e destino.");
      return;
    }
    setSalvando(true);
    saveSimulation.mutate({
      empresaId: EMPRESA_ID,
      origem: origemAtual,
      destino: destinoAtual,
      distanceKm: Number(distanciaTotal || 0),
      durationSec: Number(tempoTotal || 0),
      idaVolta,
      consumo: Number(consumo) || 0,
      precoCombustivel: Number(precoCombustivel) || 0,
      pedagio: Number(pedagioManual) || 0,
      outrosCustos: Number(outrosCustos) || 0,
      valorFrete: Number(valorFrete) || 0,
      custoTotal: Number(custoTotal || 0),
      lucro: Number(lucro || 0),
      margem: Number(margem || 0),
      rotaResumo: rotaAtual?.summary ?? null,
    });
  };

  // Lógica de Cálculo
  const rotaAtual = rotas[rotaSelecionada];
  const distanciaTotal = rotaAtual ? (idaVolta ? rotaAtual.distanceKm * 2 : rotaAtual.distanceKm) : 0;
  const tempoTotal = rotaAtual ? (idaVolta ? rotaAtual.durationSec * 2 : rotaAtual.durationSec) : 0;
  
  const custoCombustivel = (distanciaTotal / (Number(consumo) || 1)) * (Number(precoCombustivel) || 0);
  const custoPedagio = (Number(pedagioManual) || 0) * (idaVolta ? 2 : 1);
  const custoTotal = custoCombustivel + custoPedagio + (Number(outrosCustos) || 0);
  const lucro = (Number(valorFrete) || 0) - custoTotal;
  const margem = (Number(valorFrete) || 0) > 0 ? (lucro / Number(valorFrete)) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Navigation className="w-7 h-7 text-blue-600" />
              Simulador de Viagem Profissional
            </h1>
            <p className="text-gray-500 text-sm">Planejamento estratégico de rotas e custos logísticos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={limpar} className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50">
              <RotateCcw className="w-4 h-4 mr-2" /> Reiniciar
            </Button>
            <Button variant="outline" onClick={salvarSimulacao} disabled={salvando} className="bg-white border-gray-200 text-gray-600 hover:bg-gray-50">
              <History className="w-4 h-4 mr-2" /> {salvando ? "Salvando..." : "Salvar simulação"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Definição de Rota
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Origem</Label>
                  <Input 
                    ref={origemInputRef}
                    placeholder="Cidade, empresa ou endereço completo" 
                    className="border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Destino</Label>
                  <Input 
                    ref={destinoInputRef}
                    placeholder="Destino final da carga"
                    className="border-gray-200 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="idavolta" 
                    checked={idaVolta} 
                    onChange={(e) => setIdaVolta(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <Label htmlFor="idavolta" className="text-sm text-gray-600 cursor-pointer">Considerar ida e volta</Label>
                </div>
                <Button 
                  onClick={calcularRotas} 
                  disabled={calculando}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 transition-all"
                >
                  {calculando ? (
                    <><span className="animate-spin mr-2">⏳</span> Calculando...</>
                  ) : (
                    <><Calculator className="w-4 h-4 mr-2" /> Calcular Rota</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Veículo e Custos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Selecionar Veículo</Label>
                  <Select value={veiculoId} onValueChange={setVeiculoId}>
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Escolha um veículo da frota" />
                    </SelectTrigger>
                    <SelectContent>
                      {veiculos.map(v => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          {v.placa} - {v.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-xs">Consumo (km/l)</Label>
                    <Input 
                      type="number" 
                      value={consumo} 
                      onChange={e => setConsumo(e.target.value)}
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-xs">Preço Diesel (R$)</Label>
                    <Input 
                      type="number" 
                      value={precoCombustivel} 
                      onChange={e => setPrecoCombustivel(e.target.value)}
                      className="border-gray-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-xs">Pedágios (R$)</Label>
                    <Input 
                      type="number" 
                      value={pedagioManual} 
                      onChange={e => setPedagioManual(e.target.value)}
                      placeholder="Informe manualmente"
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium text-xs">Outros Custos (R$)</Label>
                    <Input 
                      type="number" 
                      value={outrosCustos} 
                      onChange={e => setOutrosCustos(e.target.value)}
                      className="border-gray-200"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-gray-900 font-bold">Valor do Frete (R$)</Label>
                  <Input 
                    type="number" 
                    value={valorFrete} 
                    onChange={e => setValorFrete(e.target.value)}
                    placeholder="0,00"
                    className="border-blue-200 focus:border-blue-500 h-12 text-lg font-semibold text-blue-700 mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita: Mapa e Resumo */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg"><Route className="w-6 h-6 text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Distância</p>
                    <p className="text-xl font-bold text-gray-900">{fmtKm(distanciaTotal)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-lg"><Clock className="w-6 h-6 text-amber-600" /></div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Tempo Est.</p>
                    <p className="text-xl font-bold text-gray-900">{fmtTempo(tempoTotal)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className={cn("bg-white border-gray-200 shadow-sm", margem > 20 ? "border-l-4 border-l-green-500" : margem > 0 ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-red-500")}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-lg"><TrendingUp className="w-6 h-6 text-green-600" /></div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Margem</p>
                    <p className="text-xl font-bold text-gray-900">{margem.toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden border-gray-200 shadow-md">
              <div className="relative h-[450px] bg-gray-100">
                <MapView
                  onMapReady={handleMapReady}
                  onLoadError={(error) => {
                    setMapError(error.message);
                    setMapReady(false);
                  }}
                  className="h-full w-full"
                />
                {mapError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 backdrop-blur-[2px] z-10 p-6">
                    <div className="bg-white p-5 rounded-xl shadow-xl max-w-lg text-center space-y-2">
                      <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                      <p className="text-gray-900 font-semibold">Serviço de mapas não disponível</p>
                      <p className="text-sm text-gray-600">
                        {mapError}. Você ainda pode preencher os custos manualmente sem quebrar a tela.
                      </p>
                    </div>
                  </div>
                ) : !rotas.length && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 backdrop-blur-[2px] z-10">
                    <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3">
                      <Info className="w-5 h-5 text-blue-600" />
                      <p className="text-gray-700 font-medium">Aguardando definição de rota para exibir mapa</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {rotas.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-md font-semibold">Opções de Rota</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {rotas.map((r, i) => (
                      <div 
                        key={i}
                        onClick={() => setRotaSelecionada(i)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                          rotaSelecionada === i ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ROUTE_COLORS[i] }} />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{r.summary}</p>
                            <p className="text-xs text-gray-500">{fmtKm(r.distanceKm)} • {fmtTempo(r.durationSec)}</p>
                          </div>
                        </div>
                        {r.hasTolls && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">PEDÁGIO</Badge>}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white border-gray-200 shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-md font-semibold">Resumo Financeiro</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> Combustível</span>
                      <span className="font-semibold text-gray-900">{fmt(custoCombustivel)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Pedágios</span>
                      <span className="font-semibold text-gray-900">{fmt(custoPedagio)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Outros</span>
                      <span className="font-semibold text-gray-900">{fmt(Number(outrosCustos) || 0)}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between">
                      <span className="text-gray-900 font-bold">Custo Total</span>
                      <span className="text-gray-900 font-bold">{fmt(custoTotal)}</span>
                    </div>
                    <div className={cn("pt-2 mt-2 rounded-lg p-3 flex justify-between items-center", lucro >= 0 ? "bg-green-50" : "bg-red-50")}>
                      <span className={cn("font-bold", lucro >= 0 ? "text-green-700" : "text-red-700")}>Resultado Líquido</span>
                      <span className={cn("text-xl font-black", lucro >= 0 ? "text-green-700" : "text-red-700")}>{fmt(lucro)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-md font-semibold">Histórico de Simulações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(historicoQ.data ?? []).map((item: any) => (
                  <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900">{item.origem} → {item.destino}</p>
                        <p className="text-xs text-gray-500">
                          {item.rotaResumo || "Rota manual"} • {fmtKm(Number(item.distanceKm || 0))} • {fmt(item.custoTotal ? Number(item.custoTotal) : 0)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {Number(item.margem || 0).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {(historicoQ.data ?? []).length === 0 && (
                  <p className="text-sm text-gray-500">Nenhuma simulação salva.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
