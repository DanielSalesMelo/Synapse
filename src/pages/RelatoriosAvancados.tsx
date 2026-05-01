import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Truck, Users, AlertTriangle, Download, Filter, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useViewAs } from "@/contexts/ViewAsContext";
import { trpc } from "@/lib/trpc";

function formatCurrency(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KpiCard({
  titulo, valor, subtitulo, icon: Icon, cor = "blue",
}: {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icon: React.ElementType;
  cor?: "blue" | "green" | "red" | "yellow" | "purple";
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
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-8 text-muted-foreground">{text}</div>;
}

export default function RelatoriosAvancados() {
  const { t } = useTranslation();
  const { effectiveEmpresaId } = useViewAs();
  const [periodo, setPeriodo] = useState("mes");

  const metricas = trpc.bi.metricas.useQuery({ empresaId: effectiveEmpresaId });
  const tendencias = trpc.bi.tendencias.useQuery({ empresaId: effectiveEmpresaId });
  const financeiro = trpc.financeiro.dashboard.useQuery({ empresaId: effectiveEmpresaId });
  const rh = trpc.funcionarios.dashboard.useQuery({ empresaId: effectiveEmpresaId });
  const folha = trpc.funcionarios.folhaResumo.useQuery({ empresaId: effectiveEmpresaId, limit: 6 });
  const ti = trpc.ti.dashboard.useQuery();

  const isLoading = metricas.isLoading || tendencias.isLoading || financeiro.isLoading || rh.isLoading || ti.isLoading;

  const metricasData = metricas.data;
  const financeiroData = financeiro.data;
  const rhData = rh.data;
  const tiData = ti.data as any;

  const viagensPorDia = useMemo(() => (tendencias.data?.viagensPorDia ?? []) as any[], [tendencias.data]);
  const receitaPorDia = useMemo(() => (tendencias.data?.receitaPorDia ?? []) as any[], [tendencias.data]);

  const hasOperacional = Number(metricasData?.viagens?.total ?? 0) > 0;
  const hasFinanceiro = Number(financeiroData?.totalPagar ?? 0) > 0 || Number(financeiroData?.totalReceber ?? 0) > 0;
  const hasRh = Number(rhData?.total ?? 0) > 0;
  const hasTi = Number(tiData?.tickets?.total ?? 0) > 0 || Number(tiData?.ativos?.total ?? 0) > 0 || Number(tiData?.certificados?.total ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">{t("pages.relatorios") || "Relatórios Avançados"}</h1>
          <p className="text-muted-foreground mt-2">
            Visão gerencial consolidada com dados reais da empresa selecionada.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Empresa ativa
          </Button>
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <Download className="h-4 w-4" />
            Exportação em implantação
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando relatórios...
        </div>
      ) : (
        <Tabs defaultValue="operacional" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="rh">RH</TabsTrigger>
            <TabsTrigger value="ti">TI</TabsTrigger>
          </TabsList>

          <TabsContent value="operacional" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard titulo="Viagens Registradas" valor={metricasData?.viagens?.total ?? 0} subtitulo={`${metricasData?.viagens?.concluidas ?? 0} concluídas`} icon={Truck} cor="blue" />
              <KpiCard titulo="Em Andamento" valor={metricasData?.viagens?.emAndamento ?? 0} subtitulo="Operação ativa no período" icon={TrendingUp} cor="green" />
              <KpiCard titulo="Receita de Viagens" valor={formatCurrency(financeiroData?.totalFreteMes)} subtitulo="Fretes concluídos no período" icon={DollarSign} cor="yellow" />
              <KpiCard titulo="Lucro Operacional" valor={formatCurrency(financeiroData?.lucroMes)} subtitulo={`Margem ${Number(financeiroData?.margemMes ?? 0).toFixed(1)}%`} icon={BarChart3} cor="purple" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Tendência Operacional</CardTitle>
                <CardDescription>Últimos registros de viagens e receita.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasOperacional && receitaPorDia.length === 0 ? (
                  <EmptyState text="Sem dados suficientes para gerar relatório operacional." />
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {viagensPorDia.slice(-8).map((item: any, index) => (
                        <Badge key={`viagem-${index}`} variant="outline">
                          {String(item.dia).slice(0, 10)} · {item.total} viagem(ns)
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {receitaPorDia.slice(-8).map((item: any, index) => (
                        <Badge key={`receita-${index}`} variant="secondary">
                          {String(item.dia).slice(0, 10)} · {formatCurrency(item.total)}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard titulo="A Receber" valor={formatCurrency(financeiroData?.totalReceber)} subtitulo="Contas abertas" icon={TrendingUp} cor="green" />
              <KpiCard titulo="A Pagar" valor={formatCurrency(financeiroData?.totalPagar)} subtitulo="Obrigações abertas" icon={TrendingDown} cor="red" />
              <KpiCard titulo="Saldo Projetado" valor={formatCurrency(financeiroData?.saldoProjetado)} subtitulo="Receber menos pagar" icon={DollarSign} cor="blue" />
              <KpiCard titulo="Contas Vencidas" valor={financeiroData?.alertas?.contasVencidas ?? 0} subtitulo={`${financeiroData?.alertas?.contasReceberVencidas ?? 0} a receber vencidas`} icon={AlertTriangle} cor="red" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
                <CardDescription>Caixa, pendências e desempenho por empresa ativa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasFinanceiro ? (
                  <EmptyState text="Nenhum dado financeiro cadastrado para a empresa selecionada." />
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Adiantamentos pendentes</p>
                        <p className="text-lg font-semibold">{formatCurrency(financeiroData?.totalAdiantamentos)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Viagens concluídas</p>
                        <p className="text-lg font-semibold">{financeiroData?.viagensConcluidas ?? 0}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Despesas de viagens</p>
                        <p className="text-lg font-semibold">{formatCurrency(financeiroData?.totalDespesasMes)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Fretes do período</p>
                        <p className="text-lg font-semibold">{formatCurrency(financeiroData?.totalFreteMes)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rh" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard titulo="Colaboradores" valor={rhData?.total ?? 0} subtitulo={`${rhData?.ativos ?? 0} ativos`} icon={Users} cor="blue" />
              <KpiCard titulo="Motoristas" valor={rhData?.motoristas ?? 0} subtitulo={`${rhData?.ajudantes ?? 0} ajudantes`} icon={Truck} cor="green" />
              <KpiCard titulo="Folha Ativa" valor={formatCurrency(rhData?.folhaAtiva)} subtitulo="Salários ativos cadastrados" icon={DollarSign} cor="red" />
              <KpiCard titulo="Alertas Documentais" valor={rhData?.alertasDocumentos ?? 0} subtitulo={`${rhData?.bloqueadosOperacionalmente ?? 0} bloqueados`} icon={AlertTriangle} cor="yellow" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Folha e Vencimentos</CardTitle>
                <CardDescription>Competências lançadas e riscos operacionais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasRh ? (
                  <EmptyState text="Nenhum colaborador cadastrado para gerar relatório de RH." />
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(folha.data ?? []).map((item: any) => (
                        <Badge key={item.referencia} variant="outline">
                          {item.competencia} · {formatCurrency(item.totalBruto)} · {item.funcionarios} funcionário(s)
                        </Badge>
                      ))}
                    </div>
                    {rhData?.vencimentos?.length > 0 && (
                      <div className="space-y-2">
                        {rhData.vencimentos.slice(0, 5).map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <p className="font-medium">{item.nome}</p>
                              <p className="text-xs text-muted-foreground">{item.funcao}</p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>CNH: {item.vencimentoCnh ? String(item.vencimentoCnh).slice(0, 10) : "—"}</p>
                              <p>ASO: {item.vencimentoAso ? String(item.vencimentoAso).slice(0, 10) : "—"}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ti" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard titulo="Chamados Abertos" valor={tiData?.tickets?.abertos ?? 0} subtitulo={`${tiData?.tickets?.ativos ?? 0} ativos`} icon={AlertTriangle} cor="red" />
              <KpiCard titulo="Em Atendimento" valor={tiData?.tickets?.emAndamento ?? 0} subtitulo="Fila ativa" icon={BarChart3} cor="blue" />
              <KpiCard titulo="Ativos Online" valor={tiData?.ativos?.online ?? 0} subtitulo={`${tiData?.ativos?.critico ?? 0} críticos`} icon={Users} cor="green" />
              <KpiCard titulo="Certificados Vencendo" valor={tiData?.certificados?.expirando ?? 0} subtitulo={`${tiData?.certificados?.vencidos ?? 0} vencidos`} icon={AlertTriangle} cor="yellow" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Resumo da operação de TI</CardTitle>
                <CardDescription>Indicadores reais do suporte e monitoramento.</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasTi ? (
                  <EmptyState text="Nenhum chamado ou agente suficiente para gerar relatório de TI." />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">SLA em risco</p>
                        <p className="text-lg font-semibold">{tiData?.certificados?.expirando ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Aguardando usuário</p>
                        <p className="text-lg font-semibold">{tiData?.ativos?.atencao ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Aguardando TI</p>
                        <p className="text-lg font-semibold">{tiData?.ativos?.critico ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Resolvidos hoje</p>
                        <p className="text-lg font-semibold">{tiData?.tickets?.resolvidosHoje ?? 0}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
