import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle, FileText, Key, Link2, Loader2, Search, Settings, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { useViewAs } from "@/contexts/ViewAsContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WINTHOR_ROUTINAS = [
  { codigo: "901", descricao: "Montar Carga", modulo: "Carregamento" },
  { codigo: "906", descricao: "Registrar Saída de Veículo", modulo: "Carregamento" },
  { codigo: "910", descricao: "Pedido por Carregamento", modulo: "Carregamento" },
  { codigo: "917", descricao: "Simulador de Frete", modulo: "Rota / Frete" },
  { codigo: "934", descricao: "Ficha de Viagem", modulo: "Expedição" },
  { codigo: "1474", descricao: "Emissão de CT-e", modulo: "Rota / Frete" },
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
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="arquivei" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Arquivei
          </TabsTrigger>
          <TabsTrigger value="winthor" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Winthor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arquivei" className="mt-6">
          <ArquiveiTab empresaId={effectiveEmpresaId} />
        </TabsContent>

        <TabsContent value="winthor" className="mt-6">
          <WinthorTab empresaId={effectiveEmpresaId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
