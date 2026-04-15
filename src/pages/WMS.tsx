import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Warehouse, Plus, Search, Package, ArrowLeftRight, AlertTriangle,
  TrendingUp, TrendingDown, BarChart3, MapPin, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WMS() {
  
  const [tab, setTab] = useState("estoque");
  const [search, setSearch] = useState("");
  const [openNovoProduto, setOpenNovoProduto] = useState(false);
  const [openMovimentacao, setOpenMovimentacao] = useState(false);
  const [formProduto, setFormProduto] = useState({
    codigo: "", descricao: "", unidade: "UN", categoria: "", estoqueMinimo: "", localizacaoPadrao: "",
  });
  const [formMov, setFormMov] = useState({
    produtoId: "", armazemId: "", tipo: "entrada", quantidade: "", observacoes: "",
  });

  const { data: estoque = [], refetch: refetchEstoque } = trpc.wms.listEstoque.useQuery({
    search: search || undefined,
  });

  const { data: produtos = [], refetch: refetchProdutos } = trpc.wms.listProdutos.useQuery({
    search: search || undefined,
  });

  const { data: armazens = [] } = trpc.wms.listArmazens.useQuery();

  const { data: movimentacoes = [] } = trpc.wms.listMovimentacoes.useQuery({ limit: 50 });

  const criarProduto = trpc.wms.createProduto.useMutation({
    onSuccess: () => {
      toast.success("Produto criado com sucesso!");
      setOpenNovoProduto(false);
      setFormProduto({ codigo: "", descricao: "", unidade: "UN", categoria: "", estoqueMinimo: "", localizacaoPadrao: "" });
      refetchProdutos();
      refetchEstoque();
    },
    onError: (e) => toast.error(e.message),
  });

  const movimentar = trpc.wms.movimentar.useMutation({
    onSuccess: () => {
      toast.success("Movimentação registrada!");
      setOpenMovimentacao(false);
      setFormMov({ produtoId: "", armazemId: "", tipo: "entrada", quantidade: "", observacoes: "" });
      refetchEstoque();
    },
    onError: (e) => toast.error(e.message),
  });

  const totalItens = estoque.length;
  const abaixoMinimo = estoque.filter((e: any) => parseFloat(e.quantidade) <= parseFloat(e.estoqueMinimo ?? "0")).length;
  const totalEntradas = movimentacoes.filter((m: any) => m.tipo === "entrada").length;
  const totalSaidas = movimentacoes.filter((m: any) => m.tipo === "saida").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-primary" />
              WMS — Gestão de Armazém
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Controle de estoque, produtos e movimentações
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={openMovimentacao} onOpenChange={setOpenMovimentacao}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Registrar Movimentação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Produto *</label>
                    <Select value={formMov.produtoId} onValueChange={v => setFormMov(f => ({ ...f, produtoId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {(produtos as any[]).map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.descricao} {p.codigo ? `(${p.codigo})` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Armazém *</label>
                    <Select value={formMov.armazemId} onValueChange={v => setFormMov(f => ({ ...f, armazemId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o armazém" />
                      </SelectTrigger>
                      <SelectContent>
                        {(armazens as any[]).map((a: any) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
                        ))}
                        {(armazens as any[]).length === 0 && (
                          <SelectItem value="1">Armazém Principal</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Tipo *</label>
                      <Select value={formMov.tipo} onValueChange={v => setFormMov(f => ({ ...f, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada</SelectItem>
                          <SelectItem value="saida">Saída</SelectItem>
                          <SelectItem value="ajuste">Ajuste</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="inventario">Inventário</SelectItem>
                          <SelectItem value="devolucao">Devolução</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Quantidade *</label>
                      <Input type="number" placeholder="0" value={formMov.quantidade}
                        onChange={e => setFormMov(f => ({ ...f, quantidade: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Observações</label>
                    <Input placeholder="Observações da movimentação" value={formMov.observacoes}
                      onChange={e => setFormMov(f => ({ ...f, observacoes: e.target.value }))} />
                  </div>
                  <Button className="w-full"
                    disabled={!formMov.produtoId || !formMov.quantidade || movimentar.isPending}
                    onClick={() => movimentar.mutate({
                      produtoId: parseInt(formMov.produtoId),
                      armazemId: formMov.armazemId ? parseInt(formMov.armazemId) : 1,
                      tipo: formMov.tipo as any,
                      quantidade: formMov.quantidade,
                      observacoes: formMov.observacoes || undefined,
                    })}>
                    {movimentar.isPending ? "Registrando..." : "Registrar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openNovoProduto} onOpenChange={setOpenNovoProduto}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Cadastrar Produto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Código *</label>
                      <Input placeholder="SKU-001" value={formProduto.codigo}
                        onChange={e => setFormProduto(f => ({ ...f, codigo: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Unidade</label>
                      <Select value={formProduto.unidade} onValueChange={v => setFormProduto(f => ({ ...f, unidade: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UN">Unidade (UN)</SelectItem>
                          <SelectItem value="KG">Quilograma (KG)</SelectItem>
                          <SelectItem value="L">Litro (L)</SelectItem>
                          <SelectItem value="CX">Caixa (CX)</SelectItem>
                          <SelectItem value="PCT">Pacote (PCT)</SelectItem>
                          <SelectItem value="M">Metro (M)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-sm font-medium">Descrição do Produto *</label>
                      <Input placeholder="Descrição do produto" value={formProduto.descricao}
                        onChange={e => setFormProduto(f => ({ ...f, descricao: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Categoria</label>
                      <Input placeholder="Ex: Eletrônicos" value={formProduto.categoria}
                        onChange={e => setFormProduto(f => ({ ...f, categoria: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Estoque Mínimo</label>
                      <Input type="number" placeholder="0" value={formProduto.estoqueMinimo}
                        onChange={e => setFormProduto(f => ({ ...f, estoqueMinimo: e.target.value }))} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-sm font-medium">Localização Padrão</label>
                      <Input placeholder="Ex: Corredor A, Prateleira 3" value={formProduto.localizacaoPadrao}
                        onChange={e => setFormProduto(f => ({ ...f, localizacaoPadrao: e.target.value }))} />
                    </div>
                  </div>
                  <Button className="w-full"
                    disabled={!formProduto.codigo || !formProduto.descricao || criarProduto.isPending}
                    onClick={() => criarProduto.mutate({
                      codigo: formProduto.codigo,
                      descricao: formProduto.descricao,
                      unidade: formProduto.unidade,
                      categoria: formProduto.categoria || undefined,
                      estoqueMinimo: formProduto.estoqueMinimo || undefined,
                      localizacaoPadrao: formProduto.localizacaoPadrao || undefined,
                    })}>
                    {criarProduto.isPending ? "Criando..." : "Criar Produto"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Itens em Estoque", value: totalItens, icon: Package, color: "text-foreground" },
            { label: "Abaixo do Mínimo", value: abaixoMinimo, icon: AlertTriangle, color: "text-red-600" },
            { label: "Entradas Recentes", value: totalEntradas, icon: TrendingUp, color: "text-green-600" },
            { label: "Saídas Recentes", value: totalSaidas, icon: TrendingDown, color: "text-orange-600" },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="estoque" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Estoque
            </TabsTrigger>
            <TabsTrigger value="produtos" className="gap-2">
              <Package className="h-4 w-4" /> Produtos
            </TabsTrigger>
            <TabsTrigger value="movimentacoes" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" /> Movimentações
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar produto..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <TabsContent value="estoque" className="mt-4 space-y-3">
            {(estoque as any[]).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Estoque vazio</p>
                <p className="text-sm mt-1">Cadastre produtos e registre entradas para começar</p>
              </div>
            ) : (
              (estoque as any[]).map((item: any) => (
                <div key={item.estoqueId} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.descricaoProduto}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.codigoProduto && <span className="text-xs text-muted-foreground">Cód: {item.codigoProduto}</span>}
                          {item.localizacaoCodigo && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {item.localizacaoCodigo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${parseFloat(item.quantidade) <= parseFloat(item.estoqueMinimo ?? "0") ? "text-red-600" : "text-foreground"}`}>
                          {parseFloat(item.quantidade).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{item.unidade}</span>
                        </p>
                        {item.estoqueMinimo && (
                          <p className="text-xs text-muted-foreground">Mín: {item.estoqueMinimo} {item.unidade}</p>
                        )}
                      </div>
                      {parseFloat(item.quantidade) <= parseFloat(item.estoqueMinimo ?? "0") && (
                        <Badge variant="outline" className="text-red-600 border-red-500/20 bg-red-500/10 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Baixo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="produtos" className="mt-4 space-y-3">
            {(produtos as any[]).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum produto cadastrado</p>
                <p className="text-sm mt-1">Clique em "Novo Produto" para começar</p>
              </div>
            ) : (
              (produtos as any[]).map((produto: any) => (
                <div key={produto.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{produto.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">Cód: {produto.codigo}</span>
                          {produto.categoria && <Badge variant="secondary" className="text-xs">{produto.categoria}</Badge>}
                          <span className="text-xs text-muted-foreground">{produto.unidade}</span>
                        </div>
                      </div>
                    </div>
                    {produto.localizacaoPadrao && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {produto.localizacaoPadrao}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="movimentacoes" className="mt-4 space-y-3">
            {(movimentacoes as any[]).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma movimentação registrada</p>
              </div>
            ) : (
              (movimentacoes as any[]).map((mov: any) => (
                <div key={mov.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        mov.tipo === "entrada" || mov.tipo === "devolucao" ? "bg-green-500/10" :
                        mov.tipo === "saida" ? "bg-red-500/10" : "bg-blue-500/10"
                      }`}>
                        {mov.tipo === "entrada" || mov.tipo === "devolucao"
                          ? <TrendingUp className="h-4 w-4 text-green-600" />
                          : mov.tipo === "saida"
                            ? <TrendingDown className="h-4 w-4 text-red-600" />
                            : <RefreshCw className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{mov.descricaoProduto ?? "Produto"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{mov.tipo} {mov.documento ? `· ${mov.documento}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        mov.tipo === "entrada" || mov.tipo === "devolucao" ? "text-green-600" :
                        mov.tipo === "saida" ? "text-red-600" : "text-blue-600"
                      }`}>
                        {mov.tipo === "entrada" || mov.tipo === "devolucao" ? "+" : mov.tipo === "saida" ? "-" : "~"}{mov.quantidade}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(mov.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
