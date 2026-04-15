import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Search, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;

const urgenciaConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  baixa:   { label: "Baixa",   color: "bg-blue-100 text-blue-700 border-blue-300",   icon: <Info className="w-3 h-3" /> },
  media:   { label: "Média",   color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: <AlertTriangle className="w-3 h-3" /> },
  alta:    { label: "Alta",    color: "bg-orange-100 text-orange-700 border-orange-300", icon: <AlertTriangle className="w-3 h-3" /> },
  critica: { label: "Crítica", color: "bg-red-100 text-red-700 border-red-300",       icon: <AlertTriangle className="w-3 h-3" /> },
};

const tiposRelato = [
  "Comportamento do motorista",
  "Problema mecânico",
  "Acidente / Colisão",
  "Roubo / Furto",
  "Avaria na carga",
  "Atraso na entrega",
  "Problema com cliente",
  "Infração de trânsito",
  "Outros",
];

export default function Relatos() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroUrgencia, setFiltroUrgencia] = useState("todos");
  const [form, setForm] = useState({
    veiculoId: "",
    motoristaId: "",
    tipo: "",
    urgencia: "media" as "baixa" | "media" | "alta" | "critica",
    titulo: "",
    descricao: "",
    data: new Date().toISOString().split("T")[0],
  });

  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: motoristas = [] } = trpc.funcionarios.listMotoristas.useQuery({ empresaId: EMPRESA_ID });

  // Relatos são armazenados localmente (sem backend dedicado ainda — usamos localStorage como fallback)
  const [relatos, setRelatos] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("synapse_relatos") || "[]"); } catch { return []; }
  });

  const salvarRelato = () => {
    if (!form.titulo) { toast.error("Informe o título do relato"); return; }
    if (!form.descricao) { toast.error("Descreva o ocorrido"); return; }
    if (!form.tipo) { toast.error("Selecione o tipo de ocorrência"); return; }

    const veiculo = veiculos.find((v: any) => String(v.id) === form.veiculoId);
    const motorista = motoristas.find((m: any) => String(m.id) === form.motoristaId);

    const novoRelato = {
      id: Date.now(),
      ...form,
      veiculoPlaca: veiculo?.placa || null,
      veiculoModelo: veiculo?.modelo || null,
      motoristaNome: motorista?.nome || null,
      status: "aberto",
      createdAt: new Date().toISOString(),
    };
    const novos = [novoRelato, ...relatos];
    setRelatos(novos);
    localStorage.setItem("synapse_relatos", JSON.stringify(novos));
    toast.success("Relato registrado com sucesso!");
    setModalOpen(false);
    setForm({ veiculoId: "", motoristaId: "", tipo: "", urgencia: "media", titulo: "", descricao: "", data: new Date().toISOString().split("T")[0] });
  };

  const encerrarRelato = (id: number) => {
    const atualizados = relatos.map((r: any) => r.id === id ? { ...r, status: "encerrado" } : r);
    setRelatos(atualizados);
    localStorage.setItem("synapse_relatos", JSON.stringify(atualizados));
    toast.success("Relato encerrado!");
  };

  const relatosFiltrados = relatos.filter((r: any) => {
    const matchBusca = !busca ||
      r.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      r.motoristaNome?.toLowerCase().includes(busca.toLowerCase()) ||
      r.veiculoPlaca?.toLowerCase().includes(busca.toLowerCase());
    const matchUrgencia = filtroUrgencia === "todos" || r.urgencia === filtroUrgencia;
    return matchBusca && matchUrgencia;
  });

  const criticos = relatos.filter((r: any) => r.urgencia === "critica" && r.status === "aberto").length;
  const abertos = relatos.filter((r: any) => r.status === "aberto").length;

  return (
<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-500" />
            Relatos de Ocorrências
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Registre e acompanhe ocorrências da frota</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Relato</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Ocorrência</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1 col-span-2">
                <Label>Título do Relato *</Label>
                <Input placeholder="Resumo breve da ocorrência" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Ocorrência *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {tiposRelato.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Urgência *</Label>
                <Select value={form.urgencia} onValueChange={(v) => setForm(f => ({ ...f, urgencia: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Veículo</Label>
                <Select value={form.veiculoId} onValueChange={(v) => setForm(f => ({ ...f, veiculoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {veiculos.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa} — {v.modelo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Motorista</Label>
                <Select value={form.motoristaId} onValueChange={(v) => setForm(f => ({ ...f, motoristaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {motoristas.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data da Ocorrência</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Descrição Detalhada *</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Descreva o ocorrido com o máximo de detalhes..."
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={salvarRelato}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Relatos", value: relatos.length, color: "text-foreground" },
          { label: "Em Aberto", value: abertos, color: "text-yellow-600" },
          { label: "Críticos Abertos", value: criticos, color: "text-red-600" },
          { label: "Encerrados", value: relatos.length - abertos, color: "text-green-600" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por título, motorista, placa..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroUrgencia} onValueChange={setFiltroUrgencia}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Urgência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as urgências</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {relatosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum relato encontrado</p>
            </CardContent>
          </Card>
        ) : (
          relatosFiltrados.map((r: any) => {
            const urg = urgenciaConfig[r.urgencia] || urgenciaConfig.media;
            return (
              <Card key={r.id} className={r.status === "encerrado" ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{r.titulo}</span>
                        <Badge className={`border text-xs flex items-center gap-1 ${urg.color}`}>
                          {urg.icon} {urg.label}
                        </Badge>
                        <Badge variant="outline" className={r.status === "encerrado" ? "border-green-300 text-green-700" : "border-yellow-300 text-yellow-700"}>
                          {r.status === "encerrado" ? "Encerrado" : "Em Aberto"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{r.tipo}</p>
                      <p className="text-sm">{r.descricao}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span>📅 {new Date(r.data).toLocaleDateString("pt-BR")}</span>
                        {r.veiculoPlaca && <span>🚛 {r.veiculoPlaca}</span>}
                        {r.motoristaNome && <span>👤 {r.motoristaNome}</span>}
                      </div>
                    </div>
                    {r.status === "aberto" && (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs"
                        onClick={() => encerrarRelato(r.id)}>
                        <CheckCircle className="w-3 h-3" /> Encerrar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
);
}
