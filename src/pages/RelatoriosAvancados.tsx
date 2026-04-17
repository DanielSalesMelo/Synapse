import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Truck,
  Users, Fuel, AlertTriangle, Calendar, Download, Filter,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useViewAs } from "@/contexts/ViewAsContext";


function KpiCard({
  titulo, valor, subtitulo, icon: Icon, cor = "blue", tendencia,
}: {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icon: React.ElementType;
  cor?: "blue" | "green" | "red" | "yellow" | "purple";
  tendencia?: { valor: number; tipo: "up" | "down" };
}) {
  const cores = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{titulo}</p>
            <p className="text-3xl font-bold mt-2">{valor}</p>
            {subtitulo && <p className="text-xs text-muted-foreground mt-1">{subtitulo}</p>}
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${cores[cor]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {tendencia && (
          <div className="flex items-center gap-1">
            {tendencia.tipo === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-xs font-medium ${tendencia.tipo === "up" ? "text-green-600" : "text-red-600"}`}>
              {tendencia.tipo === "up" ? "+" : ""}{tendencia.valor}% vs mês anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RelatoriosAvancados() {
  const { t } = useTranslation();
  const [periodo, setPeriodo] = useState("mes");

  // Dados simulados para demonstração - ZERADOS
  const dadosOperacionais = {
    viagensTotal: 0,
    viagensCompletas: 0,
    viagensAtraso: 0,
    kmTotal: 0,
    kmMedia: 0,
    combustivelGasto: 0,
    custoCombustivel: 0,
  };

  const dadosFinanceiros = {
    receita: 0,
    despesas: 0,
    lucro: 0,
    margemLucro: 0,
    conasVencendo: 0,
    contasVencidas: 0,
  };

  const dadosRH = {
    motoristasAtivos: 0,
    motoristasAfastados: 0,
    motoristasNovos: 0,
    rotatividade: 0,
    custoRH: 0,
    mediaIdade: 0,
  };

  const dadosRisco = {
    acidentes: 0,
    multas: 0,
    manutencoesPendentes: 0,
    documentosVencendo: 0,
    alertasSeguranca: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.relatorios") || "Relatórios Avançados"}</h1>
          <p className="text-muted-foreground mt-2">
            Análise gerencial completa da operação, finanças e recursos humanos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Período */}
      <div className="flex gap-2">
        {["semana", "mes", "trimestre", "ano"].map((p) => (
          <Button
            key={p}
            variant={periodo === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo(p)}
            className="capitalize"
          >
            {p === "semana" ? "Última Semana" : p === "mes" ? "Último Mês" : p === "trimestre" ? "Último Trimestre" : "Último Ano"}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="operacional" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="rh">RH</TabsTrigger>
          <TabsTrigger value="risco">Risco</TabsTrigger>
        </TabsList>

        {/* Operacional */}
        <TabsContent value="operacional" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              titulo="Viagens Realizadas"
              valor={dadosOperacionais.viagensTotal}
              subtitulo={`${dadosOperacionais.viagensCompletas} completas, ${dadosOperacionais.viagensAtraso} com atraso`}
              icon={Truck}
              cor="blue"
            />
            <KpiCard
              titulo="KM Total Rodado"
              valor={`${(dadosOperacionais.kmTotal / 1000).toFixed(1)}k`}
              subtitulo={`Média: ${dadosOperacionais.kmMedia} km/viagem`}
              icon={TrendingUp}
              cor="green"
            />
            <KpiCard
              titulo="Combustível Gasto"
              valor={`${dadosOperacionais.combustivelGasto}L`}
              subtitulo={`Custo: R$ ${(dadosOperacionais.custoCombustivel / 1000).toFixed(1)}k`}
              icon={Fuel}
              cor="yellow"
            />
            <KpiCard
              titulo="Taxa de Atraso"
              valor={`${dadosOperacionais.viagensTotal > 0 ? ((dadosOperacionais.viagensAtraso / dadosOperacionais.viagensTotal) * 100).toFixed(1) : 0}%`}
              subtitulo={`${dadosOperacionais.viagensAtraso} viagens atrasadas`}
              icon={AlertTriangle}
              cor="red"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Motorista</CardTitle>
              <CardDescription>Top 5 motoristas por viagens realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível para o período selecionado</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              titulo="Receita Total"
              valor={`R$ ${(dadosFinanceiros.receita / 1000).toFixed(1)}k`}
              subtitulo="Faturamento do período"
              icon={DollarSign}
              cor="green"
            />
            <KpiCard
              titulo="Despesas Totais"
              valor={`R$ ${(dadosFinanceiros.despesas / 1000).toFixed(1)}k`}
              subtitulo="Custos operacionais"
              icon={TrendingDown}
              cor="red"
            />
            <KpiCard
              titulo="Lucro Líquido"
              valor={`R$ ${(dadosFinanceiros.lucro / 1000).toFixed(1)}k`}
              subtitulo={`Margem: ${dadosFinanceiros.margemLucro}%`}
              icon={TrendingUp}
              cor="blue"
            />
            <KpiCard
              titulo="Contas Vencidas"
              valor={dadosFinanceiros.contasVencidas}
              subtitulo={`${dadosFinanceiros.conasVencendo} vencendo em 7 dias`}
              icon={AlertTriangle}
              cor="red"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa</CardTitle>
              <CardDescription>Receitas vs Despesas por semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível para o período selecionado</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RH */}
        <TabsContent value="rh" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              titulo="Motoristas Ativos"
              valor={dadosRH.motoristasAtivos}
              subtitulo={`${dadosRH.motoristasAfastados} afastados`}
              icon={Users}
              cor="blue"
            />
            <KpiCard
              titulo="Rotatividade"
              valor={`${dadosRH.rotatividade}%`}
              subtitulo="Turnover mensal"
              icon={TrendingDown}
              cor="yellow"
            />
            <KpiCard
              titulo="Custo com Pessoal"
              valor={`R$ ${(dadosRH.custoRH / 1000).toFixed(1)}k`}
              subtitulo="Salários e encargos"
              icon={DollarSign}
              cor="red"
            />
            <KpiCard
              titulo="Média de Idade"
              valor={`${dadosRH.mediaIdade} anos`}
              subtitulo="Perfil da frota"
              icon={Calendar}
              cor="purple"
            />
          </div>
        </TabsContent>

        {/* Risco */}
        <TabsContent value="risco" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              titulo="Acidentes"
              valor={dadosRisco.acidentes}
              subtitulo="No período selecionado"
              icon={AlertTriangle}
              cor="red"
            />
            <KpiCard
              titulo="Multas"
              valor={dadosRisco.multas}
              subtitulo="Infrações registradas"
              icon={AlertTriangle}
              cor="yellow"
            />
            <KpiCard
              titulo="Manutenções Pendentes"
              valor={dadosRisco.manutencoesPendentes}
              subtitulo="Veículos parados ou em risco"
              icon={Truck}
              cor="orange"
            />
            <KpiCard
              titulo="Alertas de Segurança"
              valor={dadosRisco.alertasSeguranca}
              subtitulo="Telemetria e comportamento"
              icon={AlertTriangle}
              cor="red"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
