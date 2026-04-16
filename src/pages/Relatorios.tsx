import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Search, Truck, Fuel, Wrench, MapPin } from "lucide-react";
import { useViewAs } from "@/contexts/ViewAsContext";

type Tab = "viagens" | "abastecimentos" | "manutencoes";

const STATUS_LABEL: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  planejada: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  em_andamento: "bg-blue-500/10 text-blue-700 border-blue-200",
  concluida: "bg-green-500/10 text-green-700 border-green-200",
  cancelada: "bg-red-500/10 text-red-700 border-red-200",
};

export default function Relatorios() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("viagens");
  const [busca, setBusca] = useState("");

  const { data: viagens } = trpc.viagens.list.useQuery({ empresaId: 1, limit: 200 });
  const { data: abastecimentos } = trpc.frota.abastecimentos.list.useQuery({ empresaId: 1, limit: 200 });
  const { data: manutencoes } = trpc.frota.manutencoes.list.useQuery({ empresaId: 1, limit: 200 });

  const viagensFiltradas = (viagens ?? []).filter(v => {
    const q = busca.toLowerCase();
    return !q || (v.veiculoPlaca ?? "").toLowerCase().includes(q)
      || (v.motoristaNome ?? "").toLowerCase().includes(q)
      || (v.destino ?? "").toLowerCase().includes(q);
  });

  const abastecimentosFiltrados = (abastecimentos ?? []).filter((a: any) => {
    const q = busca.toLowerCase();
    return !q || (a.veiculoId?.toString() ?? "").includes(q)
      || (a.local ?? "").toLowerCase().includes(q);
  });

  const manutencoesFiltradas = (manutencoes ?? []).filter((m: any) => {
    const q = busca.toLowerCase();
    return !q || (m.tipo ?? "").toLowerCase().includes(q)
      || (m.descricao ?? "").toLowerCase().includes(q);
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "viagens", label: "Viagens", icon: <Truck className="h-4 w-4" />, count: (viagens ?? []).length },
    { key: "abastecimentos", label: "Abastecimentos", icon: <Fuel className="h-4 w-4" />, count: (abastecimentos ?? []).length },
    { key: "manutencoes", label: "Manutenções", icon: <Wrench className="h-4 w-4" />, count: (manutencoes ?? []).length },
  ];

  return (
<div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Relatórios
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Visualize dados detalhados da frota</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-2 border-b border-border">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
              <span className="ml-1 text-xs bg-muted rounded-full px-1.5 py-0.5">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {tab === "viagens" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Viagens ({viagensFiltradas.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Veículo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Motorista</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Destino</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">KM Saída</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">KM Chegada</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viagensFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma viagem encontrada
                        </td>
                      </tr>
                    ) : (
                      viagensFiltradas.map(v => (
                        <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            {v.dataSaida ? new Date(v.dataSaida).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs ${v.tipo === "entrega" ? "bg-cyan-500/10 text-cyan-700 border-cyan-200" : "bg-blue-500/10 text-blue-700 border-blue-200"}`}>
                              {v.tipo === "entrega" ? "Entrega" : "Viagem"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">{v.veiculoPlaca ?? "—"}</td>
                          <td className="px-4 py-3">{v.motoristaNome ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              {v.destino ? <><MapPin className="h-3 w-3 text-muted-foreground" />{v.destino}</> : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">{v.kmSaida ? Number(v.kmSaida).toLocaleString("pt-BR") : "—"}</td>
                          <td className="px-4 py-3 text-right">{v.kmChegada ? Number(v.kmChegada).toLocaleString("pt-BR") : "—"}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs border ${STATUS_COLOR[v.status] ?? ""}`}>
                              {STATUS_LABEL[v.status] ?? v.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "abastecimentos" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Abastecimentos ({abastecimentosFiltrados.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Veículo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Motorista</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Litros</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor/L</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">KM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {abastecimentosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum abastecimento encontrado
                        </td>
                      </tr>
                    ) : (
                      abastecimentosFiltrados.map((a: any) => (
                        <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            {a.data ? new Date(a.data).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium">{a.veiculoId ?? "—"}</td>
                          <td className="px-4 py-3">{a.motoristaId ?? "—"}</td>
                          <td className="px-4 py-3 text-right">{a.quantidade ? Number(a.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</td>
                          <td className="px-4 py-3 text-right">{a.valorUnitario ? `R$ ${Number(a.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 3 })}` : "—"}</td>
                          <td className="px-4 py-3 text-right font-medium">{a.valorTotal ? `R$ ${Number(a.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                          <td className="px-4 py-3 text-right">{a.kmAtual ? Number(a.kmAtual).toLocaleString("pt-BR") : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "manutencoes" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Manutenções ({manutencoesFiltradas.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Veículo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">KM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {manutencoesFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma manutenção encontrada
                        </td>
                      </tr>
                    ) : (
                      manutencoesFiltradas.map((m: any) => (
                        <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            {m.data ? new Date(m.data).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium">{m.veiculoId ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs capitalize">{m.tipo ?? "—"}</Badge>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate">{m.descricao ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-medium">{m.valor ? `R$ ${Number(m.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                          <td className="px-4 py-3 text-right">{m.kmAtual ? Number(m.kmAtual).toLocaleString("pt-BR") : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
);
}
