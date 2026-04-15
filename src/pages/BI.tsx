import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Truck, DollarSign, Users, Package, Target, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatCurrency(v: any) {
  if (!v && v !== 0) return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BI() {
  const metricas = trpc.bi.metricas.useQuery();
  const tendencias = trpc.bi.tendencias.useQuery();

  const m = metricas.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" />Business Intelligence</h1><p className="text-muted-foreground">Visão 360° para tomada de decisões estratégicas</p></div>
      </div>

      {metricas.isLoading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
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
