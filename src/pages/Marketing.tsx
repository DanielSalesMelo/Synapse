import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import {
  Megaphone, Plus, Search, TrendingUp, Users, Mail, Zap,
  Globe, BarChart3, Target, Eye, MousePointer, DollarSign,
  Play, Pause, CheckCircle2, Clock, ArrowUpRight, Filter,
  MessageSquare, Instagram, Phone, Send,
} from "lucide-react";
import { toast } from "sonner";

// ─── Dados mockados ─────────────────────────────────────────────────────────
const MOCK_CAMPANHAS = [
  { id: 1, nome: "Black Friday 2025", canal: "Email + WhatsApp", status: "ativa", leads: 1240, abertura: 42, cliques: 18, conversao: 7.3, inicio: "2025-04-01", fim: "2025-04-30" },
  { id: 2, nome: "Prospecção B2B Q2", canal: "Email", status: "ativa", leads: 580, abertura: 38, cliques: 12, conversao: 4.1, inicio: "2025-04-10", fim: "2025-06-30" },
  { id: 3, nome: "Reativação de Clientes", canal: "WhatsApp", status: "pausada", leads: 320, abertura: 71, cliques: 34, conversao: 9.8, inicio: "2025-03-15", fim: "2025-04-15" },
  { id: 4, nome: "Lançamento Produto X", canal: "Email + Instagram", status: "rascunho", leads: 0, abertura: 0, cliques: 0, conversao: 0, inicio: "2025-05-01", fim: "2025-05-31" },
];

const MOCK_AUTOMACOES = [
  { id: 1, nome: "Boas-vindas Novo Lead", gatilho: "Cadastro no site", acoes: 3, ativos: 847, status: "ativa" },
  { id: 2, nome: "Abandono de Carrinho", gatilho: "Carrinho abandonado > 2h", acoes: 2, ativos: 124, status: "ativa" },
  { id: 3, nome: "Nutrição de Leads Frios", gatilho: "Sem interação > 30 dias", acoes: 5, ativos: 392, status: "ativa" },
  { id: 4, nome: "Pós-Venda Satisfação", gatilho: "Pedido entregue", acoes: 2, ativos: 56, status: "pausada" },
];

const MOCK_SEGMENTOS = [
  { id: 1, nome: "Clientes Ativos", criterio: "Compra nos últimos 90 dias", total: 1240, crescimento: 12 },
  { id: 2, nome: "Leads Quentes", criterio: "Score > 70 pontos", total: 387, crescimento: 28 },
  { id: 3, nome: "Inativos para Reativar", criterio: "Sem compra > 6 meses", total: 892, crescimento: -5 },
  { id: 4, nome: "Grandes Contas B2B", criterio: "Faturamento > R$ 50k/ano", total: 43, crescimento: 7 },
];

const STATUS_COLORS: Record<string, string> = {
  ativa: "bg-green-100 text-green-700",
  pausada: "bg-yellow-100 text-yellow-700",
  rascunho: "bg-gray-100 text-gray-700",
  finalizada: "bg-blue-100 text-blue-700",
};

const CANAL_ICONS: Record<string, any> = {
  Email: Mail,
  WhatsApp: Phone,
  Instagram: Instagram,
  SMS: MessageSquare,
};

