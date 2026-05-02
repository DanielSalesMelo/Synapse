import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { Megaphone, Plus, Search, TrendingUp, Users, Eye, Target, Loader2, Globe, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_COLORS: Record<string, string> = {
  ativa: "bg-green-100 text-green-700",
  em_revisao: "bg-yellow-100 text-yellow-700",
  pausada: "bg-slate-100 text-slate-700",
  encerrada: "bg-blue-100 text-blue-700",
  publicada: "bg-green-100 text-green-700",
  em_ajuste: "bg-yellow-100 text-yellow-700",
  rascunho: "bg-slate-100 text-slate-700",
};

function formatCurrency(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Marketing() {
  const [tab, setTab] = useState("visao-geral");
  const [search, setSearch] = useState("");
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);
  const [campanhaForm, setCampanhaForm] = useState({
    nome: "",
    plataforma: "meta_ads",
    objetivo: "",
    status: "ativa",
    orcamento: "",
    custoPorLead: "",
    pendencias: "",
    observacoes: "",
  });

  const me = trpc.auth.me.useQuery();
  const isMaster = (me.data as any)?.role === "master_admin";

  const campaignsQ = trpc.master.listCampaigns.useQuery(undefined, { enabled: isMaster });
  const landingPagesQ = trpc.master.listLandingPages.useQuery(undefined, { enabled: isMaster });
  const leadsQ = trpc.master.listLeads.useQuery(undefined, { enabled: isMaster });
  const proposalsQ = trpc.master.listProposals.useQuery(undefined, { enabled: isMaster });
  const createCampaign = trpc.master.createCampaign.useMutation({
    onSuccess: () => {
      campaignsQ.refetch();
      setShowNovaCampanha(false);
      setCampanhaForm({
        nome: "",
        plataforma: "meta_ads",
        objetivo: "",
        status: "ativa",
        orcamento: "",
        custoPorLead: "",
        pendencias: "",
        observacoes: "",
      });
      toast.success("Campanha criada com sucesso.");
    },
    onError: (error) => toast.error(error.message),
  });

  const campanhas = useMemo(() => {
    const base = (campaignsQ.data ?? []) as any[];
    return base.filter((item) => item.nome?.toLowerCase().includes(search.toLowerCase()) || item.clienteNome?.toLowerCase().includes(search.toLowerCase()));
  }, [campaignsQ.data, search]);

  const landingPages = (landingPagesQ.data ?? []) as any[];
  const leads = (leadsQ.data ?? []) as any[];
  const propostas = (proposalsQ.data ?? []) as any[];

  const campanhasAtivas = campanhas.filter((item) => item.status === "ativa").length;
  const taxaConversao = leads.length > 0 ? ((propostas.filter((item) => item.status === "aprovada").length / leads.length) * 100).toFixed(1) : "0.0";
  const orcamentoTotal = campanhas.reduce((acc, item) => acc + Number(item.orcamento || 0), 0);

  if (me.isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Carregando marketing...</div>;
  }

  if (!isMaster) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6 text-primary" />Marketing</h1>
          <p className="text-muted-foreground text-sm">Este módulo está disponível para a Central do Daniel.</p>
        </div>
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            Nenhum dado cadastrado para este perfil. Use a Central do Daniel para gerenciar campanhas, landing pages, leads e propostas.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Marketing
          </h1>
          <p className="text-muted-foreground text-sm">
            Campanhas, landing pages, leads e propostas com dados reais da Central do Daniel.
          </p>
        </div>
        <Dialog open={showNovaCampanha} onOpenChange={setShowNovaCampanha}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Campanha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar Nova Campanha</DialogTitle></DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createCampaign.mutate(campanhaForm as any);
              }}
            >
              <div><Label>Nome da Campanha *</Label><Input value={campanhaForm.nome} onChange={(e) => setCampanhaForm((prev) => ({ ...prev, nome: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plataforma</Label>
                  <Select value={campanhaForm.plataforma} onValueChange={(value) => setCampanhaForm((prev) => ({ ...prev, plataforma: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta_ads">Meta Ads</SelectItem>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="google_meu_negocio">Google Meu Negócio</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={campanhaForm.status} onValueChange={(value) => setCampanhaForm((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="em_revisao">Em revisão</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="encerrada">Encerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Objetivo</Label><Input value={campanhaForm.objetivo} onChange={(e) => setCampanhaForm((prev) => ({ ...prev, objetivo: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Orçamento</Label><Input value={campanhaForm.orcamento} onChange={(e) => setCampanhaForm((prev) => ({ ...prev, orcamento: e.target.value }))} placeholder="0.00" /></div>
                <div><Label>Custo por lead</Label><Input value={campanhaForm.custoPorLead} onChange={(e) => setCampanhaForm((prev) => ({ ...prev, custoPorLead: e.target.value }))} placeholder="0.00" /></div>
              </div>
              <div><Label>Pendências</Label><Textarea rows={2} value={campanhaForm.pendencias} onChange={(e) => setCampanhaForm((prev) => ({ ...prev, pendencias: e.target.value }))} /></div>
              <div><Label>Observações</Label><Textarea rows={2} value={campanhaForm.observacoes} onChange={(e) => setCampanhaForm((prev) => ({ ...prev, observacoes: e.target.value }))} /></div>
              <Button type="submit" className="w-full" disabled={createCampaign.isPending}>Salvar campanha</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />Leads</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{leads.length}</div><p className="text-xs text-muted-foreground mt-1">Base comercial ativa</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" />Campanhas Ativas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{campanhasAtivas}</div><p className="text-xs text-muted-foreground mt-1">{campaignsQ.data?.length ?? 0} registradas</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3.5 w-3.5" />Landing Pages</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{landingPages.length}</div><p className="text-xs text-muted-foreground mt-1">{landingPages.filter((item) => item.status === "publicada").length} publicadas</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5" />Conversão</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{taxaConversao}%</div><p className="text-xs text-muted-foreground mt-1">{propostas.filter((item) => item.status === "aprovada").length} propostas aprovadas</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="landing-pages">Landing Pages</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle>Orçamento em campanhas</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(orcamentoTotal)}</p><p className="text-xs text-muted-foreground mt-1">Soma das campanhas registradas</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Revisões pendentes</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{campanhas.filter((item) => item.status === "em_revisao").length}</p><p className="text-xs text-muted-foreground mt-1">Campanhas em revisão</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Propostas em aberto</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{propostas.filter((item) => ["rascunho", "enviada", "negociacao"].includes(item.status)).length}</p><p className="text-xs text-muted-foreground mt-1">Oportunidades comerciais</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campanhas" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar campanhas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campanhas.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma campanha cadastrada.</CardContent></Card>
            ) : (
              campanhas.map((campanha: any) => (
                <Card key={campanha.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{campanha.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{campanha.clienteNome || "Sem cliente vinculado"}</p>
                      </div>
                      <Badge className={STATUS_COLORS[campanha.status] || ""}>{campanha.status.replace("_", " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Plataforma</span><span>{campanha.plataforma}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Orçamento</span><span>{formatCurrency(campanha.orcamento)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">CPL</span><span>{formatCurrency(campanha.custoPorLead)}</span></div>
                    {campanha.objetivo && <p className="text-xs text-muted-foreground pt-1">{campanha.objetivo}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="landing-pages" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {landingPages.length === 0 ? (
              <Card className="md:col-span-2 xl:col-span-3"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma landing page cadastrada.</CardContent></Card>
            ) : (
              landingPages.map((page: any) => (
                <Card key={page.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />{page.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{page.clienteNome || "Sem cliente vinculado"}</p>
                      </div>
                      <Badge className={STATUS_COLORS[page.status] || ""}>{page.status.replace("_", " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-xs break-all text-muted-foreground">{page.url || "URL não cadastrada"}</p>
                    <div className="flex items-center justify-between"><span>Formulário</span><span>{page.formularioOk ? "OK" : "Pendente"}</span></div>
                    <div className="flex items-center justify-between"><span>WhatsApp</span><span>{page.whatsappOk ? "OK" : "Pendente"}</span></div>
                    <div className="flex items-center justify-between"><span>Pixel</span><span>{page.pixelInstalado ? "Instalado" : "Pendente"}</span></div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {leads.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum lead cadastrado.</p> : leads.slice(0, 8).map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{lead.nome}</p>
                      <p className="text-xs text-muted-foreground">{lead.empresa || lead.email || "Sem contato principal"}</p>
                    </div>
                    <Badge variant="outline">{lead.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Propostas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {propostas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma proposta cadastrada.</p> : propostas.slice(0, 8).map((proposta: any) => (
                  <div key={proposta.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" />{proposta.titulo}</p>
                      <p className="text-xs text-muted-foreground">{proposta.clienteNome || proposta.leadNome || "Sem vínculo comercial"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(proposta.valor)}</p>
                      <Badge className={STATUS_COLORS[proposta.status] || ""}>{proposta.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
