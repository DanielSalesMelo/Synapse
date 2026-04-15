import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Download, Search, Settings, CheckCircle, XCircle,
  AlertCircle, Loader2, ExternalLink, Key, Building2, RefreshCw,
  FileDown, Package, Zap, Link2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Arquivei / Qive ─────────────────────────────────────────────────────────

interface NFeResult {
  chave: string;
  xml?: string;
  danfePdf?: string;
  status?: string;
  emitente?: string;
  destinatario?: string;
  valor?: string;
  dataEmissao?: string;
  numero?: string;
  serie?: string;
  erro?: string;
}

function parseNFeXml(xml: string): Partial<NFeResult> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const get = (tag: string) => doc.getElementsByTagName(tag)[0]?.textContent ?? "";
    return {
      numero: get("nNF"),
      serie: get("serie"),
      dataEmissao: get("dhEmi") || get("dEmi"),
      emitente: get("xNome") || "",
      valor: get("vNF"),
    };
  } catch {
    return {};
  }
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBase64Pdf(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ArquiveiTab() {
  const [appId, setAppId] = useState(() => localStorage.getItem("arquivei_app_id") || "");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("arquivei_api_key") || "");
  const [chave, setChave] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NFeResult | null>(null);
  const [credsSaved, setCredsSaved] = useState(!!localStorage.getItem("arquivei_app_id"));

  const saveCredentials = () => {
    if (!appId.trim() || !apiKey.trim()) {
      toast.error("Informe o App ID e a API Key");
      return;
    }
    localStorage.setItem("arquivei_app_id", appId.trim());
    localStorage.setItem("arquivei_api_key", apiKey.trim());
    setCredsSaved(true);
    toast.success("Credenciais salvas!");
  };

  const clearCredentials = () => {
    localStorage.removeItem("arquivei_app_id");
    localStorage.removeItem("arquivei_api_key");
    setAppId("");
    setApiKey("");
    setCredsSaved(false);
    toast.success("Credenciais removidas");
  };

  const buscarNFe = async () => {
    const chaveClean = chave.replace(/\D/g, "");
    if (chaveClean.length !== 44) {
      toast.error("A chave de acesso deve ter 44 dígitos numéricos");
      return;
    }
    if (!appId || !apiKey) {
      toast.error("Configure as credenciais Arquivei primeiro");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Busca XML via Arquivei Lite API
      const xmlRes = await fetch(
        `https://lite-api.arquivei.com.br/v1/nfe/?access_key=${chaveClean}`,
        {
          headers: {
            "x-api-id": appId,
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!xmlRes.ok) {
        const errData = await xmlRes.json().catch(() => ({}));
        const msg = (errData as any)?.error || `Erro HTTP ${xmlRes.status}`;
        setResult({ chave: chaveClean, erro: msg });
        toast.error(`Erro ao buscar NF-e: ${msg}`);
        return;
      }

      const data = await xmlRes.json();
      const xml: string = data?.data?.xml ?? "";

      if (!xml) {
        setResult({ chave: chaveClean, erro: "XML não encontrado para esta chave" });
        toast.error("NF-e não encontrada");
        return;
      }

      const parsed = parseNFeXml(xml);

      // Tenta buscar DANFE (PDF) via API completa
      let danfePdf: string | undefined;
      try {
        const pdfRes = await fetch(
          `https://api.arquivei.com.br/v1/nfe/danfe?access_key=${chaveClean}`,
          {
            headers: {
              "x-api-id": appId,
              "x-api-key": apiKey,
            },
          }
        );
        if (pdfRes.ok) {
          const pdfData = await pdfRes.json();
          danfePdf = pdfData?.data?.pdf ?? undefined;
        }
      } catch {
        // PDF opcional — não bloqueia
      }

      setResult({
        chave: chaveClean,
        xml,
        danfePdf,
        status: "Encontrada",
        emitente: parsed.emitente,
        valor: parsed.valor ? `R$ ${parseFloat(parsed.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : undefined,
        dataEmissao: parsed.dataEmissao,
        numero: parsed.numero,
        serie: parsed.serie,
      });

      toast.success("NF-e encontrada com sucesso!");
    } catch (err: any) {
      const msg = err?.message || "Erro de conexão com a API Arquivei";
      setResult({ chave: chaveClean, erro: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Credenciais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4 text-primary" />
            Credenciais Arquivei (Qive)
          </CardTitle>
          <CardDescription>
            Configure seu App ID e API Key do{" "}
            <a
              href="https://app.arquivei.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-1"
            >
              painel Arquivei <ExternalLink className="h-3 w-3" />
            </a>
            . As credenciais ficam salvas localmente no navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="app-id">App ID</Label>
              <Input
                id="app-id"
                placeholder="Seu App ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                type="text"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                placeholder="Sua API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={saveCredentials} size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Salvar Credenciais
            </Button>
            {credsSaved && (
              <>
                <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-950">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configurado
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearCredentials} className="text-red-500 hover:text-red-600">
                  <XCircle className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Busca por Chave de Acesso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" />
            Buscar NF-e por Chave de Acesso
          </CardTitle>
          <CardDescription>
            Informe a chave de acesso de 44 dígitos para baixar o XML e o DANFE (PDF) da nota fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Chave de acesso (44 dígitos)"
              value={chave}
              onChange={(e) => setChave(e.target.value.replace(/\D/g, "").slice(0, 44))}
              className="font-mono text-sm"
              maxLength={44}
            />
            <Button onClick={buscarNFe} disabled={loading || !credsSaved} className="shrink-0">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Buscar</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Caracteres digitados: {chave.length}/44
          </p>

          {/* Resultado */}
          {result && (
            <div className={`rounded-lg border p-4 space-y-3 ${result.erro ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-green-200 bg-green-50 dark:bg-green-950/20"}`}>
              {result.erro ? (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{result.erro}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-semibold">NF-e encontrada</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {result.numero && (
                      <div>
                        <p className="text-muted-foreground text-xs">Número</p>
                        <p className="font-medium">{result.numero}</p>
                      </div>
                    )}
                    {result.serie && (
                      <div>
                        <p className="text-muted-foreground text-xs">Série</p>
                        <p className="font-medium">{result.serie}</p>
                      </div>
                    )}
                    {result.valor && (
                      <div>
                        <p className="text-muted-foreground text-xs">Valor Total</p>
                        <p className="font-medium">{result.valor}</p>
                      </div>
                    )}
                    {result.emitente && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">Emitente</p>
                        <p className="font-medium truncate">{result.emitente}</p>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (result.xml) {
                          downloadBlob(result.xml, `nfe_${result.chave}.xml`, "application/xml");
                          toast.success("XML baixado!");
                        }
                      }}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Baixar XML
                    </Button>
                    {result.danfePdf ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          downloadBase64Pdf(result.danfePdf!, `danfe_${result.chave}.pdf`);
                          toast.success("DANFE baixado!");
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Baixar DANFE (PDF)
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        <FileText className="h-4 w-4 mr-2" />
                        DANFE indisponível
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre a integração */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como funciona a integração Arquivei</p>
              <p>
                A integração usa a <strong>API Lite do Arquivei</strong> (agora Qive) para buscar o XML de NF-e
                diretamente pela chave de acesso de 44 dígitos. O XML é retornado e pode ser baixado imediatamente.
              </p>
              <p>
                O DANFE (PDF da nota) requer acesso à API completa do Arquivei. Se sua conta tiver acesso,
                ele será baixado automaticamente junto com o XML.
              </p>
              <p>
                Encontre suas credenciais em:{" "}
                <a
                  href="https://app.arquivei.com.br/configuracoes/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  app.arquivei.com.br/configuracoes/api
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Winthor ─────────────────────────────────────────────────────────────────

interface WinthorRotina {
  codigo: string;
  descricao: string;
  modulo: string;
  tipo: "relatorio" | "processo" | "consulta" | "cadastro";
  ultimaExecucao?: string;
  status?: "ok" | "erro" | "pendente";
}

const ROTINAS_PADRAO: WinthorRotina[] = [
  // ── Cadastros de Veículos e Motoristas ──────────────────────────────────────
  { codigo: "521",  descricao: "Cadastrar Veículos", modulo: "Veículos / Motoristas", tipo: "cadastro" },
  { codigo: "929",  descricao: "Cadastrar Motorista", modulo: "Veículos / Motoristas", tipo: "cadastro" },
  { codigo: "965",  descricao: "Cadastro de Localizações de Veículos", modulo: "Veículos / Motoristas", tipo: "cadastro" },
  { codigo: "969",  descricao: "Consultar Motoristas", modulo: "Veículos / Motoristas", tipo: "consulta" },
  { codigo: "970",  descricao: "Cadastrar Dados do Fornecedor de Frete", modulo: "Veículos / Motoristas", tipo: "cadastro" },
  { codigo: "971",  descricao: "Cadastrar Frete", modulo: "Veículos / Motoristas", tipo: "cadastro" },

  // ── Carregamento ─────────────────────────────────────────────────────────────
  { codigo: "901",  descricao: "Montar Carga", modulo: "Carregamento", tipo: "processo" },
  { codigo: "902",  descricao: "Emitir Mapa de Separação por Rua", modulo: "Carregamento", tipo: "relatorio" },
  { codigo: "903",  descricao: "Emitir Mapa de Separação por Cidade", modulo: "Carregamento", tipo: "relatorio" },
  { codigo: "904",  descricao: "Cancelar Carga", modulo: "Carregamento", tipo: "processo" },
  { codigo: "905",  descricao: "Transferir NF Venda entre Carregamento", modulo: "Carregamento", tipo: "processo" },
  { codigo: "906",  descricao: "Registrar Saída de Veículo", modulo: "Carregamento", tipo: "processo" },
  { codigo: "907",  descricao: "Registrar Entrada Veículo", modulo: "Carregamento", tipo: "processo" },
  { codigo: "908",  descricao: "Acompanhamento de Entregas", modulo: "Carregamento", tipo: "consulta" },
  { codigo: "909",  descricao: "Cargas em Aberto", modulo: "Carregamento", tipo: "consulta" },
  { codigo: "910",  descricao: "Pedido por Carregamento", modulo: "Carregamento", tipo: "consulta" },
  { codigo: "916",  descricao: "Emitir Mapa de Separação por Carregamento", modulo: "Carregamento", tipo: "relatorio" },
  { codigo: "920",  descricao: "Itens por Carregamento", modulo: "Carregamento", tipo: "consulta" },
  { codigo: "926",  descricao: "Acessar Montagem de Carga", modulo: "Carregamento", tipo: "processo" },
  { codigo: "933",  descricao: "Gerar Arquivo de Carregamento", modulo: "Carregamento", tipo: "processo" },
  { codigo: "939",  descricao: "Importar Cargas Montadas", modulo: "Carregamento", tipo: "processo" },
  { codigo: "960",  descricao: "Conferir Separação por Carregamento", modulo: "Carregamento", tipo: "processo" },
  { codigo: "963",  descricao: "Relação de Pedidos por Carregamento", modulo: "Carregamento", tipo: "relatorio" },
  { codigo: "967",  descricao: "Consultar Carregamento", modulo: "Carregamento", tipo: "consulta" },
  { codigo: "968",  descricao: "Consultar Corte por Carregamento", modulo: "Carregamento", tipo: "consulta" },
  { codigo: "972",  descricao: "Conferir Pedidos/Carregamentos Faturados", modulo: "Carregamento", tipo: "processo" },
  { codigo: "996",  descricao: "Agrupamento de Carregamentos", modulo: "Carregamento", tipo: "processo" },

  // ── Acerto de Carga / Motorista ───────────────────────────────────────────
  { codigo: "410",  descricao: "Acerto de Carga / Caixa", modulo: "Acerto / Motorista", tipo: "processo" },
  { codigo: "407",  descricao: "Relatório Fechamento de Carga", modulo: "Acerto / Motorista", tipo: "relatorio" },
  { codigo: "408",  descricao: "Carga Fechada por Usuário", modulo: "Acerto / Motorista", tipo: "relatorio" },
  { codigo: "412",  descricao: "Emitir Termo de Responsabilidade", modulo: "Acerto / Motorista", tipo: "relatorio" },
  { codigo: "414",  descricao: "Comissão de Motorista", modulo: "Acerto / Motorista", tipo: "relatorio" },
  { codigo: "417",  descricao: "Mapa de Acerto", modulo: "Acerto / Motorista", tipo: "relatorio" },
  { codigo: "419",  descricao: "Produtividade por Funcionário / Cx. Motorista", modulo: "Acerto / Motorista", tipo: "relatorio" },
  { codigo: "420",  descricao: "Cargas em Processo de Acerto Cx. Motorista", modulo: "Acerto / Motorista", tipo: "consulta" },
  { codigo: "421",  descricao: "Lançar Data Canhoto em Nota Fiscal", modulo: "Acerto / Motorista", tipo: "processo" },
  { codigo: "422",  descricao: "Cad. Comissão Motorista por Distribuição", modulo: "Acerto / Motorista", tipo: "cadastro" },

  // ── Expedição / Separação ───────────────────────────────────────────────
  { codigo: "931",  descricao: "Emitir Mapa de Separação por Pedido", modulo: "Expedição", tipo: "relatorio" },
  { codigo: "934",  descricao: "Ficha de Viagem", modulo: "Expedição", tipo: "relatorio" },
  { codigo: "935",  descricao: "Descarga de Mercadoria", modulo: "Expedição", tipo: "processo" },
  { codigo: "953",  descricao: "Mapa de Separação", modulo: "Expedição", tipo: "relatorio" },
  { codigo: "955",  descricao: "Iniciar / Finalizar Expedição de Pedidos", modulo: "Expedição", tipo: "processo" },
  { codigo: "959",  descricao: "Conf. Sep. Carreg. Por Bairro-Rota-Praça", modulo: "Expedição", tipo: "processo" },

  // ── Rota / Frete ─────────────────────────────────────────────────────────
  { codigo: "911",  descricao: "Cliente para Roteirizar", modulo: "Rota / Frete", tipo: "consulta" },
  { codigo: "913",  descricao: "Escala Diária de Entregas", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "914",  descricao: "Rentabilidade por Rota", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "917",  descricao: "Simulador de Frete", modulo: "Rota / Frete", tipo: "consulta" },
  { codigo: "918",  descricao: "Venda por Veículo", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "919",  descricao: "Simulador de Frete por Carregamento de Cliente", modulo: "Rota / Frete", tipo: "consulta" },
  { codigo: "921",  descricao: "Comissão por Rota", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "927",  descricao: "Resumo de Pedido por Rota", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "928",  descricao: "Resumo Rota/Praça", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "957",  descricao: "Calcular Frete do Pedido", modulo: "Rota / Frete", tipo: "processo" },
  { codigo: "964",  descricao: "Consulta Carregamento de Frete por Transportadora", modulo: "Rota / Frete", tipo: "consulta" },
  { codigo: "966",  descricao: "Consultar Praça", modulo: "Rota / Frete", tipo: "consulta" },
  { codigo: "981",  descricao: "Cálculo de Frete por Veículo", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "1407", descricao: "Romaneio Simplificado", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "1420", descricao: "Gerar Conhecimento de Frete", modulo: "Rota / Frete", tipo: "processo" },
  { codigo: "1433", descricao: "Emitir Mapa de Carregamento", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "1441", descricao: "Emitir Conhecimento de Frete", modulo: "Rota / Frete", tipo: "relatorio" },
  { codigo: "1449", descricao: "Lançar Despesas de Viagem", modulo: "Rota / Frete", tipo: "processo" },
  { codigo: "1474", descricao: "Emissão de Conhecimento de Transporte Eletrônico (CT-e)", modulo: "Rota / Frete", tipo: "processo" },

  // ── Financeiro / Vendas (referência) ────────────────────────────────────
  { codigo: "119",  descricao: "Fluxo de Caixa", modulo: "Financeiro", tipo: "relatorio" },
  { codigo: "316",  descricao: "Digitar Pedido de Venda", modulo: "Vendas", tipo: "processo" },
  { codigo: "317",  descricao: "Emitir Pedido de Venda", modulo: "Vendas", tipo: "processo" },
  { codigo: "1425", descricao: "Rel. Pedidos por Carregamento", modulo: "Vendas", tipo: "relatorio" },
  { codigo: "1428", descricao: "Produto Vendido por Carregamento", modulo: "Vendas", tipo: "relatorio" },
];

function WinthorTab() {
  const [host, setHost] = useState(() => localStorage.getItem("winthor_host") || "");
  const [porta, setPorta] = useState(() => localStorage.getItem("winthor_porta") || "1521");
  const [usuario, setUsuario] = useState(() => localStorage.getItem("winthor_usuario") || "");
  const [senha, setSenha] = useState(() => localStorage.getItem("winthor_senha") || "");
  const [sid, setSid] = useState(() => localStorage.getItem("winthor_sid") || "WINTHOR");
  const [configSaved, setConfigSaved] = useState(!!localStorage.getItem("winthor_host"));
  const [busca, setBusca] = useState("");
  const [moduloFiltro, setModuloFiltro] = useState("Todos");
  const [testando, setTestando] = useState(false);
  const [statusConexao, setStatusConexao] = useState<"idle" | "ok" | "erro">("idle");

  const salvarConfig = () => {
    if (!host.trim()) { toast.error("Informe o host do servidor Winthor"); return; }
    localStorage.setItem("winthor_host", host.trim());
    localStorage.setItem("winthor_porta", porta.trim());
    localStorage.setItem("winthor_usuario", usuario.trim());
    localStorage.setItem("winthor_senha", senha);
    localStorage.setItem("winthor_sid", sid.trim());
    setConfigSaved(true);
    toast.success("Configuração Winthor salva!");
  };

  const testarConexao = async () => {
    if (!host) { toast.error("Configure o servidor Winthor primeiro"); return; }
    setTestando(true);
    setStatusConexao("idle");
    // Simula teste de conexão (em produção, chamar endpoint do backend)
    await new Promise(r => setTimeout(r, 1500));
    // Como é uma simulação, sempre retorna "ok" se host estiver preenchido
    setStatusConexao("ok");
    toast.success("Conexão testada! (simulação — configure o backend para conexão real)");
    setTestando(false);
  };

  const modulos = ["Todos", "Veículos / Motoristas", "Carregamento", "Acerto / Motorista", "Expedição", "Rota / Frete", "Vendas", "Financeiro"];

  const rotinasFiltradas = ROTINAS_PADRAO.filter(r => {
    const matchBusca = !busca || r.codigo.includes(busca) || r.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchModulo = moduloFiltro === "Todos" || r.modulo === moduloFiltro;
    return matchBusca && matchModulo;
  });

  const tipoColors: Record<string, string> = {
    relatorio: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    processo: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    consulta: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    cadastro: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  };

  return (
    <div className="space-y-6">
      {/* Configuração de conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-primary" />
            Configuração do Servidor Winthor
          </CardTitle>
          <CardDescription>
            Configure a conexão com o banco de dados Oracle do Winthor (PC Sistemas).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Host / IP do Servidor</Label>
              <Input placeholder="192.168.1.100 ou servidor.empresa.com" value={host} onChange={e => setHost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Porta Oracle</Label>
              <Input placeholder="1521" value={porta} onChange={e => setPorta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Usuário Oracle</Label>
              <Input placeholder="WINTHOR" value={usuario} onChange={e => setUsuario(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input type="password" placeholder="Senha do banco" value={senha} onChange={e => setSenha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SID / Service Name</Label>
              <Input placeholder="WINTHOR" value={sid} onChange={e => setSid(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={salvarConfig} size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Salvar Configuração
            </Button>
            <Button onClick={testarConexao} size="sm" variant="outline" disabled={testando || !configSaved}>
              {testando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            {configSaved && (
              <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configurado
              </Badge>
            )}
            {statusConexao === "ok" && (
              <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-3 w-3 mr-1" />
                Conexão OK
              </Badge>
            )}
            {statusConexao === "erro" && (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Falha na conexão
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rotinas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Rotinas Winthor
          </CardTitle>
          <CardDescription>
            Consulte e acesse as rotinas disponíveis no ERP Winthor (PC Sistemas).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome da rotina..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {modulos.map(m => (
                <button
                  key={m}
                  onClick={() => setModuloFiltro(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    moduloFiltro === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Código</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Rotina</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Módulo</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Tipo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rotinasFiltradas.map((rotina) => (
                  <tr key={rotina.codigo} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary">{rotina.codigo}</td>
                    <td className="px-4 py-3">{rotina.descricao}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{rotina.modulo}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoColors[rotina.tipo]}`}>
                        {rotina.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => toast.info(`Rotina ${rotina.codigo} — ${rotina.descricao}\n\nConecte o backend ao Oracle Winthor para executar esta rotina.`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Acessar
                      </Button>
                    </td>
                  </tr>
                ))}
                {rotinasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Nenhuma rotina encontrada para "{busca}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Aviso de integração real */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Integração com Winthor</p>
              <p>
                A integração completa com o Winthor requer um <strong>conector backend</strong> que se conecte
                ao banco Oracle via JDBC/ODBC. As rotinas listadas acima são as principais do sistema.
              </p>
              <p>
                Para integração em produção, o backend do Rotiq precisa ter acesso à rede interna onde
                o servidor Oracle do Winthor está instalado. Entre em contato para configurar o conector.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Integracoes() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  const defaultTab = location.includes("winthor") ? "winthor" : "arquivei";

  if (loading) return null;

  const canAccess = (user as any)?.role === "admin" || (user as any)?.role === "master_admin";
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Integrações</h1>
          <p className="text-sm text-muted-foreground">
            Conecte o Rotiq com sistemas externos como Arquivei e Winthor.
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
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
          <ArquiveiTab />
        </TabsContent>

        <TabsContent value="winthor" className="mt-6">
          <WinthorTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
