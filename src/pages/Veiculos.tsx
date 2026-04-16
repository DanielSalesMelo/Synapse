import { useTranslation } from 'react-i18next';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import { Plus, Search, Truck, Link2, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";


const TIPO_LABELS: Record<string, string> = {
  van: "Van",
  toco: "Toco",
  truck: "Truck",
  cavalo: "Cavalo Mecânico",
  carreta: "Carreta",
  empilhadeira: "Empilhadeira",
  paletera: "Paleteira",
  outro: "Outro",
};

const TIPO_COLORS: Record<string, string> = {
  van: "bg-blue-100 text-blue-700",
  toco: "bg-indigo-100 text-indigo-700",
  truck: "bg-purple-100 text-purple-700",
  cavalo: "bg-orange-100 text-orange-700",
  carreta: "bg-yellow-100 text-yellow-700",
  empilhadeira: "bg-green-100 text-green-700",
  paletera: "bg-teal-100 text-teal-700",
  outro: "bg-gray-100 text-gray-700",
};

function VeiculoCard({ v, cavalos, onEdit }: { v: any; cavalos: any[]; onEdit: (v: any) => void }) {
  const cavalo = cavalos.find(c => c.id === v.cavaloPrincipalId);
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onEdit(v)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base">{v.placa}</span>
              <Badge className={`text-xs ${TIPO_COLORS[v.tipo] ?? "bg-gray-100 text-gray-700"}`}>
                {TIPO_LABELS[v.tipo] ?? v.tipo}
              </Badge>
              {v.ativo ? (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">Ativo</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-red-500 border-red-300">Inativo</Badge>
              )}
            </div>
            {v.marca && <p className="text-sm text-muted-foreground mt-1">{v.marca} {v.modelo ?? ""} {v.ano ?? ""}</p>}
            {cavalo && (
              <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                <Link2 className="h-3 w-3" />
                <span>Cavalo: {cavalo.placa}</span>
              </div>
            )}
            {v.tipo === "carreta" && !cavalo && (
              <p className="text-xs text-muted-foreground mt-1 italic">Sem cavalo vinculado</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {v.kmAtual && <span className="text-xs text-muted-foreground">{Number(v.kmAtual).toLocaleString("pt-BR")} km</span>}
            {v.classificacao > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: v.classificacao }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            )}
          </div>
        </div>
        {v.capacidadeCarga && (
          <p className="text-xs text-muted-foreground mt-2">Capacidade: {v.capacidadeCarga}</p>
        )}
      </CardContent>
    </Card>
  );
}

