import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Search, Car, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;

const tiposAcidente = [
  "Colisão traseira",
  "Colisão frontal",
  "Colisão lateral",
  "Tombamento",
  "Saída de pista",
  "Atropelamento",
  "Engavetamento",
  "Outros",
];

const gravidadeConfig: Record<string, { label: string; color: string }> = {
  leve:       { label: "Leve",       color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  moderado:   { label: "Moderado",   color: "bg-orange-100 text-orange-700 border-orange-300" },
  grave:      { label: "Grave",      color: "bg-red-100 text-red-700 border-red-300" },
  fatal:      { label: "Fatal",      color: "bg-red-200 text-red-900 border-red-500" },
};

export default function Acidentes() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    veiculoId: "",
    motoristaId: "",
    data: new Date().toISOString().split("T")[0],
    hora: "",
    tipo: "",
    gravidade: "leve",
    local: "",
    boletimOcorrencia: "",
    terceirosEnvolvidos: "nao",
    danoVeiculo: "",
    danoCarga: "",
    feridos: "nao",
    descricao: "",
    custoEstimado: "",
  });

  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: motoristas = [] } = trpc.funcionarios.listMotoristas.useQuery({ empresaId: EMPRESA_ID });

  const [acidentes, setAcidentes] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("synapse_acidentes") || "[]"); } catch { return []; }
  });

  const salvarAcidente = () => {
    if (!form.veiculoId) { toast.error("Selecione o veículo"); return; }
    if (!form.motoristaId) { toast.error("Selecione o motorista"); return; }
    if (!form.tipo) { toast.error("Selecione o tipo de acidente"); return; }
    if (!form.descricao) { toast.error("Descreva o acidente"); return; }

    const veiculo = veiculos.find((v: any) => String(v.id) === form.veiculoId);
    const motorista = motoristas.find((m: any) => String(m.id) === form.motoristaId);

    const novo = {
      id: Date.now(),
      ...form,
      veiculoPlaca: veiculo?.placa || "",
      veiculoModelo: veiculo?.modelo || "",
      motoristaNome: motorista?.nome || "",
      custoEstimado: Number(form.custoEstimado) || 0,
      status: "em_analise",
      createdAt: new Date().toISOString(),
    };
    const novos = [novo, ...acidentes];
    setAcidentes(novos);
    localStorage.setItem("synapse_acidentes", JSON.stringify(novos));
    toast.success("Acidente registrado!");
    setModalOpen(false);
    setForm({ veiculoId: "", motoristaId: "", data: new Date().toISOString().split("T")[0], hora: "", tipo: "", gravidade: "leve", local: "", boletimOcorrencia: "", terceirosEnvolvidos: "nao", danoVeiculo: "", danoCarga: "", feridos: "nao", descricao: "", custoEstimado: "" });
  };

  const encerrar = (id: number) => {
    const atualizados = acidentes.map((a: any) => a.id === id ? { ...a, status: "encerrado" } : a);
    setAcidentes(atualizados);
    localStorage.setItem("synapse_acidentes", JSON.stringify(atualizados));
    toast.success("Acidente encerrado!");
  };

  const filtrados = acidentes.filter((a: any) =>
    !busca || a.veiculoPlaca?.toLowerCase().includes(busca.toLowerCase()) ||
    a.motoristaNome?.toLowerCase().includes(busca.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(busca.toLowerCase())
  );

  const custoTotal = acidentes.reduce((s: number, a: any) => s + (Number(a.custoEstimado) || 0), 0);

  return (
<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-500" />
            Registro de Acidentes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Registre e acompanhe acidentes da frota</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-red-600 hover:bg-red-700 text-white"><Plus className="w-4 h-4" /> Registrar Acidente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Acidente</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label>Veículo *</Label>
                <Select value={form.veiculoId} onValueChange={(v) => setForm(f => ({ ...f, veiculoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {veiculos.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa} — {v.modelo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Motorista *</Label>
                <Select value={form.motoristaId} onValueChange={(v) => setForm(f => ({ ...f, motoristaId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {motoristas.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Acidente *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tiposAcidente.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Gravidade *</Label>
                <Select value={form.gravidade} onValueChange={(v) => setForm(f => ({ ...f, gravidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                    <SelectItem value="fatal">Fatal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Local do Acidente</Label>
                <Input placeholder="Endereço ou rodovia" value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Boletim de Ocorrência</Label>
                <Input placeholder="Nº do B.O." value={form.boletimOcorrencia} onChange={e => setForm(f => ({ ...f, boletimOcorrencia: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Custo Estimado (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.custoEstimado} onChange={e => setForm(f => ({ ...f, custoEstimado: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Terceiros Envolvidos?</Label>
                <Select value={form.terceirosEnvolvidos} onValueChange={(v) => setForm(f => ({ ...f, terceirosEnvolvidos: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Houve Feridos?</Label>
                <Select value={form.feridos} onValueChange={(v) => setForm(f => ({ ...f, feridos: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Dano ao Veículo</Label>
                <Input placeholder="Descreva os danos" value={form.danoVeiculo} onChange={e => setForm(f => ({ ...f, danoVeiculo: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Dano à Carga</Label>
                <Input placeholder="Descreva os danos à carga (se houver)" value={form.danoCarga} onChange={e => setForm(f => ({ ...f, danoCarga: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Descrição Detalhada *</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Descreva o acidente..."
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={salvarAcidente} className="bg-red-600 hover:bg-red-700 text-white">Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Total</p><p className="text-2xl font-bold mt-1">{acidentes.length}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Em Análise</p><p className="text-2xl font-bold mt-1 text-yellow-600">{acidentes.filter((a: any) => a.status === "em_analise").length}</p></CardContent></Card>
        <Card className="border-red-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Graves/Fatais</p><p className="text-2xl font-bold mt-1 text-red-600">{acidentes.filter((a: any) => a.gravidade === "grave" || a.gravidade === "fatal").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase">Custo Total Estimado</p><p className="text-xl font-bold mt-1">{custoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></CardContent></Card>
      </div>

      {/* Filtro */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por placa, motorista, tipo..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtrados.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum acidente registrado</p>
          </CardContent></Card>
        ) : (
          filtrados.map((a: any) => {
            const grav = gravidadeConfig[a.gravidade] || gravidadeConfig.leve;
            return (
              <Card key={a.id} className={a.status === "encerrado" ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{a.tipo}</span>
                        <Badge className={`border text-xs ${grav.color}`}>{grav.label}</Badge>
                        <Badge variant="outline" className={a.status === "encerrado" ? "border-green-300 text-green-700" : "border-yellow-300 text-yellow-700"}>
                          {a.status === "encerrado" ? "Encerrado" : "Em Análise"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.descricao}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span>📅 {new Date(a.data).toLocaleDateString("pt-BR")} {a.hora || ""}</span>
                        <span>🚛 {a.veiculoPlaca}</span>
                        <span>👤 {a.motoristaNome}</span>
                        {a.local && <span>📍 {a.local}</span>}
                        {a.custoEstimado > 0 && <span>💰 {Number(a.custoEstimado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>}
                        {a.terceirosEnvolvidos === "sim" && <span className="text-orange-600">⚠ Terceiros envolvidos</span>}
                        {a.feridos === "sim" && <span className="text-red-600">🚑 Houve feridos</span>}
                      </div>
                    </div>
                    {a.status === "em_analise" && (
                      <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => encerrar(a.id)}>Encerrar</Button>
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
