import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Plus, Search, TrendingUp, TrendingDown, AlertTriangle,
  ArrowUpRight, Star, BookOpen, Heart, BarChart3, DollarSign,
  Clock, Award, UserCheck, UserX, Smile, Frown, Meh,
  Calendar, FileText, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_FUNCIONARIOS = [];
const MOCK_TREINAMENTOS = [];
const MOCK_FOLHA = [];
const CLIMA_RESPOSTAS = [];

const CONTRATO_COLORS: Record<string, string> = {
  clt: "bg-green-100 text-green-700",
  freelancer: "bg-orange-100 text-orange-700",
  terceirizado: "bg-blue-100 text-blue-700",
  estagiario: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-green-100 text-green-700",
  afastado: "bg-yellow-100 text-yellow-700",
  ferias: "bg-blue-100 text-blue-700",
  desligado: "bg-red-100 text-red-700",
};

const TREINO_STATUS: Record<string, string> = {
  concluido: "bg-green-100 text-green-700",
  em_andamento: "bg-blue-100 text-blue-700",
  agendado: "bg-yellow-100 text-yellow-700",
  cancelado: "bg-red-100 text-red-700",
};

function diasParaVencer(date: string | null | undefined): number | null {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return diff;
}

export default function RH() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [showNovoFunc, setShowNovoFunc] = useState(false);

  // TRPC
  const { effectiveEmpresaId: EMPRESA_ID } = useViewAs();
  const { data: funcionarios = [] } = trpc.funcionarios.list.useQuery({ empresaId: EMPRESA_ID });
  const funcData = funcionarios;

  const ativos = funcData.filter((f: any) => f.status === "ativo").length;
  const afastados = funcData.filter((f: any) => f.status === "afastado").length;
  const alertasDoc = funcData.filter((f: any) => {
    const cnh = diasParaVencer(f.cnhVence ?? f.vencimentoCnh);
    const aso = diasParaVencer(f.asoVence ?? f.vencimentoAso);
    return (cnh !== null && cnh <= 30) || (aso !== null && aso <= 30);
  }).length;

  const folhaTotal = 0; // TODO: Implementar query real para folha de pagamento

  const funcFiltrados = funcData.filter((f: any) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    (f.cargo ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (f.depto ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Recursos Humanos
          </h1>
          <p className="text-muted-foreground text-sm">Colaboradores · Folha · Treinamentos · Clima · People Analytics</p>
        </div>
        <Dialog open={showNovoFunc} onOpenChange={setShowNovoFunc}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Colaborador</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar Colaborador</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); toast.success("Colaborador cadastrado!"); setShowNovoFunc(false); }}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nome Completo *</Label><Input required /></div>
                <div><Label>CPF *</Label><Input placeholder="000.000.000-00" required /></div>
                <div><Label>Data de Admissão *</Label><Input type="date" required /></div>
                <div><Label>Cargo *</Label><Input required /></div>
                <div><Label>Departamento</Label><Input /></div>
                <div><Label>Tipo de Contrato</Label>
                  <Select defaultValue="clt">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="terceirizado">Terceirizado</SelectItem>
                      <SelectItem value="estagiario">Estagiário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Salário (R$)</Label><Input type="number" min="0" step="0.01" /></div>
                <div><Label>Telefone</Label><Input placeholder="(00) 00000-0000" /></div>
                <div><Label>E-mail</Label><Input type="email" /></div>
              </div>
              <Button type="submit" className="w-full">Cadastrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Colaboradores Ativos</p>
              <div className="h-7 w-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><UserCheck className="h-4 w-4" /></div>
            </div>
            <p className="text-2xl font-bold">{ativos}</p>
            <p className="text-xs text-muted-foreground mt-1">{afastados} afastados</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Folha do Mês</p>
              <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><DollarSign className="h-4 w-4" /></div>
            </div>
            <p className="text-2xl font-bold">{folhaTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            <p className="text-xs text-muted-foreground mt-1">+ encargos</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Alertas de Documentos</p>
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${alertasDoc > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}><AlertTriangle className="h-4 w-4" /></div>
            </div>
            <p className={`text-2xl font-bold ${alertasDoc > 0 ? "text-red-600" : "text-green-600"}`}>{alertasDoc}</p>
            <p className="text-xs text-muted-foreground mt-1">CNH / ASO vencendo</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">Clima Organizacional</p>
              <div className="h-7 w-7 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center"><Smile className="h-4 w-4" /></div>
            </div>
            <p className="text-2xl font-bold">72%</p>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" />+4% vs. trimestre anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="colaboradores"><Users className="h-4 w-4 mr-1" />Colaboradores</TabsTrigger>
          <TabsTrigger value="folha"><DollarSign className="h-4 w-4 mr-1" />Folha de Pagamento</TabsTrigger>
          <TabsTrigger value="treinamentos"><BookOpen className="h-4 w-4 mr-1" />Treinamentos</TabsTrigger>
          <TabsTrigger value="clima"><Heart className="h-4 w-4 mr-1" />Clima Organizacional</TabsTrigger>
          <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1" />People Analytics</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD ── */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Alertas de Documentos</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {funcData.filter((f: any) => {
                  const cnh = diasParaVencer(f.cnhVence ?? f.vencimentoCnh);
                  const aso = diasParaVencer(f.asoVence ?? f.vencimentoAso);
                  return (cnh !== null && cnh <= 60) || (aso !== null && aso <= 60);
                }).slice(0, 5).map((f: any) => {
                  const cnh = diasParaVencer(f.cnhVence ?? f.vencimentoCnh);
                  const aso = diasParaVencer(f.asoVence ?? f.vencimentoAso);
                  return (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{f.nome}</p>
                        <p className="text-xs text-muted-foreground">{f.cargo}</p>
                      </div>
                      <div className="flex gap-2">
                        {cnh !== null && cnh <= 60 && (
                          <Badge className={`text-xs ${cnh <= 0 ? "bg-red-100 text-red-700" : cnh <= 30 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                            CNH: {cnh <= 0 ? "VENCIDA" : `${cnh}d`}
                          </Badge>
                        )}
                        {aso !== null && aso <= 60 && (
                          <Badge className={`text-xs ${aso <= 0 ? "bg-red-100 text-red-700" : aso <= 30 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                            ASO: {aso <= 0 ? "VENCIDO" : `${aso}d`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {alertasDoc === 0 && (
                  <p className="text-sm text-green-600 flex items-center gap-2 py-2"><CheckCircle2 className="h-4 w-4" />Todos os documentos em dia</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Distribuição por Departamento</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(
                  funcData.reduce((acc: any, f: any) => {
                    const d = f.depto ?? f.departamento ?? "Outros";
                    acc[d] = (acc[d] ?? 0) + 1;
                    return acc;
                  }, {})
                ).map(([depto, count]: [string, any]) => (
                  <div key={depto} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{depto}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <Progress value={(count / funcData.length) * 100} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── COLABORADORES ── */}
        <TabsContent value="colaboradores" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar colaborador, cargo, depto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Depto</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcFiltrados.map((f: any) => {
                  const cnh = diasParaVencer(f.cnhVence ?? f.vencimentoCnh);
                  const aso = diasParaVencer(f.asoVence ?? f.vencimentoAso);
                  const temAlerta = (cnh !== null && cnh <= 30) || (aso !== null && aso <= 30);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell className="text-sm">{f.cargo}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{f.depto ?? f.departamento ?? "—"}</Badge></TableCell>
                      <TableCell><Badge className={`text-xs ${CONTRATO_COLORS[f.contrato] ?? "bg-gray-100 text-gray-600"}`}>{f.contrato?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{(f.salario ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.admissao ? new Date(f.admissao).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell><Badge className={`text-xs ${STATUS_COLORS[f.status] ?? "bg-gray-100 text-gray-600"}`}>{f.status}</Badge></TableCell>
                      <TableCell>
                        {f.avaliacao ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium">{f.avaliacao}</span>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {temAlerta ? (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── FOLHA ── */}
        <TabsContent value="folha" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Processamento e histórico de folha de pagamento.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Processar Folha</Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Funcionários</TableHead>
                  <TableHead>Total Bruto</TableHead>
                  <TableHead>Encargos</TableHead>
                  <TableHead>Total Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_FOLHA.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.mes}</TableCell>
                    <TableCell>{f.funcionarios}</TableCell>
                    <TableCell className="font-mono">{f.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{f.encargos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell className="font-mono font-bold">{(f.total + f.encargos).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${f.status === "pago" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {f.status === "pago" ? "Pago" : "Em Processamento"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-xs"><FileText className="h-3 w-3 mr-1" />Holerites</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── TREINAMENTOS ── */}
        <TabsContent value="treinamentos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Gestão de treinamentos obrigatórios e de capacitação.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Treinamento</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_TREINAMENTOS.map(t => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{t.titulo}</CardTitle>
                    <Badge className={`text-xs ${TREINO_STATUS[t.status]}`}>{t.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{t.tipo}</Badge>
                    <span className="text-xs text-muted-foreground">{t.carga}h</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t.participantes} participantes</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(t.data).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── CLIMA ── */}
        <TabsContent value="clima" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Pesquisa de Clima Organizacional</p>
              <p className="text-sm text-muted-foreground">Última pesquisa: Março/2025 · 38 respondentes (84%)</p>
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Pesquisa</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Smile className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="text-3xl font-bold text-green-600">72%</p>
                <p className="text-sm text-muted-foreground mt-1">Satisfeitos</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Meh className="h-10 w-10 mx-auto text-yellow-500 mb-2" />
                <p className="text-3xl font-bold text-yellow-600">18%</p>
                <p className="text-sm text-muted-foreground mt-1">Neutros</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Frown className="h-10 w-10 mx-auto text-red-500 mb-2" />
                <p className="text-3xl font-bold text-red-600">10%</p>
                <p className="text-sm text-muted-foreground mt-1">Insatisfeitos</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Detalhamento por Pergunta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {CLIMA_RESPOSTAS.map((r, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-sm font-medium">{r.pergunta}</p>
                  <div className="flex gap-1 h-4">
                    <div className="bg-green-500 rounded-l-full" style={{ width: `${r.positivo}%` }} title={`${r.positivo}% positivo`} />
                    <div className="bg-yellow-400" style={{ width: `${r.neutro}%` }} title={`${r.neutro}% neutro`} />
                    <div className="bg-red-400 rounded-r-full" style={{ width: `${r.negativo}%` }} title={`${r.negativo}% negativo`} />
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="text-green-600">{r.positivo}% positivo</span>
                    <span className="text-yellow-600">{r.neutro}% neutro</span>
                    <span className="text-red-600">{r.negativo}% negativo</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PEOPLE ANALYTICS ── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" />Turnover</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">4.2%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3 rotate-180" />-1.1% vs. trimestre anterior</p>
                <Progress value={4.2} max={20} className="mt-2 h-1.5 [&>div]:bg-red-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" />Absenteísmo</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">2.8%</p>
                <p className="text-xs text-muted-foreground mt-1">Meta: &lt; 3%</p>
                <Progress value={2.8} max={10} className="mt-2 h-1.5 [&>div]:bg-blue-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-yellow-500" />Avaliação Média</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold flex items-center gap-1">4.2 <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /></p>
                <p className="text-xs text-muted-foreground mt-1">Baseado em {funcData.length} avaliações</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Performers</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...funcData].sort((a: any, b: any) => (b.avaliacao ?? 0) - (a.avaliacao ?? 0)).slice(0, 5).map((f: any, i: number) => (
                  <div key={f.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{f.nome}</p>
                      <p className="text-xs text-muted-foreground">{f.cargo}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold">{f.avaliacao ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
