import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Warehouse, Plus, Search, Package, ArrowLeftRight, AlertTriangle,
  TrendingUp, TrendingDown, BarChart3, MapPin, RefreshCw, Layers,
  ClipboardList, Truck, Thermometer, ScanLine, CheckSquare,
  ArrowUpRight, ArrowDownRight, Box, Zap, Target, Eye,
} from "lucide-react";
import { toast } from "sonner";

// ─── Mock data para demonstração ────────────────────────────────────────────
const MOCK_ESTOQUE = [
  { id: 1, codigo: "PRD-001", descricao: "Parafuso M8 Inox", categoria: "Fixadores", unidade: "UN", qtd: 4500, minimo: 500, localizacao: "A-01-01", lote: "L2025-04", validade: null, status: "ok" },
  { id: 2, codigo: "PRD-002", descricao: "Óleo Motor 5W30 1L", categoria: "Lubrificantes", unidade: "LT", qtd: 48, minimo: 100, localizacao: "B-03-02", lote: "L2025-03", validade: "2027-01-01", status: "critico" },
  { id: 3, codigo: "PRD-003", descricao: "Filtro de Ar Universal", categoria: "Filtros", unidade: "UN", qtd: 320, minimo: 50, localizacao: "C-02-04", lote: "L2025-02", validade: null, status: "ok" },
  { id: 4, codigo: "PRD-004", descricao: "Pneu 295/80R22.5", categoria: "Pneus", unidade: "UN", qtd: 12, minimo: 20, localizacao: "D-01-01", lote: "L2025-01", validade: null, status: "alerta" },
  { id: 5, codigo: "PRD-005", descricao: "Fluido de Freio DOT4", categoria: "Fluidos", unidade: "LT", qtd: 85, minimo: 30, localizacao: "B-04-01", lote: "L2025-04", validade: "2026-06-01", status: "ok" },
];

const MOCK_MOVIMENTACOES = [
  { id: 1, tipo: "entrada", produto: "Parafuso M8 Inox", qtd: 1000, usuario: "João Silva", data: "2025-04-15 14:32", nf: "NF-001234", armazem: "Principal" },
  { id: 2, tipo: "saida", produto: "Óleo Motor 5W30 1L", qtd: 12, usuario: "Maria Costa", data: "2025-04-15 11:20", nf: "REQ-0089", armazem: "Principal" },
  { id: 3, tipo: "transferencia", produto: "Filtro de Ar Universal", qtd: 50, usuario: "Carlos Lima", data: "2025-04-14 16:45", nf: "TRF-0012", armazem: "Filial SP" },
  { id: 4, tipo: "entrada", produto: "Pneu 295/80R22.5", qtd: 4, usuario: "Ana Souza", data: "2025-04-14 09:10", nf: "NF-001198", armazem: "Principal" },
  { id: 5, tipo: "saida", produto: "Fluido de Freio DOT4", qtd: 5, usuario: "Pedro Alves", data: "2025-04-13 15:00", nf: "REQ-0088", armazem: "Principal" },
];

const MOCK_PICKING = [
  { id: 1, pedido: "PED-2025-0841", cliente: "Transportes ABC", itens: 5, status: "pendente", prioridade: "alta", separador: null },
  { id: 2, pedido: "PED-2025-0840", cliente: "Logística XYZ", itens: 3, status: "em_separacao", prioridade: "normal", separador: "João Silva" },
  { id: 3, pedido: "PED-2025-0839", cliente: "Distribuidora Sul", itens: 8, status: "concluido", prioridade: "normal", separador: "Maria Costa" },
  { id: 4, pedido: "PED-2025-0838", cliente: "Frota Nacional", itens: 2, status: "expedido", prioridade: "urgente", separador: "Carlos Lima" },
];

const STATUS_COLORS: Record<string, string> = {
  ok: "bg-green-100 text-green-700",
  alerta: "bg-yellow-100 text-yellow-700",
  critico: "bg-red-100 text-red-700",
};

