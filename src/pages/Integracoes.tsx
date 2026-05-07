import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Building2, CheckCircle, FileText, Globe2, Key, Link2, Loader2, MessageCircleMore, Search, Settings, ShieldCheck, Smartphone, XCircle, Zap, User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type IntegrationTemplate = {
  tipo: string;
  nome: string;
  descricao: string;
  campos: string[];
};

const TEMPLATE_META: Record<string, { categoria: string; icon: any; destaque: string }> = {
  whatsapp: { categoria: "Mensageria", icon: Smartphone, destaque: "Atendimento, bot e notificações" },
  telegram: { categoria: "Mensageria", icon: MessageCircleMore, destaque: "Alertas e operação interna" },
  instagram: { categoria: "Comercial", icon: MessageCircleMore, destaque: "DM e leads" },
  serasa: { categoria: "Financeiro", icon: ShieldCheck, destaque: "Crédito e validação" },
  gmail: { categoria: "Comunicação", icon: Globe2, destaque: "E-mails e follow-up" },
  google_calendar: { categoria: "Agenda", icon: Globe2, destaque: "Compromissos e agenda" },
  google_drive: { categoria: "Arquivos", icon: FileText, destaque: "Documentos e anexos" },
  meta_ads: { categoria: "Marketing", icon: Zap, destaque: "Campanhas e mídia" },
  google_ads: { categoria: "Marketing", icon: Zap, destaque: "Campanhas e conversão" },
  anydesk: { categoria: "TI", icon: ShieldCheck, destaque: "Acesso remoto" },
  evolution_api: { categoria: "Mensageria", icon: Smartphone, destaque: "WhatsApp omnichannel" },
  arquivei: { categoria: "Fiscal", icon: FileText, destaque: "XML e DANFE" },
  winthor: { categoria: "ERP", icon: Building2, destaque: "Integração logística e estoque" },
  controle_de_ponto: { categoria: "RH", icon: BadgeCheck, destaque: "Jornada e escalas" },
  ponto_mobile: { categoria: "RH", icon: Smartphone, destaque: "Ponto com app" },
  ofx_cnab: { categoria: "Financeiro", icon: FileText, destaque: "Conciliação bancária" },
  bancos_pix_boletos: { categoria: "Financeiro", icon: Zap, destaque: "PIX e boletos" },
  nfe: { categoria: "Fiscal", icon: FileText, destaque: "Notas fiscais" },
  cte: { categoria: "Fiscal", icon: FileText, destaque: "Conhecimento de transporte" },
  mdfe: { categoria: "Fiscal", icon: FileText, destaque: "Manifestos eletrônicos" },
  sefaz_xml: { categoria: "Fiscal", icon: ShieldCheck, destaque: "Consulta e XML" },
  slack: { categoria: "Comunicação", icon: MessageCircleMore, destaque: "Operação interna" },
  teams: { categoria: "Comunicação", icon: MessageCircleMore, destaque: "Colaboração corporativa" },
  google_business_profile: { categoria: "Marketing", icon: Globe2, destaque: "Perfil e avaliações" },
  google_maps: { categoria: "Logística", icon: Globe2, destaque: "Rotas e geolocalização" },
  mercadopago: { categoria: "Financeiro", icon: Zap, destaque: "Cobrança online" },
  asaas: { categoria: "Financeiro", icon: Zap, destaque: "Recorrência e boletos" },
  clicksign: { categoria: "Documentos", icon: FileText, destaque: "Assinatura eletrônica" },
  intelbras_pabx: { categoria: "Telefonia", icon: Smartphone, destaque: "PABX e chamadas internas" },
  fusion_carga: { categoria: "Logística", icon: Globe2, destaque: "Rastreamento de caminhão em rota" },
};

