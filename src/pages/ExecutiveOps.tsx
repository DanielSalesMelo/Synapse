import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  Building2,
  CheckCircle2,
  Cpu,
  Layers3,
  Network,
  Shield,
  Sparkles,
  Ticket,
  UsersRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useViewAs } from "@/contexts/ViewAsContext";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  risco: "Risco",
  critico: "Crítico",
  estavel: "Estável",
  movimento: "Em movimento",
  configurar: "Configurar",
  preparado: "Preparado",
  aprendizado: "Aprendizado",
  governado: "Governado",
  evoluir: "Evoluir",
};

const moduleIcons: Record<string, any> = {
  atendimento: Ticket,
  monitoramento: Activity,
  inventario: Cpu,
  rede: Network,
  seguranca: Shield,
  ia: Brain,
  automacao: Zap,
  executivo: Sparkles,
};

function n(value: any) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function statusClass(status: string) {
  if (["saudavel", "estavel", "ativo"].includes(status)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (["atencao", "movimento", "configurar", "evoluir"].includes(status)) return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  if (["risco", "critico"].includes(status)) return "border-red-500/30 bg-red-500/10 text-red-100";
  return "border-sky-500/30 bg-sky-500/10 text-sky-100";
}

function healthGradient(score: number) {
  if (score >= 85) return "from-emerald-500 via-teal-400 to-sky-500";
  if (score >= 70) return "from-amber-400 via-orange-400 to-red-400";
  return "from-red-500 via-rose-500 to-fuchsia-500";
}

export default function ExecutiveOps() {
  const { user } = useAuth();
  const { effectiveEmpresaId, isSimulating, viewAs } = useViewAs();
  const role = String((user as any)?.role || "").toLowerCase();
  const isMasterGlobal = role === "master_admin" && !isSimulating;
  const canOpen = ["master_admin", "admin", "admin_empresa", "administrador", "supervisor_geral", "ti", "supervisor_ti"].includes(role);
  const scopedInput = isMasterGlobal || !effectiveEmpresaId ? undefined : { empresaId: effectiveEmpresaId };
  const enabled = canOpen && (isMasterGlobal || effectiveEmpresaId > 0);

  const resumo = trpc.corporativo.resumoExecutivo.useQuery(scopedInput, {
    enabled,
    refetchInterval: 30000,
  }) as any;
  const unidades = trpc.corporativo.listarUnidades.useQuery(
    { ...(scopedInput ?? {}), incluirArquivadas: true },
    { enabled, refetchInterval: 60000 },
  ) as any;
  const utils = trpc.useUtils();

  const [form, setForm] = useState({ name: "", type: "setor", code: "", costCenter: "" });

  const criarUnidade = trpc.corporativo.criarUnidade.useMutation({
    onSuccess: async () => {
      setForm({ name: "", type: "setor", code: "", costCenter: "" });
      await Promise.all([
        utils.corporativo.resumoExecutivo.invalidate(),
        utils.corporativo.listarUnidades.invalidate(),
      ]);
      toast.success("Setor/unidade criado com sucesso.");
    },
    onError: (err: any) => toast.error(err?.message || "Não foi possível criar a unidade."),
  }) as any;

  const arquivarUnidade = trpc.corporativo.arquivarUnidade.useMutation({
    onSuccess: async (result: any) => {
      await Promise.all([
        utils.corporativo.resumoExecutivo.invalidate(),
        utils.corporativo.listarUnidades.invalidate(),
      ]);
      toast.success(result?.message || "Unidade arquivada.");
    },
    onError: (err: any) => toast.error(err?.message || "Não foi possível arquivar."),
  }) as any;

  const data = resumo.data;
  const unidadesData = unidades.data ?? [];
  const score = Number(data?.score ?? 0);
  const createDisabled = isMasterGlobal || !effectiveEmpresaId || !form.name.trim() || criarUnidade.isPending;

  if (!canOpen) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-xl border-slate-800 bg-slate-950/70">
          <CardContent className="p-8 text-center space-y-3">
            <Shield className="h-10 w-10 mx-auto text-slate-400" />
            <h1 className="text-xl font-semibold">Centro Operacional restrito</h1>
            <p className="text-sm text-muted-foreground">
              Usuários comuns continuam com uma experiência simples de atendimento. Esta visão é apenas para TI, supervisão e administração.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.22),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-2xl shadow-slate-950/30">
        <div className="absolute right-6 top-6 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-sky-400/30 bg-sky-400/10 text-sky-100">AI-first</Badge>
              <Badge variant="outline" className="border-white/15 text-slate-200">
                {data?.contexto?.global ? "Master Admin · visão global" : viewAs.empresaNome ? `Empresa: ${viewAs.empresaNome}` : "Empresa ativa"}
              </Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Centro Operacional Synapse</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Saúde executiva, setores, atendimento, ativos e sinais preventivos no mesmo lugar. Esta é a base para medir custo, risco e recorrência por área da empresa.
              </p>
            </div>
          </div>
          <div className="min-w-64 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Score operacional</span>
              <span>{statusLabels[data?.statusGeral] ?? "Calculando"}</span>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl font-semibold text-white">{resumo.isLoading ? "..." : score}</span>
              <span className="pb-2 text-sm text-slate-400">/100</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${healthGradient(score)} transition-all`}
                style={{ width: `${Math.max(6, score)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {resumo.error ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-5 text-sm text-red-100">
            Não foi possível carregar o centro operacional agora: {resumo.error.message}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Chamados abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-semibold">{n(data?.tickets?.abertos)}</div>
              <Ticket className="h-8 w-8 text-sky-300" />
            </div>
            <p className="mt-2 text-xs text-slate-500">{n(data?.tickets?.criticos)} crítico(s) · {n(data?.tickets?.ultimos7d)} nos últimos 7 dias</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Ativos monitorados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-semibold">{n(data?.ativos?.monitorados)}</div>
              <Cpu className="h-8 w-8 text-emerald-300" />
            </div>
            <p className="mt-2 text-xs text-slate-500">{n(data?.ativos?.online)} online · {n(data?.ativos?.offline)} offline</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Setores e unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-semibold">{n(data?.unidades?.ativos)}</div>
              <Building2 className="h-8 w-8 text-violet-300" />
            </div>
            <p className="mt-2 text-xs text-slate-500">{n(data?.unidades?.semResponsavel)} sem responsável definido</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Sinais preventivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-semibold">{n((data?.ativos?.semHeartbeat7d ?? 0) + (data?.seguranca?.criticos ?? 0))}</div>
              <AlertTriangle className="h-8 w-8 text-amber-300" />
            </div>
            <p className="mt-2 text-xs text-slate-500">Heartbeat vencido, segurança e criticidade técnica</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-sky-300" />
              Módulos Synapse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(data?.modulos ?? []).map((mod: any) => {
                const Icon = moduleIcons[mod.key] ?? CheckCircle2;
                return (
                  <div key={mod.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-400/30 hover:bg-white/[0.06]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2">
                          <Icon className="h-4 w-4 text-sky-200" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-100">{mod.nome}</div>
                          <div className="mt-1 text-xs text-slate-500">{statusLabels[mod.status] ?? mod.status}</div>
                        </div>
                      </div>
                      <Badge className={statusClass(mod.sinal)}>{statusLabels[mod.sinal] ?? mod.sinal}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-violet-300" />
              Copiloto operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.insights ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">Sem recomendações no momento.</p>
            ) : (
              (data?.insights ?? []).map((item: any, index: number) => (
                <div key={`${item.titulo}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <Badge className={statusClass(item.tipo === "risco" ? "risco" : item.tipo === "acao" ? "atencao" : "estavel")}>
                    {item.tipo === "risco" ? "Risco" : item.tipo === "acao" ? "Ação" : "Oportunidade"}
                  </Badge>
                  <h3 className="mt-3 text-sm font-semibold text-slate-100">{item.titulo}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.descricao}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-violet-300" />
              Setores, unidades e centros de custo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMasterGlobal ? (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100">
                Você está em visão global. Para cadastrar setor/unidade, entre na visão de uma empresa no Painel Master.
              </div>
            ) : null}
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex.: Financeiro, RH, Produção"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="setor">Setor</SelectItem>
                      <SelectItem value="filial">Filial</SelectItem>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="equipe">Equipe</SelectItem>
                      <SelectItem value="grupo">Grupo</SelectItem>
                      <SelectItem value="centro_custo">Centro de custo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="FIN" />
                </div>
                <div className="space-y-1.5">
                  <Label>Centro de custo</Label>
                  <Input value={form.costCenter} onChange={(event) => setForm((prev) => ({ ...prev, costCenter: event.target.value }))} placeholder="CC-001" />
                </div>
              </div>
              <Button
                disabled={createDisabled}
                onClick={() => criarUnidade.mutate({
                  ...(scopedInput ?? {}),
                  name: form.name,
                  type: form.type,
                  code: form.code || undefined,
                  costCenter: form.costCenter || undefined,
                })}
                className="bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:from-sky-400 hover:to-violet-400"
              >
                Criar setor/unidade
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="h-4 w-4 text-emerald-300" />
              Impacto por setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Setor</th>
                    <th className="px-4 py-3 text-right">Chamados</th>
                    <th className="px-4 py-3 text-right">Críticos</th>
                    <th className="px-4 py-3 text-right">Ativos</th>
                    <th className="px-4 py-3 text-right">Offline</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.setores ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                        Ainda não há dados por setor. Cadastre setores e vincule usuários/agentes para habilitar a visão preventiva.
                      </td>
                    </tr>
                  ) : (
                    (data?.setores ?? []).map((row: any) => (
                      <tr key={row.setor} className="border-t border-white/10">
                        <td className="px-4 py-3 font-medium text-slate-100">{row.setor}</td>
                        <td className="px-4 py-3 text-right">{n(row.chamadosAbertos)}</td>
                        <td className="px-4 py-3 text-right text-red-200">{n(row.chamadosCriticos)}</td>
                        <td className="px-4 py-3 text-right">{n(row.ativos)}</td>
                        <td className="px-4 py-3 text-right text-amber-200">{n(row.offline)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">Unidades cadastradas</h3>
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                {unidades.isLoading ? (
                  <p className="text-sm text-slate-500">Carregando unidades...</p>
                ) : unidadesData.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma unidade cadastrada ainda.</p>
                ) : (
                  unidadesData.map((unit: any) => (
                    <div key={unit.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{unit.name}</div>
                        <div className="text-xs text-slate-500">
                          {unit.type} · {unit.empresa_nome ?? "empresa"} {unit.costCenter ? `· ${unit.costCenter}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusClass(unit.status)}>{unit.status === "arquivado" ? "Arquivado" : "Ativo"}</Badge>
                        {unit.status !== "arquivado" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Arquivar ${unit.name}? O histórico será preservado.`)) {
                                arquivarUnidade.mutate({ id: unit.id, ...(scopedInput ?? {}), motivo: "Arquivado pelo Centro Operacional" });
                              }
                            }}
                          >
                            Arquivar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
