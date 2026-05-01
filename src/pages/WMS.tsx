import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, ArrowLeftRight, Box, ClipboardList, MapPin, Package, Plus, RefreshCw, Target, Warehouse } from "lucide-react";
import { toast } from "sonner";

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">{text}</TableCell>
    </TableRow>
  );
}

export default function WMS() {
  const [location] = useLocation();
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [showMovimentacao, setShowMovimentacao] = useState(false);
  const [showNovoArmazem, setShowNovoArmazem] = useState(false);
  const [produtoForm, setProdutoForm] = useState({ codigo: "", descricao: "", unidade: "UN", categoria: "", estoqueMinimo: "", localizacaoPadrao: "" });
  const [movForm, setMovForm] = useState({ produtoId: "", armazemId: "", tipo: "entrada", quantidade: "", observacoes: "", documento: "" });
  const [armazemForm, setArmazemForm] = useState({ nome: "", codigo: "", descricao: "", endereco: "", capacidadeTotal: "", unidadeCapacidade: "m²" });

  useEffect(() => {
    if (location.includes("/wms/estoque")) setTab("estoque");
    else if (location.includes("/wms/produtos")) setTab("produtos");
    else if (location.includes("/wms/movimentacoes")) setTab("movimentacoes");
    else if (location.includes("/wms/armazens")) setTab("armazens");
    else if (location.includes("/wms/inventario")) setTab("inventario");
    else if (location.includes("/wms/acuracidade")) setTab("acuracidade");
    else setTab("dashboard");
  }, [location]);

  const dashboardQ = trpc.wms.dashboard.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const estoqueQ = trpc.wms.listEstoque.useQuery({ empresaId: EMPRESA_ID, search: search || undefined }, { enabled: !!EMPRESA_ID }) as any;
  const produtosQ = trpc.wms.listProdutos.useQuery({ empresaId: EMPRESA_ID, search: search || undefined }, { enabled: !!EMPRESA_ID }) as any;
  const armazensQ = trpc.wms.listArmazens.useQuery({ empresaId: EMPRESA_ID }, { enabled: !!EMPRESA_ID }) as any;
  const movimentacoesQ = trpc.wms.listMovimentacoes.useQuery({ empresaId: EMPRESA_ID, limit: 50 }, { enabled: !!EMPRESA_ID }) as any;

  const utils = trpc.useContext();
  const createProduto = trpc.wms.createProduto.useMutation({
    onSuccess: () => {
      toast.success("Produto cadastrado.");
      setShowNovoProduto(false);
      utils.wms.listProdutos.invalidate();
      utils.wms.listEstoque.invalidate();
      utils.wms.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const movimentar = trpc.wms.movimentar.useMutation({
    onSuccess: () => {
      toast.success("Movimentação registrada.");
      setShowMovimentacao(false);
      utils.wms.listMovimentacoes.invalidate();
      utils.wms.listEstoque.invalidate();
      utils.wms.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const createArmazem = trpc.wms.createArmazem.useMutation({
    onSuccess: () => {
      toast.success("Armazém cadastrado.");
      setShowNovoArmazem(false);
      utils.wms.listArmazens.invalidate();
      utils.wms.dashboard.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const estoque = estoqueQ.data ?? [];
  const produtos = produtosQ.data ?? [];
  const armazens = armazensQ.data ?? [];
  const movimentacoes = movimentacoesQ.data ?? [];

  const itensCriticos = useMemo(
    () => estoque.filter((item: any) => Number(item.quantidade ?? 0) < Number(item.estoqueMinimo ?? 0)),
    [estoque],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-primary" />
            WMS
          </h1>
          <p className="text-muted-foreground text-sm">Armazéns, produtos, estoque e movimentações reais.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showMovimentacao} onOpenChange={setShowMovimentacao}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><ArrowLeftRight className="h-4 w-4 mr-2" />Movimentar</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar movimentação</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                movimentar.mutate({
                  empresaId: EMPRESA_ID,
                  produtoId: Number(movForm.produtoId),
                  armazemId: Number(movForm.armazemId),
                  tipo: movForm.tipo as any,
                  quantidade: movForm.quantidade,
                  documento: movForm.documento || undefined,
                  observacoes: movForm.observacoes || undefined,
                });
              }}>
                <div><Label>Tipo *</Label><Select value={movForm.tipo} onValueChange={(v) => setMovForm((p) => ({ ...p, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="ajuste">Ajuste</SelectItem><SelectItem value="inventario">Inventário</SelectItem></SelectContent></Select></div>
                <div><Label>Produto *</Label><Select value={movForm.produtoId} onValueChange={(v) => setMovForm((p) => ({ ...p, produtoId: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{produtos.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.codigo} — {p.descricao}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Armazém *</Label><Select value={movForm.armazemId} onValueChange={(v) => setMovForm((p) => ({ ...p, armazemId: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{armazens.map((a: any) => <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantidade *</Label><Input type="number" step="0.001" value={movForm.quantidade} onChange={(e) => setMovForm((p) => ({ ...p, quantidade: e.target.value }))} required /></div>
                  <div><Label>Documento</Label><Input value={movForm.documento} onChange={(e) => setMovForm((p) => ({ ...p, documento: e.target.value }))} /></div>
                </div>
                <div><Label>Observações</Label><Textarea rows={3} value={movForm.observacoes} onChange={(e) => setMovForm((p) => ({ ...p, observacoes: e.target.value }))} /></div>
                <Button type="submit" className="w-full" disabled={movimentar.isPending}>Salvar movimentação</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showNovoProduto} onOpenChange={setShowNovoProduto}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Produto</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo produto</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                createProduto.mutate({ ...produtoForm, empresaId: EMPRESA_ID, estoqueMinimo: produtoForm.estoqueMinimo || undefined });
              }}>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Código *</Label><Input value={produtoForm.codigo} onChange={(e) => setProdutoForm((p) => ({ ...p, codigo: e.target.value }))} required /></div>
                  <div><Label>Unidade</Label><Input value={produtoForm.unidade} onChange={(e) => setProdutoForm((p) => ({ ...p, unidade: e.target.value }))} /></div>
                </div>
                <div><Label>Descrição *</Label><Input value={produtoForm.descricao} onChange={(e) => setProdutoForm((p) => ({ ...p, descricao: e.target.value }))} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Categoria</Label><Input value={produtoForm.categoria} onChange={(e) => setProdutoForm((p) => ({ ...p, categoria: e.target.value }))} /></div>
                  <div><Label>Estoque mínimo</Label><Input type="number" step="0.001" value={produtoForm.estoqueMinimo} onChange={(e) => setProdutoForm((p) => ({ ...p, estoqueMinimo: e.target.value }))} /></div>
                </div>
                <div><Label>Localização padrão</Label><Input value={produtoForm.localizacaoPadrao} onChange={(e) => setProdutoForm((p) => ({ ...p, localizacaoPadrao: e.target.value }))} /></div>
                <Button type="submit" className="w-full" disabled={createProduto.isPending}>Salvar produto</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showNovoArmazem} onOpenChange={setShowNovoArmazem}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Armazém</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo armazém</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                createArmazem.mutate({ ...armazemForm, empresaId: EMPRESA_ID, capacidadeTotal: armazemForm.capacidadeTotal || undefined });
              }}>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nome *</Label><Input value={armazemForm.nome} onChange={(e) => setArmazemForm((p) => ({ ...p, nome: e.target.value }))} required /></div>
                  <div><Label>Código</Label><Input value={armazemForm.codigo} onChange={(e) => setArmazemForm((p) => ({ ...p, codigo: e.target.value }))} /></div>
                </div>
                <div><Label>Descrição</Label><Textarea rows={2} value={armazemForm.descricao} onChange={(e) => setArmazemForm((p) => ({ ...p, descricao: e.target.value }))} /></div>
                <div><Label>Endereço</Label><Input value={armazemForm.endereco} onChange={(e) => setArmazemForm((p) => ({ ...p, endereco: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Capacidade total</Label><Input type="number" step="0.01" value={armazemForm.capacidadeTotal} onChange={(e) => setArmazemForm((p) => ({ ...p, capacidadeTotal: e.target.value }))} /></div>
                  <div><Label>Unidade</Label><Input value={armazemForm.unidadeCapacidade} onChange={(e) => setArmazemForm((p) => ({ ...p, unidadeCapacidade: e.target.value }))} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={createArmazem.isPending}>Salvar armazém</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Produtos</p><p className="text-2xl font-bold">{dashboardQ.data?.totalProdutos ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Armazéns</p><p className="text-2xl font-bold">{dashboardQ.data?.totalArmazens ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Itens em estoque</p><p className="text-2xl font-bold">{dashboardQ.data?.totalItensEstoque ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Abaixo do mínimo</p><p className={`text-2xl font-bold ${itensCriticos.length > 0 ? "text-red-600" : ""}`}>{itensCriticos.length}</p></CardContent></Card>
      </div>

      {itensCriticos.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {itensCriticos.length} item(ns) abaixo do mínimo exigem reposição.
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="armazens"><Warehouse className="h-4 w-4 mr-1" />Armazéns</TabsTrigger>
          <TabsTrigger value="produtos"><Box className="h-4 w-4 mr-1" />Produtos</TabsTrigger>
          <TabsTrigger value="estoque"><Package className="h-4 w-4 mr-1" />Estoque</TabsTrigger>
          <TabsTrigger value="movimentacoes"><ArrowLeftRight className="h-4 w-4 mr-1" />Movimentações</TabsTrigger>
          <TabsTrigger value="inventario"><ClipboardList className="h-4 w-4 mr-1" />Inventário</TabsTrigger>
          <TabsTrigger value="acuracidade"><Target className="h-4 w-4 mr-1" />Acuracidade</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Últimas movimentações</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(dashboardQ.data?.ultimasMovimentacoes ?? []).map((mov: any) => (
                  <div key={mov.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{mov.descricaoProduto}</p>
                      <p className="text-xs text-muted-foreground">{mov.tipo}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{mov.quantidade}</p>
                      <p className="text-xs text-muted-foreground">{new Date(mov.createdAt).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
                {(dashboardQ.data?.ultimasMovimentacoes ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma movimentação recente.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Itens críticos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {itensCriticos.slice(0, 5).map((item: any) => (
                  <div key={item.estoqueId} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{item.descricaoProduto}</p>
                      <p className="text-xs text-muted-foreground">{item.localizacaoCodigo || item.localizacaoPadrao || "Sem localização"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.quantidade}</p>
                      <p className="text-xs text-muted-foreground">Mín. {item.estoqueMinimo || 0}</p>
                    </div>
                  </div>
                ))}
                {itensCriticos.length === 0 && <p className="text-sm text-green-600">Todos os itens estão acima do mínimo.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="armazens" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Código</TableHead><TableHead>Capacidade</TableHead><TableHead>Endereço</TableHead></TableRow></TableHeader>
              <TableBody>
                {armazens.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell>{a.codigo || "—"}</TableCell>
                    <TableCell>{a.capacidadeTotal ? `${a.capacidadeTotal} ${a.unidadeCapacidade || ""}` : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.endereco || "—"}</TableCell>
                  </TableRow>
                ))}
                {armazens.length === 0 && <EmptyRow colSpan={4} text="Nenhum armazém cadastrado." />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="produtos" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Unidade</TableHead><TableHead>Mínimo</TableHead><TableHead>Localização</TableHead></TableRow></TableHeader>
              <TableBody>
                {produtos.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                    <TableCell className="font-medium">{p.descricao}</TableCell>
                    <TableCell>{p.categoria || "—"}</TableCell>
                    <TableCell>{p.unidade}</TableCell>
                    <TableCell>{p.estoqueMinimo || "0"}</TableCell>
                    <TableCell>{p.localizacaoPadrao || "—"}</TableCell>
                  </TableRow>
                ))}
                {produtos.length === 0 && <EmptyRow colSpan={6} text="Nenhum produto cadastrado." />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { estoqueQ.refetch(); toast.info("Estoque atualizado."); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Categoria</TableHead><TableHead>Localização</TableHead><TableHead>Qtd</TableHead><TableHead>Mínimo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {estoque.map((item: any) => {
                  const qtd = Number(item.quantidade ?? 0);
                  const min = Number(item.estoqueMinimo ?? 0);
                  const critical = qtd < min;
                  return (
                    <TableRow key={item.estoqueId}>
                      <TableCell>
                        <p className="font-medium">{item.descricaoProduto}</p>
                        <p className="text-xs text-muted-foreground">{item.codigoProduto}</p>
                      </TableCell>
                      <TableCell>{item.categoria || "—"}</TableCell>
                      <TableCell>{item.localizacaoCodigo || item.localizacaoPadrao || "—"}</TableCell>
                      <TableCell>{qtd} {item.unidade}</TableCell>
                      <TableCell>{min}</TableCell>
                      <TableCell><Badge className={critical ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>{critical ? "Abaixo do mínimo" : "Normal"}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {estoque.length === 0 && <EmptyRow colSpan={6} text="Nenhum item em estoque." />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Produto</TableHead><TableHead>Qtd</TableHead><TableHead>Documento</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
              <TableBody>
                {movimentacoes.map((mov: any) => (
                  <TableRow key={mov.id}>
                    <TableCell>{mov.tipo}</TableCell>
                    <TableCell>{mov.produtoId}</TableCell>
                    <TableCell>{mov.quantidade}</TableCell>
                    <TableCell>{mov.documento || "—"}</TableCell>
                    <TableCell>{new Date(mov.createdAt).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
                {movimentacoes.length === 0 && <EmptyRow colSpan={5} text="Nenhuma movimentação registrada." />}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="mt-4">
          <Card><CardContent className="py-10 text-center text-muted-foreground">Inventário ainda não foi persistido neste módulo. A aba está reservada para a próxima fase real.</CardContent></Card>
        </TabsContent>

        <TabsContent value="acuracidade" className="mt-4">
          <Card><CardContent className="py-10 text-center text-muted-foreground">Sem dados suficientes para gerar acuracidade. Ela será habilitada quando o inventário persistido entrar.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
