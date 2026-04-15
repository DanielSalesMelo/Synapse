
import { useTranslation } from 'react-i18next';
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Clock, Wrench, FileText, DollarSign, CheckCircle } from "lucide-react";
import { useMemo } from "react";

const EMPRESA_ID = 1;

function getDiasRestantes(vencimento: string | null): number | null {
  if (!vencimento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento);
  venc.setHours(0, 0, 0, 0);
  return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Alertas() {
  const { t } = useTranslation();
  const { data: veiculos = [] } = trpc.veiculos.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: manutencoes = [] } = trpc.frota.manutencoes.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: multas = [] } = trpc.multas.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: documentos = [] } = trpc.documentos.list.useQuery({ empresaId: EMPRESA_ID });

  const alertas = useMemo(() => {
    const list: { tipo: string; titulo: string; descricao: string; nivel: "critico" | "alto" | "medio"; icon: React.ReactNode }[] = [];

    // 1. Alertas de Manutenção
    manutencoes.forEach((m: any) => {
      if (m.status === "pendente" || m.status === "agendada") {
        const veiculo = veiculos.find((v: any) => v.id === m.veiculoId);
        list.push({
          tipo: "Manutenção",
          titulo: `Manutenção pendente — ${veiculo?.placa || "Veículo"}`,
          descricao: `${m.tipo || m.descricao || "Serviço"} — ${m.empresa || "Oficina não informada"}`,
          nivel: m.status === "agendada" ? "medio" : "alto",
          icon: <Wrench className="w-5 h-5" />,
        });
      }
    });

    // 2. Alertas de Multas
    multas.forEach((m: any) => {
      if (m.status === "pendente" && m.vencimento) {
        const dias = getDiasRestantes(m.vencimento);
        if (dias !== null) {
          if (dias < 0) {
            list.push({
              tipo: "Multa",
              titulo: `Multa vencida — ${m.veiculoPlaca || "Veículo"}`,
              descricao: `${m.descricao} — ${Number(m.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
              nivel: "critico",
              icon: <DollarSign className="w-5 h-5" />,
            });
          } else if (dias <= 7) {
            list.push({
              tipo: "Multa",
              titulo: `Multa vence em ${dias} dia(s) — ${m.veiculoPlaca || "Veículo"}`,
              descricao: `${m.descricao} — ${Number(m.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
              nivel: "alto",
              icon: <DollarSign className="w-5 h-5" />,
            });
          }
        }
      }
    });

    // 3. Alertas de Documentos (GED)
    documentos.forEach((d: any) => {
      const dias = getDiasRestantes(d.dataVencimento);
      if (dias !== null) {
        const vinculo = d.veiculoId ? `Veículo: ${veiculos.find((v: any) => v.id === d.veiculoId)?.placa || '...'}` : 
                        d.funcionarioId ? `Func.: ${trpc.useUtils().funcionarios.list.getData({empresaId: EMPRESA_ID})?.find((f: any) => f.id === d.funcionarioId)?.nome || '...'}` : '';
        
        if (dias < 0) {
          list.push({
            tipo: "Documento",
            titulo: `${d.nome} VENCIDO`,
            descricao: `${vinculo} — Venceu há ${Math.abs(dias)} dia(s)`,
            nivel: "critico",
            icon: <FileText className="w-5 h-5" />,
          });
        } else if (dias <= 30) {
          list.push({
            tipo: "Documento",
            titulo: `${d.nome} vence em ${dias} dias`,
            descricao: `${vinculo} — Vencimento: ${new Date(d.dataVencimento).toLocaleDateString("pt-BR")}`,
            nivel: dias <= 7 ? "alto" : "medio",
            icon: <FileText className="w-5 h-5" />,
          });
        }
      }
    });

    return list;
  }, [veiculos, manutencoes, multas, documentos]);

  const nivelConfig = {
    critico: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-300", bg: "border-l-4 border-l-red-500" },
    alto:    { label: "Alto",    color: "bg-orange-100 text-orange-700 border-orange-300", bg: "border-l-4 border-l-orange-500" },
    medio:   { label: "Médio",   color: "bg-yellow-100 text-yellow-700 border-yellow-300", bg: "border-l-4 border-l-yellow-500" },
  };

  const stats = useMemo(() => ({
    total: alertas.length,
    criticos: alertas.filter(a => a.nivel === "critico").length,
    altos: alertas.filter(a => a.nivel === "alto").length,
    medios: alertas.filter(a => a.nivel === "medio").length,
  }), [alertas]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          Central de Alertas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Monitoramento automático de vencimentos e pendências</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase font-semibold">Total</p><p className="text-2xl font-bold mt-1">{stats.total}</p></CardContent></Card>
        <Card className="border-red-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase font-semibold">Críticos</p><p className="text-2xl font-bold mt-1 text-red-600">{stats.criticos}</p></CardContent></Card>
        <Card className="border-orange-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase font-semibold">Altos</p><p className="text-2xl font-bold mt-1 text-orange-600">{stats.altos}</p></CardContent></Card>
        <Card className="border-yellow-200"><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground uppercase font-semibold">Médios</p><p className="text-2xl font-bold mt-1 text-yellow-600">{stats.medios}</p></CardContent></Card>
      </div>

      {alertas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p className="text-lg font-medium text-green-600">Tudo em ordem!</p>
            <p className="text-sm mt-1">Nenhum alerta ativo no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(["critico", "alto", "medio"] as const).map(nivel => {
            const grupo = alertas.filter(a => a.nivel === nivel);
            if (grupo.length === 0) return null;
            const cfg = nivelConfig[nivel];
            return (
              <div key={nivel} className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {cfg.label} ({grupo.length})
                </h3>
                <div className="grid gap-3">
                  {grupo.map((alerta, i) => (
                    <Card key={i} className={`${cfg.bg} hover:shadow-md transition-shadow`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${cfg.color.split(" ")[0]} shrink-0`}>
                            <span className={cfg.color.split(" ")[1]}>{alerta.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold">{alerta.titulo}</span>
                              <Badge variant="outline" className="text-[10px] uppercase">{alerta.tipo}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{alerta.descricao}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
