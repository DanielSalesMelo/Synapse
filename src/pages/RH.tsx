import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";

const FUNCAO_LABEL: Record<string, string> = {
  motorista: "Motorista",
  ajudante: "Ajudante",
  despachante: "Despachante",
  operador_logistico: "Operador Logístico",
  financeiro: "Financeiro",
  rh: "RH",
  compras: "Compras",
  estoque: "Estoque",
  comercial: "Comercial",
  manutencao: "Manutenção",
  administrativo: "Administrativo",
  ti: "TI",
  gerente: "Gerente",
  admin: "Administrador",
  outro: "Outro",
};

const CONTRATO_LABEL: Record<string, string> = {
  clt: "CLT",
  freelancer: "Freelancer",
  terceirizado: "Terceirizado",
  estagiario: "Estagiário",
};

const CONTRATO_COLORS: Record<string, string> = {
  clt: "bg-green-100 text-green-700",
  freelancer: "bg-orange-100 text-orange-700",
  terceirizado: "bg-blue-100 text-blue-700",
  estagiario: "bg-purple-100 text-purple-700",
};

function formatCurrency(v: unknown) {
  const value = Number(v ?? 0);
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function daysUntil(date?: string | Date | null) {
  if (!date) return null;
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function documentStatusLabel(days: number | null) {
  if (days === null) return "Sem data";
  if (days < 0) return "Vencido";
  if (days <= 30) return `Vence em ${days} dia(s)`;
  return `Em dia (${days} dias)`;
}

export default function RH() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [showNovoFunc, setShowNovoFunc] = useState(false);
  const [showProcessarFolha, setShowProcessarFolha] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    funcao: "outro",
    tipoContrato: "clt",
    cpf: "",
    rg: "",
    pis: "",
    telefone: "",
    email: "",
    salario: "",
    dataAdmissao: "",
    dataNascimento: "",
    cnh: "",
    vencimentoCnh: "",
    vencimentoAso: "",
    temPlanoSaude: false,
    temValeRefeicao: false,
    temValeTransporte: false,
    valorValeRefeicao: "",
    observacoes: "",
  });
  const [folhaForm, setFolhaForm] = useState(() => {
    const now = new Date();
    return {
      mes: String(now.getMonth() + 1),
      ano: String(now.getFullYear()),
      dataVencimento: new Date(now.getFullYear(), now.getMonth(), 5).toISOString().split("T")[0],
    };
  });

  const dashboardQ = trpc.funcionarios.dashboard.useQuery(
    { empresaId: EMPRESA_ID },
    { enabled: !!EMPRESA_ID },
  ) as any;
  const funcionariosQ = trpc.funcionarios.list.useQuery(
    { empresaId: EMPRESA_ID },
    { enabled: !!EMPRESA_ID },
  ) as any;
  const folhaQ = trpc.funcionarios.folhaResumo.useQuery(
    { empresaId: EMPRESA_ID, limit: 12 },
    { enabled: !!EMPRESA_ID },
  ) as any;
  const beneficiosQ = trpc.funcionarios.beneficiosResumo.useQuery(
    { empresaId: EMPRESA_ID },
    { enabled: !!EMPRESA_ID },
  ) as any;
  const previsaoQ = trpc.funcionarios.previsaoFolha.useQuery(
    { empresaId: EMPRESA_ID },
    { enabled: !!EMPRESA_ID },
  ) as any;

  const utils = trpc.useContext();
  const createFuncionario = trpc.funcionarios.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso.");
      setShowNovoFunc(false);
      setForm({
        nome: "",
        funcao: "outro",
        tipoContrato: "clt",
        cpf: "",
        rg: "",
        pis: "",
        telefone: "",
        email: "",
        salario: "",
        dataAdmissao: "",
        dataNascimento: "",
        cnh: "",
        vencimentoCnh: "",
        vencimentoAso: "",
        temPlanoSaude: false,
        temValeRefeicao: false,
        temValeTransporte: false,
        valorValeRefeicao: "",
        observacoes: "",
      });
      utils.funcionarios.dashboard.invalidate();
      utils.funcionarios.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const lancarFolha = trpc.funcionarios.lancarFolha.useMutation({
    onSuccess: (result) => {
      toast.success(`Folha lançada com ${result.totalRegistros ?? result.totalLancados} lançamento(s), incluindo benefícios e encargos.`);
      setShowProcessarFolha(false);
      utils.funcionarios.folhaResumo.invalidate();
      utils.funcionarios.dashboard.invalidate();
      utils.financeiro?.pagar?.list?.invalidate?.();
      utils.financeiro?.dashboard?.invalidate?.();
    },
    onError: (error) => toast.error(error.message),
  });

  const funcionarios = funcionariosQ.data ?? [];
  const dashboard = dashboardQ.data;
  const folhaResumo = folhaQ.data ?? [];

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return funcionarios;
    return funcionarios.filter((f: any) =>
      [f.nome, f.funcao, f.email, f.cpf].filter(Boolean).some((value: any) =>
        String(value).toLowerCase().includes(term),
      ),
    );
  }, [funcionarios, search]);

  const vencimentos = (dashboard?.vencimentos ?? [])
    .map((f: any) => {
      const diasCnh = daysUntil(f.vencimentoCnh);
      const diasAso = daysUntil(f.vencimentoAso);
      const diasMopp = daysUntil(f.vencimentoMopp);
      const menor = [diasCnh, diasAso, diasMopp].filter((v) => v !== null).sort((a: any, b: any) => a - b)[0] ?? null;
      return { ...f, diasCnh, diasAso, diasMopp, menor };
    })
    .filter((f: any) => f.diasCnh !== null || f.diasAso !== null || f.diasMopp !== null)
    .sort((a: any, b: any) => (a.menor ?? 99999) - (b.menor ?? 99999));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createFuncionario.mutate({
      empresaId: EMPRESA_ID,
      nome: form.nome,
      funcao: form.funcao as any,
      tipoContrato: form.tipoContrato as any,
      cpf: form.cpf || undefined,
      rg: form.rg || undefined,
      pis: form.pis || undefined,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
      salario: form.salario || undefined,
      dataAdmissao: form.dataAdmissao || undefined,
      dataNascimento: form.dataNascimento || undefined,
      cnh: form.cnh || undefined,
      vencimentoCnh: form.vencimentoCnh || undefined,
      vencimentoAso: form.vencimentoAso || undefined,
      temPlanoSaude: form.temPlanoSaude,
      temValeRefeicao: form.temValeRefeicao,
      temValeTransporte: form.temValeTransporte,
      valorValeRefeicao: form.valorValeRefeicao || undefined,
      observacoes: form.observacoes || undefined,
    });
  };

  const handleLancarFolha = (e: React.FormEvent) => {
    e.preventDefault();
    lancarFolha.mutate({
      empresaId: EMPRESA_ID,
      mes: Number(folhaForm.mes),
      ano: Number(folhaForm.ano),
      dataVencimento: folhaForm.dataVencimento,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Recursos Humanos
          </h1>
          <p className="text-muted-foreground text-sm">Colaboradores, vencimentos documentais e folha integrada ao financeiro.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showProcessarFolha} onOpenChange={setShowProcessarFolha}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Processar Folha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Processar Folha</DialogTitle></DialogHeader>
              <form onSubmit={handleLancarFolha} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mês *</Label>
                    <Input type="number" min="1" max="12" value={folhaForm.mes} onChange={(e) => setFolhaForm((p) => ({ ...p, mes: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ano *</Label>
                    <Input type="number" min="2020" value={folhaForm.ano} onChange={(e) => setFolhaForm((p) => ({ ...p, ano: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vencimento *</Label>
                    <Input type="date" value={folhaForm.dataVencimento} onChange={(e) => setFolhaForm((p) => ({ ...p, dataVencimento: e.target.value }))} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={lancarFolha.isPending}>
                  {lancarFolha.isPending ? "Processando..." : "Gerar contas da folha"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showNovoFunc} onOpenChange={setShowNovoFunc}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Cadastrar Colaborador</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Nome completo *</Label>
                    <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Função *</Label>
                    <Select value={form.funcao} onValueChange={(value) => setForm((p) => ({ ...p, funcao: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FUNCAO_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contrato *</Label>
                    <Select value={form.tipoContrato} onValueChange={(value) => setForm((p) => ({ ...p, tipoContrato: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTRATO_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>RG</Label>
                    <Input value={form.rg} onChange={(e) => setForm((p) => ({ ...p, rg: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>PIS</Label>
                    <Input value={form.pis} onChange={(e) => setForm((p) => ({ ...p, pis: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Salário base</Label>
                    <Input type="number" step="0.01" value={form.salario} onChange={(e) => setForm((p) => ({ ...p, salario: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Admissão</Label>
                    <Input type="date" value={form.dataAdmissao} onChange={(e) => setForm((p) => ({ ...p, dataAdmissao: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nascimento</Label>
                    <Input type="date" value={form.dataNascimento} onChange={(e) => setForm((p) => ({ ...p, dataNascimento: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CNH</Label>
                    <Input value={form.cnh} onChange={(e) => setForm((p) => ({ ...p, cnh: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vencimento CNH</Label>
                    <Input type="date" value={form.vencimentoCnh} onChange={(e) => setForm((p) => ({ ...p, vencimentoCnh: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vencimento ASO</Label>
                    <Input type="date" value={form.vencimentoAso} onChange={(e) => setForm((p) => ({ ...p, vencimentoAso: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Plano de Saúde</Label>
                    <Select value={form.temPlanoSaude ? "sim" : "nao"} onValueChange={(value) => setForm((p) => ({ ...p, temPlanoSaude: value === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vale Transporte</Label>
                    <Select value={form.temValeTransporte ? "sim" : "nao"} onValueChange={(value) => setForm((p) => ({ ...p, temValeTransporte: value === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vale Refeição</Label>
                    <Select value={form.temValeRefeicao ? "sim" : "nao"} onValueChange={(value) => setForm((p) => ({ ...p, temValeRefeicao: value === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor Vale Refeição</Label>
                    <Input type="number" step="0.01" value={form.valorValeRefeicao} onChange={(e) => setForm((p) => ({ ...p, valorValeRefeicao: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Observações</Label>
                    <Textarea rows={3} value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createFuncionario.isPending}>
                  {createFuncionario.isPending ? "Salvando..." : "Cadastrar colaborador"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Colaboradores Ativos</p>
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold">{dashboard?.ativos ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{dashboard?.inativos ?? 0} inativos</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Folha Base Ativa</p>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(dashboard?.folhaAtiva)}</p>
            <p className="text-xs text-muted-foreground mt-1">Salários atuais cadastrados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Alertas Documentais</p>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold">{dashboard?.alertasDocumentos ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">CNH, ASO ou MOPP em atenção</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Bloqueio Operacional</p>
              <ShieldAlert className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold">{dashboard?.bloqueadosOperacionalmente ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Motoristas ou ajudantes com documento vencido</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Plano de Saúde</p>
            <p className="text-2xl font-bold">{beneficiosQ.data?.planoSaude ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Colaboradores cobertos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Vale Refeição</p>
            <p className="text-2xl font-bold">{beneficiosQ.data?.valeRefeicao ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(beneficiosQ.data?.totalValeRefeicao)} por ciclo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Vale Transporte</p>
            <p className="text-2xl font-bold">{beneficiosQ.data?.valeTransporte ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Benefício ativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Custo estimado</p>
            <p className="text-2xl font-bold">{formatCurrency(previsaoQ.data?.custoTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">Folha + benefícios + encargos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="folha">Folha</TabsTrigger>
          <TabsTrigger value="vencimentos">Vencimentos</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribuição por Função</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(dashboard?.distribuicaoFuncao ?? []).map((item: any) => (
                  <div key={item.funcao} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{FUNCAO_LABEL[item.funcao] ?? item.funcao}</p>
                      <p className="text-xs text-muted-foreground">Equipe operacional e administrativa</p>
                    </div>
                    <Badge variant="secondary">{item.total}</Badge>
                  </div>
                ))}
                {(dashboard?.distribuicaoFuncao ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Resumo da Operação</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="text-sm">Motoristas</span>
                  <span className="font-semibold">{dashboard?.motoristas ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="text-sm">Ajudantes</span>
                  <span className="font-semibold">{dashboard?.ajudantes ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="text-sm">Folha base ativa</span>
                  <span className="font-semibold">{formatCurrency(dashboard?.folhaAtiva)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="text-sm">Documentos em alerta</span>
                  <span className="font-semibold text-orange-600">{dashboard?.alertasDocumentos ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="colaboradores" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, função, e-mail ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Card>
            <div className="md:hidden space-y-3 p-4">
              {filtrados.map((f: any) => (
                <div key={f.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{f.nome}</p>
                      <p className="text-xs text-muted-foreground">{FUNCAO_LABEL[f.funcao] ?? f.funcao}</p>
                    </div>
                    <Badge variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`text-xs ${CONTRATO_COLORS[f.tipoContrato] ?? "bg-gray-100 text-gray-700"}`}>
                      {CONTRATO_LABEL[f.tipoContrato] ?? f.tipoContrato}
                    </Badge>
                    {f.temPlanoSaude && <Badge variant="outline">Plano</Badge>}
                    {f.temValeRefeicao && <Badge variant="outline">VR</Badge>}
                    {f.temValeTransporte && <Badge variant="outline">VT</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-muted-foreground">Salário</p><p>{f.salario ? formatCurrency(f.salario) : "—"}</p></div>
                    <div><p className="text-muted-foreground">Admissão</p><p>{f.dataAdmissao ? new Date(f.dataAdmissao).toLocaleDateString("pt-BR") : "—"}</p></div>
                    <div className="col-span-2"><p className="text-muted-foreground">Contato</p><p>{f.telefone || f.email || "—"}</p></div>
                  </div>
                </div>
              ))}
              {filtrados.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum colaborador cadastrado.</p>}
            </div>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>{FUNCAO_LABEL[f.funcao] ?? f.funcao}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${CONTRATO_COLORS[f.tipoContrato] ?? "bg-gray-100 text-gray-700"}`}>
                        {CONTRATO_LABEL[f.tipoContrato] ?? f.tipoContrato}
                      </Badge>
                    </TableCell>
                    <TableCell>{f.salario ? formatCurrency(f.salario) : "—"}</TableCell>
                    <TableCell>{f.dataAdmissao ? new Date(f.dataAdmissao).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.telefone || f.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum colaborador cadastrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="folha" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Histórico real de lançamentos de salário integrados ao financeiro.</p>
            <Button size="sm" onClick={() => setShowProcessarFolha(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Processar Folha
            </Button>
          </div>
          <Card>
            <div className="md:hidden space-y-3 p-4">
              {folhaResumo.map((item: any) => (
                <div key={item.referencia} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.competencia}</p>
                    <Badge variant={Number(item.pendentes) > 0 ? "secondary" : "default"}>
                      {Number(item.pendentes) > 0 ? "Em aberto" : "Quitado"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-muted-foreground">Funcionários</p><p>{item.funcionarios}</p></div>
                    <div><p className="text-muted-foreground">Pagos</p><p>{item.pagos}</p></div>
                    <div><p className="text-muted-foreground">Pendentes</p><p>{item.pendentes}</p></div>
                    <div><p className="text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(item.totalBruto)}</p></div>
                  </div>
                </div>
              ))}
              {folhaResumo.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma folha processada ainda.</p>}
            </div>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Funcionários</TableHead>
                  <TableHead>Total Bruto</TableHead>
                  <TableHead>Pagos</TableHead>
                  <TableHead>Pendentes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folhaResumo.map((item: any) => (
                  <TableRow key={item.referencia}>
                    <TableCell className="font-medium">{item.competencia}</TableCell>
                    <TableCell>{item.funcionarios}</TableCell>
                    <TableCell>{formatCurrency(item.totalBruto)}</TableCell>
                    <TableCell>{item.pagos}</TableCell>
                    <TableCell>{item.pendentes}</TableCell>
                    <TableCell>
                      <Badge variant={Number(item.pendentes) > 0 ? "secondary" : "default"}>
                        {Number(item.pendentes) > 0 ? "Em aberto" : "Quitado"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {folhaResumo.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma folha processada ainda.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="vencimentos" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Vencimentos de documentos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="md:hidden space-y-3 p-4">
                {vencimentos.map((f: any) => {
                  const bloqueado = [f.diasCnh, f.diasAso, f.diasMopp].some((days: number | null) => days !== null && days < 0);
                  const atencao = !bloqueado && [f.diasCnh, f.diasAso, f.diasMopp].some((days: number | null) => days !== null && days <= 30);
                  return (
                    <div key={f.id} className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{f.nome}</p>
                          <p className="text-xs text-muted-foreground">{FUNCAO_LABEL[f.funcao] ?? f.funcao}</p>
                        </div>
                        <Badge className={bloqueado ? "bg-red-100 text-red-700" : atencao ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
                          {bloqueado ? "Bloqueado" : atencao ? "Atenção" : "Apto"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        <p>CNH: {documentStatusLabel(f.diasCnh)}</p>
                        <p>ASO: {documentStatusLabel(f.diasAso)}</p>
                        <p>MOPP: {documentStatusLabel(f.diasMopp)}</p>
                      </div>
                    </div>
                  );
                })}
                {vencimentos.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum vencimento documental cadastrado.</p>}
              </div>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>CNH</TableHead>
                    <TableHead>ASO</TableHead>
                    <TableHead>MOPP</TableHead>
                    <TableHead>Operacional</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vencimentos.map((f: any) => {
                    const bloqueado = [f.diasCnh, f.diasAso, f.diasMopp].some((days: number | null) => days !== null && days < 0);
                    const atencao = !bloqueado && [f.diasCnh, f.diasAso, f.diasMopp].some((days: number | null) => days !== null && days <= 30);
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.nome}</TableCell>
                        <TableCell>{FUNCAO_LABEL[f.funcao] ?? f.funcao}</TableCell>
                        <TableCell>{documentStatusLabel(f.diasCnh)}</TableCell>
                        <TableCell>{documentStatusLabel(f.diasAso)}</TableCell>
                        <TableCell>{documentStatusLabel(f.diasMopp)}</TableCell>
                        <TableCell>
                          <Badge className={bloqueado ? "bg-red-100 text-red-700" : atencao ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
                            {bloqueado ? "Bloqueado" : atencao ? "Atenção" : "Apto"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {vencimentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum vencimento documental cadastrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacional" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">Motoristas ativos</p>
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">{dashboard?.motoristas ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">Ajudantes ativos</p>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <p className="text-2xl font-bold">{dashboard?.ajudantes ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground font-medium">Prontos para operação</p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold">
                  {Math.max((dashboard?.motoristas ?? 0) + (dashboard?.ajudantes ?? 0) - (dashboard?.bloqueadosOperacionalmente ?? 0), 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Integração com logística</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Motoristas cadastrados aqui já ficam disponíveis para os módulos operacionais e de viagens.
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Ajudantes cadastrados aqui já entram na base operacional da logística.
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-orange-600" />
                Documentos vencidos geram bloqueio operacional visual nesta tela para evitar escala indevida.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
