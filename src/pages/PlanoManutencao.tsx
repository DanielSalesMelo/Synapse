import { useTranslation } from 'react-i18next';
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Search, Wrench, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;

const tiposManutencao = [
  "Troca de óleo motor",
  "Troca de óleo câmbio",
  "Troca de filtros (ar/óleo/combustível)",
  "Revisão de freios",
  "Alinhamento e balanceamento",
  "Revisão elétrica",
  "Revisão de suspensão",
  "Troca de pneus",
  "Revisão de embreagem",
  "Troca de correia dentada",
  "Revisão geral (preventiva)",
  "Tacógrafo (aferição)",
  "Outros",
];

const frequencias = [
  { value: "5000", label: "A cada 5.000 km" },
  { value: "10000", label: "A cada 10.000 km" },
  { value: "15000", label: "A cada 15.000 km" },
  { value: "20000", label: "A cada 20.000 km" },
  { value: "30000", label: "A cada 30.000 km" },
  { value: "50000", label: "A cada 50.000 km" },
  { value: "90", label: "A cada 3 meses" },
  { value: "180", label: "A cada 6 meses" },
  { value: "365", label: "Anual" },
];

export default function PlanoManutencao() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    veiculoId: "",
    tipo: "",
    frequenciaKm: "",
    frequenciaDias: "",
    ultimaExecucaoKm: "",
    ultimaExecucaoData: "",
    observacoes: "",
  });

  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });

  const [planos, setPlanos] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("synapse_planos_manutencao") || "[]"); } catch { return []; }
  });

  const salvarPlano = () => {
    if (!form.veiculoId) { toast.error("Selecione o veículo"); return; }
    if (!form.tipo) { toast.error("Selecione o tipo de manutenção"); return; }
    if (!form.frequenciaKm && !form.frequenciaDias) { toast.error("Informe a frequência (km ou dias)"); return; }

    const veiculo = veiculos.find((v: any) => String(v.id) === form.veiculoId);

    const novo = {
      id: Date.now(),
      ...form,
      veiculoPlaca: veiculo?.placa || "",
      veiculoModelo: veiculo?.modelo || "",
      kmAtual: Number(veiculo?.kmAtual) || 0,
      frequenciaKm: Number(form.frequenciaKm) || 0,
      frequenciaDias: Number(form.frequenciaDias) || 0,
      ultimaExecucaoKm: Number(form.ultimaExecucaoKm) || 0,
      ativo: true,
      createdAt: new Date().toISOString(),
    };
    const novos = [novo, ...planos];
    setPlanos(novos);
    localStorage.setItem("synapse_planos_manutencao", JSON.stringify(novos));
    toast.success("Plano de manutenção criado!");
    setModalOpen(false);
    setForm({ veiculoId: "", tipo: "", frequenciaKm: "", frequenciaDias: "", ultimaExecucaoKm: "", ultimaExecucaoData: "", observacoes: "" });
  };

  const planosComStatus = useMemo(() => {
    return planos.map((p: any) => {
      const veiculo = veiculos.find((v: any) => String(v.id) === p.veiculoId);
      const kmAtual = Number(veiculo?.kmAtual) || p.kmAtual || 0;
      let status: "em_dia" | "proximo" | "vencido" = "em_dia";
      let info = "";

      if (p.frequenciaKm > 0) {
        const proximoKm = p.ultimaExecucaoKm + p.frequenciaKm;
        const faltam = proximoKm - kmAtual;
        if (faltam <= 0) { status = "vencido"; info = `Ultrapassou ${Math.abs(faltam).toLocaleString("pt-BR")} km`; }
        else if (faltam <= 1000) { status = "proximo"; info = `Faltam ${faltam.toLocaleString("pt-BR")} km`; }
        else { info = `Faltam ${faltam.toLocaleString("pt-BR")} km`; }
      }

      if (p.frequenciaDias > 0 && p.ultimaExecucaoData) {
        const ultima = new Date(p.ultimaExecucaoData);
        const proxima = new Date(ultima.getTime() + p.frequenciaDias * 24 * 60 * 60 * 1000);
        const hoje = new Date();
        const diasRestantes = Math.ceil((proxima.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        if (diasRestantes <= 0) { status = "vencido"; info += ` | Atrasado ${Math.abs(diasRestantes)} dias`; }
        else if (diasRestantes <= 15) { status = status === "vencido" ? "vencido" : "proximo"; info += ` | ${diasRestantes} dias restantes`; }
        else { info += ` | ${diasRestantes} dias restantes`; }
      }

      return { ...p, kmAtual, status, info };
    });
  }, [planos, veiculos]);

  const filtrados = planosComStatus.filter((p: any) =>
    !busca || p.veiculoPlaca?.toLowerCase().includes(busca.toLowerCase()) ||
    p.tipo?.toLowerCase().includes(busca.toLowerCase())
  );

  const vencidos = planosComStatus.filter(p => p.status === "vencido").length;
  const proximos = planosComStatus.filter(p => p.status === "proximo").length;

  const statusConfig = {
    em_dia:  { label: "Em Dia",   color: "bg-green-100 text-green-700 border-green-300", icon: <CheckCircle className="w-3 h-3" /> },
    proximo: { label: "Próximo",  color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: <Clock className="w-3 h-3" /> },
    vencido: { label: "Vencido",  color: "bg-red-100 text-red-700 border-red-300", icon: <AlertTriangle className="w-3 h-3" /> },
  };

  return (
<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Plano de Manutenção Preventiva
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Agende manutenções por km ou período</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Plano de Manutenção</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1 col-span-2">
                <Label>Veículo *</Label>
                <Select value={form.veiculoId} onValueChange={(v) => setForm(f => ({ ...f, veiculoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa} — {v.modelo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Tipo de Manutenção *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tiposManutencao.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Frequência por KM</Label>
                <Select value={form.frequenciaKm} onValueChange={(v) => setForm(f => ({ ...f, frequenciaKm: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não usar KM</SelectItem>
                    {frequencias.filter(f => Number(f.value) >= 1000).map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Frequência por Período</Label>
                <Select value={form.frequenciaDias} onValueChange={(v) => setForm(f => ({ ...f, frequenciaDias: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não usar período</SelectItem>
                    {frequencias.filter(f => Number(f.value) < 1000).map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Último KM executado</Label>
                <Input type="number" placeholder="Ex: 150000" value={form.ultimaExecucaoKm} onChange={e => setForm(f => ({ ...f, ultimaExecucaoKm: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Última data executada</Label>
                <Input type="date" value={form.ultimaExecucaoData} onChange={e => setForm(f => ({ ...f, ultimaExecucaoData: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Input placeholder="Observações opcionais" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={salvarPlano}>Criar Plano</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Total de Planos</p><p className="text-2xl font-bold mt-1">{planos.length}</p></CardContent></Card>
        <Card className="border-red-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Vencidos</p><p className="text-2xl font-bold mt-1 text-red-600">{vencidos}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Próximos</p><p className="text-2xl font-bold mt-1 text-yellow-600">{proximos}</p></CardContent></Card>
        <Card className="border-green-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Em Dia</p><p className="text-2xl font-bold mt-1 text-green-600">{planos.length - vencidos - proximos}</p></CardContent></Card>
      </div>

      {/* Filtro */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por placa ou tipo..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum plano de manutenção cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase">
                    <th className="text-left px-4 py-3">Veículo</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Frequência</th>
                    <th className="text-left px-4 py-3">Situação</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p: any) => {
                    const st = statusConfig[p.status as keyof typeof statusConfig];
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{p.veiculoPlaca} <span className="text-muted-foreground text-xs">({p.veiculoModelo})</span></td>
                        <td className="px-4 py-3">{p.tipo}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.frequenciaKm > 0 && <span className="block">A cada {p.frequenciaKm.toLocaleString("pt-BR")} km</span>}
                          {p.frequenciaDias > 0 && <span className="block">A cada {p.frequenciaDias} dias</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{p.info}</td>
                        <td className="px-4 py-3">
                          <Badge className={`border text-xs flex items-center gap-1 w-fit ${st.color}`}>
                            {st.icon} {st.label}
                          </Badge>
                        </td>
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
);
}