const MOV_COLORS: Record<string, string> = {
  entrada: "bg-green-100 text-green-700",
  saida: "bg-red-100 text-red-700",
  transferencia: "bg-blue-100 text-blue-700",
};

const PICK_STATUS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-700",
  em_separacao: "bg-blue-100 text-blue-700",
  concluido: "bg-green-100 text-green-700",
  expedido: "bg-purple-100 text-purple-700",
};

const PICK_PRIORIDADE: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-600",
};

export default function WMS() {
  const [location] = useLocation();
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [openNovoProduto, setOpenNovoProduto] = useState(false);
  const [openMovimentacao, setOpenMovimentacao] = useState(false);
  const [formProduto, setFormProduto] = useState({ codigo: "", descricao: "", unidade: "UN", categoria: "", estoqueMinimo: "", localizacaoPadrao: "" });
  const [formMov, setFormMov] = useState({ produtoId: "", armazemId: "", tipo: "entrada", quantidade: "", observacoes: "", nf: "" });

  useEffect(() => {
    if (location.includes("produtos")) setTab("produtos");
    else if (location.includes("movimentacoes")) setTab("movimentacoes");
    else if (location.includes("inventario")) setTab("inventario");
    else if (location.includes("acuracidade")) setTab("acuracidade");
    else setTab("dashboard");
  }, [location]);

  // TRPC queries
  const { data: estoque = [], refetch: refetchEstoque } = trpc.wms.listEstoque.useQuery({ search: search || undefined });
  const { data: produtos = [], refetch: refetchProdutos } = trpc.wms.listProdutos.useQuery({ search: search || undefined });
  const { data: armazens = [] } = trpc.wms.listArmazens.useQuery();
  const { data: movimentacoes = [] } = trpc.wms.listMovimentacoes.useQuery({ limit: 50 });

  const criarProduto = trpc.wms.createProduto.useMutation({
    onSuccess: () => { toast.success("Produto criado!"); setOpenNovoProduto(false); setFormProduto({ codigo: "", descricao: "", unidade: "UN", categoria: "", estoqueMinimo: "", localizacaoPadrao: "" }); refetchProdutos(); refetchEstoque(); },
    onError: (e) => toast.error(e.message),
  });
  const movimentar = trpc.wms.movimentar.useMutation({
    onSuccess: () => { toast.success("Movimentação registrada!"); setOpenMovimentacao(false); setFormMov({ produtoId: "", armazemId: "", tipo: "entrada", quantidade: "", observacoes: "", nf: "" }); refetchEstoque(); },
    onError: (e) => toast.error(e.message),
  });

  // Dados reais ou mock
  const estoqueData = estoque.length > 0 ? estoque : MOCK_ESTOQUE;
  const movData = (movimentacoes as any[]).length > 0 ? movimentacoes : MOCK_MOVIMENTACOES;
  const itensAbaixoMinimo = estoqueData.filter((i: any) => i.status === "critico" || i.status === "alerta" || (i.qtd !== undefined && i.estoqueMinimo !== undefined && i.qtd < i.estoqueMinimo)).length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Cabeçalho ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-primary" />
              WMS — Gestão de Armazém
            </h1>
            <p className="text-muted-foreground text-sm">Estoque · Picking · Expedição · Inventário · Acuracidade</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={openMovimentacao} onOpenChange={setOpenMovimentacao}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><ArrowLeftRight className="h-4 w-4 mr-2" />Movimentar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={e => { e.preventDefault(); movimentar.mutate({ produtoId: Number(formMov.produtoId), armazemId: Number(formMov.armazemId), tipo: formMov.tipo as any, quantidade: Number(formMov.quantidade), observacoes: formMov.observacoes || undefined }); }}>
                  <div><Label>Tipo *</Label>
                    <Select value={formMov.tipo} onValueChange={v => setFormMov(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">📥 Entrada</SelectItem>
                        <SelectItem value="saida">📤 Saída</SelectItem>
                        <SelectItem value="transferencia">🔄 Transferência</SelectItem>
                        <SelectItem value="ajuste">⚙️ Ajuste de Inventário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Produto *</Label>
                    <Select value={formMov.produtoId} onValueChange={v => setFormMov(p => ({ ...p, produtoId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{produtos.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.codigo} — {p.descricao}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Armazém *</Label>
                    <Select value={formMov.armazemId} onValueChange={v => setFormMov(p => ({ ...p, armazemId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{armazens.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Quantidade *</Label><Input type="number" min="1" value={formMov.quantidade} onChange={e => setFormMov(p => ({ ...p, quantidade: e.target.value }))} required /></div>
                    <div><Label>NF / Requisição</Label><Input placeholder="NF-000000" value={formMov.nf} onChange={e => setFormMov(p => ({ ...p, nf: e.target.value }))} /></div>
                  </div>
                  <div><Label>Observações</Label><Input value={formMov.observacoes} onChange={e => setFormMov(p => ({ ...p, observacoes: e.target.value }))} /></div>
                  <Button type="submit" className="w-full" disabled={movimentar.isPending}>Registrar</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={openNovoProduto} onOpenChange={setOpenNovoProduto}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Cadastrar Produto</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={e => { e.preventDefault(); criarProduto.mutate({ ...formProduto, estoqueMinimo: Number(formProduto.estoqueMinimo) || 0 }); }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Código *</Label><Input value={formProduto.codigo} onChange={e => setFormProduto(p => ({ ...p, codigo: e.target.value }))} required /></div>
                    <div><Label>Unidade</Label>
                      <Select value={formProduto.unidade} onValueChange={v => setFormProduto(p => ({ ...p, unidade: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["UN", "KG", "LT", "MT", "CX", "PC", "PR", "RL"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Descrição *</Label><Input value={formProduto.descricao} onChange={e => setFormProduto(p => ({ ...p, descricao: e.target.value }))} required /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Categoria</Label><Input value={formProduto.categoria} onChange={e => setFormProduto(p => ({ ...p, categoria: e.target.value }))} /></div>
                    <div><Label>Estoque Mínimo</Label><Input type="number" min="0" value={formProduto.estoqueMinimo} onChange={e => setFormProduto(p => ({ ...p, estoqueMinimo: e.target.value }))} /></div>
                  </div>
                  <div><Label>Localização Padrão</Label><Input placeholder="Ex: A-01-01" value={formProduto.localizacaoPadrao} onChange={e => setFormProduto(p => ({ ...p, localizacaoPadrao: e.target.value }))} /></div>
                  <Button type="submit" className="w-full" disabled={criarProduto.isPending}>Cadastrar Produto</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Itens em Estoque", value: estoqueData.length, icon: Package, color: "text-blue-600 bg-blue-50", trend: null },
            { label: "Abaixo do Mínimo", value: itensAbaixoMinimo, icon: AlertTriangle, color: itensAbaixoMinimo > 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50", trend: null },
            { label: "Armazéns Ativos", value: armazens.length || 3, icon: Warehouse, color: "text-purple-600 bg-purple-50", trend: null },
            { label: "Movimentações Hoje", value: 24, icon: ArrowLeftRight, color: "text-orange-600 bg-orange-50", trend: "+8%" },
            { label: "Pedidos em Picking", value: MOCK_PICKING.filter(p => p.status === "em_separacao").length, icon: ScanLine, color: "text-cyan-600 bg-cyan-50", trend: null },
            { label: "Acuracidade", value: "98.4%", icon: Target, color: "text-green-600 bg-green-50", trend: "+0.3%" },
          ].map((kpi, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium leading-snug">{kpi.label}</p>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}>
                    <kpi.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                {kpi.trend && <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" />{kpi.trend}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Alertas Críticos ── */}
        {itensAbaixoMinimo > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              <strong>{itensAbaixoMinimo} {itensAbaixoMinimo === 1 ? "item está" : "itens estão"} abaixo do estoque mínimo</strong> — verifique a aba Estoque para detalhes e gere pedidos de reposição.
            </p>
            <Button variant="outline" size="sm" className="ml-auto shrink-0 text-red-700 border-red-300 hover:bg-red-100" onClick={() => setTab("estoque")}>
              Ver Itens
            </Button>
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="estoque"><Package className="h-4 w-4 mr-1" />Estoque</TabsTrigger>
            <TabsTrigger value="produtos"><Layers className="h-4 w-4 mr-1" />Produtos</TabsTrigger>
            <TabsTrigger value="movimentacoes"><ArrowLeftRight className="h-4 w-4 mr-1" />Movimentações</TabsTrigger>
            <TabsTrigger value="picking"><ScanLine className="h-4 w-4 mr-1" />Picking</TabsTrigger>
            <TabsTrigger value="inventario"><ClipboardList className="h-4 w-4 mr-1" />Inventário</TabsTrigger>
            <TabsTrigger value="acuracidade"><Target className="h-4 w-4 mr-1" />Acuracidade</TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD ── */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Itens Críticos (Abaixo do Mínimo)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {estoqueData.filter((i: any) => i.status === "critico" || i.status === "alerta").slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{item.descricao}</p>
                        <p className="text-xs text-muted-foreground">{item.localizacao}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-xs ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}>{item.qtd} {item.unidade}</Badge>
                        <p className="text-xs text-muted-foreground mt-0.5">Mín: {item.minimo ?? item.estoqueMinimo}</p>
                      </div>
                    </div>
                  ))}
                  {estoqueData.filter((i: any) => i.status === "critico" || i.status === "alerta").length === 0 && (
                    <p className="text-sm text-green-600 flex items-center gap-2 py-2"><CheckSquare className="h-4 w-4" />Todos os itens acima do mínimo</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Últimas Movimentações</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(movData as any[]).slice(0, 5).map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${MOV_COLORS[m.tipo] ?? "bg-gray-100 text-gray-600"}`}>{m.tipo}</Badge>
                        <div>
                          <p className="text-sm font-medium">{m.produto ?? m.descricao}</p>
                          <p className="text-xs text-muted-foreground">{m.usuario ?? "Sistema"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{m.qtd ?? m.quantidade}</p>
                        <p className="text-xs text-muted-foreground">{typeof m.data === "string" ? m.data.substring(0, 16) : new Date(m.data ?? m.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">Pedidos em Picking</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {["pendente", "em_separacao", "concluido", "expedido"].map(status => {
                    const count = MOCK_PICKING.filter(p => p.status === status).length;
                    const labels: Record<string, string> = { pendente: "Pendentes", em_separacao: "Em Separação", concluido: "Concluídos", expedido: "Expedidos" };
                    return (
                      <div key={status} className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground mt-1">{labels[status]}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ESTOQUE ── */}
          <TabsContent value="estoque" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto, código, localização..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={() => { refetchEstoque(); toast.info("Estoque atualizado"); }}>
                <RefreshCw className="h-4 w-4 mr-2" />Atualizar
              </Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estoqueData.map((item: any) => {
                    const qtd = item.qtd ?? item.quantidade ?? 0;
                    const min = item.minimo ?? item.estoqueMinimo ?? 0;
                    const status = item.status ?? (qtd === 0 ? "critico" : qtd < min ? "alerta" : "ok");
                    const pct = min > 0 ? Math.min(100, Math.round((qtd / min) * 100)) : 100;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.categoria}</Badge></TableCell>
                        <TableCell className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{item.localizacao ?? item.localizacaoPadrao ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.lote ?? "—"}</TableCell>
                        <TableCell className="text-right font-bold">{qtd} <span className="text-xs text-muted-foreground font-normal">{item.unidade}</span></TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">{min}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={`text-xs ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>{status === "ok" ? "Normal" : status === "alerta" ? "Alerta" : "Crítico"}</Badge>
                            <Progress value={pct} className={`h-1 ${status === "critico" ? "[&>div]:bg-red-500" : status === "alerta" ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setFormMov(p => ({ ...p, produtoId: String(item.id) })); setOpenMovimentacao(true); }}>
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Movimentar</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── PRODUTOS ── */}
          <TabsContent value="produtos" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produtos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Estoque Mínimo</TableHead>
                    <TableHead>Localização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(produtos.length > 0 ? produtos : MOCK_ESTOQUE).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                      <TableCell className="font-medium">{p.descricao}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.categoria}</Badge></TableCell>
                      <TableCell>{p.unidade}</TableCell>
                      <TableCell>{p.estoqueMinimo ?? p.minimo ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.localizacaoPadrao ?? p.localizacao ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── MOVIMENTAÇÕES ── */}
          <TabsContent value="movimentacoes" className="space-y-4 mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>NF / Req.</TableHead>
                    <TableHead>Armazém</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movData as any[]).map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell><Badge className={`text-xs ${MOV_COLORS[m.tipo] ?? "bg-gray-100 text-gray-600"}`}>{m.tipo}</Badge></TableCell>
                      <TableCell className="font-medium">{m.produto ?? m.descricao}</TableCell>
                      <TableCell className="font-bold">{m.qtd ?? m.quantidade}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.nf ?? "—"}</TableCell>
                      <TableCell className="text-xs">{m.armazem ?? "Principal"}</TableCell>
                      <TableCell className="text-xs">{m.usuario ?? "Sistema"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{typeof m.data === "string" ? m.data : new Date(m.data ?? m.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── PICKING ── */}
          <TabsContent value="picking" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Separação de pedidos por ordem de prioridade.</p>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Ordem</Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Separador</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PICKING.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold">{p.pedido}</TableCell>
                      <TableCell className="font-medium">{p.cliente}</TableCell>
                      <TableCell>{p.itens} itens</TableCell>
                      <TableCell><Badge className={`text-xs ${PICK_PRIORIDADE[p.prioridade]}`}>{p.prioridade}</Badge></TableCell>
                      <TableCell><Badge className={`text-xs ${PICK_STATUS[p.status]}`}>{p.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{p.separador ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {p.status === "pendente" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success(`Picking iniciado para ${p.pedido}`)}>
                            <ScanLine className="h-3 w-3 mr-1" />Iniciar
                          </Button>
                        )}
                        {p.status === "em_separacao" && (
                          <Button size="sm" className="h-7 text-xs" onClick={() => toast.success(`Picking concluído para ${p.pedido}`)}>
                            <CheckSquare className="h-3 w-3 mr-1" />Concluir
                          </Button>
                        )}
                        {(p.status === "concluido" || p.status === "expedido") && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
                            <Eye className="h-3 w-3 mr-1" />Ver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* ── INVENTÁRIO ── */}
          <TabsContent value="inventario" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Contagem cíclica e inventário geral com divergências.</p>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Inventário</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-10 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum inventário em andamento</p>
                  <p className="text-sm mt-1">Crie um novo inventário para iniciar a contagem cíclica ou geral.</p>
                  <Button className="mt-4" size="sm"><Plus className="h-4 w-4 mr-2" />Iniciar Inventário</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ACURACIDADE ── */}
          <TabsContent value="acuracidade" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" />Acuracidade Geral</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">98.4%</div>
                  <Progress value={98.4} className="mt-2 h-2 [&>div]:bg-green-500" />
                  <p className="text-xs text-muted-foreground mt-1">Meta: 99% | +0.3% vs. mês anterior</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Box className="h-4 w-4" />Divergências no Mês</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">7</div>
                  <p className="text-xs text-muted-foreground mt-2">Itens com divergência entre físico e sistema</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Giro de Estoque</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">4.2x</div>
                  <p className="text-xs text-muted-foreground mt-2">Rotatividade média mensal</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">Histórico de Acuracidade</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["Abril/2025", "Março/2025", "Fevereiro/2025", "Janeiro/2025"].map((mes, i) => {
                    const vals = [98.4, 98.1, 97.8, 97.5];
                    return (
                      <div key={mes} className="flex items-center gap-3">
                        <span className="text-sm w-28 shrink-0">{mes}</span>
                        <Progress value={vals[i]} className="flex-1 h-2" />
                        <span className="text-sm font-bold w-14 text-right">{vals[i]}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