function normalizeFieldLabel(field: string) {
  const key = field.toLowerCase().trim();
  if (key.includes("email")) return "E-mail";
  if (key.includes("senha") || key.includes("password")) return "Senha";
  if (key.includes("login") || key.includes("usuario")) return "Login / Usuário";
  if (key.includes("nome")) return "Nome";
  if (key.includes("token")) return "Token de acesso";
  if (key.includes("secret") || key.includes("chave")) return "Chave secreta";
  if (key.includes("host")) return "Host / URL";
  if (key.includes("webhook")) return "URL de webhook";
  return field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getFieldIcon(field: string) {
  const key = field.toLowerCase();
  if (key.includes("email")) return Mail;
  if (key.includes("senha") || key.includes("password") || key.includes("secret") || key.includes("token")) return Lock;
  if (key.includes("login") || key.includes("usuario") || key.includes("nome")) return User;
  return Key;
}

function GenericIntegrationCard({
  empresaId,
  template,
  existing,
}: {
  empresaId: number;
  template: IntegrationTemplate;
  existing?: any;
}) {
  const initial = useMemo(
    () => {
      const config = existing?.config ? JSON.parse(existing.config) : {};
      const values: Record<string, string> = {};
      for (const field of template.campos) values[field] = config?.[field] ?? "";
      return values;
    },
    [existing, template.campos]
  );

  const [values, setValues] = useState<Record<string, string>>(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  const saveConfig = trpc.integracoes.upsert.useMutation({
    onSuccess: () => toast.success(`${template.nome} salva com sucesso.`),
    onError: (error) => toast.error(error.message || "Não foi possível salvar a integração."),
  });

  const meta = TEMPLATE_META[template.tipo] || { categoria: "Integração", icon: Link2, destaque: "Configuração avançada" };
  const Icon = meta.icon;

  const handleSave = () => {
    const payload = Object.fromEntries(Object.entries(values).filter(([, value]) => String(value).trim().length > 0));
    if (Object.keys(payload).length === 0) {
      toast.error("Preencha pelo menos um campo para salvar.");
      return;
    }
    saveConfig.mutate({
      empresaId,
      tipo: template.tipo as any,
      nome: template.nome,
      status: "configurando",
      config: JSON.stringify(payload),
    });
  };

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{template.nome}</CardTitle>
              <CardDescription className="mt-1">{template.descricao}</CardDescription>
            </div>
          </div>
          <Badge variant={existing ? "secondary" : "outline"} className={existing ? "bg-green-50 text-green-700" : ""}>
            {existing ? "Configurada" : "Pendente"}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{meta.categoria}</Badge>
          <Badge variant="outline">{meta.destaque}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {template.campos.map((field) => (
            <div key={field} className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                {(() => {
                  const FieldIcon = getFieldIcon(field);
                  return <FieldIcon className="h-3.5 w-3.5 text-muted-foreground" />;
                })()}
                {normalizeFieldLabel(field)}
              </Label>
              <Input
                value={values[field] ?? ""}
                onChange={(e) => setValues((current) => ({ ...current, [field]: e.target.value }))}
                placeholder={`Informe ${normalizeFieldLabel(field).toLowerCase()}`}
                type={field.toLowerCase().includes("secret") || field.toLowerCase().includes("password") || field.toLowerCase().includes("token") ? "password" : "text"}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saveConfig.isPending}>
            {saveConfig.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
            Salvar configuração
          </Button>
          {existing?.ultimaSincronizacao && (
            <p className="text-xs text-muted-foreground">
              Última sincronização: {new Date(existing.ultimaSincronizacao).toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const WINTHOR_ROUTINAS = [
  { codigo: "901", descricao: "Montar Carga", modulo: "Carregamento" },
  { codigo: "906", descricao: "Registrar Saída de Veículo", modulo: "Carregamento" },
  { codigo: "910", descricao: "Pedido por Carregamento", modulo: "Carregamento" },
  { codigo: "917", descricao: "Simulador de Frete", modulo: "Rota / Frete" },
  { codigo: "934", descricao: "Ficha de Viagem", modulo: "Expedição" },
  { codigo: "1474", descricao: "Emissão de CT-e", modulo: "Rota / Frete" },
  { codigo: "1301", descricao: "Consulta de Saldo e Estoque", modulo: "Estoque" },
  { codigo: "1407", descricao: "Romaneio de Entrega", modulo: "Expedição" },
  { codigo: "1430", descricao: "Roteirização por Região", modulo: "Rota / Frete" },
  { codigo: "1508", descricao: "Ocorrências de Entrega", modulo: "SAC / Operação" },
  { codigo: "1702", descricao: "Controle de Devoluções", modulo: "Pós-entrega" },
  { codigo: "1771", descricao: "Acompanhamento de Motorista", modulo: "Monitoramento" },
  { codigo: "1880", descricao: "Conferência de Carregamento", modulo: "Carregamento" },
];

function ArquiveiTab({ empresaId }: { empresaId: number }) {
  const configQ = trpc.integracoes.getByTipo.useQuery({ empresaId, tipo: "arquivei" }, { enabled: !!empresaId }) as any;
  const [appId, setAppId] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const config = configQ.data?.config ? JSON.parse(configQ.data.config) : null;
    setAppId(config?.appId ?? "");
    setApiKey(config?.apiKey ?? "");
  }, [configQ.data]);

  const saveConfig = trpc.integracoes.upsert.useMutation({
    onSuccess: () => {
      configQ.refetch();
      toast.success("Integração Arquivei salva.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar a integração."),
  });

  const handleSave = () => {
    if (!appId.trim() || !apiKey.trim()) {
      toast.error("Informe App ID e API Key.");
      return;
    }
    saveConfig.mutate({
      empresaId,
      tipo: "arquivei",
      nome: "Arquivei / Qive",
      status: "ativa",
      config: JSON.stringify({ appId: appId.trim(), apiKey: apiKey.trim() }),
    });
  };

  const configured = !!configQ.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-primary" />
            Credenciais Arquivei / Qive
          </CardTitle>
          <CardDescription>
            Salve a configuração da API por empresa para consulta de XML e DANFE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>App ID *</Label>
              <Input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="Seu App ID" />
            </div>
            <div className="space-y-1.5">
              <Label>API Key *</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Sua API Key" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saveConfig.isPending}>
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Salvar Integração
            </Button>
            {configured ? (
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configurada
              </Badge>
            ) : (
              <Badge variant="outline">Ainda não configurada</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WinthorTab({ empresaId }: { empresaId: number }) {
  const configQ = trpc.integracoes.getByTipo.useQuery({ empresaId, tipo: "winthor" }, { enabled: !!empresaId }) as any;
  const [host, setHost] = useState("");
  const [porta, setPorta] = useState("1521");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [sid, setSid] = useState("WINTHOR");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const config = configQ.data?.config ? JSON.parse(configQ.data.config) : null;
    setHost(config?.host ?? "");
    setPorta(config?.porta ?? "1521");
    setUsuario(config?.usuario ?? "");
    setSenha(config?.senha ?? "");
    setSid(config?.sid ?? "WINTHOR");
  }, [configQ.data]);

  const saveConfig = trpc.integracoes.upsert.useMutation({
    onSuccess: () => {
      configQ.refetch();
      toast.success("Configuração Winthor salva.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar o Winthor."),
  });

  const handleSave = () => {
    if (!host.trim()) {
      toast.error("Informe o host do Winthor.");
      return;
    }
    saveConfig.mutate({
      empresaId,
      tipo: "winthor",
      nome: "TOTVS Winthor",
      status: "configurando",
      config: JSON.stringify({
        host: host.trim(),
        porta: porta.trim(),
        usuario: usuario.trim(),
        senha,
        sid: sid.trim(),
      }),
    });
  };

  const rotinasFiltradas = useMemo(
    () => WINTHOR_ROUTINAS.filter((rotina) => rotina.codigo.includes(busca) || rotina.descricao.toLowerCase().includes(busca.toLowerCase())),
    [busca]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-primary" />
            Configuração do Winthor
          </CardTitle>
          <CardDescription>
            Persistência real da conexão por empresa. A execução Oracle depende do servidor Winthor na sua rede.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Host / IP *</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.100" />
            </div>
            <div className="space-y-1.5">
              <Label>Porta</Label>
              <Input value={porta} onChange={(e) => setPorta(e.target.value)} placeholder="1521" />
            </div>
            <div className="space-y-1.5">
              <Label>Usuário</Label>
              <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="WINTHOR" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha do Oracle" />
            </div>
            <div className="space-y-1.5">
              <Label>SID / Service Name</Label>
              <Input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="WINTHOR" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saveConfig.isPending}>
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Salvar Configuração
            </Button>
            {configQ.data ? (
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Salva no Synapse
              </Badge>
            ) : (
              <Badge variant="outline">Sem configuração salva</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Rotinas Winthor disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar rotina..." className="pl-9" />
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2">Código</th>
                  <th className="text-left px-4 py-2">Rotina</th>
                  <th className="text-left px-4 py-2">Módulo</th>
                </tr>
              </thead>
              <tbody>
                {rotinasFiltradas.map((rotina) => (
                  <tr key={rotina.codigo} className="border-t">
                    <td className="px-4 py-2 font-mono">{rotina.codigo}</td>
                    <td className="px-4 py-2">{rotina.descricao}</td>
                    <td className="px-4 py-2 text-muted-foreground">{rotina.modulo}</td>
                  </tr>
                ))}
                {rotinasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Nenhuma rotina encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Integracoes() {
  const { effectiveEmpresaId } = useViewAs();
  const meQ = trpc.auth.me.useQuery();
  const templatesQ = trpc.integracoes.templates.useQuery(undefined, { staleTime: 1000 * 60 * 10 });
  const integrationsQ = trpc.integracoes.list.useQuery({ empresaId: effectiveEmpresaId }, { enabled: !!effectiveEmpresaId });
  const [catalogSearch, setCatalogSearch] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todas");
  const canAccess = (meQ.data as any)?.role === "admin" || (meQ.data as any)?.role === "master_admin";

  if (meQ.isLoading) return null;

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <XCircle className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Configurações reais salvas por empresa no backend do Synapse.
          </p>
        </div>
      </div>

      <Tabs defaultValue="arquivei">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="arquivei" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Arquivei
          </TabsTrigger>
          <TabsTrigger value="winthor" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Winthor
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="flex items-center gap-2">
            <Globe2 className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arquivei" className="mt-6">
          <ArquiveiTab empresaId={effectiveEmpresaId} />
        </TabsContent>

        <TabsContent value="winthor" className="mt-6">
          <WinthorTab empresaId={effectiveEmpresaId} />
        </TabsContent>

        <TabsContent value="catalogo" className="mt-6">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <h2 className="text-base font-semibold">Integrações estratégicas do Synapse</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mensageria, marketing, crédito, agenda, arquivos e operação remota configurados por empresa.
              </p>
            </div>

            <div className="rounded-2xl border p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Buscar integração</Label>
                  <Input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Ex: WhatsApp, Serasa, SEFAZ, Intelbras..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <div className="flex flex-wrap gap-2">
                    {["todas", "Mensageria", "Financeiro", "Fiscal", "RH", "Telefonia", "TI", "Marketing", "Logística"].map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        size="sm"
                        variant={categoriaAtiva === cat ? "default" : "outline"}
                        onClick={() => setCategoriaAtiva(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["whatsapp", "telegram", "serasa", "sefaz_xml", "intelbras_pabx", "controle_de_ponto", "ponto_mobile"].map((tipo) => {
                  const nome = (templatesQ.data ?? []).find((t: any) => t.tipo === tipo)?.nome ?? tipo;
                  const exists = (integrationsQ.data ?? []).some((item: any) => item.tipo === tipo);
                  return (
                    <Badge key={tipo} variant={exists ? "secondary" : "outline"} className={exists ? "bg-green-50 text-green-700" : ""}>
                      {nome}: {exists ? "Configurada" : "Pendente"}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {(templatesQ.data ?? [])
                .filter((template: any) => !["arquivei", "winthor"].includes(template.tipo))
                .filter((template: any) => {
                  const term = catalogSearch.trim().toLowerCase();
                  if (!term) return true;
                  return (
                    String(template.nome ?? "").toLowerCase().includes(term) ||
                    String(template.descricao ?? "").toLowerCase().includes(term) ||
                    String(template.tipo ?? "").toLowerCase().includes(term)
                  );
                })
                .filter((template: any) => {
                  if (categoriaAtiva === "todas") return true;
                  const meta = TEMPLATE_META[template.tipo];
                  return meta?.categoria === categoriaAtiva;
                })
                .map((template: any) => (
                  <GenericIntegrationCard
                    key={template.tipo}
                    empresaId={effectiveEmpresaId}
                    template={template}
                    existing={(integrationsQ.data ?? []).find((item: any) => item.tipo === template.tipo)}
                  />
                ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
