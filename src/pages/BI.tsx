import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Truck, DollarSign, Target, Activity, AlertTriangle, CheckCircle2, CircleSlash, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useState } from "react";

function formatCurrency(v: any) {
  if (!v && v !== 0) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatKpi(tipo: string, valor: number) {
  if (tipo === "moeda") return formatCurrency(valor);
  if (tipo === "percent") return `${Number(valor || 0).toFixed(1)}%`;
  return Number(valor || 0).toLocaleString("pt-BR");
}

export default function BI() {
  const [pulseDias, setPulseDias] = useState<15 | 30 | 60>(30);
  const [gradeDias, setGradeDias] = useState<15 | 30 | 60>(15);
  const { effectiveEmpresaId, viewAs, isSimulating } = useViewAs();
  const metricas = trpc.bi.metricas.useQuery({ empresaId: effectiveEmpresaId });
  const tendencias = trpc.bi.tendencias.useQuery({ empresaId: effectiveEmpresaId });
  const avancado = trpc.bi.painelAvancado.useQuery({ empresaId: effectiveEmpresaId });
  const cockpit25 = trpc.bi.cockpit25.useQuery({ empresaId: effectiveEmpresaId });
  const powerInsights = trpc.bi.powerInsights.useQuery({ empresaId: effectiveEmpresaId });
  const gradeDiaria = trpc.bi.financeiroGradeDiaria.useQuery({ empresaId: effectiveEmpresaId, dias: gradeDias });
  const modules20 = trpc.bi.executiveModules20.useQuery({ empresaId: effectiveEmpresaId, dias: 30 });
  const pulse20 = trpc.bi.tiFinanceiroRhPulse.useQuery({ empresaId: effectiveEmpresaId, dias: pulseDias });

  const m = metricas.data;
  const adv = avancado.data;
  const power = powerInsights.data;
  const saldoPrevisto = Number(m?.financeiro?.receber?.pendente ?? 0) - Number(m?.financeiro?.pagar?.pendente ?? 0);
  const valorEmRisco = Number(m?.financeiro?.pagar?.vencido ?? 0) + Number(m?.financeiro?.receber?.vencido ?? 0);
  const totalMovimento =
    Number(m?.viagens?.total || 0) +
    Number(m?.frota?.total || 0) +
    Number(m?.rh?.total || 0) +
    Number(m?.crm?.totalClientes || 0) +
    Number(m?.crm?.leads?.totalLeads || 0) +
    Number(m?.vendas?.totalPedidos || 0);
  const temBaseOperacional = totalMovimento > 0 || Math.abs(saldoPrevisto) > 0 || valorEmRisco > 0;
  const saudeFinanceira = valorEmRisco === 0 ? "Saudável" : valorEmRisco < Math.max(10000, Math.abs(saldoPrevisto) * 0.3) ? "Atenção" : "Crítica";
  const saudeOperacional = (Number(m?.viagens?.total || 0) > 0 && Number(m?.viagens?.concluidas || 0) / Math.max(1, Number(m?.viagens?.total || 1)) > 0.7) ? "Boa" : "Acompanhar";
  const saudeTI = Number(adv?.ti?.chamados_criticos || 0) === 0 ? "Estável" : "Crítica";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" />Business Intelligence</h1><p className="text-muted-foreground">Visão 360° para tomada de decisões estratégicas</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Empresa ativa: #{effectiveEmpresaId}</Badge>
        {isSimulating && viewAs.empresaNome ? (
          <Badge className="bg-blue-600 text-white">Visualizando como: {viewAs.empresaNome}</Badge>
        ) : (
          <Badge variant="secondary">Visão da empresa do usuário logado</Badge>
        )}
      </div>

      {metricas.isLoading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : metricas.error ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Não foi possível carregar o BI agora.</CardContent></Card>
      ) : (
        <>
          {!temBaseOperacional && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="py-5 space-y-2">
                <p className="font-semibold flex items-center gap-2 text-amber-800"><AlertTriangle className="h-4 w-4" /> Sem dados suficientes para BI executivo</p>
                <p className="text-sm text-amber-700">
                  O painel está correto, mas a empresa ativa ainda não tem volume operacional/financeiro suficiente.
                  Cadastre lançamentos de financeiro, viagens, RH, TI ou use Importação para popular dados reais.
                </p>
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-slate-700" />Diagnóstico Executivo</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saúde Financeira</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {saudeFinanceira === "Saudável" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : saudeFinanceira === "Atenção" ? <AlertTriangle className="h-5 w-5 text-amber-600" /> : <CircleSlash className="h-5 w-5 text-red-600" />}
                    <span className={`text-lg font-bold ${saudeFinanceira === "Saudável" ? "text-green-700" : saudeFinanceira === "Atenção" ? "text-amber-700" : "text-red-700"}`}>{saudeFinanceira}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Risco atual: {formatCurrency(valorEmRisco)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saúde Operacional</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {saudeOperacional === "Boa" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                    <span className={`text-lg font-bold ${saudeOperacional === "Boa" ? "text-green-700" : "text-amber-700"}`}>{saudeOperacional}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Eficiência: {m?.viagens?.total ? `${(((m?.viagens?.concluidas ?? 0) / Math.max(1, m?.viagens?.total ?? 0)) * 100).toFixed(1)}%` : "Sem base ainda"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saúde TI</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {saudeTI === "Estável" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <CircleSlash className="h-5 w-5 text-red-600" />}
                    <span className={`text-lg font-bold ${saudeTI === "Estável" ? "text-green-700" : "text-red-700"}`}>{saudeTI}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Chamados críticos: {Number(adv?.ti?.chamados_criticos || 0)}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Activity className="h-5 w-5 text-red-600" />Painel Executivo Avançado</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Financeiro em Risco</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-red-600">{formatCurrency((Number(adv?.financeiro?.pagar_vencido ?? 0) + Number(adv?.financeiro?.receber_vencido ?? 0)))}</div><p className="text-xs text-muted-foreground">Pagar/Receber vencido</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">TI Crítico</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{adv?.ti?.chamados_criticos ?? 0}</div><p className="text-xs text-muted-foreground">{adv?.agentes?.offline ?? 0} agentes offline</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">RH Atenção</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{adv?.rh?.cnh_vencida ?? 0}</div><p className="text-xs text-muted-foreground">CNHs vencidas</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Estoque Crítico</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{adv?.estoque?.baixo_estoque ?? 0}</div><p className="text-xs text-muted-foreground">Itens abaixo do mínimo</p></CardContent></Card>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(adv?.alertasCriticos ?? []).length > 0 ? (adv?.alertasCriticos ?? []).map((a: string, i: number) => (
                <Badge key={i} className="bg-red-100 text-red-700">{a}</Badge>
              )) : <Badge variant="secondary">Sem alertas críticos no momento</Badge>}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-600" />Cockpit BI (25 módulos executivos)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(cockpit25.data?.kpis ?? []).map((k: any) => (
                <Card key={k.chave}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">{k.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatKpi(k.tipo, Number(k.valor || 0))}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Os KPIs acima são alimentados pelos módulos operacionais. Se estiverem zerados, isso indica ausência de lançamentos na empresa ativa, não erro visual.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-sky-600" />BI Decisório Avançado</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inadimplência</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${Number(power?.resumo?.inadimplenciaPct || 0) > 20 ? "text-red-600" : "text-amber-600"}`}>{Number(power?.resumo?.inadimplenciaPct || 0).toFixed(1)}%</div><p className="text-xs text-muted-foreground mt-1">Receber vencido sobre pendente</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Risco Financeiro</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(power?.resumo?.valorEmRisco)}</div><p className="text-xs text-muted-foreground mt-1">Vencidos (pagar + receber)</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Projetado</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${Number(power?.resumo?.saldoPrevisto || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(power?.resumo?.saldoPrevisto)}</div><p className="text-xs text-muted-foreground mt-1">Pendente a receber - pagar</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Eficiência Operacional</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{Number(power?.resumo?.eficienciaOperacional || 0).toFixed(1)}%</div><p className="text-xs text-muted-foreground mt-1">Viagens concluídas</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Faturamento Logístico</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(power?.resumo?.faturamentoViagens)}</div><p className="text-xs text-muted-foreground mt-1">Frete total de viagens</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tendência Mensal (6 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  {(power?.serieMensal ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
                  ) : (
                    <div className="space-y-2">
                      {(power?.serieMensal ?? []).map((r: any) => {
                        const receber = Number(r.receber || 0);
                        const pagar = Number(r.pagar || 0);
                        const saldo = receber - pagar;
                        return (
                          <div key={r.mes} className="grid grid-cols-4 text-sm border-b pb-1">
                            <span className="font-medium">{r.mes}</span>
                            <span className="text-green-700">{formatCurrency(receber)}</span>
                            <span className="text-red-700">{formatCurrency(pagar)}</span>
                            <span className={saldo >= 0 ? "text-blue-700 font-semibold" : "text-red-700 font-semibold"}>{formatCurrency(saldo)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">Financeiro Diário (estilo planilha)</CardTitle>
                    <div className="flex gap-1">
                      {[15, 30, 60].map((d) => (
                        <button
                          key={d}
                          onClick={() => setGradeDias(d as 15 | 30 | 60)}
                          className={`px-2 py-0.5 text-xs rounded border ${gradeDias === d ? "bg-primary text-primary-foreground" : "bg-background"}`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(gradeDiaria.data?.rows ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados diários.</p>
                  ) : (
                    <div className="max-h-72 overflow-auto rounded border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                          <tr>
                            <th className="text-left px-3 py-2">Dia</th>
                            <th className="text-right px-3 py-2">Receber</th>
                            <th className="text-right px-3 py-2">Pagar</th>
                            <th className="text-right px-3 py-2">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(gradeDiaria.data?.rows ?? []).map((r: any) => {
                            const saldo = Number(r.saldo || 0);
                            return (
                              <tr key={r.dia} className="border-t">
                                <td className="px-3 py-2">{String(r.dia).slice(0, 10)}</td>
                                <td className="px-3 py-2 text-right text-green-700">{formatCurrency(r.receber)}</td>
                                <td className="px-3 py-2 text-right text-red-700">{formatCurrency(r.pagar)}</td>
                                <td className={`px-3 py-2 text-right font-semibold ${saldo >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(saldo)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-fuchsia-600" />20 Módulos Executivos (Power BI Style)</h2>
            {(modules20.data?.modules ?? []).length === 0 ? (
              <Card><CardContent className="py-8 text-sm text-muted-foreground text-center">Sem dados suficientes para montar os 20 módulos executivos.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(modules20.data?.modules ?? []).map((mod: any) => (
                  <Card key={mod.key} className="border-l-4 border-l-fuchsia-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">{mod.label}</CardTitle>
                        <Badge variant="secondary" className="text-[10px]">{mod.area}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatKpi(mod.tipo, Number(mod.valor || 0))}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-emerald-600" />20 Módulos TI + Financeiro + RH</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Período:</span>
                {[15, 30, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => setPulseDias(d as 15 | 30 | 60)}
                    className={`px-2 py-1 rounded border ${pulseDias === d ? "bg-primary text-primary-foreground" : "bg-background"}`}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            </div>

            {(pulse20.data?.alerts ?? []).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {(pulse20.data?.alerts ?? []).map((a: string, i: number) => (
                  <Badge key={i} className="bg-red-100 text-red-700">{a}</Badge>
                ))}
              </div>
            )}

            {(pulse20.data?.modules ?? []).length === 0 ? (
              <Card><CardContent className="py-8 text-sm text-muted-foreground text-center">Sem dados suficientes para os módulos executivos de TI/Financeiro/RH.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(pulse20.data?.modules ?? []).map((mod: any) => (
                  <Card key={mod.key} className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm">{mod.label}</CardTitle>
                        <Badge variant="outline" className="text-[10px]">{mod.area}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatKpi(mod.tipo, Number(mod.valor || 0))}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Previsto</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${saldoPrevisto >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(saldoPrevisto)}</div><p className="text-xs text-muted-foreground mt-1">Receber pendente menos pagar pendente</p></CardContent></Card>
            <Card className="border-l-4 border-l-red-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor em Risco</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(valorEmRisco)}</div><p className="text-xs text-muted-foreground mt-1">Somatório de vencidos (pagar + receber)</p></CardContent></Card>
            <Card className="border-l-4 border-l-emerald-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Eficiência Operacional</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{m?.viagens?.total ? `${(((m?.viagens?.concluidas ?? 0) / Math.max(1, m?.viagens?.total ?? 0)) * 100).toFixed(1)}%` : "0.0%"}</div><p className="text-xs text-muted-foreground mt-1">Viagens concluídas sobre total</p></CardContent></Card>
          </div>

          {/* Seção: Operações */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Truck className="h-5 w-5 text-blue-600" />Operações & Frota</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Viagens</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{m?.viagens?.total ?? 0}</div><p className="text-xs text-muted-foreground mt-1">{m?.viagens?.emAndamento ?? 0} em andamento</p></CardContent></Card>
              <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Viagens Concluídas</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{m?.viagens?.concluidas ?? 0}</div></CardContent></Card>
              <Card className="border-l-4 border-l-purple-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Veículos na Frota</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{m?.frota?.total ?? 0}</div></CardContent></Card>
              <Card className="border-l-4 border-l-cyan-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Funcionários</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{m?.rh?.total ?? 0}</div></CardContent></Card>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Package className="h-5 w-5 text-amber-600" />Cross-Área Profissional</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Leads Novos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{adv?.comercial?.leads_novos ?? 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Viagens em Andamento</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{adv?.logistica?.viagens_andamento ?? 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Chamados Abertos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{adv?.ti?.chamados_abertos ?? 0}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Faturamento de Viagens</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(adv?.logistica?.faturamento_viagens)}</div></CardContent></Card>
            </div>
          </div>

          {/* Seção: Financeiro */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-600" />Financeiro</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-red-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total a Pagar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(m?.financeiro?.pagar?.total)}</div><p className="text-xs text-muted-foreground mt-1">{formatCurrency(m?.financeiro?.pagar?.pendente)} pendente</p></CardContent></Card>
              <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total a Receber</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(m?.financeiro?.receber?.total)}</div><p className="text-xs text-muted-foreground mt-1">{formatCurrency(m?.financeiro?.receber?.pendente)} pendente</p></CardContent></Card>
              <Card className="border-l-4 border-l-emerald-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Pedidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{m?.vendas?.totalPedidos ?? 0}</div></CardContent></Card>
              <Card className="border-l-4 border-l-amber-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor Pedidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(m?.vendas?.valorPedidos)}</div></CardContent></Card>
            </div>
          </div>

          {/* Seção: Comercial */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Target className="h-5 w-5 text-purple-600" />Comercial & CRM</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-purple-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Clientes Ativos</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{m?.crm?.totalClientes ?? 0}</div></CardContent></Card>
              <Card className="border-l-4 border-l-indigo-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Leads</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{m?.crm?.leads?.totalLeads ?? 0}</div><p className="text-xs text-green-600 mt-1">{m?.crm?.leads?.novos ?? 0} novos</p></CardContent></Card>
              <Card className="border-l-4 border-l-pink-500"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Taxa de Conversão</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{m?.crm?.totalClientes && m?.crm?.leads?.totalLeads ? ((m.crm.totalClientes / (m.crm.totalClientes + m.crm.leads.totalLeads)) * 100).toFixed(1) : 0}%</div></CardContent></Card>
            </div>
          </div>

          {/* Tendências */}
          {tendencias.data && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-600" />Tendências (Últimos 30 dias)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Viagens por Dia</CardTitle></CardHeader><CardContent>
                  {(tendencias.data.viagensPorDia as any[])?.length > 0 ? (
                    <div className="flex items-end gap-1 h-32">{(tendencias.data.viagensPorDia as any[]).map((d: any, i: number) => {
                      const max = Math.max(...(tendencias.data!.viagensPorDia as any[]).map((x: any) => Number(x.total)));
                      const h = max > 0 ? (Number(d.total) / max) * 100 : 0;
                      return <div key={i} className="flex-1 bg-blue-500 rounded-t min-w-[4px] transition-all hover:bg-blue-600" style={{ height: `${Math.max(h, 4)}%` }} title={`${d.dia}: ${d.total}`} />;
                    })}</div>
                  ) : <p className="text-sm text-muted-foreground">Sem dados no período</p>}
                </CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Receita por Dia</CardTitle></CardHeader><CardContent>
                  {(tendencias.data.receitaPorDia as any[])?.length > 0 ? (
                    <div className="flex items-end gap-1 h-32">{(tendencias.data.receitaPorDia as any[]).map((d: any, i: number) => {
                      const max = Math.max(...(tendencias.data!.receitaPorDia as any[]).map((x: any) => Number(x.total)));
                      const h = max > 0 ? (Number(d.total) / max) * 100 : 0;
                      return <div key={i} className="flex-1 bg-green-500 rounded-t min-w-[4px] transition-all hover:bg-green-600" style={{ height: `${Math.max(h, 4)}%` }} title={`${d.dia}: R$ ${Number(d.total).toFixed(2)}`} />;
                    })}</div>
                  ) : <p className="text-sm text-muted-foreground">Sem dados no período</p>}
                </CardContent></Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
