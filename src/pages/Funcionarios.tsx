import { useTranslation } from 'react-i18next';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Plus, Search, Users, Phone, CreditCard, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";


const FUNCAO_LABELS: Record<string, string> = {
  motorista: "Motorista",
  ajudante: "Ajudante",
  despachante: "Despachante",
  gerente: "Gerente",
  admin: "Administrador",
  outro: "Outro",
};

const CONTRATO_LABELS: Record<string, string> = {
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

function diasParaVencer(date: Date | null | string | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const hoje = new Date();
  const diff = Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function VencimentoBadge({ label, date }: { label: string; date: Date | null | string | undefined }) {
  const dias = diasParaVencer(date);
  if (dias === null) return null;
  if (dias < 0) return <span className="text-xs text-red-600 font-medium">{label}: VENCIDO</span>;
  if (dias <= 30) return <span className="text-xs text-orange-600 font-medium">{label}: {dias}d</span>;
  return null;
}

function FuncionarioCard({ f, onEdit }: { f: any; onEdit: (f: any) => void }) {
  const alertas = [
    diasParaVencer(f.vencimentoCnh) !== null && (diasParaVencer(f.vencimentoCnh) ?? 999) <= 30,
    diasParaVencer(f.vencimentoAso) !== null && (diasParaVencer(f.vencimentoAso) ?? 999) <= 30,
    diasParaVencer(f.vencimentoMopp) !== null && (diasParaVencer(f.vencimentoMopp) ?? 999) <= 30,
  ].filter(Boolean).length;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onEdit(f)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{f.nome}</span>
              {alertas > 0 && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="text-xs bg-gray-100 text-gray-700">{FUNCAO_LABELS[f.funcao] ?? f.funcao}</Badge>
              <Badge className={`text-xs ${CONTRATO_COLORS[f.tipoContrato] ?? "bg-gray-100 text-gray-700"}`}>
                {CONTRATO_LABELS[f.tipoContrato] ?? f.tipoContrato}
              </Badge>
            </div>
            {f.telefone && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{f.telefone}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <VencimentoBadge label="CNH" date={f.vencimentoCnh} />
              <VencimentoBadge label="ASO" date={f.vencimentoAso} />
              <VencimentoBadge label="MOPP" date={f.vencimentoMopp} />
            </div>
          </div>
          <div className="text-right shrink-0">
            {f.tipoContrato === "freelancer" && f.valorDiaria && (
              <div>
                <p className="text-xs text-muted-foreground">Diária</p>
                <p className="font-bold text-sm">
                  {Number(f.valorDiaria).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            )}
            {f.tipoContrato === "freelancer" && f.diaPagamento && (
              <p className="text-xs text-muted-foreground mt-1">Paga dia {f.diaPagamento}</p>
            )}
            {f.cnh && <p className="text-xs text-muted-foreground mt-1">CNH: {f.categoriaCnh ?? ""} {f.cnh}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FuncionarioForm({ initial, onSave, onClose }: {
  initial?: any;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    nome: initial?.nome ?? "",
    cpf: initial?.cpf ?? "",
    telefone: initial?.telefone ?? "",
    email: initial?.email ?? "",
    funcao: initial?.funcao ?? "motorista",
    tipoContrato: initial?.tipoContrato ?? "clt",
    salario: initial?.salario ?? "",
    dataAdmissao: initial?.dataAdmissao ? new Date(initial.dataAdmissao).toISOString().split("T")[0] : "",
    dataFimContrato: initial?.dataFimContrato ? new Date(initial.dataFimContrato).toISOString().split("T")[0] : "",
    valorDiaria: initial?.valorDiaria ?? "",
    valorMensal: initial?.valorMensal ?? "",
    tipoCobranca: initial?.tipoCobranca ?? "diaria",
    diaPagamento: initial?.diaPagamento ?? "",
    cnh: initial?.cnh ?? "",
    categoriaCnh: initial?.categoriaCnh ?? "",
    vencimentoCnh: initial?.vencimentoCnh ? new Date(initial.vencimentoCnh).toISOString().split("T")[0] : "",
    mopp: initial?.mopp ?? false,
    vencimentoMopp: initial?.vencimentoMopp ? new Date(initial.vencimentoMopp).toISOString().split("T")[0] : "",
    vencimentoAso: initial?.vencimentoAso ? new Date(initial.vencimentoAso).toISOString().split("T")[0] : "",
    banco: initial?.banco ?? "",
    chavePix: initial?.chavePix ?? "",
    observacoes: initial?.observacoes ?? "",
  });

  const isFreelancer = form.tipoContrato === "freelancer";
  const isMotoristaOuAjudante = ["motorista", "ajudante"].includes(form.funcao);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      empresaId: EMPRESA_ID,
      nome: form.nome,
      cpf: form.cpf || undefined,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
      funcao: form.funcao,
      tipoContrato: form.tipoContrato,
      salario: form.salario || null,
      dataAdmissao: form.dataAdmissao || null,
      dataFimContrato: form.dataFimContrato || null,
      valorDiaria: isFreelancer ? (form.valorDiaria || null) : null,
      valorMensal: isFreelancer ? (form.valorMensal || null) : null,
      tipoCobranca: isFreelancer ? form.tipoCobranca as any : null,
      diaPagamento: isFreelancer && form.diaPagamento ? Number(form.diaPagamento) : null,
      cnh: form.cnh || undefined,
      categoriaCnh: form.categoriaCnh || undefined,
      vencimentoCnh: form.vencimentoCnh || null,
      mopp: form.mopp,
      vencimentoMopp: form.vencimentoMopp || null,
      vencimentoAso: form.vencimentoAso || null,
      banco: form.banco || undefined,
      chavePix: form.chavePix || undefined,
      observacoes: form.observacoes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Tabs defaultValue="dados">
        <TabsList className="w-full">
          <TabsTrigger value="dados" className="flex-1">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="contrato" className="flex-1">Contrato</TabsTrigger>
          {isMotoristaOuAjudante && <TabsTrigger value="docs" className="flex-1">Documentos</TabsTrigger>}
          <TabsTrigger value="pagamento" className="flex-1">Pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome completo *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contrato" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Função *</Label>
              <Select value={form.funcao} onValueChange={v => setForm(f => ({ ...f, funcao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FUNCAO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Contrato *</Label>
              <Select value={form.tipoContrato} onValueChange={v => setForm(f => ({ ...f, tipoContrato: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRATO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de Admissão</Label>
              <Input type="date" value={form.dataAdmissao} onChange={e => setForm(f => ({ ...f, dataAdmissao: e.target.value }))} />
            </div>
            {!isFreelancer && (
              <div className="space-y-1.5">
                <Label>Salário</Label>
                <Input type="number" value={form.salario} onChange={e => setForm(f => ({ ...f, salario: e.target.value }))} placeholder="0,00" />
              </div>
            )}
          </div>

          {isFreelancer && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800 space-y-3">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Configuração Freelancer</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo de Cobrança</Label>
                  <Select value={form.tipoCobranca} onValueChange={v => setForm(f => ({ ...f, tipoCobranca: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Por Diária</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="por_viagem">Por Viagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Dia de Pagamento</Label>
                  <Input type="number" min="1" max="31" value={form.diaPagamento} onChange={e => setForm(f => ({ ...f, diaPagamento: e.target.value }))} placeholder="Ex: 5" />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor da Diária</Label>
                  <Input type="number" value={form.valorDiaria} onChange={e => setForm(f => ({ ...f, valorDiaria: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor Mensal</Label>
                  <Input type="number" value={form.valorMensal} onChange={e => setForm(f => ({ ...f, valorMensal: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Fim do Contrato</Label>
                  <Input type="date" value={form.dataFimContrato} onChange={e => setForm(f => ({ ...f, dataFimContrato: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {isMotoristaOuAjudante && (
          <TabsContent value="docs" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Número da CNH</Label>
                <Input value={form.cnh} onChange={e => setForm(f => ({ ...f, cnh: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria CNH</Label>
                <Select value={form.categoriaCnh || "none"} onValueChange={v => setForm(f => ({ ...f, categoriaCnh: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {["A", "B", "AB", "C", "D", "E", "AC", "AD", "AE"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento CNH</Label>
                <Input type="date" value={form.vencimentoCnh} onChange={e => setForm(f => ({ ...f, vencimentoCnh: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento ASO</Label>
                <Input type="date" value={form.vencimentoAso} onChange={e => setForm(f => ({ ...f, vencimentoAso: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>MOPP</Label>
                <Select value={form.mopp ? "sim" : "nao"} onValueChange={v => setForm(f => ({ ...f, mopp: v === "sim" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não possui</SelectItem>
                    <SelectItem value="sim">Possui MOPP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.mopp && (
                <div className="space-y-1.5">
                  <Label>Vencimento MOPP</Label>
                  <Input type="date" value={form.vencimentoMopp} onChange={e => setForm(f => ({ ...f, vencimentoMopp: e.target.value }))} />
                </div>
              )}
            </div>
          </TabsContent>
        )}

        <TabsContent value="pagamento" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Banco</Label>
              <Input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} placeholder="Bradesco, Itaú..." />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Chave PIX</Label>
              <Input value={form.chavePix} onChange={e => setForm(f => ({ ...f, chavePix: e.target.value }))} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit">{initial ? "Salvar" : "Cadastrar"}</Button>
      </div>
    </form>
  );
}

export default function Funcionarios() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filterFuncao, setFilterFuncao] = useState("todos");
  const [filterContrato, setFilterContrato] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: lista = [], isLoading } = trpc.funcionarios.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: freelancersPendentes = [] } = trpc.funcionarios.freelancersPendentes.useQuery({ empresaId: EMPRESA_ID });

  const createMut = trpc.funcionarios.create.useMutation({
    onSuccess: () => { utils.funcionarios.list.invalidate(); setOpen(false); toast.success("Funcionário cadastrado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.funcionarios.update.useMutation({
    onSuccess: () => { utils.funcionarios.list.invalidate(); setEditing(null); toast.success("Funcionário atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return lista.filter(f => {
      const matchSearch = !search || f.nome.toLowerCase().includes(search.toLowerCase()) ||
        (f.cpf ?? "").includes(search);
      const matchFuncao = filterFuncao === "todos" || f.funcao === filterFuncao;
      const matchContrato = filterContrato === "todos" || f.tipoContrato === filterContrato;
      return matchSearch && matchFuncao && matchContrato;
    });
  }, [lista, search, filterFuncao, filterContrato]);

  return (
<div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Funcionários</h1>
            <p className="text-sm text-muted-foreground">{lista.length} cadastrados</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Funcionário</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Cadastrar Funcionário</DialogTitle></DialogHeader>
              <FuncionarioForm onSave={d => createMut.mutate(d)} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerta freelancers para pagar */}
        {freelancersPendentes.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>{freelancersPendentes.length} freelancer(s)</strong> com pagamento nos próximos 7 dias:{" "}
              {freelancersPendentes.map(f => f.nome).join(", ")}
            </p>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterFuncao} onValueChange={setFilterFuncao}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as funções</SelectItem>
              {Object.entries(FUNCAO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterContrato} onValueChange={setFilterContrato}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os contratos</SelectItem>
              {Object.entries(CONTRATO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted rounded" /></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum funcionário encontrado</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(f => (
              <FuncionarioCard key={f.id} f={f} onEdit={setEditing} />
            ))}
          </div>
        )}

        {/* Modal edição */}
        <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar — {editing?.nome}</DialogTitle></DialogHeader>
            {editing && (
              <FuncionarioForm
                initial={editing}
                onSave={d => updateMut.mutate({ id: editing.id, ...d })}
                onClose={() => setEditing(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
);
}
