import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Clock, LogIn, LogOut, Coffee, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const TIPO_ICONS: Record<string, any> = {
  entrada: <LogIn className="h-4 w-4 text-green-600" />,
  saida: <LogOut className="h-4 w-4 text-red-600" />,
  inicio_intervalo: <Coffee className="h-4 w-4 text-yellow-600" />,
  fim_intervalo: <Coffee className="h-4 w-4 text-blue-600" />,
};
const TIPO_LABELS: Record<string, string> = {
  entrada: "Entrada", saida: "Saída", inicio_intervalo: "Início Intervalo", fim_intervalo: "Fim Intervalo",
};
const TIPO_COLORS: Record<string, string> = {
  entrada: "bg-green-100 text-green-700", saida: "bg-red-100 text-red-700",
  inicio_intervalo: "bg-yellow-100 text-yellow-700", fim_intervalo: "bg-blue-100 text-blue-700",
};

export default function Ponto() {
  const [funcId, setFuncId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const funcionarios = trpc.funcionarios.list.useQuery({ search: "", page: 1, limit: 200 });
  const registros = trpc.ponto.list.useQuery({
    funcionarioId: funcId ? Number(funcId) : undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });
  const resumoDia = trpc.ponto.resumoDia.useQuery({ funcionarioId: Number(funcId) || 0 }, { enabled: !!funcId });

  const registrar = trpc.ponto.registrar.useMutation({
    onSuccess: () => { registros.refetch(); resumoDia.refetch(); toast.success("Ponto registrado!"); },
  });

  function handleRegistrar(tipo: "entrada" | "saida" | "inicio_intervalo" | "fim_intervalo") {
    if (!funcId) { toast.error("Selecione um funcionário"); return; }
    registrar.mutate({ funcionarioId: Number(funcId), tipo });
  }

  const funcList = (funcionarios.data as any)?.items || funcionarios.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6" />Ponto Eletrônico</h1><p className="text-muted-foreground">Registro de entrada, saída e intervalos</p></div>
      </div>

      {/* Seleção de funcionário e botões de registro */}
      <Card><CardContent className="pt-6 space-y-4">
        <div><Label>Funcionário</Label>
          <Select value={funcId} onValueChange={setFuncId}>
            <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
            <SelectContent>{(funcList as any[])?.map((f: any) => (<SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={() => handleRegistrar("entrada")} className="bg-green-600 hover:bg-green-700 h-16 text-lg" disabled={registrar.isPending}><LogIn className="h-5 w-5 mr-2" />Entrada</Button>
          <Button onClick={() => handleRegistrar("inicio_intervalo")} className="bg-yellow-600 hover:bg-yellow-700 h-16 text-lg" disabled={registrar.isPending}><Coffee className="h-5 w-5 mr-2" />Início Intervalo</Button>
          <Button onClick={() => handleRegistrar("fim_intervalo")} className="bg-blue-600 hover:bg-blue-700 h-16 text-lg" disabled={registrar.isPending}><Coffee className="h-5 w-5 mr-2" />Fim Intervalo</Button>
          <Button onClick={() => handleRegistrar("saida")} className="bg-red-600 hover:bg-red-700 h-16 text-lg" disabled={registrar.isPending}><LogOut className="h-5 w-5 mr-2" />Saída</Button>
        </div>
      </CardContent></Card>

      {/* Resumo do dia */}
      {funcId && resumoDia.data && (
        <Card><CardHeader><CardTitle className="text-sm">Registros de Hoje</CardTitle></CardHeader><CardContent>
          <div className="flex gap-3 flex-wrap">
            {resumoDia.data.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro hoje</p> :
              resumoDia.data.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  {TIPO_ICONS[r.tipo]}
                  <div><p className="text-xs font-medium">{TIPO_LABELS[r.tipo]}</p><p className="text-sm font-bold">{new Date(r.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div>
                </div>
              ))}
          </div>
        </CardContent></Card>
      )}

      {/* Filtros e histórico */}
      <div className="flex gap-2">
        <div><Label className="text-xs">Data Início</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
        <div><Label className="text-xs">Data Fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
      </div>

      <Card><Table><TableHeader><TableRow><TableHead>Data/Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Observação</TableHead><TableHead>Ajustado</TableHead></TableRow></TableHeader>
        <TableBody>{registros.data?.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-sm">{new Date(r.dataHora).toLocaleString("pt-BR")}</TableCell>
            <TableCell><Badge className={TIPO_COLORS[r.tipo] || ""}>{TIPO_LABELS[r.tipo] || r.tipo}</Badge></TableCell>
            <TableCell className="text-sm">{r.observacao || "—"}</TableCell>
            <TableCell>{r.ajustadoPor ? <Badge variant="outline" className="text-xs">Ajustado</Badge> : "—"}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></Card>
    </div>
  );
}
