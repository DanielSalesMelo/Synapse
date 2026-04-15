
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Search, AlertTriangle, CheckCircle, Clock, ExternalLink, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;

const TIPO_DOC_LABELS: Record<string, string> = {
  cnh: "CNH (Motorista)",
  crlv: "CRLV (Veículo)",
  aso: "ASO (Saúde)",
  mopp: "MOPP (Especial)",
  nota_fiscais: "Nota Fiscal",
  seguro: "Seguro",
  licenciamento: "Licenciamento",
  contrato: "Contrato",
  outro: "Outro",
};

function getDiasRestantes(vencimento: string | null): number | null {
  if (!vencimento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento);
  venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function StatusBadge({ vencimento }: { vencimento: string | null }) {
  const dias = getDiasRestantes(vencimento);
  if (dias === null) return <Badge variant="outline">Sem vencimento</Badge>;
  if (dias < 0) return <Badge className="bg-red-100 text-red-700 border border-red-300">Vencido ({Math.abs(dias)}d)</Badge>;
  if (dias <= 30) return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300">Vence em {dias}d</Badge>;
  return <Badge className="bg-green-100 text-green-700 border border-green-300">Em dia</Badge>;
}

export default function DocumentacaoFrota() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [form, setForm] = useState({
    tipo: "outro",
    nome: "",
    url: "",
    veiculoId: "",
    funcionarioId: "",
    dataVencimento: "",
    observacoes: "",
  });

  const utils = trpc.useUtils();
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: funcionarios = [] } = trpc.funcionarios.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: documentos = [], isLoading } = trpc.documentos.list.useQuery({ empresaId: EMPRESA_ID });

  const createMut = trpc.documentos.create.useMutation({
    onSuccess: () => {
      utils.documentos.list.invalidate();
      setModalOpen(false);
      toast.success("Documento registrado com sucesso!");
      setForm({ tipo: "outro", nome: "", url: "", veiculoId: "", funcionarioId: "", dataVencimento: "", observacoes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.documentos.softDelete.useMutation({
    onSuccess: () => {
      utils.documentos.list.invalidate();
      toast.success("Documento removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const docsFiltrados = useMemo(() => {
    return documentos.filter((d: any) => {
      const matchBusca = !busca || 
        d.nome.toLowerCase().includes(busca.toLowerCase()) ||
        TIPO_DOC_LABELS[d.tipo]?.toLowerCase().includes(busca.toLowerCase());
      
      if (!matchBusca) return false;
      if (filtroStatus === "todos") return true;
      
      const dias = getDiasRestantes(d.dataVencimento);
      if (filtroStatus === "vencido") return dias !== null && dias < 0;
      if (filtroStatus === "avencer") return dias !== null && dias >= 0 && dias <= 30;
      if (filtroStatus === "emdia") return dias === null || dias > 30;
      
      return true;
    });
  }, [documentos, busca, filtroStatus]);

  const stats = useMemo(() => {
    const res = { vencidos: 0, aVencer30: 0, emDia: 0 };
    documentos.forEach((d: any) => {
      const dias = getDiasRestantes(d.dataVencimento);
      if (dias !== null && dias < 0) res.vencidos++;
      else if (dias !== null && dias <= 30) res.aVencer30++;
      else res.emDia++;
    });
    return res;
  }, [documentos]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Gestão de Documentos (GED)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Controle centralizado de CRLV, CNH, Seguros e Notas</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Documento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload de Documento</DialogTitle>
            </DialogHeader>
            <form className="space-y-4 mt-2" onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate({
                ...form,
                empresaId: EMPRESA_ID,
                veiculoId: form.veiculoId ? parseInt(form.veiculoId) : null,
                funcionarioId: form.funcionarioId ? parseInt(form.funcionarioId) : null,
                dataVencimento: form.dataVencimento || null,
                tipo: form.tipo as any,
              });
            }}>
              <div className="space-y-1.5">
                <Label>Nome do Documento *</Label>
                <Input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: CRLV Caminhão 01" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_DOC_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Vencimento</Label>
                  <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>URL do Arquivo (S3/Link) *</Label>
                <div className="flex gap-2">
                  <Input required value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
                  <Button type="button" variant="outline" size="icon" title="Simular Upload"><Upload className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Vincular Veículo</Label>
                  <Select value={form.veiculoId} onValueChange={v => setForm(f => ({ ...f, veiculoId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {veiculos.map((v: any) => <SelectItem key={v.id} value={String(v.id)}>{v.placa}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Vincular Funcionário</Label>
                  <Select value={form.funcionarioId} onValueChange={v => setForm(f => ({ ...f, funcionarioId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {funcionarios.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMut.isPending}>Salvar Documento</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-100 bg-red-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Vencidos</p>
              <p className="text-2xl font-bold text-red-700">{stats.vencidos}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-100 bg-yellow-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-6 w-6 text-yellow-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Vencem em 30 dias</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.aVencer30}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-100 bg-green-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-6 w-6 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Em Dia</p>
              <p className="text-2xl font-bold text-green-700">{stats.emDia}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar documentos..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="avencer">A vencer (30d)</SelectItem>
            <SelectItem value="emdia">Em dia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docsFiltrados.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {d.nome}
                    </div>
                  </TableCell>
                  <TableCell>{TIPO_DOC_LABELS[d.tipo] || d.tipo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.veiculoId ? `Veículo: ${veiculos.find((v: any) => v.id === d.veiculoId)?.placa || '...'}` : 
                     d.funcionarioId ? `Func.: ${funcionarios.find((f: any) => f.id === d.funcionarioId)?.nome || '...'}` : 
                     'Geral'}
                  </TableCell>
                  <TableCell>{d.dataVencimento ? new Date(d.dataVencimento).toLocaleDateString('pt-BR') : '—'}</TableCell>
                  <TableCell><StatusBadge vencimento={d.dataVencimento} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild title="Ver Arquivo">
                        <a href={d.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                        if(confirm("Excluir este documento?")) deleteMut.mutate({ id: d.id });
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {docsFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