export default function Marketing() {
  const [tab, setTab] = useState("visao-geral");
  const [search, setSearch] = useState("");
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);

  const campanhasFiltradas = MOCK_CAMPANHAS.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Marketing
          </h1>
          <p className="text-muted-foreground text-sm">
            Campanhas · Automações · Segmentação · Analytics
          </p>
        </div>
        <Dialog open={showNovaCampanha} onOpenChange={setShowNovaCampanha}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar Nova Campanha</DialogTitle></DialogHeader>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); toast.success("Campanha criada!"); setShowNovaCampanha(false); }}>
              <div><Label>Nome da Campanha *</Label><Input placeholder="Ex: Promoção de Maio" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Canal</Label>
                  <Select defaultValue="email">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">📧 E-mail</SelectItem>
                      <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                      <SelectItem value="sms">💬 SMS</SelectItem>
                      <SelectItem value="instagram">📸 Instagram</SelectItem>
                      <SelectItem value="multi">🔀 Multi-canal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Segmento</Label>
                  <Select defaultValue="todos">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Leads</SelectItem>
                      {MOCK_SEGMENTOS.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data de Início</Label><Input type="date" /></div>
                <div><Label>Data de Fim</Label><Input type="date" /></div>
              </div>
              <div><Label>Objetivo da Campanha</Label><Textarea placeholder="Descreva o objetivo e a mensagem principal..." rows={3} /></div>
              <Button type="submit" className="w-full">Criar Campanha</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />Total de Leads</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">4.821</div><p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" />+12% este mês</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" />Campanhas Ativas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{MOCK_CAMPANHAS.filter((c) => c.status === "ativa").length}</div><p className="text-xs text-muted-foreground mt-1">{MOCK_CAMPANHAS.length} no total</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Taxa de Abertura</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">41.2%</div><p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" />+3.1% vs. mês anterior</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5" />Taxa de Conversão</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">6.8%</div><p className="text-xs text-green-600 flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3" />+0.9% vs. mês anterior</p></CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral"><BarChart3 className="h-4 w-4 mr-1" />Visão Geral</TabsTrigger>
          <TabsTrigger value="campanhas"><Megaphone className="h-4 w-4 mr-1" />Campanhas</TabsTrigger>
          <TabsTrigger value="automacoes"><Zap className="h-4 w-4 mr-1" />Automações</TabsTrigger>
          <TabsTrigger value="segmentos"><Filter className="h-4 w-4 mr-1" />Segmentação</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1" />E-mail Marketing</TabsTrigger>
          <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
        </TabsList>

        {/* ── VISÃO GERAL ── */}
        <TabsContent value="visao-geral" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Campanhas em Destaque</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {MOCK_CAMPANHAS.filter((c) => c.status === "ativa").map((c) => (
                  <div key={c.id} className="space-y-1.5 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.nome}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Abertura: <strong>{c.abertura}%</strong></span>
                      <span>Cliques: <strong>{c.cliques}%</strong></span>
                      <span>Conversão: <strong>{c.conversao}%</strong></span>
                    </div>
                    <Progress value={c.conversao * 10} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Automações Ativas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {MOCK_AUTOMACOES.filter((a) => a.status === "ativa").map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">{a.gatilho}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{a.ativos.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">em fluxo</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── CAMPANHAS ── */}
        <TabsContent value="campanhas" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar campanhas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Cliques</TableHead>
                  <TableHead>Conversão</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanhasFiltradas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.canal}</Badge></TableCell>
                    <TableCell><Badge className={`text-xs ${STATUS_COLORS[c.status]}`}>{c.status}</Badge></TableCell>
                    <TableCell className="font-mono">{c.leads.toLocaleString()}</TableCell>
                    <TableCell>{c.abertura > 0 ? `${c.abertura}%` : "—"}</TableCell>
                    <TableCell>{c.cliques > 0 ? `${c.cliques}%` : "—"}</TableCell>
                    <TableCell className={c.conversao > 5 ? "text-green-600 font-bold" : ""}>{c.conversao > 0 ? `${c.conversao}%` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.inicio} → {c.fim}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === "ativa" ? (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Pausar"><Pause className="h-3.5 w-3.5" /></Button>
                        ) : c.status === "pausada" ? (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Retomar"><Play className="h-3.5 w-3.5" /></Button>
                        ) : null}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ver detalhes"><Eye className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ── AUTOMAÇÕES ── */}
        <TabsContent value="automacoes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Fluxos de automação baseados em gatilhos de comportamento.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Automação</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_AUTOMACOES.map((a) => (
              <Card key={a.id} className={a.status === "pausada" ? "opacity-70" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{a.nome}</CardTitle>
                    <Badge className={`text-xs ${a.status === "ativa" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" />Gatilho: {a.gatilho}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{a.acoes} ações no fluxo</span>
                      <span className="text-primary font-medium">{a.ativos.toLocaleString()} contatos ativos</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">Editar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── SEGMENTAÇÃO ── */}
        <TabsContent value="segmentos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Segmentos dinâmicos de leads e clientes para campanhas direcionadas.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Segmento</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_SEGMENTOS.map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{s.nome}</CardTitle>
                    <span className={`text-xs font-medium flex items-center gap-1 ${s.crescimento >= 0 ? "text-green-600" : "text-red-600"}`}>
                      <ArrowUpRight className={`h-3 w-3 ${s.crescimento < 0 ? "rotate-180" : ""}`} />
                      {s.crescimento > 0 ? "+" : ""}{s.crescimento}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.criterio}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{s.total.toLocaleString()}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs">Ver Leads</Button>
                      <Button size="sm" className="h-7 text-xs"><Send className="h-3 w-3 mr-1" />Campanha</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── E-MAIL MARKETING ── */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Criação e disparo de e-mails com editor visual e templates profissionais.</p>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo E-mail</Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Editor de E-mail Marketing</p>
                <p className="text-sm mt-1">Crie e-mails profissionais com editor drag-and-drop, templates e personalização dinâmica.</p>
                <Button className="mt-4" size="sm"><Plus className="h-4 w-4 mr-2" />Criar Primeiro E-mail</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ANALYTICS ── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MousePointer className="h-4 w-4" />CTR Médio</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">18.4%</div><p className="text-xs text-green-600 mt-1">+2.3% vs. mês anterior</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />ROI das Campanhas</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">4.2x</div><p className="text-xs text-muted-foreground mt-1">Para cada R$ 1 investido</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Custo por Lead</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">R$ 12,40</div><p className="text-xs text-green-600 mt-1">-R$ 3,20 vs. mês anterior</p></CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Gráficos de Performance</p>
                <p className="text-sm mt-1">Visualize a evolução de leads, conversões e ROI ao longo do tempo.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
