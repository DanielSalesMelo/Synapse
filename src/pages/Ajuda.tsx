import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Headphones,
  MessageSquare,
  Monitor,
  Search,
  Shield,
  Sparkles,
  TerminalSquare,
  UserCog,
} from "lucide-react";

type HelpBlock =
  | { tipo: "texto"; conteudo: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] };

type HelpSection = {
  id: string;
  icon: typeof BookOpen;
  titulo: string;
  descricao: string;
  badge: string;
  badgeColor: string;
  conteudo: HelpBlock[];
};

const SECOES: HelpSection[] = [
  {
    id: "visao-geral",
    icon: Sparkles,
    titulo: "Visão geral",
    descricao: "O que é o Synapse e como ele organiza suporte e TI",
    badge: "Comece aqui",
    badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    conteudo: [
      {
        tipo: "texto",
        conteudo:
          "O Synapse é uma plataforma operacional para suporte, TI, monitoramento e automação. O helpdesk é um módulo dentro da plataforma, mas a experiência principal é conversacional, em tempo real e orientada por contexto.",
      },
      {
        tipo: "lista",
        itens: [
          "Usuários comuns abrem solicitações, conversam com a TI e acompanham o status do atendimento.",
          "TI/Admin acompanha chamados, dispositivos, telemetria, anexos, alertas e operações técnicas permitidas.",
          "Master Admin pode operar em contexto global administrativo sem ficar preso a uma empresa fixa.",
        ],
      },
    ],
  },
  {
    id: "perfis",
    icon: Shield,
    titulo: "Perfis e permissões",
    descricao: "Separação clara entre usuário comum, TI/Admin e Master",
    badge: "Segurança",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    conteudo: [
      {
        tipo: "tabela",
        cabecalho: ["Perfil", "Pode acessar", "Não pode acessar"],
        linhas: [
          ["Usuário comum", "Meus chamados, chat, anexos e status do atendimento", "Dados técnicos, AnyDesk, comandos, PowerShell, outros ativos e área TI"],
          ["TI/Admin", "Demandas, dispositivos, inventário, anexos, status, AnyDesk e ações técnicas permitidas", "Ações bloqueadas por política ou fora da empresa autorizada"],
          ["Master Admin", "Visão global, empresas, dispositivos, pareamento, administração e auditoria", "Nada fora das políticas globais de segurança e auditoria"],
        ],
      },
      {
        tipo: "texto",
        conteudo:
          "Dados técnicos como CPU, RAM, disco, GPU, placa-mãe, serial, IP, usuário logado, AnyDesk e heartbeat ficam disponíveis apenas para perfis autorizados e sempre respeitam o contexto da empresa.",
      },
    ],
  },
  {
    id: "chamados",
    icon: Headphones,
    titulo: "Chamados e chat",
    descricao: "Atendimento por conversa, histórico e anexos",
    badge: "Suporte",
    badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    conteudo: [
      {
        tipo: "lista",
        itens: [
          "Abra um chamado descrevendo o problema em linguagem natural.",
          "Use o chat para conversar com a TI, enviar prints, anexar arquivos e copiar logs.",
          "Acompanhe status como aberto, em andamento, aguardando usuário, resolvido ou encerrado.",
          "Notificações e indicadores de leitura serão usados para destacar novas respostas e pendências.",
        ],
      },
    ],
  },
  {
    id: "dispositivos",
    icon: Monitor,
    titulo: "Dispositivos monitorados",
    descricao: "Inventário, telemetria e vínculo com o Synapse para Windows",
    badge: "Monitoramento",
    badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    conteudo: [
      {
        tipo: "lista",
        itens: [
          "Cada computador pareado aparece no painel TI / Ativos Monitorados.",
          "O painel mostra hostname, usuário logado, IP, sistema operacional, CPU, RAM, disco, GPU, placa-mãe, socket, serial/asset, AnyDesk, versão e última coleta.",
          "Ações disponíveis: remover monitoramento, desparear este PC, arquivar ativo, limpar vínculo para reinstalar e reativar ativo.",
          "Ao reinstalar no mesmo PC, o Synapse tenta reaproveitar o registro pelo fingerprint/hostname para evitar duplicidade.",
        ],
      },
    ],
  },
  {
    id: "instalacao",
    icon: Cpu,
    titulo: "Synapse para Windows",
    descricao: "Download único para suporte, chat, pareamento e monitoramento",
    badge: "Windows",
    badgeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    conteudo: [
      {
        tipo: "texto",
        conteudo:
          "Use o botão Baixar Synapse para Windows no módulo Dispositivos. O aplicativo oficial concentra instalação, reparo, remoção, limpeza de vínculo antigo, pareamento e inicialização com o Windows.",
      },
      {
        tipo: "lista",
        itens: [
          "Informe o código SYNC gerado no painel TI.",
          "O modo usuário comum ou TI/Admin é determinado pelas permissões da conta.",
          "O usuário comum não vê dados técnicos nem comandos.",
          "O TI/Admin vê recursos avançados somente quando a política permite.",
        ],
      },
    ],
  },
  {
    id: "operacoes-remotas",
    icon: TerminalSquare,
    titulo: "Operações remotas",
    descricao: "Base para comandos seguros, auditoria e PowerShell controlado",
    badge: "TI",
    badgeColor: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    conteudo: [
      {
        tipo: "lista",
        itens: [
          "A execução remota deve acontecer por jobs auditáveis, nunca por comando direto sem registro.",
          "Comandos perigosos são bloqueados ou exigem aprovação.",
          "PowerShell, scripts e ações administrativas devem respeitar RBAC, allowlist, blocklist e expiração de sessão.",
          "Toda ação sensível precisa gerar trilha de auditoria.",
        ],
      },
    ],
  },
  {
    id: "notificacoes",
    icon: Bell,
    titulo: "Notificações",
    descricao: "Alertas, respostas e eventos importantes",
    badge: "Tempo real",
    badgeColor: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    conteudo: [
      {
        tipo: "lista",
        itens: [
          "Novos chamados, novas mensagens e alertas críticos aparecem com badges e toasts.",
          "O Synapse atualiza chamados, dispositivos e telemetria em intervalos curtos.",
          "A evolução planejada inclui presença, digitação, notificações em segundo plano e alertas do aplicativo desktop.",
        ],
      },
    ],
  },
  {
    id: "master-admin",
    icon: UserCog,
    titulo: "Master Admin",
    descricao: "Contexto global administrativo",
    badge: "Global",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    conteudo: [
      {
        tipo: "texto",
        conteudo:
          "O Master Admin não precisa ter empresa fixa. Quando nenhuma empresa está selecionada, o Synapse usa um contexto global administrativo seguro para navegação, pareamento e visão operacional. Usuários normais e TI continuam filtrados por empresa ativa.",
      },
    ],
  },
];

