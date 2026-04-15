import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Plus, ShoppingCart, FileText, DollarSign, Search, Package } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_PEDIDO_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700", enviado: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700", em_separacao: "bg-yellow-100 text-yellow-700",
  expedido: "bg-purple-100 text-purple-700", entregue: "bg-emerald-100 text-emerald-700",
  cancelado: "bg-red-100 text-red-700",
};
const STATUS_PROPOSTA_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700", enviada: "bg-blue-100 text-blue-700",
  aprovada: "bg-green-100 text-green-700", rejeitada: "bg-red-100 text-red-700",
  expirada: "bg-orange-100 text-orange-700",
};

function formatCurrency(v: any) {
  if (!v && v !== 0) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Vendas() {
  const [tab, setTab] = useState("pedidos");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showNewPedido, setShowNewPedido] = useState(false);
  const [showNewProposta, setShowNewProposta] = useState(false);

  const dashboard = trpc.vendas.dashboard.useQuery();
  const pedidosQ = trpc.vendas.listPedidos.useQuery({ search, status: statusFilter });
  const propostasQ = trpc.vendas.listPropostas.useQuery({ search, status: statusFilter });

  const createPedido = trpc.vendas.createPedido.useMutation({ onSuccess: () => { pedidosQ.refetch(); dashboard.refetch(); setShowNewPedido(false); toast.success("Pedido criado!"); } });
  const createProposta = trpc.vendas.createProposta.useMutation({ onSuccess: () => { propostasQ.refetch(); dashboard.refetch(); setShowNewProposta(false); toast.success("Proposta criada!"); } });
  const updateStatus = trpc.vendas.updatePedidoStatus.useMutation({ onSuccess: () => { pedidosQ.refetch(); dashboard.refetch(); toast.success("Status atualizado!"); } });

  const [pedidoForm, setPedidoForm] = useState({ clienteNome: "", formaPagamento: "", observacoes: "" });
  const [propostaForm, setPropostaForm] = useState({ titulo: "", valorTotal: "", descricao: "", condicoes: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Vendas</h1><p className="text-muted-foreground">Pedidos, Propostas e Comissões</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Total Pedidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.pedidos?.total ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Valor Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(dashboard.data?.pedidos?.valorTotal)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" />Entregues</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.pedidos?.entregues ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" />Propostas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboard.data?.propostas?.total ?? 0}</div><p className="text-xs text-green-600">{dashboard.data?.propostas?.aprovadas ?? 0} aprovadas</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="pedidos">Pedidos</TabsTrigger><TabsTrigger value="propostas">Propostas</TabsTrigger></TabsList>

        <TabsContent value="pedidos" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar pedidos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="em_separacao">Em Separação</SelectItem><SelectItem value="expedido">Expedido</SelectItem><SelectItem value="entregue">Entregue</SelectItem></SelectContent></Select>
            <Dialog open={showNewPedido} onOpenChange={setShowNewPedido}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Pedido</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createPedido.mutate(pedidoForm); }} className="space-y-3">
                  <div><Label>Cliente *</Label><Input value={pedidoForm.clienteNome} onChange={e => setPedidoForm(p => ({ ...p, clienteNome: e.target.value }))} required /></div>
                  <div><Label>Forma de Pagamento</Label><Input value={pedidoForm.formaPagamento} onChange={e => setPedidoForm(p => ({ ...p, formaPagamento: e.target.value }))} /></div>
                  <div><Label>Observações</Label><Input value={pedidoForm.observacoes} onChange={e => setPedidoForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
                  <Button type="submit" className="w-full" disabled={createPedido.isPending}>Criar Pedido</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>{pedidosQ.data?.map(p => (<TableRow key={p.id}><TableCell className="font-mono text-sm">{p.numero}</TableCell><TableCell className="font-medium">{p.clienteNome}</TableCell><TableCell>{formatCurrency(p.valorTotal)}</TableCell><TableCell><Badge className={STATUS_PEDIDO_COLORS[p.status] || ""}>{p.status.replace("_", " ")}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</TableCell>
              <TableCell>
                <Select value={p.status} onValueChange={v => updateStatus.mutate({ id: p.id, status: v as any })}><SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rascunho">Rascunho</SelectItem><SelectItem value="enviado">Enviado</SelectItem><SelectItem value="aprovado">Aprovado</SelectItem><SelectItem value="em_separacao">Separação</SelectItem><SelectItem value="expedido">Expedido</SelectItem><SelectItem value="entregue">Entregue</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select>
              </TableCell></TableRow>))}</TableBody>
          </Table></Card>
        </TabsContent>

        <TabsContent value="propostas" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar propostas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Dialog open={showNewProposta} onOpenChange={setShowNewProposta}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Proposta</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Nova Proposta</DialogTitle></DialogHeader>
                <form onSubmit={e => { e.preventDefault(); createProposta.mutate(propostaForm); }} className="space-y-3">
                  <div><Label>Título *</Label><Input value={propostaForm.titulo} onChange={e => setPropostaForm(p => ({ ...p, titulo: e.target.value }))} required /></div>
                  <div><Label>Valor Total</Label><Input value={propostaForm.valorTotal} onChange={e => setPropostaForm(p => ({ ...p, valorTotal: e.target.value }))} placeholder="0.00" /></div>
                  <div><Label>Descrição</Label><Input value={propostaForm.descricao} onChange={e => setPropostaForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                  <div><Label>Condições</Label><Input value={propostaForm.condicoes} onChange={e => setPropostaForm(p => ({ ...p, condicoes: e.target.value }))} /></div>
                  <Button type="submit" className="w-full" disabled={createProposta.isPending}>Criar Proposta</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card><Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Título</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
            <TableBody>{propostasQ.data?.map(p => (<TableRow key={p.id}><TableCell className="font-mono text-sm">{p.numero}</TableCell><TableCell className="font-medium">{p.titulo}</TableCell><TableCell>{formatCurrency(p.valorTotal)}</TableCell><TableCell><Badge className={STATUS_PROPOSTA_COLORS[p.status] || ""}>{p.status}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</TableCell></TableRow>))}</TableBody>
          </Table></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