function VeiculoForm({ initial, cavalos, onSave, onClose }: {
  initial?: any;
  cavalos: any[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [form, setForm] = useState({
    placa: initial?.placa ?? "",
    tipo: initial?.tipo ?? "toco",
    cavaloPrincipalId: initial?.cavaloPrincipalId ?? null,
    marca: initial?.marca ?? "",
    modelo: initial?.modelo ?? "",
    ano: initial?.ano ?? "",
    capacidadeCarga: initial?.capacidadeCarga ?? "",
    kmAtual: initial?.kmAtual ?? "",
    vencimentoCrlv: initial?.vencimentoCrlv ? new Date(initial.vencimentoCrlv).toISOString().split("T")[0] : "",
    vencimentoSeguro: initial?.vencimentoSeguro ? new Date(initial.vencimentoSeguro).toISOString().split("T")[0] : "",
    observacoes: initial?.observacoes ?? "",
  });

  const isCarreta = form.tipo === "carreta";

  // Máscaras e Validações
  const validatePlaca = (v: string) => {
    const clean = v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (clean.length > 7) return clean.slice(0, 7);
    return clean;
  };

  const formatPlacaDisplay = (v: string) => {
    const clean = v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (clean.length <= 3) return clean;
    // Formato antigo: AAA-0000, Mercosul: AAA0A00
    if (/^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/.test(clean)) return clean; // Mercosul
    if (clean.length > 3) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return clean;
  };

  const isPlacaValid = (v: string) => {
    const clean = v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return /^[A-Z]{3}[0-9]{4}$/.test(clean) || /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/.test(clean);
  };

  const validateAno = (v: string) => {
    const clean = v.replace(/\D/g, "");
    return clean.slice(0, 4);
  };

  const isAnoValid = (v: string) => {
    if (!v) return true;
    const year = parseInt(v);
    return year >= 1900 && year <= new Date().getFullYear() + 2;
  };

  const formatNumber = (v: string) => v.replace(/\D/g, "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isPlacaValid(form.placa)) {
      toast.error("Placa inválida. Use o formato AAA-0000 ou Mercosul.");
      return;
    }
    onSave({
      empresaId: EMPRESA_ID,
      placa: form.placa.replace("-", "").toUpperCase(),
      tipo: form.tipo,
      cavaloPrincipalId: isCarreta && form.cavaloPrincipalId ? Number(form.cavaloPrincipalId) : null,
      marca: form.marca || undefined,
      modelo: form.modelo || undefined,
      ano: form.ano ? Number(form.ano) : undefined,
      capacidadeCarga: form.capacidadeCarga || undefined,
      kmAtual: form.kmAtual ? Number(form.kmAtual) : undefined,
      vencimentoCrlv: form.vencimentoCrlv || undefined,
      vencimentoSeguro: form.vencimentoSeguro || undefined,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex justify-between">
            Placa *
            {!isPlacaValid(form.placa) && form.placa.length > 0 && <XCircle className="h-4 w-4 text-red-500" />}
          </Label>
          <Input
            value={formatPlacaDisplay(form.placa)}
            onChange={e => setForm(f => ({ ...f, placa: validatePlaca(e.target.value) }))}
            placeholder="AAA-0000"
            required
            className={`uppercase ${!isPlacaValid(form.placa) && form.placa.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isCarreta && (
        <div className="space-y-1.5 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
          <Label className="text-orange-700 dark:text-orange-400 flex items-center gap-1">
            <Link2 className="h-3 w-3" /> Cavalo Mecânico Vinculado
          </Label>
          <Select
            value={form.cavaloPrincipalId ? String(form.cavaloPrincipalId) : "none"}
            onValueChange={v => setForm(f => ({ ...f, cavaloPrincipalId: v === "none" ? null : Number(v) }))}
          >
            <SelectTrigger><SelectValue placeholder="Selecionar cavalo..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem cavalo vinculado</SelectItem>
              {cavalos.map(c => (
                <SelectItem key={c.id} value={String(c.id)}>{c.placa} {c.marca ? `— ${c.marca}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            O checklist e manutenções serão registrados separadamente para cada unidade.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Marca</Label>
          <Input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Scania, Volvo..." />
        </div>
        <div className="space-y-1.5">
          <Label>Modelo</Label>
          <Input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="R450, FH..." />
        </div>
        <div className="space-y-1.5">
          <Label className="flex justify-between">
            Ano
            {!isAnoValid(form.ano) && form.ano.length > 0 && <XCircle className="h-4 w-4 text-red-500" />}
          </Label>
          <Input 
            value={form.ano} 
            onChange={e => setForm(f => ({ ...f, ano: validateAno(e.target.value) }))} 
            placeholder="2022" 
            className={!isAnoValid(form.ano) && form.ano.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Capacidade de Carga (kg)</Label>
          <Input 
            value={form.capacidadeCarga} 
            onChange={e => setForm(f => ({ ...f, capacidadeCarga: formatNumber(e.target.value) }))} 
            placeholder="27000" 
          />
        </div>
        <div className="space-y-1.5">
          <Label>KM Atual</Label>
          <Input 
            value={form.kmAtual} 
            onChange={e => setForm(f => ({ ...f, kmAtual: formatNumber(e.target.value) }))} 
            placeholder="150000" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Vencimento CRLV</Label>
          <Input type="date" value={form.vencimentoCrlv} onChange={e => setForm(f => ({ ...f, vencimentoCrlv: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento Seguro</Label>
          <Input type="date" value={form.vencimentoSeguro} onChange={e => setForm(f => ({ ...f, vencimentoSeguro: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!isPlacaValid(form.placa) || (form.ano.length > 0 && !isAnoValid(form.ano))}>
          {initial ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}

export default function Veiculos() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const utils = trpc.useUtils();
  const { data: veiculosList = [], isLoading } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: cavalos = [] } = trpc.veiculos.listCavalos.useQuery({ empresaId: EMPRESA_ID });

  const createMut = trpc.veiculos.create.useMutation({
    onSuccess: () => { utils.veiculos.list.invalidate(); setOpen(false); toast.success("Veículo cadastrado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.veiculos.update.useMutation({
    onSuccess: () => { utils.veiculos.list.invalidate(); setEditing(null); toast.success("Veículo atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return veiculosList.filter(v => {
      const matchSearch = !search || v.placa.toLowerCase().includes(search.toLowerCase()) ||
        (v.marca ?? "").toLowerCase().includes(search.toLowerCase());
      const matchTipo = filterTipo === "todos" || v.tipo === filterTipo;
      return matchSearch && matchTipo;
    });
  }, [veiculosList, search, filterTipo]);

  const grupos = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(v => {
      const k = v.tipo;
      if (!g[k]) g[k] = [];
      g[k].push(v);
    });
    return g;
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Veículos</h1>
          <p className="text-sm text-muted-foreground">{veiculosList.length} veículos cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Cadastrar Veículo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Veículo</DialogTitle>
            </DialogHeader>
            <VeiculoForm 
              cavalos={cavalos} 
              onSave={data => createMut.mutate(data)} 
              onClose={() => setOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar placa ou marca..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-32 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mb-4 opacity-20" />
            <p>Nenhum veículo encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grupos).sort().map(([tipo, list]) => (
            <div key={tipo} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{TIPO_LABELS[tipo] ?? tipo}</h2>
                <Badge variant="secondary" className="rounded-full">{list.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map(v => (
                  <VeiculoCard key={v.id} v={v} cavalos={cavalos} onEdit={setEditing} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Veículo</DialogTitle>
          </DialogHeader>
          {editing && (
            <VeiculoForm
              initial={editing}
              cavalos={cavalos}
              onSave={data => updateMut.mutate({ id: editing.id, ...data })}
              onClose={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
