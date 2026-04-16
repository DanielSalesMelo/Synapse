import { useTranslation } from 'react-i18next';
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useViewAs } from "@/contexts/ViewAsContext";
import {
  BarChart3, TrendingUp, TrendingDown, Fuel, Wrench,
  DollarSign, Truck, AlertTriangle, Calculator, Target
} from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (v: number, dec = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export default function Custos() {
  const { t } = useTranslation();
  const [veiculoId, setVeiculoId] = useState<string>("todos");
  const [periodo, setPeriodo] = useState<string>("12");
  const [precoKm, setPrecoKm] = useState<string>("0.85");

  const { data: veiculos } = trpc.veiculos.list.useQuery({ empresaId: 1 });
  const { data: abastecimentos } = trpc.frota.abastecimentos.list.useQuery({
    empresaId: 1,
    veiculoId: veiculoId !== "todos" ? parseInt(veiculoId) : undefined,
  });
  const { data: manutencoes } = trpc.frota.manutencoes.list.useQuery({
    empresaId: 1,
    veiculoId: veiculoId !== "todos" ? parseInt(veiculoId) : undefined,
  });

  // Calcular métricas
  const metricas = useMemo(() => {
    const meses = parseInt(periodo);
    const cutoff = Date.now() - meses * 30 * 24 * 60 * 60 * 1000;

    const abs = (abastecimentos ?? []).filter((a: any) => !a.deletedAt && new Date(a.data).getTime() > cutoff);
    const mans = (manutencoes ?? []).filter((m: any) => !m.deletedAt && new Date(m.data).getTime() > cutoff);

    const totalCombustivel = abs.reduce((s: number, a: any) => s + Number(a.valorTotal ?? 0), 0);
    const totalLitros = abs.reduce((s: number, a: any) => s + Number(a.litros ?? 0), 0);
    const totalManutencao = mans.reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0);
    const totalKmRodado = abs.reduce((s: number, a: any) => s + Number(a.kmRodado ?? 0), 0);

    const mediaCombustivel = totalLitros > 0 ? totalKmRodado / totalLitros : 0;
    const custoPorKm = totalKmRodado > 0 ? (totalCombustivel + totalManutencao) / totalKmRodado : 0;
    const custoCombustivelKm = totalKmRodado > 0 ? totalCombustivel / totalKmRodado : 0;
    const custoManutencaoKm = totalKmRodado > 0 ? totalManutencao / totalKmRodado : 0;

    const precoKmNum = parseFloat(precoKm) || 0;
    const receitaEstimada = totalKmRodado * precoKmNum;
    const margemBruta = receitaEstimada - totalCombustivel - totalManutencao;
    const margemPct = receitaEstimada > 0 ? (margemBruta / receitaEstimada) * 100 : 0;

    // Por veículo
    const porVeiculo = (veiculos ?? []).map((v: any) => {
      const absV = abs.filter((a: any) => a.veiculoId === v.id);
      const mansV = mans.filter((m: any) => m.veiculoId === v.id);
      const combV = absV.reduce((s: number, a: any) => s + Number(a.valorTotal ?? 0), 0);
      const manV = mansV.reduce((s: number, m: any) => s + Number(m.valor ?? 0), 0);
      const litrosV = absV.reduce((s: number, a: any) => s + Number(a.litros ?? 0), 0);
      const kmV = absV.reduce((s: number, a: any) => s + Number(a.kmRodado ?? 0), 0);
      return {
        ...v,
        combustivel: combV,
        manutencao: manV,
        total: combV + manV,
        litros: litrosV,
        km: kmV,
        media: litrosV > 0 && kmV > 0 ? kmV / litrosV : 0,
        custoPorKm: kmV > 0 ? (combV + manV) / kmV : 0,
      };
    }).filter(v => v.total > 0).sort((a, b) => b.total - a.total);

    // Por mês
    const porMes: Record<string, { combustivel: number; manutencao: number }> = {};
    abs.forEach((a: any) => {
      const mes = new Date(a.data).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      if (!porMes[mes]) porMes[mes] = { combustivel: 0, manutencao: 0 };
      porMes[mes].combustivel += a.valorTotal ?? 0;
    });
    mans.forEach((m: any) => {
      const mes = new Date(m.data).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      if (!porMes[mes]) porMes[mes] = { combustivel: 0, manutencao: 0 };
      porMes[mes].manutencao += m.valor ?? 0;
    });

    return {
      totalCombustivel, totalLitros, totalManutencao, totalKmRodado,
      mediaCombustivel, custoPorKm, custoCombustivelKm, custoManutencaoKm,
      receitaEstimada, margemBruta, margemPct,
      porVeiculo, porMes,
      totalGeral: totalCombustivel + totalManutencao,
    };
  }, [abastecimentos, manutencoes, veiculos, periodo, precoKm]);

  const maxTotal = Math.max(...metricas.porVeiculo.map(v => v.total), 1);

  return (
<div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Custos Operacionais
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Análise completa de custos por veículo e período
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Veículo</Label>
                <Select value={veiculoId} onValueChange={setVeiculoId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Toda a Frota</SelectItem>
                    {(veiculos ?? []).map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Período</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Último mês</SelectItem>
                    <SelectItem value="3">Últimos 3 meses</SelectItem>
                    <SelectItem value="6">Últimos 6 meses</SelectItem>
                    <SelectItem value="12">Último ano</SelectItem>
                    <SelectItem value="36">Últimos 3 anos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço por KM rodado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.85"
                  value={precoKm}
                  onChange={e => setPrecoKm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Total Geral</p>
                <DollarSign className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </div>
              <p className="text-lg font-bold leading-tight">{fmt(metricas.totalGeral)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Combustível</p>
                <Fuel className="h-4 w-4 text-blue-500/70 shrink-0" />
              </div>
              <p className="text-lg font-bold leading-tight">{fmt(metricas.totalCombustivel)}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtN(metricas.totalLitros)} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Manutenção</p>
                <Wrench className="h-4 w-4 text-orange-500/70 shrink-0" />
              </div>
              <p className="text-lg font-bold leading-tight">{fmt(metricas.totalManutencao)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Custo/KM</p>
                <Truck className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </div>
              <p className="text-lg font-bold leading-tight">R$ {fmtN(metricas.custoPorKm, 3)}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtN(metricas.totalKmRodado, 0)} km</p>
            </CardContent>
          </Card>
        </div>

        {/* Calculadora de viabilidade */}
        {parseFloat(precoKm) > 0 && (
          <Card className={metricas.margemPct >= 20 ? "border-green-200 bg-green-500/5" : metricas.margemPct >= 0 ? "border-yellow-200 bg-yellow-500/5" : "border-red-200 bg-red-500/5"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Calculadora de Viabilidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Receita Estimada</p>
                  <p className="font-semibold text-green-600">{fmt(metricas.receitaEstimada)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo Total</p>
                  <p className="font-semibold text-red-600">{fmt(metricas.totalGeral)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margem Bruta</p>
                  <p className={`font-bold text-lg ${metricas.margemBruta >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(metricas.margemBruta)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margem %</p>
                  <p className={`font-bold text-lg ${metricas.margemPct >= 20 ? "text-green-600" : metricas.margemPct >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                    {fmtN(metricas.margemPct, 1)}%
                  </p>
                </div>
              </div>
              {metricas.margemPct < 15 && metricas.margemPct >= 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100 rounded-lg p-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Margem abaixo de 15% — considere revisar o preço por KM cobrado.
                </div>
              )}
              {metricas.margemPct < 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-700 bg-red-100 rounded-lg p-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Operação no prejuízo! O custo supera a receita estimada.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="veiculos">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="veiculos">Por Veículo</TabsTrigger>
            <TabsTrigger value="mensal">Por Mês</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          {/* Tab: Por Veículo */}
          <TabsContent value="veiculos" className="space-y-3 mt-4">
            {metricas.porVeiculo.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum dado no período selecionado</CardContent></Card>
            ) : (
              metricas.porVeiculo.map(v => (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold">{v.placa}</span>
                          <Badge variant="outline" className="text-xs">{v.tipo}</Badge>
                          {v.custoPorKm > parseFloat(precoKm || "0") && parseFloat(precoKm || "0") > 0 && (
                            <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Custo alto
                            </Badge>
                          )}
                        </div>
                        {/* Barra de custo */}
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(v.total / maxTotal) * 100}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                          <span>Combustível: <strong className="text-foreground">{fmt(v.combustivel)}</strong></span>
                          <span>Manutenção: <strong className="text-foreground">{fmt(v.manutencao)}</strong></span>
                          {v.media > 0 && <span>Média: <strong className="text-foreground">{fmtN(v.media)} km/L</strong></span>}
                          {v.custoPorKm > 0 && <span>R$/km: <strong className="text-foreground">{fmtN(v.custoPorKm, 3)}</strong></span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">{fmt(v.total)}</p>
                        <p className="text-xs text-muted-foreground">total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab: Por Mês */}
          <TabsContent value="mensal" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {Object.entries(metricas.porMes).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum dado no período</p>
                  ) : (
                    Object.entries(metricas.porMes)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([mes, dados]) => {
                        const total = dados.combustivel + dados.manutencao;
                        const maxMes = Math.max(...Object.values(metricas.porMes).map(d => d.combustivel + d.manutencao), 1);
                        return (
                          <div key={mes} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium capitalize">{mes}</span>
                              <span className="font-bold">{fmt(total)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${(dados.combustivel / maxMes) * 100}%` }}
                              />
                              <div
                                className="h-full bg-orange-500 transition-all"
                                style={{ width: `${(dados.manutencao / maxMes) * 100}%` }}
                              />
                            </div>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />Combustível: {fmt(dados.combustivel)}</span>
                              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />Manutenção: {fmt(dados.manutencao)}</span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Detalhes */}
          <TabsContent value="detalhes" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Indicadores de Eficiência</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Média de consumo</span>
                    <span className="font-medium">{fmtN(metricas.mediaCombustivel)} km/L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo combustível/km</span>
                    <span className="font-medium">R$ {fmtN(metricas.custoCombustivelKm, 3)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo manutenção/km</span>
                    <span className="font-medium">R$ {fmtN(metricas.custoManutencaoKm, 3)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground font-medium">Custo total/km</span>
                    <span className="font-bold">R$ {fmtN(metricas.custoPorKm, 3)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">KM total rodado</span>
                    <span className="font-medium">{fmtN(metricas.totalKmRodado, 0)} km</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição de Custos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metricas.totalGeral > 0 && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
                            Combustível
                          </span>
                          <span className="font-medium">{fmtN((metricas.totalCombustivel / metricas.totalGeral) * 100, 1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${(metricas.totalCombustivel / metricas.totalGeral) * 100}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
                            Manutenção
                          </span>
                          <span className="font-medium">{fmtN((metricas.totalManutencao / metricas.totalGeral) * 100, 1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${(metricas.totalManutencao / metricas.totalGeral) * 100}%` }} />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
);
}
