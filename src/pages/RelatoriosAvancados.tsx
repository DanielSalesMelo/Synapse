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

const EMPRESA_ID = 1;

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

  // Dados simulados para demonstração
  const dadosOperacionais = {
    viagensTotal: 1245,
    viagensCompletas: 1180,
    viagensAtraso: 65,
    kmTotal: 125000,
    kmMedia: 100.4,
    combustivelGasto: 12500,
    custoCombustivel: 62500,
  };

  const dadosFinanceiros = {
    receita: 185000,
    despesas: 95000,
    lucro: 90000,
    margemLucro: 48.6,
    conasVencendo: 5,
    contasVencidas: 2,
  };

  const dadosRH = {
    motoristasAtivos: 45,
    motoristasAfastados: 3,
    motoristasNovos: 2,
    rotatividade: 4.2,
    custoRH: 157500,
    mediaIdade: 38,
  };

  const dadosRisco = {
    acidentes: 1,
    multas: 3,
    manutencoesPendentes: 8,
    documentosVencendo: 5,
    alertasSeguranca: 12,
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
              tendencia={{ valor: 12, tipo: "up" }}
            />
            <KpiCard
              titulo="KM Total Rodado"
              valor={`${(dadosOperacionais.kmTotal / 1000).toFixed(1)}k`}
              subtitulo={`Média: ${dadosOperacionais.kmMedia} km/viagem`}
              icon={TrendingUp}
              cor="green"
              tendencia={{ valor: 8, tipo: "up" }}
            />
            <KpiCard
              titulo="Combustível Gasto"
              valor={`${dadosOperacionais.combustivelGasto}L`}
              subtitulo={`Custo: R$ ${(dadosOperacionais.custoCombustivel / 1000).toFixed(1)}k`}
              icon={Fuel}
              cor="yellow"
              tendencia={{ valor: 5, tipo: "down" }}
            />
            <KpiCard
              titulo="Taxa de Atraso"
              valor={`${((dadosOperacionais.viagensAtraso / dadosOperacionais.viagensTotal) * 100).toFixed(1)}%`}
              subtitulo={`${dadosOperacionais.viagensAtraso} viagens atrasadas`}
              icon={AlertTriangle}
              cor="red"
              tendencia={{ valor: 3, tipo: "down" }}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Motorista</CardTitle>
              <CardDescription>Top 5 motoristas por viagens realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { nome: "João Silva", viagens: 156, km: 15600, taxa: 98.5 },
                  { nome: "Maria Santos", viagens: 142, km: 14200, taxa: 97.2 },
                  { nome: "Carlos Oliveira", viagens: 138, km: 13800, taxa: 96.8 },
                  { nome: "Ana Costa", viagens: 125, km: 12500, taxa: 95.2 },
                  { nome: "Pedro Alves", viagens: 118, km: 11800, taxa: 94.1 },
                ].map((motorista, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{motorista.nome}</p>
                      <p className="text-xs text-muted-foreground">{motorista.viagens} viagens • {motorista.km}km</p>
                    </div>
                    <Badge variant="outline">{motorista.taxa}% on-time</Badge>
                  </div>
                ))}
              </div>
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
              tendencia={{ valor: 15, tipo: "up" }}
            />
            <KpiCard
              titulo="Despesas Totais"
              valor={`R$ ${(dadosFinanceiros.despesas / 1000).toFixed(1)}k`}
              subtitulo="Custos operacionais"
              icon={TrendingDown}
              cor="red"
              tendencia={{ valor: 8, tipo: "down" }}
            />
            <KpiCard
              titulo="Lucro Líquido"
              valor={`R$ ${(dadosFinanceiros.lucro / 1000).toFixed(1)}k`}
              subtitulo={`Margem: ${dadosFinanceiros.margemLucro}%`}
              icon={TrendingUp}
              cor="blue"
              tendencia={{ valor: 22, tipo: "up" }}
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
              <div className="space-y-3">
                {[
                  { semana: "Semana 1", receita: 45000, despesa: 22000 },
                  { semana: "Semana 2", receita: 48000, despesa: 24000 },
                  { semana: "Semana 3", receita: 46000, despesa: 23000 },
                  { semana: "Semana 4", receita: 46000, despesa: 26000 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.semana}</span>
                      <span className="text-muted-foreground">
                        Saldo: R$ {(item.receita - item.despesa).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex gap-2 h-2">
                      <div
                        className="bg-green-500 rounded"
                        style={{ width: `${(item.receita / 50000) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 rounded"
                        style={{ width: `${(item.despesa / 50000) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
              titulo="Custo RH"
              valor={`R$ ${(dadosRH.custoRH / 1000).toFixed(1)}k`}
              subtitulo="Folha de pagamento"
              icon={DollarSign}
              cor="purple"
            />
            <KpiCard
              titulo="Rotatividade"
              valor={`${dadosRH.rotatividade}%`}
              subtitulo={`${dadosRH.motoristasNovos} novos contratados`}
              icon={TrendingUp}
              cor="yellow"
            />
            <KpiCard
              titulo="Idade Média"
              valor={`${dadosRH.mediaIdade} anos`}
              subtitulo="Experiência média"
              icon={Calendar}
              cor="green"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Motoristas</CardTitle>
              <CardDescription>Por experiência e categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { categoria: "Experientes (10+ anos)", quantidade: 18, percentual: 40 },
                  { categoria: "Intermediários (5-10 anos)", quantidade: 15, percentual: 33 },
                  { categoria: "Iniciantes (0-5 anos)", quantidade: 12, percentual: 27 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.categoria}</span>
                      <span className="text-muted-foreground">{item.quantidade} motoristas</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2"
                        style={{ width: `${item.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risco */}
        <TabsContent value="risco" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              titulo="Acidentes"
              valor={dadosRisco.acidentes}
              subtitulo="Últimos 30 dias"
              icon={AlertTriangle}
              cor="red"
              tendencia={{ valor: 50, tipo: "down" }}
            />
            <KpiCard
              titulo="Multas de Trânsito"
              valor={dadosRisco.multas}
              subtitulo="Infrações registradas"
              icon={AlertTriangle}
              cor="red"
            />
            <KpiCard
              titulo="Manutenções Pendentes"
              valor={dadosRisco.manutencoesPendentes}
              subtitulo="Veículos aguardando"
              icon={Truck}
              cor="yellow"
            />
            <KpiCard
              titulo="Documentos Vencendo"
              valor={dadosRisco.documentosVencendo}
              subtitulo="Próximos 30 dias"
              icon={AlertTriangle}
              cor="yellow"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alertas de Segurança</CardTitle>
              <CardDescription>Situações que requerem atenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { tipo: "Crítico", descricao: "Veículo ABC-1234 com manutenção vencida", cor: "red" },
                  { tipo: "Crítico", descricao: "Motorista João Silva com CNH vencendo em 5 dias", cor: "red" },
                  { tipo: "Aviso", descricao: "Pneus do veículo XYZ-5678 com desgaste 85%", cor: "yellow" },
                  { tipo: "Aviso", descricao: "Seguro de 3 veículos vencendo em 15 dias", cor: "yellow" },
                  { tipo: "Informação", descricao: "Relatório mensal disponível para download", cor: "blue" },
                ].map((alerta, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border border-${alerta.cor}-200 dark:border-${alerta.cor}-900/30 bg-${alerta.cor}-50 dark:bg-${alerta.cor}-900/10`}>
                    <AlertTriangle className={`h-4 w-4 text-${alerta.cor}-600 dark:text-${alerta.cor}-400 mt-0.5 shrink-0`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium text-${alerta.cor}-900 dark:text-${alerta.cor}-400`}>{alerta.tipo}</p>
                      <p className={`text-xs text-${alerta.cor}-700 dark:text-${alerta.cor}-500 mt-0.5`}>{alerta.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
