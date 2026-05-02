import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Crown, Building2, Users, Shield, Settings, Plus, Activity,
  Eye, RefreshCw, Copy, CheckCircle, Key, CreditCard,
  Package, Calendar, AlertTriangle, DollarSign,
  Clock, Star, Check, X, Edit2, Ban,
  RotateCcw, Receipt, Wallet, Megaphone, GraduationCap, HeartPulse, FolderKanban, NotebookPen, ListTodo,
  Briefcase, Store, MessageCircleMore, CalendarRange, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Aba = "workspace" | "visao-geral" | "empresas" | "licencas" | "cobrancas" | "planos" | "config";

const TAB_ROUTE_MAP: Record<Aba, string> = {
  workspace: "/master/painel",
  "visao-geral": "/master/painel",
  empresas: "/master/empresas",
  licencas: "/master/licencas",
  cobrancas: "/master/cobrancas",
  planos: "/master/planos",
  config: "/master/config",
};

function resolveMasterTab(path: string): Aba {
  if (path.startsWith("/master/empresas")) return "empresas";
  if (path.startsWith("/master/licencas")) return "licencas";
  if (path.startsWith("/master/cobrancas")) return "cobrancas";
  if (path.startsWith("/master/planos")) return "planos";
  if (path.startsWith("/master/config")) return "config";
  if (path.startsWith("/master/visao-geral")) return "visao-geral";
  return "workspace";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PLANO_CORES: Record<string, string> = {
  trial:      "bg-slate-100 text-slate-700 border-slate-300",
  basico:     "bg-blue-100 text-blue-700 border-blue-300",
  pro:        "bg-purple-100 text-purple-700 border-purple-300",
  enterprise: "bg-amber-100 text-amber-700 border-amber-300",
};
const STATUS_CORES: Record<string, string> = {
  trial:     "bg-sky-100 text-sky-700",
  ativa:     "bg-green-100 text-green-700",
  suspensa:  "bg-orange-100 text-orange-700",
  vencida:   "bg-red-100 text-red-700",
  cancelada: "bg-gray-100 text-gray-500",
};
const STATUS_COB_CORES: Record<string, string> = {
  pendente:  "bg-yellow-100 text-yellow-700",
  pago:      "bg-green-100 text-green-700",
  vencido:   "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
  estornado: "bg-purple-100 text-purple-700",
};
const PLANO_LABELS: Record<string, string> = { trial: "Trial", basico: "Básico", pro: "Pro", enterprise: "Enterprise" };
const STATUS_LABELS: Record<string, string> = { trial: "Trial", ativa: "Ativa", suspensa: "Suspensa", vencida: "Vencida", cancelada: "Cancelada" };
const CICLO_LABELS: Record<string, string> = { mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };
const FP_LABELS: Record<string, string> = { pix: "PIX", boleto: "Boleto", cartao_credito: "Cartão de Crédito", transferencia: "Transferência", cortesia: "Cortesia" };

function fmtData(d: any) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function fmtMoeda(v: any) {
  if (!v && v !== 0) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function diasRestantes(d: any): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function PlanoBadge({ plano }: { plano: string }) {
  return <Badge className={`text-xs border ${PLANO_CORES[plano] ?? "bg-gray-100 text-gray-600"}`}>{PLANO_LABELS[plano] ?? plano}</Badge>;
}
function StatusBadge({ status }: { status: string }) {
  return <Badge className={`text-xs ${STATUS_CORES[status] ?? "bg-gray-100 text-gray-600"}`}>{STATUS_LABELS[status] ?? status}</Badge>;
}

// ─── Modal: Criar Licença ─────────────────────────────────────────────────────
function ModalLicenca({ empresas, onClose, refetch }: { empresas: any[]; onClose: () => void; refetch: () => void }) {
  const [form, setForm] = useState({
    empresaId: "",
    planoCod: "trial" as "trial" | "basico" | "pro" | "enterprise",
    ciclo: "mensal" as "mensal" | "trimestral" | "semestral" | "anual",
    valorContratado: "",
    descontoPercent: "0",
    diasTrial: "14",
    observacoes: "",
  });

  const criarMut = trpc.licenciamento.criarLicenca.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem); refetch(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const ativarMut = trpc.licenciamento.ativarPlano.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem); refetch(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const salvar = () => {
    if (!form.empresaId) return toast.error("Selecione uma empresa");
    if (form.planoCod === "trial") {
      criarMut.mutate({ empresaId: Number(form.empresaId), planoCod: "trial", ciclo: form.ciclo, diasTrial: Number(form.diasTrial), observacoes: form.observacoes || undefined });
    } else {
      if (!form.valorContratado) return toast.error("Informe o valor contratado");
      ativarMut.mutate({ empresaId: Number(form.empresaId), planoCod: form.planoCod, ciclo: form.ciclo, valorContratado: form.valorContratado, descontoPercent: form.descontoPercent || undefined, observacoes: form.observacoes || undefined });
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-purple-500" /> Nova Licença</DialogTitle></DialogHeader>
      <div className="space-y-4 pt-2">
        <div>
          <Label>Empresa *</Label>
          <Select value={form.empresaId} onValueChange={v => setForm(f => ({ ...f, empresaId: v }))}>
            <SelectTrigger><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
            <SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Plano *</Label>
            <Select value={form.planoCod} onValueChange={v => setForm(f => ({ ...f, planoCod: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">🧪 Trial (Gratuito)</SelectItem>
                <SelectItem value="basico">🔵 Básico — R$ 199/mês</SelectItem>
                <SelectItem value="pro">🟣 Pro — R$ 449/mês</SelectItem>
                <SelectItem value="enterprise">🟡 Enterprise — Sob consulta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ciclo de Cobrança</Label>
            <Select value={form.ciclo} onValueChange={v => setForm(f => ({ ...f, ciclo: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="semestral">Semestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.planoCod === "trial" ? (
          <div><Label>Dias de Trial</Label><Input type="number" value={form.diasTrial} onChange={e => setForm(f => ({ ...f, diasTrial: e.target.value }))} min={1} max={90} /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor Contratado (R$) *</Label><Input placeholder="Ex: 449.00" value={form.valorContratado} onChange={e => setForm(f => ({ ...f, valorContratado: e.target.value }))} /></div>
            <div><Label>Desconto (%)</Label><Input placeholder="0" value={form.descontoPercent} onChange={e => setForm(f => ({ ...f, descontoPercent: e.target.value }))} /></div>
          </div>
        )}
        <div><Label>Observações</Label><Textarea rows={2} placeholder="Notas internas..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={criarMut.isPending || ativarMut.isPending}>
            {criarMut.isPending || ativarMut.isPending ? "Salvando..." : "Criar Licença"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Modal: Registrar Cobrança ────────────────────────────────────────────────
function ModalCobranca({ empresas, licencas, onClose, refetch }: { empresas: any[]; licencas: any[]; onClose: () => void; refetch: () => void }) {
  const hoje = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ empresaId: "", planoCod: "basico" as any, ciclo: "mensal" as any, periodoInicio: hoje, periodoFim: "", valorBruto: "", desconto: "0", valorLiquido: "", dataVencimento: "", formaPagamento: "" as any, observacoes: "" });

  const criarMut = trpc.licenciamento.criarCobranca.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem); refetch(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!form.empresaId) return;
    const lic = licencas.find((l: any) => l.licenca.empresaId === Number(form.empresaId));
    if (lic) setForm(f => ({ ...f, planoCod: lic.licenca.planoCod, ciclo: lic.licenca.ciclo ?? "mensal" }));
  }, [form.empresaId]);

  useEffect(() => {
    const bruto = parseFloat(form.valorBruto) || 0;
    const desc = parseFloat(form.desconto) || 0;
    setForm(f => ({ ...f, valorLiquido: (bruto - desc).toFixed(2) }));
  }, [form.valorBruto, form.desconto]);

  const salvar = () => {
    if (!form.empresaId || !form.valorBruto || !form.dataVencimento || !form.periodoFim) return toast.error("Preencha todos os campos obrigatórios");
    criarMut.mutate({ ...form, empresaId: Number(form.empresaId), desconto: form.desconto || "0", formaPagamento: form.formaPagamento || undefined });
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="w-5 h-5 text-green-500" /> Nova Cobrança</DialogTitle></DialogHeader>
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Empresa *</Label>
            <Select value={form.empresaId} onValueChange={v => setForm(f => ({ ...f, empresaId: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plano</Label>
            <Select value={form.planoCod} onValueChange={v => setForm(f => ({ ...f, planoCod: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Período Início *</Label><Input type="date" value={form.periodoInicio} onChange={e => setForm(f => ({ ...f, periodoInicio: e.target.value }))} /></div>
          <div><Label>Período Fim *</Label><Input type="date" value={form.periodoFim} onChange={e => setForm(f => ({ ...f, periodoFim: e.target.value }))} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Valor Bruto (R$) *</Label><Input placeholder="449.00" value={form.valorBruto} onChange={e => setForm(f => ({ ...f, valorBruto: e.target.value }))} /></div>
          <div><Label>Desconto (R$)</Label><Input placeholder="0.00" value={form.desconto} onChange={e => setForm(f => ({ ...f, desconto: e.target.value }))} /></div>
          <div><Label>Valor Líquido</Label><Input readOnly value={form.valorLiquido} className="bg-muted" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Vencimento *</Label><Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} /></div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="cortesia">Cortesia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={criarMut.isPending}>{criarMut.isPending ? "Salvando..." : "Registrar Cobrança"}</Button>
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Modal: Atualizar Licença ─────────────────────────────────────────────────
function ModalAtualizarLicenca({ licenca, onClose, onSave, loading }: any) {
  const [form, setForm] = useState({
    planoCod: licenca.planoCod,
    status: licenca.status,
    ciclo: licenca.ciclo ?? "mensal",
    valorContratado: licenca.valorContratado ?? "",
    descontoPercent: licenca.descontoPercent ?? "0",
    dataFim: licenca.dataFim ? new Date(licenca.dataFim).toISOString().split("T")[0] : "",
    dataTrialFim: licenca.dataTrialFim ? new Date(licenca.dataTrialFim).toISOString().split("T")[0] : "",
    motivoSuspensao: licenca.motivoSuspensao ?? "",
    observacoes: licenca.observacoes ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-background rounded-2xl border shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit2 className="w-5 h-5 text-blue-500" /> Editar Licença</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plano</Label>
              <Select value={form.planoCod} onValueChange={v => setForm(f => ({ ...f, planoCod: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valor Contratado (R$)</Label><Input value={form.valorContratado} onChange={e => setForm(f => ({ ...f, valorContratado: e.target.value }))} /></div>
            <div><Label>Desconto (%)</Label><Input value={form.descontoPercent} onChange={e => setForm(f => ({ ...f, descontoPercent: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data Fim</Label><Input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} /></div>
            <div><Label>Fim do Trial</Label><Input type="date" value={form.dataTrialFim} onChange={e => setForm(f => ({ ...f, dataTrialFim: e.target.value }))} /></div>
          </div>
          {form.status === "suspensa" && <div><Label>Motivo da Suspensão</Label><Input value={form.motivoSuspensao} onChange={e => setForm(f => ({ ...f, motivoSuspensao: e.target.value }))} /></div>}
          <div><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Registrar Pagamento ───────────────────────────────────────────────
function ModalRegistrarPagamento({ cobranca, onClose, onSave, loading }: any) {
  const [form, setForm] = useState({ formaPagamento: "pix" as any, comprovante: "", observacoes: "", renovarLicenca: true });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-background rounded-2xl border shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Registrar Pagamento</h2>
        <p className="text-sm text-muted-foreground mb-4">Valor: <strong>{fmtMoeda(cobranca.valorLiquido)}</strong></p>
        <div className="space-y-3">
          <div>
            <Label>Forma de Pagamento *</Label>
            <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="cortesia">Cortesia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Comprovante / Código</Label><Input placeholder="ID da transação, código PIX..." value={form.comprovante} onChange={e => setForm(f => ({ ...f, comprovante: e.target.value }))} /></div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.renovarLicenca} onChange={e => setForm(f => ({ ...f, renovarLicenca: e.target.checked }))} className="rounded" />
            Renovar licença automaticamente após pagamento
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => onSave(form)} disabled={loading}>
              {loading ? "Registrando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PlanoCard ────────────────────────────────────────────────────────────────
function PlanoCard({ plano, meta, onSave }: { plano: any; meta: any; onSave: (u: any) => void }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    precoMensal: plano?.precoMensal ?? "0",
    precoTrimestral: plano?.precoTrimestral ?? "",
    precoSemestral: plano?.precoSemestral ?? "",
    precoAnual: plano?.precoAnual ?? "",
    limiteUsuarios: plano?.limiteUsuarios ?? 5,
    limiteVeiculos: plano?.limiteVeiculos ?? 10,
    limiteMotoristas: plano?.limiteMotoristas ?? 10,
    diasTrial: plano?.diasTrial ?? 14,
  });

  if (!plano) return (
    <Card className={`border-2 ${meta.cor} ${meta.bg}`}>
      <CardContent className="pt-6 text-center text-sm text-muted-foreground">
        <p className="text-2xl mb-2">{meta.icon}</p>
        <p className="font-medium">{meta.nome}</p>
        <p className="text-xs mt-2 text-orange-600">Reinicie o servidor para criar os planos padrão</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className={`border-2 ${meta.cor} ${meta.bg}`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <p className="font-bold">{meta.nome}</p>
              <p className="text-xs text-muted-foreground">{meta.desc}</p>
            </div>
          </div>
          <button onClick={() => setEditando(!editando)} className="text-muted-foreground hover:text-foreground transition-colors">
            {editando ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>

        {!editando ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Mensal</span><span className="font-semibold">{fmtMoeda(plano.precoMensal)}</span></div>
            {plano.precoTrimestral && <div className="flex justify-between"><span className="text-muted-foreground">Trimestral</span><span className="font-semibold">{fmtMoeda(plano.precoTrimestral)}</span></div>}
            {plano.precoSemestral && <div className="flex justify-between"><span className="text-muted-foreground">Semestral</span><span className="font-semibold">{fmtMoeda(plano.precoSemestral)}</span></div>}
            {plano.precoAnual && <div className="flex justify-between"><span className="text-muted-foreground">Anual</span><span className="font-semibold">{fmtMoeda(plano.precoAnual)}</span></div>}
            <hr className="my-2" />
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Usuários</span><span>{plano.limiteUsuarios >= 9999 ? "∞" : plano.limiteUsuarios}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Veículos</span><span>{plano.limiteVeiculos >= 9999 ? "∞" : plano.limiteVeiculos}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Motoristas</span><span>{plano.limiteMotoristas >= 9999 ? "∞" : plano.limiteMotoristas}</span></div>
            {meta.codigo === "trial" && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Dias Trial</span><span>{plano.diasTrial}d</span></div>}
            <hr className="my-2" />
            <div className="space-y-1 text-xs">
              {[
                { k: "temIntegracaoArquivei", l: "Arquivei" },
                { k: "temIntegracaoWinthor", l: "Winthor" },
                { k: "temRelatoriosAvancados", l: "Relatórios Avançados" },
                { k: "temMultiEmpresa", l: "Multi-Empresa" },
                { k: "temSuportePrioritario", l: "Suporte Prioritário" },
              ].map(f => (
                <div key={f.k} className="flex items-center gap-1.5">
                  {plano[f.k] ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-muted-foreground/40" />}
                  <span className={plano[f.k] ? "text-foreground" : "text-muted-foreground/60"}>{f.l}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div><Label className="text-xs">Preço Mensal (R$)</Label><Input size={1} value={form.precoMensal} onChange={e => setForm(f => ({ ...f, precoMensal: e.target.value }))} /></div>
            <div><Label className="text-xs">Trimestral (R$)</Label><Input size={1} value={form.precoTrimestral} onChange={e => setForm(f => ({ ...f, precoTrimestral: e.target.value }))} /></div>
            <div><Label className="text-xs">Semestral (R$)</Label><Input size={1} value={form.precoSemestral} onChange={e => setForm(f => ({ ...f, precoSemestral: e.target.value }))} /></div>
            <div><Label className="text-xs">Anual (R$)</Label><Input size={1} value={form.precoAnual} onChange={e => setForm(f => ({ ...f, precoAnual: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-1">
              <div><Label className="text-xs">Usuários</Label><Input type="number" size={1} value={form.limiteUsuarios} onChange={e => setForm(f => ({ ...f, limiteUsuarios: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Veículos</Label><Input type="number" size={1} value={form.limiteVeiculos} onChange={e => setForm(f => ({ ...f, limiteVeiculos: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Motoristas</Label><Input type="number" size={1} value={form.limiteMotoristas} onChange={e => setForm(f => ({ ...f, limiteMotoristas: Number(e.target.value) }))} /></div>
            </div>
            {meta.codigo === "trial" && <div><Label className="text-xs">Dias de Trial</Label><Input type="number" size={1} value={form.diasTrial} onChange={e => setForm(f => ({ ...f, diasTrial: Number(e.target.value) }))} /></div>}
            <Button size="sm" className="w-full mt-2" onClick={() => { onSave(form); setEditando(false); }}>Salvar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function PainelMaster() {
  const { user, loading } = useAuth();
  const { enterAdminView } = useViewAs();
  const [location, navigate] = useLocation();
  const [abaAtiva, setAbaAtiva] = useState<Aba>(resolveMasterTab(location));
  const [modalLicenca, setModalLicenca] = useState(false);
  const [modalCobranca, setModalCobranca] = useState(false);
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalAtualizarLic, setModalAtualizarLic] = useState<any>(null);
  const [modalPagarCob, setModalPagarCob] = useState<any>(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const isMaster = !loading && !!user && (user as any).role === "master_admin";

  const { data: empresas = [], refetch: refetchEmpresas, isLoading: loadingEmpresas } =
    trpc.empresas.list.useQuery(undefined, { enabled: isMaster });
  const { data: allUsers = [] } =
    trpc.dashboard.listUsers.useQuery({}, { enabled: isMaster });
  const { data: licencas = [], refetch: refetchLicencas, isLoading: loadingLicencas } =
    trpc.licenciamento.listarLicencas.useQuery(undefined, { enabled: isMaster });
  const { data: cobrancas = [], refetch: refetchCobrancas } =
    trpc.licenciamento.listarCobrancas.useQuery({}, { enabled: isMaster });
  const { data: planos = [] } =
    trpc.licenciamento.listarPlanos.useQuery(undefined, { enabled: isMaster });
  const { data: dashboard } =
    trpc.licenciamento.dashboardLicencas.useQuery(undefined, { enabled: isMaster });
  const { data: masterDashboard, refetch: refetchMasterDashboard } =
    trpc.master.dashboard.useQuery(undefined, { enabled: isMaster });
  const { data: masterClients = [], refetch: refetchMasterClients } =
    trpc.master.listClients.useQuery(undefined, { enabled: isMaster });
  const { data: masterTasks = [], refetch: refetchMasterTasks } =
    trpc.master.listTasks.useQuery(undefined, { enabled: isMaster });
  const { data: masterFinancial = [], refetch: refetchMasterFinancial } =
    trpc.master.listFinancial.useQuery(undefined, { enabled: isMaster });
  const { data: masterEvents = [], refetch: refetchMasterEvents } =
    trpc.master.listEvents.useQuery(undefined, { enabled: isMaster });
  const { data: masterReminders = [], refetch: refetchMasterReminders } =
    trpc.master.listReminders.useQuery(undefined, { enabled: isMaster });
  const { data: masterCampaigns = [], refetch: refetchMasterCampaigns } =
    trpc.master.listCampaigns.useQuery(undefined, { enabled: isMaster });
  const { data: masterLandingPages = [], refetch: refetchMasterLandingPages } =
    trpc.master.listLandingPages.useQuery(undefined, { enabled: isMaster });
  const { data: masterLeads = [], refetch: refetchMasterLeads } =
    trpc.master.listLeads.useQuery(undefined, { enabled: isMaster });
  const { data: masterProposals = [], refetch: refetchMasterProposals } =
    trpc.master.listProposals.useQuery(undefined, { enabled: isMaster });
  const { data: masterHealthLogs = [], refetch: refetchMasterHealthLogs } =
    trpc.master.listHealthLogs.useQuery(undefined, { enabled: isMaster });
  const { data: masterCollegeTasks = [], refetch: refetchMasterCollegeTasks } =
    trpc.master.listCollegeTasks.useQuery(undefined, { enabled: isMaster });
  const { data: masterProjects = [], refetch: refetchMasterProjects } =
    trpc.master.listProjects.useQuery(undefined, { enabled: isMaster });
  const { data: masterAiNotes = [], refetch: refetchMasterAiNotes } =
    trpc.master.listAiNotes.useQuery(undefined, { enabled: isMaster });
  const { data: masterDailyPlans = [], refetch: refetchMasterDailyPlans } =
    trpc.master.listDailyPlans.useQuery(undefined, { enabled: isMaster });
  const { data: masterServices = [], refetch: refetchMasterServices } =
    trpc.master.listServices.useQuery(undefined, { enabled: isMaster });
  const { data: masterGoogleProfiles = [], refetch: refetchMasterGoogleProfiles } =
    trpc.master.listGoogleBusinessProfiles.useQuery(undefined, { enabled: isMaster });
  const { data: masterFollowUps = [], refetch: refetchMasterFollowUps } =
    trpc.master.listFollowUps.useQuery(undefined, { enabled: isMaster });
  const { data: masterPaymentSchedules = [], refetch: refetchMasterPaymentSchedules } =
    trpc.master.listPaymentSchedules.useQuery(undefined, { enabled: isMaster });
  const { data: masterSynapseReleases = [], refetch: refetchMasterSynapseReleases } =
    trpc.master.listSynapseReleases.useQuery(undefined, { enabled: isMaster });

  const criarEmpresaMut = trpc.empresas.criar.useMutation({
        onSuccess: (d) => { toast.success(d.mensagem || "Empresa criada!"); setModalEmpresa(false); setFormEmpresa({ nome: "", cnpj: "", email: "", telefone: "", cidade: "", estado: "", tipoEmpresa: "independente", matrizId: "", grupoId: "" }); refetchEmpresas(); },
    onError: (e) => toast.error(e.message),
  });
  const toggleAtivoMut = trpc.empresas.toggleAtivo.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem); refetchEmpresas(); },
    onError: (e) => toast.error(e.message),
  });
  const regenerarConviteMut = trpc.empresas.regenerarConvite.useMutation({
    onSuccess: (d) => { toast.success(`Novo código: ${d.codigoConvite}`); refetchEmpresas(); },
    onError: (e) => toast.error(e.message),
  });
  const atualizarLicMut = trpc.licenciamento.atualizarLicenca.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem); refetchLicencas(); setModalAtualizarLic(null); },
    onError: (e) => toast.error(e.message),
  });
  const pagarCobMut = trpc.licenciamento.registrarPagamento.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem); refetchCobrancas(); refetchLicencas(); setModalPagarCob(null); },
    onError: (e) => toast.error(e.message),
  });
  const atualizarPlanoMut = trpc.licenciamento.atualizarPlano.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem); },
    onError: (e) => toast.error(e.message),
  });
  const createMasterClientMut = trpc.master.createClient.useMutation({
    onSuccess: () => {
      toast.success("Cliente salvo na Central do Daniel.");
      setFormClienteMaster({ nome: "", empresa: "", contato: "", whatsapp: "", email: "", servicos: "", valorMensal: "", status: "lead", proximaAcao: "", observacoes: "" });
      refetchMasterClients(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterTaskMut = trpc.master.createTask.useMutation({
    onSuccess: () => {
      toast.success("Tarefa criada.");
      setFormTaskMaster({ titulo: "", descricao: "", area: "synapse", prioridade: "alta", periodo: "manha", dataLimite: "", clientId: "" });
      refetchMasterTasks(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMasterTaskStatusMut = trpc.master.updateTaskStatus.useMutation({
    onSuccess: () => { refetchMasterTasks(); refetchMasterDashboard(); },
    onError: (e) => toast.error(e.message),
  });
  const createMasterFinancialMut = trpc.master.createFinancial.useMutation({
    onSuccess: () => {
      toast.success("Lançamento salvo.");
      setFormFinanceMaster({ tipo: "receita", descricao: "", valor: "", categoria: "", status: "pendente", vencimento: "", clientId: "", observacoes: "" });
      refetchMasterFinancial(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const markMasterFinancialPaidMut = trpc.master.markFinancialPaid.useMutation({
    onSuccess: () => { refetchMasterFinancial(); refetchMasterDashboard(); },
    onError: (e) => toast.error(e.message),
  });
  const createMasterEventMut = trpc.master.createEvent.useMutation({
    onSuccess: () => {
      toast.success("Compromisso salvo.");
      setFormEventMaster({ titulo: "", area: "vida", inicio: "", fim: "", local: "", clientId: "" });
      refetchMasterEvents(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterReminderMut = trpc.master.createReminder.useMutation({
    onSuccess: () => {
      toast.success("Lembrete criado.");
      setFormReminderMaster({ titulo: "", lembrarEm: "", descricao: "" });
      refetchMasterReminders(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterCampaignMut = trpc.master.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campanha salva.");
      setFormCampaignMaster({
        nome: "", plataforma: "meta_ads", objetivo: "", status: "ativa", orcamento: "",
        custoPorLead: "", ultimaRevisao: "", proximaRevisao: "", resultado: "", pendencias: "", observacoes: "", clientId: "",
      });
      refetchMasterCampaigns(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterLandingPageMut = trpc.master.createLandingPage.useMutation({
    onSuccess: () => {
      toast.success("Landing page salva.");
      setFormLandingPageMaster({
        nome: "", url: "", dominio: "", status: "rascunho", dataPublicacao: "",
        formularioOk: false, whatsappOk: false, pixelInstalado: false, observacoes: "", melhorias: "", clientId: "",
      });
      refetchMasterLandingPages(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterLeadMut = trpc.master.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead salvo.");
      setFormLeadMaster({
        nome: "", empresa: "", contato: "", whatsapp: "", email: "", origem: "", status: "novo", interesse: "", proximaAcao: "", observacoes: "",
      });
      refetchMasterLeads(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterProposalMut = trpc.master.createProposal.useMutation({
    onSuccess: () => {
      toast.success("Proposta salva.");
      setFormProposalMaster({
        titulo: "", valor: "", status: "rascunho", validade: "", descricao: "", observacoes: "", clientId: "", leadId: "",
      });
      refetchMasterProposals(); refetchMasterDashboard();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterHealthLogMut = trpc.master.createHealthLog.useMutation({
    onSuccess: () => {
      toast.success("Registro de saúde salvo.");
      setFormHealthMaster({ referencia: "", humor: "3", energia: "3", sonoHoras: "", pesoKg: "", observacoes: "" });
      refetchMasterHealthLogs();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterCollegeTaskMut = trpc.master.createCollegeTask.useMutation({
    onSuccess: () => {
      toast.success("Tarefa da faculdade salva.");
      setFormCollegeMaster({ disciplina: "", titulo: "", status: "a_fazer", prazo: "", observacoes: "" });
      refetchMasterCollegeTasks();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMasterCollegeTaskStatusMut = trpc.master.updateCollegeTaskStatus.useMutation({
    onSuccess: () => {
      refetchMasterCollegeTasks();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterProjectMut = trpc.master.createProject.useMutation({
    onSuccess: () => {
      toast.success("Projeto salvo.");
      setFormProjectMaster({ titulo: "", area: "synapse", status: "planejamento", progresso: "0", descricao: "", proximaEntrega: "", clientId: "" });
      refetchMasterProjects();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterAiNoteMut = trpc.master.createAiNote.useMutation({
    onSuccess: () => {
      toast.success("Nota de IA salva.");
      setFormAiNoteMaster({ titulo: "", categoria: "", conteudo: "" });
      refetchMasterAiNotes();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterDailyPlanMut = trpc.master.createDailyPlan.useMutation({
    onSuccess: () => {
      toast.success("Planejamento diário salvo.");
      setFormDailyPlanMaster({ referencia: "", focoPrincipal: "", top3: "", manha: "", tarde: "", noite: "", observacoes: "" });
      refetchMasterDailyPlans();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterServiceMut = trpc.master.createService.useMutation({
    onSuccess: () => {
      toast.success("Serviço salvo.");
      setFormServiceMaster({ nome: "", tipo: "trafego_pago", status: "ativo", checklist: "", valorMensal: "", proximaRevisao: "", observacoes: "", clientId: "" });
      refetchMasterServices();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterGoogleProfileMut = trpc.master.createGoogleBusinessProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil Google salvo.");
      setFormGoogleProfileMaster({
        perfil: "", linkPerfil: "", ultimaAtualizacao: "", fotosPendentes: false, avaliacoesPendentes: false,
        postagemSemanal: false, servicosAtualizados: false, palavrasChave: "", relatorioMensal: false,
        checklistOtimizacao: "", observacoes: "", clientId: "",
      });
      refetchMasterGoogleProfiles();
    },
    onError: (e) => toast.error(e.message),
  });
  const createMasterFollowUpMut = trpc.master.createFollowUp.useMutation({
    onSuccess: () => {
      toast.success("Follow-up salvo.");
      setFormFollowUpMaster({ titulo: "", canal: "whatsapp", status: "pendente", dataPrevista: "", resposta: "", observacoes: "", clientId: "", leadId: "", proposalId: "" });
      refetchMasterFollowUps();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMasterFollowUpStatusMut = trpc.master.updateFollowUpStatus.useMutation({
    onSuccess: () => refetchMasterFollowUps(),
    onError: (e) => toast.error(e.message),
  });
  const createMasterPaymentScheduleMut = trpc.master.createPaymentSchedule.useMutation({
    onSuccess: () => {
      toast.success("Cobrança programada salva.");
      setFormPaymentScheduleMaster({ descricao: "", valor: "", status: "pendente", recorrencia: "mensal", vencimento: "", ultimaCobranca: "", observacoes: "", clientId: "" });
      refetchMasterPaymentSchedules();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMasterPaymentScheduleStatusMut = trpc.master.updatePaymentScheduleStatus.useMutation({
    onSuccess: () => refetchMasterPaymentSchedules(),
    onError: (e) => toast.error(e.message),
  });
  const createMasterSynapseReleaseMut = trpc.master.createSynapseRelease.useMutation({
    onSuccess: () => {
      toast.success("Release do Synapse salva.");
      setFormSynapseReleaseMaster({ versao: "", titulo: "", status: "planejada", dataPrevista: "", destaques: "", riscos: "", deployStatus: "" });
      refetchMasterSynapseReleases();
    },
    onError: (e) => toast.error(e.message),
  });

  const [formEmpresa, setFormEmpresa] = useState({ nome: "", cnpj: "", email: "", telefone: "", cidade: "", estado: "", tipoEmpresa: "independente" as any, matrizId: "", grupoId: "" });
  const [formClienteMaster, setFormClienteMaster] = useState({ nome: "", empresa: "", contato: "", whatsapp: "", email: "", servicos: "", valorMensal: "", status: "lead", proximaAcao: "", observacoes: "" });
  const [formTaskMaster, setFormTaskMaster] = useState({ titulo: "", descricao: "", area: "synapse", prioridade: "alta", periodo: "manha", dataLimite: "", clientId: "" });
  const [formFinanceMaster, setFormFinanceMaster] = useState({ tipo: "receita", descricao: "", valor: "", categoria: "", status: "pendente", vencimento: "", clientId: "", observacoes: "" });
  const [formEventMaster, setFormEventMaster] = useState({ titulo: "", area: "vida", inicio: "", fim: "", local: "", clientId: "" });
  const [formReminderMaster, setFormReminderMaster] = useState({ titulo: "", lembrarEm: "", descricao: "" });
  const [formCampaignMaster, setFormCampaignMaster] = useState({
    nome: "", plataforma: "meta_ads", objetivo: "", status: "ativa", orcamento: "",
    custoPorLead: "", ultimaRevisao: "", proximaRevisao: "", resultado: "", pendencias: "", observacoes: "", clientId: "",
  });
  const [formLandingPageMaster, setFormLandingPageMaster] = useState({
    nome: "", url: "", dominio: "", status: "rascunho", dataPublicacao: "",
    formularioOk: false, whatsappOk: false, pixelInstalado: false, observacoes: "", melhorias: "", clientId: "",
  });
  const [formLeadMaster, setFormLeadMaster] = useState({
    nome: "", empresa: "", contato: "", whatsapp: "", email: "", origem: "", status: "novo", interesse: "", proximaAcao: "", observacoes: "",
  });
  const [formProposalMaster, setFormProposalMaster] = useState({
    titulo: "", valor: "", status: "rascunho", validade: "", descricao: "", observacoes: "", clientId: "", leadId: "",
  });
  const [formHealthMaster, setFormHealthMaster] = useState({ referencia: "", humor: "3", energia: "3", sonoHoras: "", pesoKg: "", observacoes: "" });
  const [formCollegeMaster, setFormCollegeMaster] = useState({ disciplina: "", titulo: "", status: "a_fazer", prazo: "", observacoes: "" });
  const [formProjectMaster, setFormProjectMaster] = useState({ titulo: "", area: "synapse", status: "planejamento", progresso: "0", descricao: "", proximaEntrega: "", clientId: "" });
  const [formAiNoteMaster, setFormAiNoteMaster] = useState({ titulo: "", categoria: "", conteudo: "" });
  const [formDailyPlanMaster, setFormDailyPlanMaster] = useState({ referencia: "", focoPrincipal: "", top3: "", manha: "", tarde: "", noite: "", observacoes: "" });
  const [formServiceMaster, setFormServiceMaster] = useState({ nome: "", tipo: "trafego_pago", status: "ativo", checklist: "", valorMensal: "", proximaRevisao: "", observacoes: "", clientId: "" });
  const [formGoogleProfileMaster, setFormGoogleProfileMaster] = useState({
    perfil: "", linkPerfil: "", ultimaAtualizacao: "", fotosPendentes: false, avaliacoesPendentes: false,
    postagemSemanal: false, servicosAtualizados: false, palavrasChave: "", relatorioMensal: false,
    checklistOtimizacao: "", observacoes: "", clientId: "",
  });
  const [formFollowUpMaster, setFormFollowUpMaster] = useState({ titulo: "", canal: "whatsapp", status: "pendente", dataPrevista: "", resposta: "", observacoes: "", clientId: "", leadId: "", proposalId: "" });
  const [formPaymentScheduleMaster, setFormPaymentScheduleMaster] = useState({ descricao: "", valor: "", status: "pendente", recorrencia: "mensal", vencimento: "", ultimaCobranca: "", observacoes: "", clientId: "" });
  const [formSynapseReleaseMaster, setFormSynapseReleaseMaster] = useState({ versao: "", titulo: "", status: "planejada", dataPrevista: "", destaques: "", riscos: "", deployStatus: "" });

  useEffect(() => {
    if (!loading && user && (user as any).role !== "master_admin") navigate("/dashboard");
  }, [user, loading, navigate]);
  useEffect(() => {
    setAbaAtiva(resolveMasterTab(location));
  }, [location]);
  if (loading || !user || (user as any).role !== "master_admin") return null;

  const copiar = (txt: string, label: string) => navigator.clipboard.writeText(txt).then(() => toast.success(`${label} copiado!`));

  const licencasFiltradas = (licencas as any[]).filter((l: any) => filtroStatus === "todos" || l.licenca.status === filtroStatus);

  const empresasAtivas = (empresas as any[]).filter((e: any) => e.ativo).length;
  const totalUsuarios = (allUsers as any[]).length;
  const receitaMensal = (licencas as any[]).filter((l: any) => l.licenca.status === "ativa").reduce((acc: number, l: any) => acc + (parseFloat(l.licenca.valorContratado) || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500" /> Painel Master</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão centralizada — licenças, planos, cobranças e empresas</p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border border-amber-300 gap-1 text-sm px-3 py-1">
          <Shield className="w-3.5 h-3.5" /> Master Admin
        </Badge>
      </div>

      {/* Abas */}
      <div className="flex gap-0 border-b flex-wrap">
        {([
          { key: "workspace",   label: "Central do Daniel", icon: <Crown className="w-4 h-4" /> },
          { key: "visao-geral", label: "Visão Geral",   icon: <Activity className="w-4 h-4" /> },
          { key: "empresas",    label: "Empresas",      icon: <Building2 className="w-4 h-4" /> },
          { key: "licencas",    label: "Licenças",      icon: <Package className="w-4 h-4" /> },
          { key: "cobrancas",   label: "Cobranças",     icon: <Receipt className="w-4 h-4" /> },
          { key: "planos",      label: "Planos",        icon: <Star className="w-4 h-4" /> },
          { key: "config",      label: "Configurações", icon: <Settings className="w-4 h-4" /> },
        ] as const).map(aba => (
          <button key={aba.key} onClick={() => navigate(TAB_ROUTE_MAP[aba.key])}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${abaAtiva === aba.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {aba.icon} {aba.label}
            {aba.key === "licencas" && (dashboard as any)?.stats?.vencendoEm7dias ? (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{(dashboard as any).stats.vencendoEm7dias}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ═══ CENTRAL DO DANIEL ════════════════════════════════════════════════ */}
      {abaAtiva === "workspace" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Foco do dia", value: String((masterDashboard as any)?.focoHoje?.length ?? 0), sub: "tarefas prioritárias", cor: "text-blue-600", bg: "border-blue-200 bg-blue-50/30", icon: <Check className="w-9 h-9 text-blue-200" /> },
              { label: "A receber", value: fmtMoeda((masterDashboard as any)?.stats?.financeiro?.receberpendente ?? 0), sub: `${(masterDashboard as any)?.stats?.financeiro?.atrasados ?? 0} atrasados`, cor: "text-green-600", bg: "border-green-200 bg-green-50/30", icon: <DollarSign className="w-9 h-9 text-green-200" /> },
              { label: "Clientes", value: String((masterDashboard as any)?.stats?.clientes?.ativos ?? 0), sub: `${(masterDashboard as any)?.stats?.clientes?.leads ?? 0} leads`, cor: "text-purple-600", bg: "border-purple-200 bg-purple-50/30", icon: <Users className="w-9 h-9 text-purple-200" /> },
              { label: "Agenda", value: String((masterDashboard as any)?.agenda?.length ?? 0), sub: `${(masterDashboard as any)?.stats?.lembretes?.hoje ?? 0} lembretes hoje`, cor: "text-orange-600", bg: "border-orange-200 bg-orange-50/30", icon: <Calendar className="w-9 h-9 text-orange-200" /> },
            ].map((k, i) => (
              <Card key={i} className={k.bg}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${k.cor}`}>{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                    </div>
                    {k.icon}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Planejamento do dia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm leading-6">
                    {(masterDashboard as any)?.planejamento?.resumo ?? "Cadastre tarefas, clientes e agenda para o Synapse montar seu plano."}
                  </p>
                  <p className="text-sm font-medium mt-3">
                    {(masterDashboard as any)?.planejamento?.proximaAcao ?? "Defina a primeira prioridade do dia."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm">Planejar meu dia</Button>
                  <Button size="sm" variant="outline">O que faço agora?</Button>
                </div>
                {!(masterDashboard as any)?.focoHoje?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa priorizada ainda. Cadastre a primeira tarefa abaixo.</p>
                ) : (
                  (masterDashboard as any).focoHoje.map((task: any) => (
                    <div key={task.id} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                      <div>
                        <p className="font-medium">{task.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.area} · {task.prioridade} · {task.periodo}
                          {task.dataLimite ? ` · prazo ${fmtData(task.dataLimite)}` : ""}
                        </p>
                        {task.descricao && <p className="text-sm text-muted-foreground mt-2">{task.descricao}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant={task.status === "concluida" ? "outline" : "default"}
                        onClick={() => updateMasterTaskStatusMut.mutate({ id: task.id, status: task.status === "concluida" ? "a_fazer" : "concluida" })}
                      >
                        {task.status === "concluida" ? "Reabrir" : "Concluir"}
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alertas, agenda e lembretes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {((masterDashboard as any)?.planejamento?.alertas?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {((masterDashboard as any)?.planejamento?.alertas ?? []).map((alerta: string, index: number) => (
                      <div key={`${alerta}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                        <p className="text-sm text-amber-900">{alerta}</p>
                      </div>
                    ))}
                  </div>
                )}
                {!(masterDashboard as any)?.agenda?.length && !(masterReminders as any[])?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum compromisso ou lembrete cadastrado.</p>
                ) : (
                  <>
                    {((masterDashboard as any)?.agenda ?? []).map((event: any) => (
                      <div key={`event-${event.id}`} className="rounded-lg bg-muted/40 p-3">
                        <p className="font-medium text-sm">{event.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fmtData(event.inicio)} {new Date(event.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                        {event.local && <p className="text-xs text-muted-foreground">{event.local}</p>}
                      </div>
                    ))}
                    {(masterReminders as any[]).slice(0, 4).map((reminder: any) => (
                      <div key={`reminder-${reminder.id}`} className="rounded-lg border p-3">
                        <p className="font-medium text-sm">{reminder.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">Lembrar em {fmtData(reminder.lembrarEm)}</p>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cadastro rápido de cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Nome *</Label><Input value={formClienteMaster.nome} onChange={e => setFormClienteMaster(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div><Label>Empresa</Label><Input value={formClienteMaster.empresa} onChange={e => setFormClienteMaster(f => ({ ...f, empresa: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Contato</Label><Input value={formClienteMaster.contato} onChange={e => setFormClienteMaster(f => ({ ...f, contato: e.target.value }))} /></div>
                  <div><Label>WhatsApp</Label><Input value={formClienteMaster.whatsapp} onChange={e => setFormClienteMaster(f => ({ ...f, whatsapp: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2"><Label>E-mail</Label><Input type="email" value={formClienteMaster.email} onChange={e => setFormClienteMaster(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><Label>Valor mensal</Label><Input placeholder="0.00" value={formClienteMaster.valorMensal} onChange={e => setFormClienteMaster(f => ({ ...f, valorMensal: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Serviços</Label><Input placeholder="Tráfego, landing page..." value={formClienteMaster.servicos} onChange={e => setFormClienteMaster(f => ({ ...f, servicos: e.target.value }))} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formClienteMaster.status} onValueChange={v => setFormClienteMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="proposta_enviada">Proposta enviada</SelectItem>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="saindo">Saindo</SelectItem>
                        <SelectItem value="encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Próxima ação</Label><Input placeholder="Cobrar proposta, revisar campanha..." value={formClienteMaster.proximaAcao} onChange={e => setFormClienteMaster(f => ({ ...f, proximaAcao: e.target.value }))} /></div>
                <div><Label>Observações</Label><Textarea rows={3} value={formClienteMaster.observacoes} onChange={e => setFormClienteMaster(f => ({ ...f, observacoes: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterClientMut.mutate(formClienteMaster as any)} disabled={createMasterClientMut.isPending}>
                    {createMasterClientMut.isPending ? "Salvando..." : "Salvar cliente"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tarefa rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Título *</Label><Input value={formTaskMaster.titulo} onChange={e => setFormTaskMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div><Label>Descrição</Label><Textarea rows={3} value={formTaskMaster.descricao} onChange={e => setFormTaskMaster(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Área</Label>
                    <Select value={formTaskMaster.area} onValueChange={v => setFormTaskMaster(f => ({ ...f, area: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vida">Vida</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
                        <SelectItem value="synapse">Synapse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={formTaskMaster.prioridade} onValueChange={v => setFormTaskMaster(f => ({ ...f, prioridade: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Período</Label>
                    <Select value={formTaskMaster.periodo} onValueChange={v => setFormTaskMaster(f => ({ ...f, periodo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manha">Manhã</SelectItem>
                        <SelectItem value="tarde">Tarde</SelectItem>
                        <SelectItem value="noite">Noite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Prazo</Label><Input type="date" value={formTaskMaster.dataLimite} onChange={e => setFormTaskMaster(f => ({ ...f, dataLimite: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Cliente vinculado</Label>
                  <Select value={formTaskMaster.clientId || "none"} onValueChange={v => setFormTaskMaster(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterTaskMut.mutate({ ...formTaskMaster, clientId: formTaskMaster.clientId ? Number(formTaskMaster.clientId) : undefined } as any)} disabled={createMasterTaskMut.isPending}>
                    {createMasterTaskMut.isPending ? "Criando..." : "Criar tarefa"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Financeiro do Daniel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={formFinanceMaster.tipo} onValueChange={v => setFormFinanceMaster(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2"><Label>Descrição *</Label><Input value={formFinanceMaster.descricao} onChange={e => setFormFinanceMaster(f => ({ ...f, descricao: e.target.value }))} /></div>
                  <div><Label>Valor *</Label><Input placeholder="0.00" value={formFinanceMaster.valor} onChange={e => setFormFinanceMaster(f => ({ ...f, valor: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Label>Categoria</Label><Input value={formFinanceMaster.categoria} onChange={e => setFormFinanceMaster(f => ({ ...f, categoria: e.target.value }))} /></div>
                  <div><Label>Vencimento</Label><Input type="date" value={formFinanceMaster.vencimento} onChange={e => setFormFinanceMaster(f => ({ ...f, vencimento: e.target.value }))} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formFinanceMaster.status} onValueChange={v => setFormFinanceMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cliente</Label>
                    <Select value={formFinanceMaster.clientId || "none"} onValueChange={v => setFormFinanceMaster(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterFinancialMut.mutate({ ...formFinanceMaster, clientId: formFinanceMaster.clientId ? Number(formFinanceMaster.clientId) : undefined } as any)} disabled={createMasterFinancialMut.isPending}>
                    {createMasterFinancialMut.isPending ? "Salvando..." : "Salvar lançamento"}
                  </Button>
                </div>

                <div className="space-y-2 pt-3">
                  {(masterDashboard as any)?.recebimentos?.length ? (
                    (masterDashboard as any).recebimentos.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-sm">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground">{item.clienteNome ?? "Sem cliente"} · vence {fmtData(item.vencimento)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{fmtMoeda(item.valor)}</span>
                          <Button size="sm" variant="outline" onClick={() => markMasterFinancialPaidMut.mutate({ id: item.id, status: "pago" })}>Marcar pago</Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum recebimento ou pagamento pendente.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Agenda rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Título *</Label><Input value={formEventMaster.titulo} onChange={e => setFormEventMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Área</Label>
                    <Select value={formEventMaster.area} onValueChange={v => setFormEventMaster(f => ({ ...f, area: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vida">Vida</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
                        <SelectItem value="synapse">Synapse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Local</Label><Input value={formEventMaster.local} onChange={e => setFormEventMaster(f => ({ ...f, local: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início *</Label><Input type="datetime-local" value={formEventMaster.inicio} onChange={e => setFormEventMaster(f => ({ ...f, inicio: e.target.value }))} /></div>
                  <div><Label>Fim</Label><Input type="datetime-local" value={formEventMaster.fim} onChange={e => setFormEventMaster(f => ({ ...f, fim: e.target.value }))} /></div>
                </div>
                <div><Label>Lembrete rápido</Label><Input type="datetime-local" value={formReminderMaster.lembrarEm} onChange={e => setFormReminderMaster(f => ({ ...f, lembrarEm: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => createMasterReminderMut.mutate(formReminderMaster)} disabled={createMasterReminderMut.isPending}>
                    {createMasterReminderMut.isPending ? "Salvando..." : "Criar lembrete"}
                  </Button>
                  <Button onClick={() => createMasterEventMut.mutate({ ...formEventMaster, clientId: formEventMaster.clientId ? Number(formEventMaster.clientId) : undefined } as any)} disabled={createMasterEventMut.isPending}>
                    {createMasterEventMut.isPending ? "Salvando..." : "Salvar agenda"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Clientes críticos e follow-up</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!(masterDashboard as any)?.clientesCriticos?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
                ) : (
                  (masterDashboard as any).clientesCriticos.map((client: any) => (
                    <div key={client.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{client.nome}</p>
                          <p className="text-xs text-muted-foreground">{client.empresa ?? "Sem empresa"} · {client.status}</p>
                        </div>
                        {client.valorMensal && <span className="font-semibold">{fmtMoeda(client.valorMensal)}</span>}
                      </div>
                      {client.proximaAcao && <p className="text-sm text-muted-foreground mt-2">{client.proximaAcao}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campanhas e revisões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Campanha *</Label><Input value={formCampaignMaster.nome} onChange={e => setFormCampaignMaster(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div>
                    <Label>Cliente</Label>
                    <Select value={formCampaignMaster.clientId || "none"} onValueChange={v => setFormCampaignMaster(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Plataforma</Label>
                    <Select value={formCampaignMaster.plataforma} onValueChange={v => setFormCampaignMaster(f => ({ ...f, plataforma: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meta_ads">Meta Ads</SelectItem>
                        <SelectItem value="google_ads">Google Ads</SelectItem>
                        <SelectItem value="google_meu_negocio">Google Meu Negócio</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Objetivo</Label><Input value={formCampaignMaster.objetivo} onChange={e => setFormCampaignMaster(f => ({ ...f, objetivo: e.target.value }))} /></div>
                  <div><Label>Orçamento</Label><Input placeholder="0.00" value={formCampaignMaster.orcamento} onChange={e => setFormCampaignMaster(f => ({ ...f, orcamento: e.target.value }))} /></div>
                  <div><Label>CPL</Label><Input placeholder="0.00" value={formCampaignMaster.custoPorLead} onChange={e => setFormCampaignMaster(f => ({ ...f, custoPorLead: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formCampaignMaster.status} onValueChange={v => setFormCampaignMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="em_revisao">Em revisão</SelectItem>
                        <SelectItem value="pausada">Pausada</SelectItem>
                        <SelectItem value="encerrada">Encerrada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Última revisão</Label><Input type="date" value={formCampaignMaster.ultimaRevisao} onChange={e => setFormCampaignMaster(f => ({ ...f, ultimaRevisao: e.target.value }))} /></div>
                  <div><Label>Próxima revisão</Label><Input type="date" value={formCampaignMaster.proximaRevisao} onChange={e => setFormCampaignMaster(f => ({ ...f, proximaRevisao: e.target.value }))} /></div>
                </div>
                <div><Label>Pendências</Label><Textarea rows={2} value={formCampaignMaster.pendencias} onChange={e => setFormCampaignMaster(f => ({ ...f, pendencias: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterCampaignMut.mutate({ ...formCampaignMaster, clientId: formCampaignMaster.clientId ? Number(formCampaignMaster.clientId) : undefined } as any)} disabled={createMasterCampaignMut.isPending}>
                    {createMasterCampaignMut.isPending ? "Salvando..." : "Salvar campanha"}
                  </Button>
                </div>

                {!(masterDashboard as any)?.campanhas?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada ainda.</p>
                ) : (
                  ((masterDashboard as any).campanhas as any[]).map((campaign: any) => (
                    <div key={campaign.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{campaign.nome}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {campaign.clienteNome ?? "Sem cliente"} · {campaign.plataforma} · {campaign.status}
                          </p>
                        </div>
                        {campaign.orcamento && <span className="font-semibold">{fmtMoeda(campaign.orcamento)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Revisão: {fmtData(campaign.proximaRevisao)} {campaign.custoPorLead ? `· CPL ${fmtMoeda(campaign.custoPorLead)}` : ""}
                      </p>
                      {campaign.pendencias && <p className="text-sm text-muted-foreground mt-2">{campaign.pendencias}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Landing pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Nome *</Label><Input value={formLandingPageMaster.nome} onChange={e => setFormLandingPageMaster(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div>
                    <Label>Cliente</Label>
                    <Select value={formLandingPageMaster.clientId || "none"} onValueChange={v => setFormLandingPageMaster(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>URL</Label><Input value={formLandingPageMaster.url} onChange={e => setFormLandingPageMaster(f => ({ ...f, url: e.target.value }))} /></div>
                  <div><Label>Domínio</Label><Input value={formLandingPageMaster.dominio} onChange={e => setFormLandingPageMaster(f => ({ ...f, dominio: e.target.value }))} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formLandingPageMaster.status} onValueChange={v => setFormLandingPageMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="publicada">Publicada</SelectItem>
                        <SelectItem value="em_ajuste">Em ajuste</SelectItem>
                        <SelectItem value="pausada">Pausada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Label>Publicação</Label><Input type="date" value={formLandingPageMaster.dataPublicacao} onChange={e => setFormLandingPageMaster(f => ({ ...f, dataPublicacao: e.target.value }))} /></div>
                  <label className="flex items-center gap-2 text-sm pt-7"><input type="checkbox" checked={formLandingPageMaster.formularioOk} onChange={e => setFormLandingPageMaster(f => ({ ...f, formularioOk: e.target.checked }))} />Formulário ok</label>
                  <label className="flex items-center gap-2 text-sm pt-7"><input type="checkbox" checked={formLandingPageMaster.whatsappOk} onChange={e => setFormLandingPageMaster(f => ({ ...f, whatsappOk: e.target.checked }))} />WhatsApp ok</label>
                  <label className="flex items-center gap-2 text-sm pt-7"><input type="checkbox" checked={formLandingPageMaster.pixelInstalado} onChange={e => setFormLandingPageMaster(f => ({ ...f, pixelInstalado: e.target.checked }))} />Pixel instalado</label>
                </div>
                <div><Label>Melhorias futuras</Label><Textarea rows={2} value={formLandingPageMaster.melhorias} onChange={e => setFormLandingPageMaster(f => ({ ...f, melhorias: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterLandingPageMut.mutate({ ...formLandingPageMaster, clientId: formLandingPageMaster.clientId ? Number(formLandingPageMaster.clientId) : undefined } as any)} disabled={createMasterLandingPageMut.isPending}>
                    {createMasterLandingPageMut.isPending ? "Salvando..." : "Salvar landing page"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Páginas recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!(masterDashboard as any)?.landingPages?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma landing page cadastrada ainda.</p>
                ) : (
                  ((masterDashboard as any).landingPages as any[]).map((page: any) => (
                    <div key={page.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{page.nome}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {page.clienteNome ?? "Sem cliente"} · {page.status}
                          </p>
                        </div>
                        {page.dominio && <span className="text-xs text-muted-foreground">{page.dominio}</span>}
                      </div>
                      {page.url && <p className="text-xs text-blue-600 mt-2">{page.url}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {page.formularioOk ? "Formulario ok" : "Formulario pendente"} · {page.whatsappOk ? "WhatsApp ok" : "WhatsApp pendente"} · {page.pixelInstalado ? "Pixel ok" : "Pixel pendente"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Leads e funil comercial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Nome *</Label><Input value={formLeadMaster.nome} onChange={e => setFormLeadMaster(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div><Label>Empresa</Label><Input value={formLeadMaster.empresa} onChange={e => setFormLeadMaster(f => ({ ...f, empresa: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Label>Contato</Label><Input value={formLeadMaster.contato} onChange={e => setFormLeadMaster(f => ({ ...f, contato: e.target.value }))} /></div>
                  <div><Label>WhatsApp</Label><Input value={formLeadMaster.whatsapp} onChange={e => setFormLeadMaster(f => ({ ...f, whatsapp: e.target.value }))} /></div>
                  <div><Label>E-mail</Label><Input value={formLeadMaster.email} onChange={e => setFormLeadMaster(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><Label>Origem</Label><Input value={formLeadMaster.origem} onChange={e => setFormLeadMaster(f => ({ ...f, origem: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formLeadMaster.status} onValueChange={v => setFormLeadMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="contato">Contato</SelectItem>
                        <SelectItem value="qualificado">Qualificado</SelectItem>
                        <SelectItem value="proposta">Proposta</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                        <SelectItem value="perdido">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2"><Label>Próxima ação</Label><Input value={formLeadMaster.proximaAcao} onChange={e => setFormLeadMaster(f => ({ ...f, proximaAcao: e.target.value }))} /></div>
                </div>
                <div><Label>Interesse</Label><Textarea rows={2} value={formLeadMaster.interesse} onChange={e => setFormLeadMaster(f => ({ ...f, interesse: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterLeadMut.mutate(formLeadMaster as any)} disabled={createMasterLeadMut.isPending}>
                    {createMasterLeadMut.isPending ? "Salvando..." : "Salvar lead"}
                  </Button>
                </div>

                {!(masterDashboard as any)?.leads?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhum lead cadastrado ainda.</p>
                ) : (
                  ((masterDashboard as any).leads as any[]).map((lead: any) => (
                    <div key={lead.id} className="rounded-lg border p-3">
                      <p className="font-medium text-sm">{lead.nome}</p>
                      <p className="text-xs text-muted-foreground mt-1">{lead.empresa ?? "Sem empresa"} · {lead.status}</p>
                      {lead.proximaAcao && <p className="text-sm text-muted-foreground mt-2">{lead.proximaAcao}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Propostas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Título *</Label><Input value={formProposalMaster.titulo} onChange={e => setFormProposalMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                  <div><Label>Valor</Label><Input placeholder="0.00" value={formProposalMaster.valor} onChange={e => setFormProposalMaster(f => ({ ...f, valor: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formProposalMaster.status} onValueChange={v => setFormProposalMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="enviada">Enviada</SelectItem>
                        <SelectItem value="negociacao">Negociação</SelectItem>
                        <SelectItem value="aprovada">Aprovada</SelectItem>
                        <SelectItem value="recusada">Recusada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Validade</Label><Input type="date" value={formProposalMaster.validade} onChange={e => setFormProposalMaster(f => ({ ...f, validade: e.target.value }))} /></div>
                  <div>
                    <Label>Cliente</Label>
                    <Select value={formProposalMaster.clientId || "none"} onValueChange={v => setFormProposalMaster(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lead</Label>
                    <Select value={formProposalMaster.leadId || "none"} onValueChange={v => setFormProposalMaster(f => ({ ...f, leadId: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {(masterLeads as any[]).map((lead: any) => <SelectItem key={lead.id} value={String(lead.id)}>{lead.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Descrição</Label><Textarea rows={2} value={formProposalMaster.descricao} onChange={e => setFormProposalMaster(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterProposalMut.mutate({ ...formProposalMaster, clientId: formProposalMaster.clientId ? Number(formProposalMaster.clientId) : undefined, leadId: formProposalMaster.leadId ? Number(formProposalMaster.leadId) : undefined } as any)} disabled={createMasterProposalMut.isPending}>
                    {createMasterProposalMut.isPending ? "Salvando..." : "Salvar proposta"}
                  </Button>
                </div>

                {!(masterDashboard as any)?.propostas?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma proposta cadastrada ainda.</p>
                ) : (
                  ((masterDashboard as any).propostas as any[]).map((proposal: any) => (
                    <div key={proposal.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{proposal.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {proposal.clienteNome ?? proposal.leadNome ?? "Sem vínculo"} · {proposal.status}
                          </p>
                        </div>
                        {proposal.valor && <span className="font-semibold">{fmtMoeda(proposal.valor)}</span>}
                      </div>
                      {proposal.validade && <p className="text-xs text-muted-foreground mt-2">Validade: {fmtData(proposal.validade)}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><HeartPulse className="w-4 h-4 text-rose-500" /> Saúde e energia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Label>Data</Label><Input type="date" value={formHealthMaster.referencia} onChange={e => setFormHealthMaster(f => ({ ...f, referencia: e.target.value }))} /></div>
                  <div>
                    <Label>Humor</Label>
                    <Select value={formHealthMaster.humor} onValueChange={v => setFormHealthMaster(f => ({ ...f, humor: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["1","2","3","4","5"].map(v => <SelectItem key={v} value={v}>{v}/5</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Energia</Label>
                    <Select value={formHealthMaster.energia} onValueChange={v => setFormHealthMaster(f => ({ ...f, energia: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["1","2","3","4","5"].map(v => <SelectItem key={v} value={v}>{v}/5</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Sono (h)</Label><Input placeholder="7.5" value={formHealthMaster.sonoHoras} onChange={e => setFormHealthMaster(f => ({ ...f, sonoHoras: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Peso (kg)</Label><Input placeholder="82.4" value={formHealthMaster.pesoKg} onChange={e => setFormHealthMaster(f => ({ ...f, pesoKg: e.target.value }))} /></div>
                  <div><Label>Observações</Label><Input placeholder="Como você está hoje?" value={formHealthMaster.observacoes} onChange={e => setFormHealthMaster(f => ({ ...f, observacoes: e.target.value }))} /></div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterHealthLogMut.mutate({ ...formHealthMaster, humor: Number(formHealthMaster.humor), energia: Number(formHealthMaster.energia) } as any)} disabled={createMasterHealthLogMut.isPending}>
                    {createMasterHealthLogMut.isPending ? "Salvando..." : "Salvar saúde"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterHealthLogs as any[]).slice(0, 4).map((item: any) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{fmtData(item.referencia)}</p>
                        <Badge variant="outline">Humor {item.humor ?? "—"} · Energia {item.energia ?? "—"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Sono {item.sonoHoras ?? "—"}h · Peso {item.pesoKg ?? "—"}kg</p>
                      {item.observacoes && <p className="text-sm text-muted-foreground mt-2">{item.observacoes}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4 text-indigo-500" /> Faculdade e estudos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Disciplina *</Label><Input value={formCollegeMaster.disciplina} onChange={e => setFormCollegeMaster(f => ({ ...f, disciplina: e.target.value }))} /></div>
                  <div><Label>Tarefa *</Label><Input value={formCollegeMaster.titulo} onChange={e => setFormCollegeMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formCollegeMaster.status} onValueChange={v => setFormCollegeMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a_fazer">A fazer</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="atrasada">Atrasada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Prazo</Label><Input type="date" value={formCollegeMaster.prazo} onChange={e => setFormCollegeMaster(f => ({ ...f, prazo: e.target.value }))} /></div>
                  <div><Label>Observações</Label><Input value={formCollegeMaster.observacoes} onChange={e => setFormCollegeMaster(f => ({ ...f, observacoes: e.target.value }))} /></div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterCollegeTaskMut.mutate(formCollegeMaster as any)} disabled={createMasterCollegeTaskMut.isPending}>
                    {createMasterCollegeTaskMut.isPending ? "Salvando..." : "Salvar tarefa"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterCollegeTasks as any[]).slice(0, 5).map((task: any) => (
                    <div key={task.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{task.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">{task.disciplina} · {task.status} {task.prazo ? `· ${fmtData(task.prazo)}` : ""}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => updateMasterCollegeTaskStatusMut.mutate({ id: task.id, status: task.status === "concluida" ? "a_fazer" : "concluida" })}>
                        {task.status === "concluida" ? "Reabrir" : "Concluir"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FolderKanban className="w-4 h-4 text-cyan-500" /> Projetos e roadmap</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Título *</Label><Input value={formProjectMaster.titulo} onChange={e => setFormProjectMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Área</Label>
                    <Select value={formProjectMaster.area} onValueChange={v => setFormProjectMaster(f => ({ ...f, area: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vida">Vida</SelectItem>
                        <SelectItem value="clientes">Clientes</SelectItem>
                        <SelectItem value="synapse">Synapse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formProjectMaster.status} onValueChange={v => setFormProjectMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planejamento">Planejamento</SelectItem>
                        <SelectItem value="execucao">Execução</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Progresso (%)</Label><Input type="number" min={0} max={100} value={formProjectMaster.progresso} onChange={e => setFormProjectMaster(f => ({ ...f, progresso: e.target.value }))} /></div>
                  <div><Label>Próxima entrega</Label><Input type="date" value={formProjectMaster.proximaEntrega} onChange={e => setFormProjectMaster(f => ({ ...f, proximaEntrega: e.target.value }))} /></div>
                </div>
                <div><Label>Descrição</Label><Textarea rows={2} value={formProjectMaster.descricao} onChange={e => setFormProjectMaster(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterProjectMut.mutate({ ...formProjectMaster, progresso: Number(formProjectMaster.progresso), clientId: formProjectMaster.clientId ? Number(formProjectMaster.clientId) : undefined } as any)} disabled={createMasterProjectMut.isPending}>
                    {createMasterProjectMut.isPending ? "Salvando..." : "Salvar projeto"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterProjects as any[]).slice(0, 4).map((project: any) => (
                    <div key={project.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{project.titulo}</p>
                        <Badge variant="outline">{project.progresso ?? 0}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{project.area} · {project.status}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><NotebookPen className="w-4 h-4 text-fuchsia-500" /> Notas da IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Título *</Label><Input value={formAiNoteMaster.titulo} onChange={e => setFormAiNoteMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div><Label>Categoria</Label><Input value={formAiNoteMaster.categoria} onChange={e => setFormAiNoteMaster(f => ({ ...f, categoria: e.target.value }))} /></div>
                <div><Label>Conteúdo *</Label><Textarea rows={4} value={formAiNoteMaster.conteudo} onChange={e => setFormAiNoteMaster(f => ({ ...f, conteudo: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterAiNoteMut.mutate(formAiNoteMaster as any)} disabled={createMasterAiNoteMut.isPending}>
                    {createMasterAiNoteMut.isPending ? "Salvando..." : "Salvar nota"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterAiNotes as any[]).slice(0, 4).map((note: any) => (
                    <div key={note.id} className="rounded-lg border p-3">
                      <p className="font-medium text-sm">{note.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1">{note.categoria ?? "Sem categoria"} · {fmtData(note.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><ListTodo className="w-4 h-4 text-emerald-500" /> Planejamento diário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Data</Label><Input type="date" value={formDailyPlanMaster.referencia} onChange={e => setFormDailyPlanMaster(f => ({ ...f, referencia: e.target.value }))} /></div>
                <div><Label>Foco principal *</Label><Input value={formDailyPlanMaster.focoPrincipal} onChange={e => setFormDailyPlanMaster(f => ({ ...f, focoPrincipal: e.target.value }))} /></div>
                <div><Label>Top 3</Label><Input placeholder="Item 1 | Item 2 | Item 3" value={formDailyPlanMaster.top3} onChange={e => setFormDailyPlanMaster(f => ({ ...f, top3: e.target.value }))} /></div>
                <div className="grid grid-cols-1 gap-3">
                  <div><Label>Manhã</Label><Textarea rows={2} value={formDailyPlanMaster.manha} onChange={e => setFormDailyPlanMaster(f => ({ ...f, manha: e.target.value }))} /></div>
                  <div><Label>Tarde</Label><Textarea rows={2} value={formDailyPlanMaster.tarde} onChange={e => setFormDailyPlanMaster(f => ({ ...f, tarde: e.target.value }))} /></div>
                  <div><Label>Noite</Label><Textarea rows={2} value={formDailyPlanMaster.noite} onChange={e => setFormDailyPlanMaster(f => ({ ...f, noite: e.target.value }))} /></div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterDailyPlanMut.mutate(formDailyPlanMaster as any)} disabled={createMasterDailyPlanMut.isPending}>
                    {createMasterDailyPlanMut.isPending ? "Salvando..." : "Salvar plano"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterDailyPlans as any[]).slice(0, 3).map((plan: any) => (
                    <div key={plan.id} className="rounded-lg border p-3">
                      <p className="font-medium text-sm">{plan.focoPrincipal}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fmtData(plan.referencia)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Briefcase className="w-4 h-4 text-sky-500" /> Serviços e entregas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Serviço *</Label><Input value={formServiceMaster.nome} onChange={e => setFormServiceMaster(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={formServiceMaster.tipo} onValueChange={v => setFormServiceMaster(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trafego_pago">Tráfego pago</SelectItem>
                        <SelectItem value="landing_page">Landing page</SelectItem>
                        <SelectItem value="google_meu_negocio">Google Meu Negócio</SelectItem>
                        <SelectItem value="consultoria">Consultoria</SelectItem>
                        <SelectItem value="implantacao">Implantação</SelectItem>
                        <SelectItem value="synapse">Synapse</SelectItem>
                        <SelectItem value="faculdade">Faculdade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formServiceMaster.status} onValueChange={v => setFormServiceMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="em_revisao">Em revisão</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Valor mensal</Label><Input value={formServiceMaster.valorMensal} onChange={e => setFormServiceMaster(f => ({ ...f, valorMensal: e.target.value }))} /></div>
                  <div><Label>Próxima revisão</Label><Input type="date" value={formServiceMaster.proximaRevisao} onChange={e => setFormServiceMaster(f => ({ ...f, proximaRevisao: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Select value={formServiceMaster.clientId || "sem_cliente"} onValueChange={v => setFormServiceMaster(f => ({ ...f, clientId: v === "sem_cliente" ? "" : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem_cliente">Sem cliente</SelectItem>
                      {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Checklist</Label><Textarea rows={2} value={formServiceMaster.checklist} onChange={e => setFormServiceMaster(f => ({ ...f, checklist: e.target.value }))} /></div>
                <div><Label>Observações</Label><Textarea rows={2} value={formServiceMaster.observacoes} onChange={e => setFormServiceMaster(f => ({ ...f, observacoes: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterServiceMut.mutate({ ...formServiceMaster, clientId: formServiceMaster.clientId ? Number(formServiceMaster.clientId) : undefined } as any)} disabled={createMasterServiceMut.isPending}>
                    {createMasterServiceMut.isPending ? "Salvando..." : "Salvar serviço"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterServices as any[]).slice(0, 4).map((service: any) => (
                    <div key={service.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{service.nome}</p>
                        <Badge variant="outline">{service.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{service.clienteNome ?? "Sem cliente"} · {service.tipo}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Store className="w-4 h-4 text-orange-500" /> Google Meu Negócio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Perfil *</Label><Input value={formGoogleProfileMaster.perfil} onChange={e => setFormGoogleProfileMaster(f => ({ ...f, perfil: e.target.value }))} /></div>
                  <div><Label>Link do perfil</Label><Input value={formGoogleProfileMaster.linkPerfil} onChange={e => setFormGoogleProfileMaster(f => ({ ...f, linkPerfil: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Última atualização</Label><Input type="date" value={formGoogleProfileMaster.ultimaAtualizacao} onChange={e => setFormGoogleProfileMaster(f => ({ ...f, ultimaAtualizacao: e.target.value }))} /></div>
                  <div>
                    <Label>Cliente</Label>
                    <Select value={formGoogleProfileMaster.clientId || "sem_cliente"} onValueChange={v => setFormGoogleProfileMaster(f => ({ ...f, clientId: v === "sem_cliente" ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_cliente">Sem cliente</SelectItem>
                        {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label>Fotos</Label>
                    <Select value={formGoogleProfileMaster.fotosPendentes ? "sim" : "nao"} onValueChange={v => setFormGoogleProfileMaster(f => ({ ...f, fotosPendentes: v === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nao">Ok</SelectItem><SelectItem value="sim">Pendente</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Avaliações</Label>
                    <Select value={formGoogleProfileMaster.avaliacoesPendentes ? "sim" : "nao"} onValueChange={v => setFormGoogleProfileMaster(f => ({ ...f, avaliacoesPendentes: v === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nao">Ok</SelectItem><SelectItem value="sim">Pendente</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Postagem</Label>
                    <Select value={formGoogleProfileMaster.postagemSemanal ? "sim" : "nao"} onValueChange={v => setFormGoogleProfileMaster(f => ({ ...f, postagemSemanal: v === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Serviços</Label>
                    <Select value={formGoogleProfileMaster.servicosAtualizados ? "sim" : "nao"} onValueChange={v => setFormGoogleProfileMaster(f => ({ ...f, servicosAtualizados: v === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Relatório</Label>
                    <Select value={formGoogleProfileMaster.relatorioMensal ? "sim" : "nao"} onValueChange={v => setFormGoogleProfileMaster(f => ({ ...f, relatorioMensal: v === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Palavras-chave</Label><Input value={formGoogleProfileMaster.palavrasChave} onChange={e => setFormGoogleProfileMaster(f => ({ ...f, palavrasChave: e.target.value }))} /></div>
                <div><Label>Checklist de otimização</Label><Textarea rows={2} value={formGoogleProfileMaster.checklistOtimizacao} onChange={e => setFormGoogleProfileMaster(f => ({ ...f, checklistOtimizacao: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterGoogleProfileMut.mutate({ ...formGoogleProfileMaster, clientId: formGoogleProfileMaster.clientId ? Number(formGoogleProfileMaster.clientId) : undefined } as any)} disabled={createMasterGoogleProfileMut.isPending}>
                    {createMasterGoogleProfileMut.isPending ? "Salvando..." : "Salvar perfil"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterGoogleProfiles as any[]).slice(0, 4).map((profile: any) => (
                    <div key={profile.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{profile.perfil}</p>
                        <Badge variant="outline">{profile.clienteNome ?? "Interno"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Atualizado em {fmtData(profile.ultimaAtualizacao)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><MessageCircleMore className="w-4 h-4 text-violet-500" /> Follow-ups comerciais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Título *</Label><Input value={formFollowUpMaster.titulo} onChange={e => setFormFollowUpMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Canal</Label>
                    <Select value={formFollowUpMaster.canal} onValueChange={v => setFormFollowUpMaster(f => ({ ...f, canal: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formFollowUpMaster.status} onValueChange={v => setFormFollowUpMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="feito">Feito</SelectItem>
                        <SelectItem value="sem_retorno">Sem retorno</SelectItem>
                        <SelectItem value="reagendado">Reagendado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data prevista</Label><Input type="date" value={formFollowUpMaster.dataPrevista} onChange={e => setFormFollowUpMaster(f => ({ ...f, dataPrevista: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Cliente</Label>
                    <Select value={formFollowUpMaster.clientId || "sem_cliente"} onValueChange={v => setFormFollowUpMaster(f => ({ ...f, clientId: v === "sem_cliente" ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_cliente">Sem cliente</SelectItem>
                        {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Lead</Label>
                    <Select value={formFollowUpMaster.leadId || "sem_lead"} onValueChange={v => setFormFollowUpMaster(f => ({ ...f, leadId: v === "sem_lead" ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_lead">Sem lead</SelectItem>
                        {(masterLeads as any[]).map((lead: any) => <SelectItem key={lead.id} value={String(lead.id)}>{lead.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Proposta</Label>
                    <Select value={formFollowUpMaster.proposalId || "sem_proposta"} onValueChange={v => setFormFollowUpMaster(f => ({ ...f, proposalId: v === "sem_proposta" ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_proposta">Sem proposta</SelectItem>
                        {(masterProposals as any[]).map((proposal: any) => <SelectItem key={proposal.id} value={String(proposal.id)}>{proposal.titulo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Resposta / contexto</Label><Textarea rows={2} value={formFollowUpMaster.resposta} onChange={e => setFormFollowUpMaster(f => ({ ...f, resposta: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterFollowUpMut.mutate({
                    ...formFollowUpMaster,
                    clientId: formFollowUpMaster.clientId ? Number(formFollowUpMaster.clientId) : undefined,
                    leadId: formFollowUpMaster.leadId ? Number(formFollowUpMaster.leadId) : undefined,
                    proposalId: formFollowUpMaster.proposalId ? Number(formFollowUpMaster.proposalId) : undefined,
                  } as any)} disabled={createMasterFollowUpMut.isPending}>
                    {createMasterFollowUpMut.isPending ? "Salvando..." : "Salvar follow-up"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterFollowUps as any[]).slice(0, 4).map((follow: any) => (
                    <div key={follow.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{follow.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">{follow.clienteNome ?? follow.leadNome ?? follow.propostaTitulo ?? "Sem vínculo"} · {follow.canal}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => updateMasterFollowUpStatusMut.mutate({ id: follow.id, status: follow.status === "feito" ? "pendente" : "feito" })}>
                        {follow.status === "feito" ? "Reabrir" : "Concluir"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><CalendarRange className="w-4 h-4 text-amber-500" /> Agenda de cobrança</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Descrição *</Label><Input value={formPaymentScheduleMaster.descricao} onChange={e => setFormPaymentScheduleMaster(f => ({ ...f, descricao: e.target.value }))} /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>Valor *</Label><Input value={formPaymentScheduleMaster.valor} onChange={e => setFormPaymentScheduleMaster(f => ({ ...f, valor: e.target.value }))} /></div>
                  <div>
                    <Label>Recorrência</Label>
                    <Select value={formPaymentScheduleMaster.recorrencia} onValueChange={v => setFormPaymentScheduleMaster(f => ({ ...f, recorrencia: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="avulso">Avulso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formPaymentScheduleMaster.status} onValueChange={v => setFormPaymentScheduleMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="cobrado">Cobrado</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="atrasado">Atrasado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Vencimento</Label><Input type="date" value={formPaymentScheduleMaster.vencimento} onChange={e => setFormPaymentScheduleMaster(f => ({ ...f, vencimento: e.target.value }))} /></div>
                  <div>
                    <Label>Cliente</Label>
                    <Select value={formPaymentScheduleMaster.clientId || "sem_cliente"} onValueChange={v => setFormPaymentScheduleMaster(f => ({ ...f, clientId: v === "sem_cliente" ? "" : v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_cliente">Sem cliente</SelectItem>
                        {(masterClients as any[]).map((client: any) => <SelectItem key={client.id} value={String(client.id)}>{client.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Observações</Label><Textarea rows={2} value={formPaymentScheduleMaster.observacoes} onChange={e => setFormPaymentScheduleMaster(f => ({ ...f, observacoes: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterPaymentScheduleMut.mutate({ ...formPaymentScheduleMaster, clientId: formPaymentScheduleMaster.clientId ? Number(formPaymentScheduleMaster.clientId) : undefined } as any)} disabled={createMasterPaymentScheduleMut.isPending}>
                    {createMasterPaymentScheduleMut.isPending ? "Salvando..." : "Salvar cobrança"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterPaymentSchedules as any[]).slice(0, 4).map((schedule: any) => (
                    <div key={schedule.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-sm">{schedule.descricao}</p>
                        <p className="text-xs text-muted-foreground mt-1">{schedule.clienteNome ?? "Sem cliente"} · {fmtMoeda(schedule.valor)} · {schedule.recorrencia}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => updateMasterPaymentScheduleStatusMut.mutate({ id: schedule.id, status: schedule.status === "pago" ? "pendente" : "pago" })}>
                        {schedule.status === "pago" ? "Reabrir" : "Marcar pago"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Rocket className="w-4 h-4 text-cyan-500" /> Releases do Synapse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label>Versão *</Label><Input placeholder="v1.2.0" value={formSynapseReleaseMaster.versao} onChange={e => setFormSynapseReleaseMaster(f => ({ ...f, versao: e.target.value }))} /></div>
                  <div><Label>Título *</Label><Input value={formSynapseReleaseMaster.titulo} onChange={e => setFormSynapseReleaseMaster(f => ({ ...f, titulo: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={formSynapseReleaseMaster.status} onValueChange={v => setFormSynapseReleaseMaster(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planejada">Planejada</SelectItem>
                        <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                        <SelectItem value="em_teste">Em teste</SelectItem>
                        <SelectItem value="publicada">Publicada</SelectItem>
                        <SelectItem value="adiada">Adiada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data prevista</Label><Input type="date" value={formSynapseReleaseMaster.dataPrevista} onChange={e => setFormSynapseReleaseMaster(f => ({ ...f, dataPrevista: e.target.value }))} /></div>
                  <div><Label>Deploy</Label><Input value={formSynapseReleaseMaster.deployStatus} onChange={e => setFormSynapseReleaseMaster(f => ({ ...f, deployStatus: e.target.value }))} /></div>
                </div>
                <div><Label>Destaques</Label><Textarea rows={2} value={formSynapseReleaseMaster.destaques} onChange={e => setFormSynapseReleaseMaster(f => ({ ...f, destaques: e.target.value }))} /></div>
                <div><Label>Riscos</Label><Textarea rows={2} value={formSynapseReleaseMaster.riscos} onChange={e => setFormSynapseReleaseMaster(f => ({ ...f, riscos: e.target.value }))} /></div>
                <div className="flex justify-end">
                  <Button onClick={() => createMasterSynapseReleaseMut.mutate(formSynapseReleaseMaster as any)} disabled={createMasterSynapseReleaseMut.isPending}>
                    {createMasterSynapseReleaseMut.isPending ? "Salvando..." : "Salvar release"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(masterSynapseReleases as any[]).slice(0, 4).map((release: any) => (
                    <div key={release.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{release.versao} · {release.titulo}</p>
                        <Badge variant="outline">{release.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{release.dataPrevista ? fmtData(release.dataPrevista) : "Sem data"} · {release.deployStatus ?? "Sem deploy"}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══ VISÃO GERAL ═══════════════════════════════════════════════════════ */}
      {abaAtiva === "visao-geral" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Empresas Ativas", value: empresasAtivas, sub: `${(empresas as any[]).length} total`, cor: "text-blue-600", bg: "border-blue-200 bg-blue-50/30", icon: <Building2 className="w-9 h-9 text-blue-200" /> },
              { label: "Licenças Ativas", value: (dashboard as any)?.stats?.ativas ?? 0, sub: `${(dashboard as any)?.stats?.trial ?? 0} em trial`, cor: "text-green-600", bg: "border-green-200 bg-green-50/30", icon: <Package className="w-9 h-9 text-green-200" /> },
              { label: "Receita Mensal", value: fmtMoeda(receitaMensal), sub: "licenças ativas", cor: "text-purple-600", bg: "border-purple-200 bg-purple-50/30", icon: <DollarSign className="w-9 h-9 text-purple-200" /> },
              { label: "Vencendo em 7d", value: (dashboard as any)?.stats?.vencendoEm7dias ?? 0, sub: `${(dashboard as any)?.stats?.vencidas ?? 0} já vencidas`, cor: "text-red-600", bg: "border-red-200 bg-red-50/30", icon: <AlertTriangle className="w-9 h-9 text-red-200" /> },
            ].map((k, i) => (
              <Card key={i} className={k.bg}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                      <p className={`text-3xl font-bold mt-1 ${k.cor}`}>{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                    </div>
                    {k.icon}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Distribuição por Plano</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "trial", label: "Trial", cor: "bg-slate-400", count: (dashboard as any)?.stats?.porPlano?.trial ?? 0 },
                  { key: "basico", label: "Básico", cor: "bg-blue-500", count: (dashboard as any)?.stats?.porPlano?.basico ?? 0 },
                  { key: "pro", label: "Pro", cor: "bg-purple-500", count: (dashboard as any)?.stats?.porPlano?.pro ?? 0 },
                  { key: "enterprise", label: "Enterprise", cor: "bg-amber-500", count: (dashboard as any)?.stats?.porPlano?.enterprise ?? 0 },
                ].map(p => {
                  const total = (dashboard as any)?.stats?.total || 1;
                  const pct = Math.round((p.count / total) * 100);
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-muted-foreground">{p.count} empresa{p.count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${p.cor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Alertas de Vencimento</CardTitle>
              </CardHeader>
              <CardContent>
                {!(dashboard as any)?.alertas?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum vencimento nos próximos 30 dias ✓</p>
                ) : (
                  <div className="space-y-2">
                    {(dashboard as any).alertas.slice(0, 8).map((a: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                        <div>
                          <p className="font-medium">{a.empresaNome}</p>
                          <p className="text-xs text-muted-foreground">{PLANO_LABELS[a.plano]} · vence {fmtData(a.dataVencimento)}</p>
                        </div>
                        <Badge className={a.diasRestantes <= 3 ? "bg-red-100 text-red-700" : a.diasRestantes <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}>
                          {a.diasRestantes}d
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══ EMPRESAS ══════════════════════════════════════════════════════════ */}
      {abaAtiva === "empresas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{(empresas as any[]).length} empresa{(empresas as any[]).length !== 1 ? "s" : ""} cadastrada{(empresas as any[]).length !== 1 ? "s" : ""}</p>
            <Dialog open={modalEmpresa} onOpenChange={setModalEmpresa}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nova Empresa</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Nome *</Label><Input value={formEmpresa.nome} onChange={e => setFormEmpresa(f => ({ ...f, nome: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>CNPJ</Label><Input value={formEmpresa.cnpj} onChange={e => setFormEmpresa(f => ({ ...f, cnpj: e.target.value }))} /></div>
                    <div><Label>Telefone</Label><Input value={formEmpresa.telefone} onChange={e => setFormEmpresa(f => ({ ...f, telefone: e.target.value }))} /></div>
                  </div>
                  <div><Label>E-mail</Label><Input type="email" value={formEmpresa.email} onChange={e => setFormEmpresa(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Cidade</Label><Input value={formEmpresa.cidade} onChange={e => setFormEmpresa(f => ({ ...f, cidade: e.target.value }))} /></div>
                    <div><Label>Estado</Label><Input maxLength={2} value={formEmpresa.estado} onChange={e => setFormEmpresa(f => ({ ...f, estado: e.target.value.toUpperCase() }))} /></div>
                  </div>

                  <div>
                    <Label className="mb-1.5 block">Tipo de Empresa *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {["independente", "matriz", "filial", "grupo"].map(tipo => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setFormEmpresa(f => ({ ...f, tipoEmpresa: tipo, matrizId: tipo !== "filial" ? "" : f.matrizId, grupoId: tipo !== "grupo" ? "" : f.grupoId }))}
                          className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                            formEmpresa.tipoEmpresa === tipo
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-input hover:border-primary/50"
                          }`}>
                          {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formEmpresa.tipoEmpresa === "filial" && (
                    <div>
                      <Label>ID da Empresa Matriz *</Label>
                      <Input type="number" placeholder="Ex: 1" value={formEmpresa.matrizId} onChange={e => setFormEmpresa(f => ({ ...f, matrizId: e.target.value }))} />
                    </div>
                  )}

                  {formEmpresa.tipoEmpresa === "grupo" && (
                    <div>
                      <Label>ID do Grupo Empresarial (opcional)</Label>
                      <Input type="number" placeholder="Deixe em branco para novo" value={formEmpresa.grupoId} onChange={e => setFormEmpresa(f => ({ ...f, grupoId: e.target.value }))} />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setModalEmpresa(false)}>Cancelar</Button>
                    <Button onClick={() => criarEmpresaMut.mutate({
                      ...formEmpresa,
                      matrizId: formEmpresa.matrizId ? parseInt(formEmpresa.matrizId) : undefined,
                      grupoId: formEmpresa.grupoId ? parseInt(formEmpresa.grupoId) : undefined,
                    })} disabled={criarEmpresaMut.isPending}>
                      {criarEmpresaMut.isPending ? "Criando..." : "Criar Empresa"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {loadingEmpresas ? <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p> :
              (empresas as any[]).map((emp: any) => {
                const licEmp = (licencas as any[]).find((l: any) => l.licenca.empresaId === emp.id);
                const dataRef = licEmp?.licenca.dataFim ?? licEmp?.licenca.dataTrialFim;
                const dias = diasRestantes(dataRef);
                return (
                  <Card key={emp.id} className={!emp.ativo ? "opacity-60" : ""}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{emp.nome}</p>
                              {!emp.ativo && <Badge variant="outline" className="text-xs text-red-600 border-red-300">Inativa</Badge>}
                              {licEmp && <PlanoBadge plano={licEmp.licenca.planoCod} />}
                              {licEmp && <StatusBadge status={licEmp.licenca.status} />}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {emp.cnpj && <span>CNPJ: {emp.cnpj}</span>}
                              {emp.email && <span>{emp.email}</span>}
                              {emp.cidade && <span>{emp.cidade}/{emp.estado}</span>}
                              {emp.codigoConvite && (
                                <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => copiar(emp.codigoConvite, "Código de convite")}>
                                  <Key className="w-3 h-3" /> {emp.codigoConvite} <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {licEmp && dias !== null && (
                              <p className={`text-xs mt-1 font-medium ${dias <= 0 ? "text-red-600" : dias <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                                {dias <= 0 ? "⚠️ Licença vencida" : `${dias} dias restantes`}
                                {licEmp.licenca.valorContratado && ` · ${fmtMoeda(licEmp.licenca.valorContratado)}/${CICLO_LABELS[licEmp.licenca.ciclo ?? "mensal"]?.toLowerCase()}`}
                              </p>
                            )}
                            {!licEmp && <p className="text-xs text-orange-600 mt-1">⚠️ Sem licença cadastrada</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { enterAdminView(emp.id, emp.nome); navigate("/dashboard"); }}>
                            <Eye className="w-3.5 h-3.5" /> Ver como
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => regenerarConviteMut.mutate({ id: emp.id })}>
                            <RefreshCw className="w-3.5 h-3.5" /> Convite
                          </Button>
                          <Button size="sm" variant="outline" className={`gap-1 text-xs ${emp.ativo ? "text-red-600 border-red-300 hover:bg-red-50" : ""}`}
                            onClick={() => toggleAtivoMut.mutate({ id: emp.id })}>
                            {emp.ativo ? <><Ban className="w-3.5 h-3.5" /> Desativar</> : <><CheckCircle className="w-3.5 h-3.5" /> Ativar</>}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* ═══ LICENÇAS ══════════════════════════════════════════════════════════ */}
      {abaAtiva === "licencas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {["todos", "trial", "ativa", "suspensa", "vencida", "cancelada"].map(s => (
                <button key={s} onClick={() => setFiltroStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${filtroStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground"}`}>
                  {s === "todos" ? "Todos" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <Dialog open={modalLicenca} onOpenChange={setModalLicenca}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nova Licença</Button>
              </DialogTrigger>
              <ModalLicenca empresas={empresas as any[]} onClose={() => setModalLicenca(false)} refetch={refetchLicencas} />
            </Dialog>
          </div>

          {loadingLicencas ? <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p> :
            !licencasFiltradas.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma licença encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {licencasFiltradas.map((item: any) => {
                  const lic = item.licenca;
                  const emp = item.empresa;
                  const dataRef = lic.dataFim ?? lic.dataTrialFim;
                  const dias = diasRestantes(dataRef);
                  return (
                    <Card key={lic.id} className={lic.status === "cancelada" ? "opacity-60" : ""}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${lic.planoCod === "enterprise" ? "bg-amber-100" : lic.planoCod === "pro" ? "bg-purple-100" : lic.planoCod === "basico" ? "bg-blue-100" : "bg-slate-100"}`}>
                              <Package className={`w-5 h-5 ${lic.planoCod === "enterprise" ? "text-amber-600" : lic.planoCod === "pro" ? "text-purple-600" : lic.planoCod === "basico" ? "text-blue-600" : "text-slate-600"}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">{emp?.nome ?? `Empresa #${lic.empresaId}`}</p>
                                <PlanoBadge plano={lic.planoCod} />
                                <StatusBadge status={lic.status} />
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Início: {fmtData(lic.dataInicio)}</span>
                                {dataRef && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Vence: {fmtData(dataRef)}</span>}
                                {lic.ciclo && <span>{CICLO_LABELS[lic.ciclo]}</span>}
                                {lic.valorContratado && <span className="font-medium text-foreground">{fmtMoeda(lic.valorContratado)}</span>}
                                {lic.descontoPercent && parseFloat(lic.descontoPercent) > 0 && <span className="text-green-600">-{lic.descontoPercent}%</span>}
                              </div>
                              {dias !== null && (
                                <p className={`text-xs mt-1 font-medium ${dias <= 0 ? "text-red-600" : dias <= 7 ? "text-orange-600" : dias <= 30 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                  {dias <= 0 ? "⚠️ Vencida" : `${dias} dias restantes`}
                                </p>
                              )}
                              {lic.observacoes && <p className="text-xs text-muted-foreground mt-1 italic">{lic.observacoes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setModalAtualizarLic(lic)}>
                              <Edit2 className="w-3.5 h-3.5" /> Editar
                            </Button>
                            {lic.status !== "ativa" && lic.planoCod !== "trial" && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs text-green-600 border-green-300"
                                onClick={() => atualizarLicMut.mutate({ empresaId: lic.empresaId, renovar: true })}>
                                <RotateCcw className="w-3.5 h-3.5" /> Renovar
                              </Button>
                            )}
                            {lic.status === "ativa" && (
                              <Button size="sm" variant="outline" className="gap-1 text-xs text-orange-600 border-orange-300"
                                onClick={() => atualizarLicMut.mutate({ empresaId: lic.empresaId, status: "suspensa", motivoSuspensao: "Suspenso manualmente" })}>
                                <Ban className="w-3.5 h-3.5" /> Suspender
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {/* ═══ COBRANÇAS ═════════════════════════════════════════════════════════ */}
      {abaAtiva === "cobrancas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{(cobrancas as any[]).length} cobrança{(cobrancas as any[]).length !== 1 ? "s" : ""} registrada{(cobrancas as any[]).length !== 1 ? "s" : ""}</p>
            <Dialog open={modalCobranca} onOpenChange={setModalCobranca}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nova Cobrança</Button>
              </DialogTrigger>
              <ModalCobranca empresas={empresas as any[]} licencas={licencas as any[]} onClose={() => setModalCobranca(false)} refetch={refetchCobrancas} />
            </Dialog>
          </div>

          {!(cobrancas as any[]).length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma cobrança registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(cobrancas as any[]).map((item: any) => {
                const cob = item.cobranca;
                const emp = item.empresa;
                return (
                  <Card key={cob.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cob.status === "pago" ? "bg-green-100" : cob.status === "vencido" ? "bg-red-100" : "bg-yellow-100"}`}>
                            <Wallet className={`w-5 h-5 ${cob.status === "pago" ? "text-green-600" : cob.status === "vencido" ? "text-red-600" : "text-yellow-600"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{emp?.nome ?? `Empresa #${cob.empresaId}`}</p>
                              <PlanoBadge plano={cob.planoCod} />
                              <Badge className={`text-xs ${STATUS_COB_CORES[cob.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {cob.status === "pendente" ? "Pendente" : cob.status === "pago" ? "Pago" : cob.status === "vencido" ? "Vencido" : cob.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>Período: {fmtData(cob.periodoInicio)} – {fmtData(cob.periodoFim)}</span>
                              <span>Vence: {fmtData(cob.dataVencimento)}</span>
                              {cob.dataPagamento && <span className="text-green-600">Pago em: {fmtData(cob.dataPagamento)}</span>}
                              {cob.formaPagamento && <span>{FP_LABELS[cob.formaPagamento]}</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                              {parseFloat(cob.desconto) > 0 && <span className="text-muted-foreground line-through text-xs">{fmtMoeda(cob.valorBruto)}</span>}
                              <span className="font-semibold text-foreground">{fmtMoeda(cob.valorLiquido)}</span>
                              {parseFloat(cob.desconto) > 0 && <span className="text-green-600 text-xs">-{fmtMoeda(cob.desconto)}</span>}
                            </div>
                          </div>
                        </div>
                        {cob.status === "pendente" && (
                          <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => setModalPagarCob(cob)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Registrar Pagamento
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ PLANOS ════════════════════════════════════════════════════════════ */}
      {abaAtiva === "planos" && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Configure os preços e limites de cada plano. As alterações afetam novas contratações.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { codigo: "trial",      nome: "Trial",      cor: "border-slate-300",  bg: "bg-slate-50",  icon: "🧪", desc: "Período de teste gratuito" },
              { codigo: "basico",     nome: "Básico",     cor: "border-blue-300",   bg: "bg-blue-50",   icon: "🔵", desc: "Frotas pequenas" },
              { codigo: "pro",        nome: "Pro",        cor: "border-purple-300", bg: "bg-purple-50", icon: "🟣", desc: "Frotas médias e grandes" },
              { codigo: "enterprise", nome: "Enterprise", cor: "border-amber-300",  bg: "bg-amber-50",  icon: "🟡", desc: "Solução completa" },
            ].map(p => {
              const plano = (planos as any[]).find((pl: any) => pl.codigo === p.codigo);
              return <PlanoCard key={p.codigo} plano={plano} meta={p} onSave={(updates: any) => atualizarPlanoMut.mutate({ codigo: p.codigo as any, ...updates })} />;
            })}
          </div>
        </div>
      )}

      {/* ═══ CONFIGURAÇÕES ═════════════════════════════════════════════════════ */}
      {abaAtiva === "config" && (
        <div className="space-y-4 max-w-lg">
          <Card>
            <CardHeader><CardTitle className="text-base">Administradores</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(allUsers as any[]).filter((u: any) => u.role === "admin" || u.role === "master_admin").map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{u.name} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge className={u.role === "master_admin" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                      {u.role === "master_admin" ? "Master" : "Admin"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modais flutuantes */}
      {modalAtualizarLic && (
        <ModalAtualizarLicenca licenca={modalAtualizarLic} onClose={() => setModalAtualizarLic(null)}
          onSave={(updates: any) => atualizarLicMut.mutate({ empresaId: modalAtualizarLic.empresaId, ...updates })}
          loading={atualizarLicMut.isPending} />
      )}
      {modalPagarCob && (
        <ModalRegistrarPagamento cobranca={modalPagarCob} onClose={() => setModalPagarCob(null)}
          onSave={(data: any) => pagarCobMut.mutate({ cobrancaId: modalPagarCob.id, ...data })}
          loading={pagarCobMut.isPending} />
      )}
    </div>
  );
}
