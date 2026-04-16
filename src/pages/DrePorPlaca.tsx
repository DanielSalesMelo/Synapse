
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Truck, Calculator } from "lucide-react";
import { useViewAs } from "@/contexts/ViewAsContext";


const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (v: number, dec = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export default function DrePorPlaca() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [veiculoId, setVeiculoId] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: dreData, isLoading } = trpc.financeiro.drePorPlaca.useQuery({
    empresaId: EMPRESA_ID,
    veiculoId: veiculoId !== "todos" ? parseInt(veiculoId) : undefined,
    dataInicio,
    dataFim,
  });

  const relatorio = useMemo(() => {
    if (!dreData) return null;

    const veiculosMap: Record<number, any> = {};
    veiculos.forEach(v => {
      veiculosMap[v.id] = { 
        placa: v.placa, 
        receita: 0, 
        despesas: {}, 
        totalDespesas: 0, 
        km: 0 
      };
    });

    dreData.receitas.forEach((r: any) => {
      if (veiculosMap[r.veiculoId]) {
        veiculosMap[r.veiculoId].receita = Number(r.total_receita);
      }
    });

    dreData.despesas.forEach((d: any) => {
      if (veiculosMap[d.veiculoId]) {
        veiculosMap[d.veiculoId].despesas[d.categoria] = Number(d.total_despesa);
        veiculosMap[d.veiculoId].totalDespesas += Number(d.total_despesa);
      }
    });

    dreData.kmRodado.forEach((k: any) => {
      if (veiculosMap[k.veiculoId]) {
        veiculosMap[k.veiculoId].km = Number(k.total_km);
      }
    });

    const lista = Object.values(veiculosMap)
      .filter((v: any) => v.receita > 0 || v.totalDespesas > 0)
      .map((v: any) => ({
        ...v,
        lucro: v.receita - v.totalDespesas,
        margem: v.receita > 0 ? ((v.receita - v.totalDespesas) / v.receita) * 100 : 0,
        custoKm: v.km > 0 ? v.totalDespesas / v.km : 0
      }))
      .sort((a, b) => b.lucro - a.lucro);

    const totais = lista.reduce((acc, curr) => ({
      receita: acc.receita + curr.receita,
      despesas: acc.despesas + curr.totalDespesas,
      lucro: acc.lucro + curr.lucro,
      km: acc.km + curr.km
    }), { receita: 0, despesas: 0, lucro: 0, km: 0 });

    return { lista, totais };
  }, [dreData, veiculos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            DRE por Placa (Estratégico)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análise de rentabilidade real por veículo
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Veículo</Label>
              <Select value={veiculoId} onValueChange={setVeiculoId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Toda a Frota</SelectItem>
                  {veiculos.map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Início</Label>
              <input 
                type="date" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={dataInicio} 
                onChange={e => setDataInicio(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Fim</Label>
              <input 
                type="date" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={dataFim} 
                onChange={e => setDataFim(e.target.value)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {relatorio && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Receita Total</p>
                <p className="text-xl font-bold text-green-600">{fmt(relatorio.totais.receita)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Despesa Total</p>
                <p className="text-xl font-bold text-red-600">{fmt(relatorio.totais.despesas)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Lucro Líquido</p>
                <p className={`text-xl font-bold ${relatorio.totais.lucro >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {fmt(relatorio.totais.lucro)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Custo Médio/KM</p>
                <p className="text-xl font-bold">
                  R$ {fmtN(relatorio.totais.km > 0 ? relatorio.totais.despesas / relatorio.totais.km : 0, 3)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhamento por Veículo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Despesa</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead className="text-right">Custo/KM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.lista.map((v: any) => (
                    <TableRow key={v.placa}>
                      <TableCell className="font-medium">{v.placa}</TableCell>
                      <TableCell className="text-right text-green-600">{fmt(v.receita)}</TableCell>
                      <TableCell className="text-right text-red-600">{fmt(v.totalDespesas)}</TableCell>
                      <TableCell className={`text-right font-bold ${v.lucro >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {fmt(v.lucro)}
                      </TableCell>
                      <TableCell className={`text-right ${v.margem >= 20 ? "text-green-600" : v.margem >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                        {fmtN(v.margem, 1)}%
                      </TableCell>
                      <TableCell className="text-right">R$ {fmtN(v.custoKm, 3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
