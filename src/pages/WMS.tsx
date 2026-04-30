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

function EmptyTableRow({ colSpan, title, description }: { colSpan: number; title: string; description: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

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

  const estoqueData = estoque as any[];
  const movData = movimentacoes as any[];
  const itensAbaixoMinimo = estoqueData.filter((i: any) => i.status === "critico" || i.status === "alerta" || (i.qtd !== undefined && i.estoqueMinimo !== undefined && i.qtd < i.estoqueMinimo)).length;
  const movimentacoesHoje = movData.filter((m: any) => {
    const data = m.data ?? m.createdAt;
    if (!data) return false;
    const date = new Date(data);
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;
  const pickingDisponivel = false;

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
            { label: "Armazéns Ativos", value: armazens.length, icon: Warehouse, color: "text-purple-600 bg-purple-50", trend: null },
            { label: "Movimentações Hoje", value: movimentacoesHoje, icon: ArrowLeftRight, color: "text-orange-600 bg-orange-50", trend: null },
            { label: "Pedidos em Picking", value: pickingDisponivel ? 0 : "Em implantação", icon: ScanLine, color: "text-cyan-600 bg-cyan-50", trend: null },
            { label: "Acuracidade", value: "Sem dados", icon: Target, color: "text-green-600 bg-green-50", trend: null },
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
                  {movData.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Nenhuma movimentação registrada.</p>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-sm">Pedidos em Picking</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Badge variant="outline">Em implantação</Badge>
                  <p className="mt-3 text-sm font-medium">O fluxo de picking ainda não está habilitado para uso real.</p>
                  <p className="text-sm text-muted-foreground mt-1">Quando estiver persistido no banco, os pedidos aparecerão aqui.</p>
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
                  {estoqueData.length === 0 && (
                    <EmptyTableRow
                      colSpan={9}
                      title="Nenhum item cadastrado."
                      description="Cadastre o primeiro item ou importe o estoque para começar."
                    />
                  )}
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
                  {produtos.length === 0 && (
                    <EmptyTableRow
                      colSpan={6}
                      title="Nenhum produto cadastrado."
                      description="Cadastre o primeiro produto para montar o estoque."
                    />
                  )}
                  {produtos.map((p: any) => (
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
                  {movData.length === 0 && (
                    <EmptyTableRow
                      colSpan={7}
                      title="Nenhuma movimentação registrada."
                      description="As entradas, saídas e transferências aparecerão aqui."
                    />
                  )}
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
              <Badge variant="outline">Em implantação</Badge>
            </div>
            <Card>
              <CardContent className="py-10 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="font-medium">Módulo de picking em implantação.</p>
                <p className="text-sm text-muted-foreground mt-1">Ele será liberado quando o fluxo estiver persistido e integrado ao estoque real.</p>
              </CardContent>
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ACURACIDADE ── */}
          <TabsContent value="acuracidade" className="space-y-4 mt-4">
            <Card>
              <CardContent className="py-10 text-center">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="font-medium">Sem dados suficientes para gerar gráfico.</p>
                <p className="text-sm text-muted-foreground mt-1">A acuracidade será exibida quando houver inventários concluídos e divergências registradas.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
