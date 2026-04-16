import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Clock, LogIn, LogOut, Coffee, User, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const TIPO_ICONS: Record<string, React.ReactNode> = {
  entrada: <LogIn className="h-4 w-4 text-green-600" />,
  saida: <LogOut className="h-4 w-4 text-red-600" />,
  inicio_intervalo: <Coffee className="h-4 w-4 text-yellow-600" />,
  fim_intervalo: <Coffee className="h-4 w-4 text-blue-600" />,
};

const TIPO_LABELS: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
  inicio_intervalo: "Início Intervalo",
  fim_intervalo: "Fim Intervalo",
};

const TIPO_COLORS: Record<string, string> = {
  entrada: "bg-green-100 text-green-700 border-green-200",
  saida: "bg-red-100 text-red-700 border-red-200",
  inicio_intervalo: "bg-yellow-100 text-yellow-700 border-yellow-200",
  fim_intervalo: "bg-blue-100 text-blue-700 border-blue-200",
};

const TIPO_BUTTON_STYLES: Record<string, string> = {
  entrada: "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200",
  inicio_intervalo: "bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-200",
  fim_intervalo: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200",
  saida: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200",
};

export default function Ponto() {
  const { user } = useAuth();
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Registros do usuário logado
  const registros = trpc.ponto.list.useQuery({
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });

  // Resumo do dia do usuário logado
  const resumoDia = trpc.ponto.resumoDia.useQuery();

  const registrar = trpc.ponto.registrar.useMutation({
    onSuccess: (data) => {
      registros.refetch();
      resumoDia.refetch();
      toast.success(`${TIPO_LABELS[data.tipo]} registrada com sucesso!`);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao registrar ponto");
    },
  });

  function handleRegistrar(tipo: "entrada" | "saida" | "inicio_intervalo" | "fim_intervalo") {
    registrar.mutate({ tipo });
  }

  const agora = new Date();
  const horaAtual = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dataAtual = agora.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Determina o próximo tipo de ponto esperado
  const registrosHoje = (resumoDia.data as any[]) || [];
  const ultimoTipo = registrosHoje.length > 0 ? registrosHoje[registrosHoje.length - 1]?.tipo : null;
  const proximoTipo = (() => {
    if (!ultimoTipo) return "entrada";
    if (ultimoTipo === "entrada") return "inicio_intervalo";
    if (ultimoTipo === "inicio_intervalo") return "fim_intervalo";
    if (ultimoTipo === "fim_intervalo") return "saida";
    return null; // já saiu
  })();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Ponto Eletrônico
          </h1>
          <p className="text-muted-foreground">Registre sua jornada de trabalho</p>
        </div>
      </div>

      {/* Card do usuário logado + relógio */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Info do usuário */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">{user?.name} {user?.lastName || ""}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Relógio */}
            <div className="text-center">
              <p className="text-4xl font-mono font-bold text-primary">{horaAtual}</p>
              <p className="text-sm text-muted-foreground capitalize">{dataAtual}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de registro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Registrar Ponto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["entrada", "inicio_intervalo", "fim_intervalo", "saida"] as const).map((tipo) => (
              <Button
                key={tipo}
                onClick={() => handleRegistrar(tipo)}
                className={`h-20 flex flex-col gap-1 text-sm font-semibold transition-all ${TIPO_BUTTON_STYLES[tipo]} ${proximoTipo === tipo ? "ring-2 ring-offset-2 ring-current scale-105" : "opacity-80 hover:opacity-100"}`}
                disabled={registrar.isPending}
              >
                <span className="text-2xl">
                  {tipo === "entrada" && <LogIn className="h-6 w-6" />}
                  {tipo === "inicio_intervalo" && <Coffee className="h-6 w-6" />}
                  {tipo === "fim_intervalo" && <Coffee className="h-6 w-6" />}
                  {tipo === "saida" && <LogOut className="h-6 w-6" />}
                </span>
                {TIPO_LABELS[tipo]}
                {proximoTipo === tipo && (
                  <span className="text-xs opacity-80">← próximo</span>
                )}
              </Button>
            ))}
          </div>

          {registrar.isPending && (
            <p className="text-center text-sm text-muted-foreground mt-3 animate-pulse">Registrando...</p>
          )}
        </CardContent>
      </Card>

      {/* Resumo do dia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Registros de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumoDia.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : registrosHoje.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum registro hoje. Clique em <strong>Entrada</strong> para começar.</p>
            </div>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {registrosHoje.map((r: any, idx: number) => (
                <div key={r.id} className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3 border">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-background border">
                    <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                  </div>
                  {TIPO_ICONS[r.tipo]}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{TIPO_LABELS[r.tipo]}</p>
                    <p className="text-base font-bold font-mono">
                      {new Date(r.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros e histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Registros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div>
              <Label className="text-xs text-muted-foreground">Data Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data Fim</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
            </div>
          </div>

          {registros.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : (registros.data as any[])?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado no período.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Localização</TableHead>
                    <TableHead className="hidden md:table-cell">Observação</TableHead>
                    <TableHead>Ajuste</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(registros.data as any[])?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(r.dataHora).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${TIPO_COLORS[r.tipo] || ""} border text-xs`}>
                          <span className="flex items-center gap-1">
                            {TIPO_ICONS[r.tipo]}
                            {TIPO_LABELS[r.tipo] || r.tipo}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {r.latitude && r.longitude ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.latitude}, {r.longitude}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{r.observacao || "—"}</TableCell>
                      <TableCell>
                        {r.ajustadoPor ? (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                            Ajustado
                          </Badge>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
