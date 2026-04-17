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
const MOCK_CAMPANHAS: any[] = [];
const MOCK_AUTOMACOES: any[] = [];
const MOCK_SEGMENTOS: any[] = [];

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
          <CardContent><div className="text-2xl font-bold">0</div><p className="text-xs text-muted-foreground mt-1">Nenhum lead cadastrado</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" />Campanhas Ativas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{MOCK_CAMPANHAS.filter((c) => c.status === "ativa").length}</div><p className="text-xs text-muted-foreground mt-1">{MOCK_CAMPANHAS.length} no total</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Taxa de Abertura</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">0%</div><p className="text-xs text-muted-foreground mt-1">Sem dados no período</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5" />Taxa de Conversão</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">0%</div><p className="text-xs text-muted-foreground mt-1">Sem dados no período</p></CardContent>
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
          <div className="text-center py-12 text-muted-foreground">Nenhuma campanha ou automação ativa no momento</div>
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
            <div className="text-center py-12 text-muted-foreground">Nenhuma campanha encontrada</div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