const renderTexto = (texto: string) => {
  const partes = texto.split(/(\*\*.*?\*\*)/g);
  return partes.map((parte, index) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={index}>{parte.slice(2, -2)}</strong>;
    }
    return <span key={index}>{parte}</span>;
  });
};

export default function Ajuda() {
  const [busca, setBusca] = useState("");
  const [secaoAtiva, setSecaoAtiva] = useState(SECOES[0].id);
  const [copiado, setCopiado] = useState(false);

  const secoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return SECOES;
    return SECOES.filter((secao) =>
      [secao.titulo, secao.descricao, secao.badge, ...secao.conteudo.flatMap((bloco) => {
        if (bloco.tipo === "texto") return [bloco.conteudo];
        if (bloco.tipo === "lista") return bloco.itens;
        return [...bloco.cabecalho, ...bloco.linhas.flat()];
      })].some((valor) => valor.toLowerCase().includes(termo)),
    );
  }, [busca]);

  const secaoAtual = secoesFiltradas.find((secao) => secao.id === secaoAtiva) ?? secoesFiltradas[0] ?? SECOES[0];
  const ActiveIcon = secaoAtual.icon;

  const handleCopiarEmail = async () => {
    await navigator.clipboard.writeText("suporte@synapse.com.br");
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                Central de ajuda
              </Badge>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-cyan-300" />
                Ajuda do Synapse
              </CardTitle>
              <CardDescription className="max-w-2xl text-slate-400">
                Guia rápido em português-BR para suporte, TI, dispositivos monitorados, permissões e instalação do Synapse para Windows.
              </CardDescription>
            </div>
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar na ajuda..."
                className="pl-9 border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Tópicos</CardTitle>
            <CardDescription>{secoesFiltradas.length} seção(ões)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {secoesFiltradas.map((secao) => {
              const Icon = secao.icon;
              const active = secao.id === secaoAtual.id;
              return (
                <button
                  key={secao.id}
                  type="button"
                  onClick={() => setSecaoAtiva(secao.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    active ? "border-cyan-400/40 bg-cyan-400/10" : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${active ? "text-cyan-400" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{secao.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">{secao.descricao}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="outline" className={secaoAtual.badgeColor}>{secaoAtual.badge}</Badge>
                  <CardTitle className="mt-3 flex items-center gap-2 text-xl">
                    <ActiveIcon className="h-5 w-5 text-primary" />
                    {secaoAtual.titulo}
                  </CardTitle>
                  <CardDescription>{secaoAtual.descricao}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {secaoAtual.conteudo.map((bloco, index) => {
                if (bloco.tipo === "texto") {
                  return <p key={index} className="text-sm leading-7 text-muted-foreground">{renderTexto(bloco.conteudo)}</p>;
                }
                if (bloco.tipo === "lista") {
                  return (
                    <div key={index} className="grid gap-2">
                      {bloco.itens.map((item) => (
                        <div key={item} className="flex gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                          <span className="text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={index} className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          {bloco.cabecalho.map((coluna) => (
                            <th key={coluna} className="px-4 py-3 text-left font-semibold">{coluna}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bloco.linhas.map((linha) => (
                          <tr key={linha.join("-")} className="border-t">
                            {linha.map((celula) => (
                              <td key={celula} className="px-4 py-3 text-muted-foreground">{celula}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold">Precisa de suporte?</p>
                  <p className="text-sm text-muted-foreground">
                    Use o chat interno para atendimento rápido ou envie detalhes para o suporte técnico.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-background px-3 py-2 text-xs">suporte@synapse.com.br</code>
                <Button size="sm" variant="outline" onClick={handleCopiarEmail}>
                  {copiado ? <Check className="mr-2 h-4 w-4 text-emerald-500" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-3 p-5 md:grid-cols-3">
              <div className="rounded-xl border bg-muted/30 p-4">
                <MessageSquare className="mb-2 h-5 w-5 text-blue-500" />
                <p className="font-medium">Chat como centro</p>
                <p className="mt-1 text-xs text-muted-foreground">Atendimento por conversa, histórico, anexos e status.</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <Monitor className="mb-2 h-5 w-5 text-cyan-500" />
                <p className="font-medium">Dispositivos sincronizados</p>
                <p className="mt-1 text-xs text-muted-foreground">Heartbeat, inventário e telemetria filtrados por permissão.</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <Shield className="mb-2 h-5 w-5 text-emerald-500" />
                <p className="font-medium">Operação segura</p>
                <p className="mt-1 text-xs text-muted-foreground">RBAC, auditoria e políticas para ações técnicas.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
