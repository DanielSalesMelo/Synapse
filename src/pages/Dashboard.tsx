import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Users, Fuel, Wrench, TrendingDown, TrendingUp,
  AlertTriangle, Wallet, MapPin, ClipboardCheck, ArrowUpRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const EMPRESA_ID = 1;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function KpiCard({
  title, value, subtitle, icon: Icon, color = "blue", trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  trend?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-xs text-muted-foreground font-medium leading-snug flex-1">{title}</p>
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpRight className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertCard({ title, count, value, color }: { title: string; count: number; value?: string; color: string }) {
  if (count === 0) return null;
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${color}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm font-bold">{value}</span>}
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: resumo, isLoading } = trpc.dashboard.resumo.useQuery({ empresaId: EMPRESA_ID });
  const { data: finDash } = trpc.financeiro.dashboard.useQuery({ empresaId: EMPRESA_ID });
  const { data: tanque } = trpc.frota.tanque.saldoAtual.useQuery({ empresaId: EMPRESA_ID });
  const { data: custoMedioTanque } = trpc.frota.tanque.custoMedio.useQuery({ empresaId: EMPRESA_ID });

  const totalAlertas = resumo ? (
    resumo.alertas.contasVencendo7dias +
    resumo.alertas.freelancersParaPagar +
    resumo.alertas.cnhVencendo +
    resumo.alertas.crlvVencendo
  ) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral da operação — {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title={t("pages.veiculos")}
          value={isLoading ? "..." : resumo?.veiculos.total ?? 0}
          subtitle="na frota"
          icon={Truck}
          color="blue"
        />
        <KpiCard
          title={t("pages.motoristas")}
          value={isLoading ? "..." : resumo?.funcionarios.motoristas ?? 0}
          subtitle={`${resumo?.funcionarios.ajudantes ?? 0} ajudantes`}
          icon={Users}
          color="purple"
        />
        <KpiCard
          title={t("pages.viagens")}
          value={isLoading ? "..." : resumo?.viagens.emAndamento ?? 0}
          subtitle={`${resumo?.viagens.planejadas ?? 0} planejadas`}
          icon={MapPin}
          color="green"
        />
        <KpiCard
          title={t("pages.alertas")}
          value={isLoading ? "..." : totalAlertas}
          subtitle="requerem atenção"
          icon={AlertTriangle}
          color={totalAlertas > 0 ? "red" : "green"}
        />
      </div>

      {/* Financeiro e Combustível */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title={t("pages.contas_pagar")}
          value={finDash ? formatCurrency(finDash.totalPagar) : "..."}
          subtitle={finDash ? `+ ${formatCurrency(finDash.totalVencido)} vencido` : ""}
          icon={TrendingDown}
          color="red"
        />
        <KpiCard
          title={t("pages.contas_receber")}
          value={finDash ? formatCurrency(finDash.totalReceber) : "..."}
          subtitle="fretes e CTEs"
          icon={TrendingUp}
          color="green"
        />
        <KpiCard
          title={t("pages.adiantamentos")}
          value={finDash ? formatCurrency(finDash.totalAdiantamentos) : "..."}
          subtitle="aguardando acerto"
          icon={Wallet}
          color="yellow"
        />
      </div>

      {/* Combustível do mês e Tanque */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title={t("pages.abastecimentos")}
          value={resumo ? formatCurrency(resumo.combustivel.valorMes) : "..."}
          subtitle={`${resumo?.combustivel.litrosMes?.toFixed(0) ?? 0} litros`}
          icon={Fuel}
          color="blue"
        />
        <KpiCard
          title={t("pages.manutencoes")}
          value={resumo ? formatCurrency(resumo.manutencao.valorMes) : "..."}
          subtitle={`${resumo?.manutencao.quantidadeMes ?? 0} serviços`}
          icon={Wrench}
          color="yellow"
        />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium mb-3">Tanque Interno</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm">Diesel</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">{tanque ? `${Number(tanque.diesel).toFixed(0)}L` : "..."}</span>
                  {custoMedioTanque && custoMedioTanque.diesel.custoMedio > 0 && (
                    <p className="text-xs text-muted-foreground">R$ {custoMedioTanque.diesel.custoMedio.toFixed(3)}/L</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">ARLA</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">{tanque ? `${Number(tanque.arla).toFixed(0)}L` : "..."}</span>
                  {custoMedioTanque && custoMedioTanque.arla.custoMedio > 0 && (
                    <p className="text-xs text-muted-foreground">R$ {custoMedioTanque.arla.custoMedio.toFixed(3)}/L</p>
                  )}
                </div>
              </div>
              {custoMedioTanque && custoMedioTanque.diesel.custoMedio > 0 && tanque && (
                <div className="pt-2 mt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Valor em estoque</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(Number(tanque.diesel) * custoMedioTanque.diesel.custoMedio + Number(tanque.arla) * custoMedioTanque.arla.custoMedio)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {resumo && totalAlertas > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Alertas e Pendências
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AlertCard
              title="Contas vencendo em 7 dias"
              count={resumo.alertas.contasVencendo7dias}
              value={formatCurrency(resumo.alertas.valorContasVencendo)}
              color="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            />
            <AlertCard
              title="Freelancers para pagar esta semana"
              count={resumo.alertas.freelancersParaPagar}
              color="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
            />
            <AlertCard
              title="CNH vencendo em 7 dias"
              count={resumo.alertas.cnhVencendo}
              color="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
            />
            <AlertCard
              title="CRLV vencendo em 7 dias"
              count={resumo.alertas.crlvVencendo}
              color="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
            />
          </CardContent>
        </Card>
      )}

      {totalAlertas === 0 && !isLoading && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-300 text-sm">Tudo em dia!</p>
              <p className="text-xs text-green-600 dark:text-green-400">Nenhum alerta pendente no momento.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
