import { useState } from "react";
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
  RotateCcw, Receipt, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useEffect } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Aba = "visao-geral" | "empresas" | "licencas" | "cobrancas" | "planos" | "config";

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
  const [, navigate] = useLocation();
  const [abaAtiva, setAbaAtiva] = useState<Aba>("visao-geral");
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

  const criarEmpresaMut = trpc.empresas.criar.useMutation({
    onSuccess: (d) => { toast.success(d.mensagem || "Empresa criada!"); setModalEmpresa(false); setFormEmpresa({ nome: "", cnpj: "", email: "", telefone: "", cidade: "", estado: "", tipoEmpresa: "independente" }); refetchEmpresas(); },
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

  const [formEmpresa, setFormEmpresa] = useState({ nome: "", cnpj: "", email: "", telefone: "", cidade: "", estado: "", tipoEmpresa: "independente" as any });

  useEffect(() => {
    if (!loading && user && (user as any).role !== "master_admin") navigate("/dashboard");
  }, [user, loading, navigate]);
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
          { key: "visao-geral", label: "Visão Geral",   icon: <Activity className="w-4 h-4" /> },
          { key: "empresas",    label: "Empresas",      icon: <Building2 className="w-4 h-4" /> },
          { key: "licencas",    label: "Licenças",      icon: <Package className="w-4 h-4" /> },
          { key: "cobrancas",   label: "Cobranças",     icon: <Receipt className="w-4 h-4" /> },
          { key: "planos",      label: "Planos",        icon: <Star className="w-4 h-4" /> },
          { key: "config",      label: "Configurações", icon: <Settings className="w-4 h-4" /> },
        ] as const).map(aba => (
          <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${abaAtiva === aba.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {aba.icon} {aba.label}
            {aba.key === "licencas" && (dashboard as any)?.stats?.vencendoEm7dias ? (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{(dashboard as any).stats.vencendoEm7dias}</span>
            ) : null}
          </button>
        ))}
      </div>

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
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setModalEmpresa(false)}>Cancelar</Button>
                    <Button onClick={() => criarEmpresaMut.mutate(formEmpresa)} disabled={criarEmpresaMut.isPending}>
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
