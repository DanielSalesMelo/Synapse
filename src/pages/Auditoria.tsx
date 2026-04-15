import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Shield, AlertTriangle, Eye, Activity, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

const RISCO_COLORS: Record<string, string> = {
  baixo: "bg-green-100 text-green-700", medio: "bg-yellow-100 text-yellow-700",
  alto: "bg-orange-100 text-orange-700", critico: "bg-red-100 text-red-700",
};
const TIPO_COLORS: Record<string, string> = {
  login: "bg-blue-100 text-blue-700", logout: "bg-gray-100 text-gray-700",
  create: "bg-green-100 text-green-700", update: "bg-yellow-100 text-yellow-700",
  delete: "bg-red-100 text-red-700", export: "bg-purple-100 text-purple-700",
  view: "bg-cyan-100 text-cyan-700", permission_change: "bg-orange-100 text-orange-700",
};

export default function Auditoria() {
  const [search, setSearch] = useState("");
  const [modulo, setModulo] = useState("");
  const [tipoEvento, setTipoEvento] = useState("");
  const [risco, setRisco] = useState("");
  const [page, setPage] = useState(1);

  const stats = trpc.auditoria.stats.useQuery();
  const logs = trpc.auditoria.list.useQuery({ search, modulo: modulo || undefined, tipoEvento: tipoEvento || undefined, risco: risco || undefined, page });
  const modulosMaisAcessados = trpc.auditoria.modulosMaisAcessados.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Auditoria</h1><p className="text-muted-foreground">Trilha completa de auditoria e segurança</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" />Total de Eventos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.data?.total ?? 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Eye className="h-4 w-4" />Eventos Hoje</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.data?.hoje ?? 0}</div></CardContent></Card>
        <Card className="border-orange-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Risco Alto</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-600">{stats.data?.altos ?? 0}</div></CardContent></Card>
        <Card className="border-red-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Risco Crítico</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{stats.data?.criticos ?? 0}</div></CardContent></Card>
      </div>

      {/* Módulos mais acessados */}
      {modulosMaisAcessados.data && modulosMaisAcessados.data.length > 0 && (
        <Card><CardHeader><CardTitle className="text-sm">Módulos Mais Acessados</CardTitle></CardHeader><CardContent>
          <div className="flex gap-2 flex-wrap">{modulosMaisAcessados.data.map((m: any) => (<Badge key={m.modulo} variant="secondary" className="text-xs">{m.modulo}: {m.total}</Badge>))}</div>
        </CardContent></Card>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por descrição ou usuário..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" /></div>
        <Select value={modulo} onValueChange={v => { setModulo(v === "todos" ? "" : v); setPage(1); }}><SelectTrigger className="w-40"><SelectValue placeholder="Módulo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="auth">Auth</SelectItem><SelectItem value="frota">Frota</SelectItem><SelectItem value="financeiro">Financeiro</SelectItem><SelectItem value="crm">CRM</SelectItem><SelectItem value="vendas">Vendas</SelectItem><SelectItem value="chat">Chat</SelectItem><SelectItem value="ti">TI</SelectItem></SelectContent></Select>
        <Select value={tipoEvento} onValueChange={v => { setTipoEvento(v === "todos" ? "" : v); setPage(1); }}><SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="login">Login</SelectItem><SelectItem value="create">Criação</SelectItem><SelectItem value="update">Atualização</SelectItem><SelectItem value="delete">Exclusão</SelectItem><SelectItem value="export">Exportação</SelectItem></SelectContent></Select>
        <Select value={risco} onValueChange={v => { setRisco(v === "todos" ? "" : v); setPage(1); }}><SelectTrigger className="w-32"><SelectValue placeholder="Risco" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="baixo">Baixo</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="alto">Alto</SelectItem><SelectItem value="critico">Crítico</SelectItem></SelectContent></Select>
      </div>

      {/* Tabela de logs */}
      <Card><Table><TableHeader><TableRow><TableHead>Data/Hora</TableHead><TableHead>Usuário</TableHead><TableHead>Módulo</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Risco</TableHead><TableHead>IP</TableHead></TableRow></TableHeader>
        <TableBody>{logs.data?.items?.map((l: any) => (
          <TableRow key={l.id} className={l.risco === "critico" ? "bg-red-50" : l.risco === "alto" ? "bg-orange-50" : ""}>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleString("pt-BR")}</TableCell>
            <TableCell className="font-medium text-sm">{l.userName || "Sistema"}</TableCell>
            <TableCell><Badge variant="outline" className="text-xs">{l.modulo}</Badge></TableCell>
            <TableCell><Badge className={TIPO_COLORS[l.tipoEvento] || "bg-gray-100 text-gray-700"}>{l.tipoEvento}</Badge></TableCell>
            <TableCell className="text-sm max-w-[300px] truncate">{l.descricao}</TableCell>
            <TableCell>{l.risco && <Badge className={RISCO_COLORS[l.risco]}>{l.risco}</Badge>}</TableCell>
            <TableCell className="text-xs text-muted-foreground font-mono">{l.ipAddress || "—"}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table></Card>

      {/* Paginação */}
      {logs.data && logs.data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">Página {page} de {logs.data.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= logs.data.totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
