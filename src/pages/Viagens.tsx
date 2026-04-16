import { useTranslation } from 'react-i18next';
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { useViewAs } from "@/contexts/ViewAsContext";
import {
  Truck, Plus, Calculator, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, MapPin, User, Package, DollarSign, Fuel
} from "lucide-react";


const STATUS_CONFIG = {
  planejada: { label: "Planejada", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  em_andamento: { label: "Em Andamento", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  concluida: { label: "Concluída", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelada: { label: "Cancelada", color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const CLASSIFICACAO_CONFIG = {
  otimo: { label: "Ótimo (≥30%)", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  bom: { label: "Bom (15-30%)", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  atencao: { label: "Atenção (0-15%)", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  prejuizo: { label: "Prejuízo", icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
};

function CalculadoraViagem() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { t } = useTranslation();
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const [distanciaKm, setDistanciaKm] = useState("");
  const [freteTotal, setFreteTotal] = useState("");
  const [diasViagem, setDiasViagem] = useState("1");
  const [pedagio, setPedagio] = useState("0");
  const [outros, setOutros] = useState("0");
  const [ajudante1Id, setAjudante1Id] = useState<number | null>(null);
  const [ajudante2Id, setAjudante2Id] = useState<number | null>(null);
  const [calcAtivo, setCalcAtivo] = useState(false);

  const { data: veiculosList } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID, apenasAtivos: true });
  const { data: ajudantesList } = trpc.funcionarios.listAjudantes.useQuery({ empresaId: EMPRESA_ID });

  const calcInput = useMemo(() => ({
    empresaId: EMPRESA_ID,
    veiculoId: veiculoId ?? 0,
    distanciaKm: Number(distanciaKm) || 0,
    freteTotal: Number(freteTotal) || 0,
    diasViagem: Number(diasViagem) || 1,
    pedagioEstimado: Number(pedagio) || 0,
    outrosCustos: Number(outros) || 0,
    ajudante1Id: ajudante1Id ?? undefined,
    ajudante2Id: ajudante2Id ?? undefined,
  }), [veiculoId, distanciaKm, freteTotal, diasViagem, pedagio, outros, ajudante1Id, ajudante2Id]);

  const { data: resultado, isLoading } = trpc.frota.calcularCustoViagem.useQuery(calcInput, {
    enabled: calcAtivo && !!veiculoId && Number(distanciaKm) > 0 && Number(freteTotal) > 0,
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <Label>Veículo *</Label>
            <Select onValueChange={v => setVeiculoId(Number(v))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                {veiculosList?.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.placa} — {r.tipo.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Distância (km) *</Label>
              <Input className="mt-1" type="number" value={distanciaKm} onChange={e => setDistanciaKm(e.target.value)} placeholder="Ex: 1200" />
            </div>
            <div>
              <Label>Dias de viagem</Label>
              <Input className="mt-1" type="number" value={diasViagem} onChange={e => setDiasViagem(e.target.value)} min="1" />
            </div>
          </div>
          <div>
            <Label>Frete total esperado (R$) *</Label>
            <Input className="mt-1" type="number" value={freteTotal} onChange={e => setFreteTotal(e.target.value)} placeholder="Ex: 5000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pedágio estimado (R$)</Label>
              <Input className="mt-1" type="number" value={pedagio} onChange={e => setPedagio(e.target.value)} />
            </div>
            <div>
              <Label>Outros custos (R$)</Label>
              <Input className="mt-1" type="number" value={outros} onChange={e => setOutros(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ajudante 1</Label>
              <Select onValueChange={v => setAjudante1Id(v === "none" ? null : Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {ajudantesList?.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ajudante 2</Label>
              <Select onValueChange={v => setAjudante2Id(v === "none" ? null : Number(v))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {ajudantesList?.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" onClick={() => setCalcAtivo(true)} disabled={!veiculoId || !distanciaKm || !freteTotal}>
            <Calculator className="w-4 h-4 mr-2" />
            Calcular Viabilidade
          </Button>
        </div>

        {/* Resultado */}
        <div>
          {isLoading && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Calculando...
            </div>
          )}
          {resultado && !isLoading && (() => {
            const cfg = CLASSIFICACAO_CONFIG[resultado.classificacao];
            const Icon = cfg.icon;
            return (
              <div className="space-y-4">
                {/* Classificação */}
                <div className={`rounded-xl border p-4 ${cfg.bg}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-8 h-8 ${cfg.color}`} />
                    <div>
                      <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Margem estimada: <span className={`font-semibold ${cfg.color}`}>{resultado.margemPercent}%</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detalhamento */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Detalhamento dos Custos</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> Combustível ({resultado.litrosNecessarios}L × R${resultado.precoDieselUsado.toFixed(2)})</span>
                      <span className="font-medium">{fmt(resultado.custoCombustivel)}</span>
                    </div>
                    {resultado.custoDiariasMotorista > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><User className="w-3.5 h-3.5" /> Diária motorista ({diasViagem}d)</span>
                        <span className="font-medium">{fmt(resultado.custoDiariasMotorista)}</span>
                      </div>
                    )}
                    {resultado.custoDiariasAjudantes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1"><User className="w-3.5 h-3.5" /> Diárias ajudantes</span>
                        <span className="font-medium">{fmt(resultado.custoDiariasAjudantes)}</span>
                      </div>
                    )}
                    {resultado.pedagioEstimado > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pedágio</span>
                        <span className="font-medium">{fmt(resultado.pedagioEstimado)}</span>
                      </div>
                    )}
                    {resultado.outrosCustos > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Outros</span>
                        <span className="font-medium">{fmt(resultado.outrosCustos)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Custo Total</span>
                      <span className="text-red-400">{fmt(resultado.custoTotal)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Frete Total</span>
                      <span className="text-emerald-400">{fmt(resultado.freteTotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base">
                      <span>Lucro Estimado</span>
                      <span className={resultado.lucroEstimado >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {fmt(resultado.lucroEstimado)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">
                    Média de consumo do veículo: {resultado.mediaConsumoVeiculo} km/L
                  </div>
                </div>
              </div>
            );
          })()}
          {!resultado && !isLoading && calcAtivo && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Preencha todos os campos obrigatórios para calcular.
            </div>
          )}
          {!calcAtivo && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Calculator className="w-12 h-12 opacity-30" />
              <p className="text-sm text-center">Preencha os dados ao lado e clique em<br /><strong>Calcular Viabilidade</strong></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormViagem({ onSuccess }: { onSuccess: () => void }) {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [veiculoId, setVeiculoId] = useState("");
  const [cavaloPrincipalId, setCavaloPrincipalId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [ajudante1Id, setAjudante1Id] = useState("");
  const [ajudante2Id, setAjudante2Id] = useState("");
  const [ajudante3Id, setAjudante3Id] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [dataSaida, setDataSaida] = useState("");
  const [kmSaida, setKmSaida] = useState("");
  const [descricaoCarga, setDescricaoCarga] = useState("");
  const [pesoCarga, setPesoCarga] = useState("");
  const [freteTotal, setFreteTotal] = useState("");
  const [adiantamento, setAdiantamento] = useState("");
  const [notaFiscal, setNotaFiscal] = useState("");

  const { data: veiculosList } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID, apenasAtivos: true });
  const { data: cavalos } = trpc.veiculos.listCavalos.useQuery({ empresaId: EMPRESA_ID });
  const { data: motoristas } = trpc.funcionarios.listMotoristas.useQuery({ empresaId: EMPRESA_ID });
  const { data: ajudantes } = trpc.funcionarios.listAjudantes.useQuery({ empresaId: EMPRESA_ID });

  const veiculoSelecionado = veiculosList?.find(r => r.id === Number(veiculoId));
  const isCarreta = veiculoSelecionado?.tipo === "carreta";

  const createMutation = trpc.viagens.create.useMutation({
    onSuccess: () => {
      toast.success("Viagem criada com sucesso!");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculoId) { toast.error("Selecione um veículo"); return; }
    createMutation.mutate({
      empresaId: EMPRESA_ID,
      veiculoId: Number(veiculoId),
      cavaloPrincipalId: cavaloPrincipalId ? Number(cavaloPrincipalId) : null,
      motoristaId: motoristaId ? Number(motoristaId) : null,
      ajudante1Id: ajudante1Id ? Number(ajudante1Id) : null,
      ajudante2Id: ajudante2Id ? Number(ajudante2Id) : null,
      ajudante3Id: ajudante3Id ? Number(ajudante3Id) : null,
      origem: origem || undefined,
      destino: destino || undefined,
      dataSaida: dataSaida || null,
      kmSaida: kmSaida ? Number(kmSaida) : null,
      descricaoCarga: descricaoCarga || undefined,
      pesoCarga: pesoCarga || null,
      freteTotal: freteTotal || null,
      adiantamento: adiantamento || null,
      notaFiscal: notaFiscal || undefined,
      status: "planejada",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Veículo *</Label>
          <Select value={veiculoId} onValueChange={setVeiculoId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione o veículo" />
            </SelectTrigger>
            <SelectContent>
              {veiculosList?.map(r => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.placa} — {r.tipo.toUpperCase()}
                    {r.capacidadeCarga ? ` (${r.capacidadeCarga}t)` : ""}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cavalo — só aparece se for carreta */}
        {isCarreta && (
          <div className="col-span-2">
            <Label className="text-amber-400">Cavalo (trator) acoplado</Label>
            <Select value={cavaloPrincipalId} onValueChange={setCavaloPrincipalId}>
              <SelectTrigger className="mt-1 border-amber-500/30">
                <SelectValue placeholder="Selecione o cavalo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {cavalos?.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.placa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Motorista</Label>
          <Select value={motoristaId} onValueChange={setMotoristaId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {motoristas?.map(m => (
                <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Ajudante 1</Label>
          <Select value={ajudante1Id} onValueChange={setAjudante1Id}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {ajudantes?.map(a => (
                <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Ajudante 2</Label>
          <Select value={ajudante2Id} onValueChange={setAjudante2Id}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {ajudantes?.map(a => (
                <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Ajudante 3</Label>
          <Select value={ajudante3Id} onValueChange={setAjudante3Id}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {ajudantes?.map(a => (
                <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Origem</Label>
          <PlacesAutocomplete
            value={origem}
            onChange={setOrigem}
            placeholder="Cidade, endereço ou empresa..."
            iconColor="text-green-500"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Destino</Label>
          <PlacesAutocomplete
            value={destino}
            onChange={setDestino}
            placeholder="Cidade, endereço ou empresa..."
            iconColor="text-red-500"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Data de saída</Label>
          <Input className="mt-1" type="datetime-local" value={dataSaida} onChange={e => setDataSaida(e.target.value)} />
        </div>

        <div>
          <Label>KM na saída</Label>
          <Input className="mt-1" type="number" value={kmSaida} onChange={e => setKmSaida(e.target.value)} />
        </div>

        <div className="col-span-2">
          <Label>Descrição da carga</Label>
          <Input className="mt-1" value={descricaoCarga} onChange={e => setDescricaoCarga(e.target.value)} placeholder="Ex: Carga de eletrodomésticos" />
        </div>

        <div>
          <Label>Peso da carga (ton)</Label>
          <Input className="mt-1" type="number" value={pesoCarga} onChange={e => setPesoCarga(e.target.value)} />
        </div>

        <div>
          <Label>Frete total (R$)</Label>
          <Input className="mt-1" type="number" value={freteTotal} onChange={e => setFreteTotal(e.target.value)} />
        </div>

        <div>
          <Label>Adiantamento (R$)</Label>
          <Input className="mt-1" type="number" value={adiantamento} onChange={e => setAdiantamento(e.target.value)} placeholder="Dinheiro para viagem" />
        </div>
        <div>
          <Label>Nota Fiscal</Label>
          <Input className="mt-1" value={notaFiscal} onChange={e => setNotaFiscal(e.target.value)} placeholder="Nº da NF" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Criando..." : "Criar Viagem"}
      </Button>
    </form>
  );
}

export default function Viagens() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [openNova, setOpenNova] = useState(false);

  const { data: viagensList, refetch } = trpc.viagens.list.useQuery({
    empresaId: EMPRESA_ID,
    status: statusFiltro !== "todos" ? statusFiltro as any : undefined,
    limit: 100,
  });

  const updateStatusMutation = trpc.viagens.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const fmt = (v: string | null | undefined) => {
    if (!v) return "—";
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const fmtDate = (d: Date | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  return (
<div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Viagens</h1>
            <p className="text-muted-foreground text-sm mt-1">Despacho, acompanhamento e análise de viagens</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculadora
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Calculadora de Viabilidade de Viagem</DialogTitle>
                </DialogHeader>
                <CalculadoraViagem />
              </DialogContent>
            </Dialog>

            <Dialog open={openNova} onOpenChange={setOpenNova}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Viagem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Nova Viagem</DialogTitle>
                </DialogHeader>
                <FormViagem onSuccess={() => { setOpenNova(false); refetch(); }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros de status */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "todos", label: "Todas" },
            { value: "planejada", label: "Planejadas" },
            { value: "em_andamento", label: "Em Andamento" },
            { value: "concluida", label: "Concluídas" },
            { value: "cancelada", label: "Canceladas" },
          ].map(f => (
            <Button
              key={f.value}
              variant={statusFiltro === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFiltro(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Lista de viagens */}
        <div className="space-y-3">
          {!viagensList?.length && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Truck className="w-12 h-12 opacity-30" />
              <p>Nenhuma viagem encontrada.</p>
              <Button variant="outline" onClick={() => setOpenNova(true)}>
                <Plus className="w-4 h-4 mr-2" /> Criar primeira viagem
              </Button>
            </div>
          )}

          {viagensList?.map(v => {
            const statusCfg = STATUS_CONFIG[v.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planejada;
            const lucro = v.freteTotal && v.totalDespesas
              ? Number(v.freteTotal) - Number(v.totalDespesas)
              : null;

            return (
              <Card key={v.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-1 p-2 rounded-lg bg-primary/10">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{v.veiculoPlaca ?? "—"}</span>
                          <Badge variant="outline" className="text-xs">{v.veiculoTipo?.toUpperCase()}</Badge>
                          <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          {(v.origem || v.destino) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {v.origem ?? "?"} → {v.destino ?? "?"}
                            </span>
                          )}
                          {v.motoristaNome && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {v.motoristaNome}
                            </span>
                          )}
                          {v.descricaoCarga && (
                            <span className="flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />
                              {v.descricaoCarga}
                              {v.pesoCarga ? ` (${v.pesoCarga}t)` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Saída: {fmtDate(v.dataSaida)}
                          </span>
                          {v.dataChegada && <span>Chegada: {fmtDate(v.dataChegada)}</span>}
                          {v.kmRodado && <span>{Number(v.kmRodado).toLocaleString("pt-BR")} km</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      {v.freteTotal && (
                        <p className="font-semibold text-emerald-400 text-sm">
                          {fmt(v.freteTotal)}
                        </p>
                      )}
                      {v.adiantamento && (
                        <p className="text-xs text-muted-foreground">
                          Adiant.: {fmt(v.adiantamento)}
                        </p>
                      )}
                      {lucro !== null && (
                        <p className={`text-xs font-medium ${lucro >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {lucro >= 0 ? "+" : ""}{fmt(String(lucro))}
                        </p>
                      )}

                      {/* Ações de status */}
                      {v.status === "planejada" && (
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => updateStatusMutation.mutate({ id: v.id, status: "em_andamento" })}>
                          Iniciar
                        </Button>
                      )}
                      {v.status === "em_andamento" && (
                        <Button size="sm" variant="outline" className="text-xs h-7 border-emerald-500/30 text-emerald-400"
                          onClick={() => updateStatusMutation.mutate({ id: v.id, status: "concluida" })}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Concluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
);
}
