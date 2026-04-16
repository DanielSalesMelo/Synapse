import { useTranslation } from 'react-i18next';
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Truck, Wrench, FileText, AlertTriangle } from "lucide-react";
import { useViewAs } from "@/contexts/ViewAsContext";


const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDiasDoMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const diaSemanaInicio = primeiro.getDay();
  const dias: (number | null)[] = [];
  for (let i = 0; i < diaSemanaInicio; i++) dias.push(null);
  for (let d = 1; d <= ultimoDia; d++) dias.push(d);
  return dias;
}

function dateKey(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

type Evento = { tipo: "viagem" | "manutencao" | "documento" | "multa"; titulo: string; cor: string };

export default function Calendario() {
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { t } = useTranslation();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(hoje.getDate());

  const { data: viagens = [] } = trpc.viagens.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: manutencoes = [] } = trpc.frota.manutencoes.list.useQuery({ empresaId: EMPRESA_ID });
  const { data: multas = [] } = trpc.multas.list.useQuery({ empresaId: EMPRESA_ID });

  const documentos: any[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("synapse_documentos") || "[]"); } catch { return []; }
  }, []);

  // Mapear eventos por dia
  const eventosPorDia = useMemo(() => {
    const mapa: Record<string, Evento[]> = {};
    const add = (key: string, ev: Evento) => {
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push(ev);
    };

    viagens.forEach((v: any) => {
      if (v.dataSaida || v.createdAt) {
        const dt = v.dataSaida || v.createdAt;
        add(dateKey(dt), { tipo: "viagem", titulo: `${v.origem || "?"} → ${v.destino || "?"}`, cor: "bg-blue-500" });
      }
      if (v.dataChegada) {
        add(dateKey(v.dataChegada), { tipo: "viagem", titulo: `Retorno: ${v.destino || "?"}`, cor: "bg-green-500" });
      }
    });

    manutencoes.forEach((m: any) => {
      const dt = m.dataAgendada || m.data || m.createdAt;
      if (dt) {
        add(dateKey(dt), { tipo: "manutencao", titulo: `${m.tipo || m.descricao || "Manutenção"} — ${m.veiculoPlaca || ""}`, cor: "bg-orange-500" });
      }
    });

    multas.forEach((m: any) => {
      if (m.vencimento) {
        add(dateKey(m.vencimento), { tipo: "multa", titulo: `Multa: ${m.descricao || "Infração"} — ${m.veiculoPlaca || ""}`, cor: "bg-red-500" });
      }
    });

    documentos.forEach((d: any) => {
      if (d.vencimento) {
        add(dateKey(d.vencimento), { tipo: "documento", titulo: `${d.tipo} — ${d.veiculoPlaca || d.motoristaNome || ""}`, cor: "bg-purple-500" });
      }
    });

    return mapa;
  }, [viagens, manutencoes, multas, documentos]);

  const dias = getDiasDoMes(ano, mes);
  const hojeKey = dateKey(hoje);

  const mesAnterior = () => {
    if (mes === 0) { setMes(11); setAno(a => a - 1); }
    else setMes(m => m - 1);
    setDiaSelecionado(null);
  };
  const mesSeguinte = () => {
    if (mes === 11) { setMes(0); setAno(a => a + 1); }
    else setMes(m => m + 1);
    setDiaSelecionado(null);
  };

  const diaKey = diaSelecionado ? `${ano}-${String(mes + 1).padStart(2, "0")}-${String(diaSelecionado).padStart(2, "0")}` : null;
  const eventosDoDia = diaKey ? (eventosPorDia[diaKey] || []) : [];

  const iconePorTipo = {
    viagem: <Truck className="w-4 h-4" />,
    manutencao: <Wrench className="w-4 h-4" />,
    documento: <FileText className="w-4 h-4" />,
    multa: <AlertTriangle className="w-4 h-4" />,
  };

  return (
<div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-purple-500" />
          Calendário
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Viagens, manutenções, vencimentos e multas</p>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Viagens</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Manutenções</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Multas</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Documentos</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            {/* Header do mês */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={mesAnterior}><ChevronLeft className="w-4 h-4" /></Button>
              <h2 className="text-lg font-bold">{MESES[mes]} {ano}</h2>
              <Button variant="outline" size="icon" onClick={mesSeguinte}><ChevronRight className="w-4 h-4" /></Button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1">
              {dias.map((dia, i) => {
                if (dia === null) return <div key={`empty-${i}`} />;
                const key = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const eventos = eventosPorDia[key] || [];
                const isHoje = key === hojeKey;
                const isSelecionado = dia === diaSelecionado;

                return (
                  <button
                    key={key}
                    onClick={() => setDiaSelecionado(dia)}
                    className={`relative p-2 rounded-lg text-sm transition-all min-h-[60px] flex flex-col items-center
                      ${isHoje ? "ring-2 ring-primary" : ""}
                      ${isSelecionado ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}
                    `}
                  >
                    <span className={`font-medium ${isHoje && !isSelecionado ? "text-primary" : ""}`}>{dia}</span>
                    {eventos.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {eventos.slice(0, 3).map((ev, j) => (
                          <span key={j} className={`w-2 h-2 rounded-full ${isSelecionado ? "bg-primary-foreground/70" : ev.cor}`} />
                        ))}
                        {eventos.length > 3 && <span className="text-[9px] text-muted-foreground">+{eventos.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do dia */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">
              {diaSelecionado
                ? `${diaSelecionado} de ${MESES[mes]}`
                : "Selecione um dia"
              }
            </h3>
            {eventosDoDia.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {diaSelecionado ? "Nenhum evento neste dia" : "Clique em um dia para ver os eventos"}
              </p>
            ) : (
              <div className="space-y-2">
                {eventosDoDia.map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <span className={`p-1.5 rounded ${ev.cor} text-white shrink-0`}>
                      {iconePorTipo[ev.tipo]}
                    </span>
                    <div className="min-w-0">
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {ev.tipo === "viagem" ? "Viagem" : ev.tipo === "manutencao" ? "Manutenção" : ev.tipo === "multa" ? "Multa" : "Documento"}
                      </Badge>
                      <p className="text-sm">{ev.titulo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
);
}
