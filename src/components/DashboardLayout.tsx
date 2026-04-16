import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Truck, Users, Fuel, Wrench, DollarSign,
  ClipboardCheck, MapPin, LogOut, Menu, TrendingUp, TrendingDown,
  Wallet, BarChart3, Sun, Moon, Monitor, UserCog, Send, RotateCcw,
  Navigation, AlertTriangle, FileText, Bell, Calendar, Gauge,
  ClipboardList, BookOpen, Shield, Settings, Star, ChevronLeft,
  ChevronRight, Calculator, MessageSquare, Scale, FileSpreadsheet,
  HelpCircle, Brain, PackageCheck, Warehouse, Package, ArrowLeftRight,
  Target, ShoppingCart, Clock, UserCheck, Headphones, Activity,
  Megaphone, Server, Cpu, HardDrive, Network, Key, Bug, GitMerge,
  Building2, Receipt, Banknote, PieChart, UserPlus, GraduationCap,
  HeartHandshake, Award, Clipboard, Microscope, Thermometer, Leaf,
  Globe, Plug, Zap, Search, ChevronDown, ChevronUp, X, CheckCircle,
  Info, Ticket, Wrench as WrenchIcon,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { SeletorEmpresa } from "./SeletorEmpresa";
import { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
type MenuItem = { icon: any; label: string; path: string };
type MenuGroup = {
  label: string;
  icon?: any;
  requiredRole?: string;
  items: MenuItem[];
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTRUTURA DO MENU — Limpa, intuitiva, máximo 10 grupos principais
// ─────────────────────────────────────────────────────────────────────────────
const getMenuGroups = (t: any): MenuGroup[] => [
  // ── INÍCIO ─────────────────────────────────────────────────────────────────
  {
    label: "Início",
    icon: LayoutDashboard,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Brain, label: "IA Synapse", path: "/ia" },
      { icon: MessageSquare, label: "Chat", path: "/chat" },
      { icon: Bell, label: "Alertas", path: "/gestao/alertas" },
      { icon: Calendar, label: "Calendário", path: "/gestao/calendario" },
      { icon: CheckCircle, label: "Tarefas & Projetos", path: "/tarefas" },
      { icon: BookOpen, label: "Bloco de Notas", path: "/notas" },
    ],
  },

  // ── FROTA & OPERAÇÕES ──────────────────────────────────────────────────────
  {
    label: "Frota & Operações",
    icon: Truck,
    items: [
      { icon: Truck, label: "Veículos", path: "/veiculos" },
      { icon: Users, label: "Motoristas", path: "/funcionarios" },
      { icon: Navigation, label: "Viagens", path: "/viagens" },
      { icon: Fuel, label: "Abastecimentos", path: "/abastecimentos" },
      { icon: Calculator, label: "Simulador de Viagem", path: "/simulador-viagem" },
      { icon: Wrench, label: "Manutenções", path: "/manutencoes" },
      { icon: ClipboardList, label: "Plano de Manutenção", path: "/plano-manutencao" },
      { icon: Gauge, label: "Combustível", path: "/gestao/estoque-combustivel" },
      { icon: ClipboardCheck, label: "Conferência de Veículos", path: "/conferencia-veiculos" },
    ],
  },

  // ── DESPACHANTE ────────────────────────────────────────────────────────────
  {
    label: "Despachante",
    icon: Send,
    items: [
      { icon: MapPin, label: "Saída para Entrega", path: "/despachante/entrega" },
      { icon: Send, label: "Saída para Viagem", path: "/despachante/viagem" },
      { icon: RotateCcw, label: "Retorno de Veículo", path: "/despachante/retorno" },
      { icon: FileText, label: "Notas Fiscais", path: "/notas-fiscais" },
      { icon: Scale, label: "Acerto de Carga", path: "/acerto-carga" },
      { icon: ClipboardList, label: "Carregamento", path: "/carregamento" },
      { icon: BookOpen, label: "Ocorrências", path: "/gestao/relatos" },
      { icon: AlertTriangle, label: "Multas", path: "/gestao/multas" },
      { icon: Shield, label: "Acidentes", path: "/gestao/acidentes" },
      { icon: FileText, label: "Documentos", path: "/gestao/documentos" },
    ],
  },

  // ── COMERCIAL ─────────────────────────────────────────────────────────────
  {
    label: "Comercial",
    icon: Target,
    items: [
      { icon: Target, label: "Clientes", path: "/crm" },
      { icon: TrendingUp, label: "Leads & Funil", path: "/crm/funil" },
      { icon: ShoppingCart, label: "Pedidos de Venda", path: "/vendas" },
      { icon: FileText, label: "Propostas", path: "/vendas/propostas" },
      { icon: HeartHandshake, label: "Pós-Venda", path: "/crm/pos-venda" },
      { icon: Megaphone, label: "Campanhas de Marketing", path: "/marketing/campanhas" },
      { icon: Zap, label: "Automações de Marketing", path: "/marketing/automacoes" },
      { icon: BarChart3, label: "Performance de Marketing", path: "/marketing/analytics" },
    ],
  },

  // ── ESTOQUE & LOGÍSTICA ────────────────────────────────────────────────────
  {
    label: "Estoque & Logística",
    icon: Warehouse,
    items: [
      { icon: PackageCheck, label: "Recebimento", path: "/recepcao" },
      { icon: Warehouse, label: "Estoque", path: "/wms/estoque" },
      { icon: Package, label: "Produtos", path: "/wms/produtos" },
      { icon: ArrowLeftRight, label: "Movimentações", path: "/wms/movimentacoes" },
      { icon: MapPin, label: "Endereçamento", path: "/wms/armazens" },
      { icon: ClipboardCheck, label: "Inventário", path: "/wms/inventario" },
      { icon: Thermometer, label: "Controle de Temperatura", path: "/logistica/temperatura" },
      { icon: Leaf, label: "Rastreabilidade de Lote", path: "/logistica/rastreabilidade" },
    ],
  },

  // ── FINANCEIRO ─────────────────────────────────────────────────────────────
  {
    label: "Financeiro",
    icon: DollarSign,
    items: [
      { icon: TrendingDown, label: "Contas a Pagar", path: "/financeiro" },
      { icon: TrendingUp, label: "Contas a Receber", path: "/financeiro/receber" },
      { icon: Wallet, label: "Adiantamentos", path: "/financeiro/adiantamentos" },
      { icon: DollarSign, label: "Acertos de Viagem", path: "/gestao/acertos" },
      { icon: BarChart3, label: "Custos Operacionais", path: "/custos" },
      { icon: Calculator, label: "DRE por Placa", path: "/financeiro/dre" },
      { icon: Banknote, label: "Fluxo de Caixa", path: "/financeiro/fluxo-caixa" },
      { icon: Receipt, label: "Conciliação Bancária", path: "/financeiro/conciliacao" },
    ],
  },

  // ── PESSOAS ────────────────────────────────────────────────────────────────
  {
    label: "Pessoas",
    icon: UserPlus,
    items: [
      { icon: Users, label: "Funcionários", path: "/rh/funcionarios" },
      { icon: Clock, label: "Ponto Eletrônico", path: "/ponto" },
      { icon: DollarSign, label: "Folha de Pagamento", path: "/rh/folha" },
      { icon: Award, label: "Benefícios", path: "/rh/beneficios" },
      { icon: GraduationCap, label: "Treinamentos", path: "/rh/treinamentos" },
      { icon: PieChart, label: "People Analytics", path: "/rh/analytics" },
      { icon: HeartHandshake, label: "Clima Organizacional", path: "/rh/clima" },
      { icon: UserCheck, label: "Controle de Visitas", path: "/recepcionista" },
    ],
  },

  // ── TI ─────────────────────────────────────────────────────────────────────
  {
    label: "TI",
    icon: Monitor,
    items: [
      { icon: Bug, label: "Chamados", path: "/ti/tickets" },
      { icon: HardDrive, label: "Inventário de Ativos", path: "/ti/inventario" },
      { icon: Cpu, label: "Monitoramento", path: "/ti/monitoramento" },
      { icon: Key, label: "Acessos Remotos", path: "/ti/acessos" },
      { icon: Shield, label: "Licenças de Software", path: "/ti/licencas" },
      { icon: ShoppingCart, label: "Compras de TI", path: "/ti/compras" },
      { icon: WrenchIcon, label: "Manutenção", path: "/ti/manutencao" },
      { icon: Network, label: "Agentes", path: "/ti/agentes" },
      { icon: Shield, label: "Certificados Digitais", path: "/ti/certificados" },
      { icon: Bell, label: "Alertas de TI", path: "/ti/alertas" },
    ],
  },

  // ── RELATÓRIOS & BI ────────────────────────────────────────────────────────
  {
    label: "Relatórios & BI",
    icon: Activity,
    items: [
      { icon: Activity, label: "Business Intelligence", path: "/bi" },
      { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
      { icon: TrendingUp, label: "Relatórios Avançados", path: "/relatorios-avancados" },
      { icon: Clipboard, label: "Não Conformidades", path: "/qualidade/nao-conformidades" },
      { icon: FileSpreadsheet, label: "Importar / Exportar", path: "/import-export" },
    ],
  },

  // ── SISTEMA ────────────────────────────────────────────────────────────────
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { icon: UserCog, label: "Usuários", path: "/usuarios" },
      { icon: Settings, label: "Configurações", path: "/configuracoes" },
      { icon: Plug, label: "Integrações", path: "/integracoes" },
      { icon: HelpCircle, label: "Ajuda", path: "/ajuda" },
    ],
  },

  // ── MASTER ADMIN ───────────────────────────────────────────────────────────
  {
    label: "Master Admin",
    icon: Star,
    requiredRole: "master_admin",
    items: [
      { icon: Star, label: "Painel Master", path: "/master/painel" },
      { icon: Building2, label: "Gestão de Empresas", path: "/master/empresas" },
      { icon: Shield, label: "Permissões", path: "/master/permissoes" },
      { icon: Activity, label: "Auditoria Global", path: "/auditoria" },
      { icon: Brain, label: "Treinamento da IA", path: "/master/ia-training" },
      { icon: BarChart3, label: "BI Global", path: "/master/bi" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  setCollapsed,
  location,
  navigate,
  user,
  logout,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  location: string;
  navigate: (path: string) => void;
  user: any;
  logout: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const isActive = (path: string) => location === path;

  const isGroupActive = (items: MenuItem[]) =>
    items.some((item) => isActive(item.path));

  // Badges de notificação por rota — dados reais do backend
  const chatUnreadQ = trpc.chat.listConversas.useQuery(undefined, { refetchInterval: 15000 });
  const tiDashQ = trpc.ti.dashboard.useQuery(undefined, { refetchInterval: 30000 });
  const chatUnread = (chatUnreadQ.data ?? []).reduce((acc: number, c: any) => acc + (c.unreadCount ?? 0), 0);
  const tiOpen = (tiDashQ.data as any)?.abertos ?? 0;
  const totalNotifs = chatUnread + tiOpen;

  // Atualiza título da aba com contador de notificações
  useEffect(() => {
    document.title = totalNotifs > 0 ? `(${totalNotifs > 99 ? '99+' : totalNotifs}) Synapse` : 'Synapse';
    return () => { document.title = 'Synapse'; };
  }, [totalNotifs]);

  const BADGES: Record<string, number> = {
    "/chat": chatUnread,
    "/ti": tiOpen,
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const roleLabel =
    user?.role === "master_admin" ? "Master ADM" :
    user?.role === "ti_master"    ? "TI Master" :
    user?.role === "admin"        ? "Administrador" :
    user?.role === "financeiro"   ? "Financeiro" :
    user?.role === "comercial"    ? "Comercial" :
    user?.role === "dispatcher"   ? "Despachante" :
    user?.role === "motorista"    ? "Motorista" :
    user?.role === "wms_operator" ? "Operador WMS" :
    user?.role === "rh"           ? "RH" :
    user?.role === "ti"           ? "TI" :
    user?.role === "monitor"      ? "Monitor" : "Usuário";

  const handleNav = (path: string) => {
    const scrollTop = navRef.current?.scrollTop ?? 0;
    navigate(path);
    requestAnimationFrame(() => {
      if (navRef.current) navRef.current.scrollTop = scrollTop;
    });
  };

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isGroupExpanded = (label: string, items: MenuItem[]) => {
    if (expandedGroups[label] !== undefined) return expandedGroups[label];
    return isGroupActive(items);
  };

  const menuGroups = getMenuGroups(t);

  const filteredGroups = search.trim()
    ? menuGroups.map((g) => ({
        ...g,
        items: g.items.filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.items.length > 0)
    : menuGroups;

  // Roles que têm acesso total (vêem tudo)
  const FULL_ACCESS_ROLES = ["master_admin", "ti_master", "admin"];

  // Mapa de acesso por grupo: quais roles podem ver cada grupo
  const GROUP_ACCESS: Record<string, string[]> = {
    "INÍCIO":               [...FULL_ACCESS_ROLES, "financeiro", "comercial", "dispatcher", "motorista", "wms_operator", "rh", "ti", "monitor", "user"],
    "FROTA & OPERAÇÕES":   [...FULL_ACCESS_ROLES, "dispatcher", "motorista"],
    "CRM & VENDAS":         [...FULL_ACCESS_ROLES, "comercial"],
    "MARKETING":            [...FULL_ACCESS_ROLES, "comercial"],
    "WMS / ARMÁZEM":       [...FULL_ACCESS_ROLES, "wms_operator"],
    "LOGÍSTICA":            [...FULL_ACCESS_ROLES, "wms_operator", "dispatcher"],
    "FINANCEIRO":           [...FULL_ACCESS_ROLES, "financeiro"],
    "RH / PESSOAS":         [...FULL_ACCESS_ROLES, "rh"],
    "TI / INFRAESTRUTURA":  [...FULL_ACCESS_ROLES, "ti"],
    "RECEPÇÃO":            [...FULL_ACCESS_ROLES, "user"],
    "QUALIDADE (QMS)":      [...FULL_ACCESS_ROLES],
    "BI & RELATÓRIOS":     [...FULL_ACCESS_ROLES, "financeiro", "monitor"],
    "SISTEMA":              [...FULL_ACCESS_ROLES, "ti"],
    "INTEGRAÇÕES":         [...FULL_ACCESS_ROLES, "ti"],
    "MASTER ADMIN":         ["master_admin", "ti_master"],
  };

  const canSeeGroup = (groupLabel: string): boolean => {
    if (!user?.role) return false;
    // Master ADM e TI Master vêem tudo sempre
    if (user.role === "master_admin" || user.role === "ti_master") return true;
    // Verifica requiredRole legado
    const group = filteredGroups.find(g => g.label === groupLabel);
    if (group?.requiredRole === "master_admin") return false;
    // Verifica mapa de acesso
    const allowed = GROUP_ACCESS[groupLabel];
    if (!allowed) return true; // grupo sem restrição = todos vêem
    return allowed.includes(user.role);
  };

  const visibleGroups = filteredGroups.filter((group) => canSeeGroup(group.label));



  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-foreground tracking-tight text-base">Synapse</span>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto p-1 rounded hover:bg-accent transition-colors"
            title="Recolher menu"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* ── Busca no menu ── */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar no menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-muted border-0 outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      )}

      {/* ── Menu items ── */}
      <nav ref={navRef} className="flex-1 overflow-y-auto py-1">
        {visibleGroups.map((group) => {
          const expanded = collapsed ? false : isGroupExpanded(group.label, group.items);
          const GroupIcon = group.icon;
          const groupHasBadge = group.items.some((item) => BADGES[item.path] > 0);
          const groupTotalBadge = group.items.reduce((acc, item) => acc + (BADGES[item.path] || 0), 0);

          return (
            <div key={group.label} className="mb-1">
              {!collapsed ? (
                /* Cabeçalho do grupo — linha separadora + label discreto */
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-2 px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                    isGroupActive(group.items)
                      ? "text-primary"
                      : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                  }`}
                >
                  {GroupIcon && <GroupIcon className="h-3 w-3 shrink-0" />}
                  <span className="flex-1 text-left truncate">{group.label}</span>
                  {/* Badge total do grupo quando recolhido */}
                  {!expanded && groupHasBadge && (
                    <span className="h-4 min-w-4 px-1 text-[10px] rounded-full bg-red-500 text-white font-bold flex items-center justify-center shrink-0">
                      {groupTotalBadge > 9 ? "9+" : groupTotalBadge}
                    </span>
                  )}
                  {expanded ? (
                    <ChevronUp className="h-3 w-3 shrink-0 opacity-40" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />
                  )}
                </button>
              ) : (
                <div className="h-px bg-sidebar-border/20 mx-3 mt-2" />
              )}

              {(expanded || collapsed) &&
                group.items.map((item) => {
                  const active = isActive(item.path);
                  const badge = BADGES[item.path];
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      title={collapsed ? item.label : undefined}
                      className={`relative w-full flex items-center gap-2.5 py-1.5 text-xs transition-all ${
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      } ${collapsed ? "justify-center px-0 mx-0 rounded-none" : "pl-7 pr-3 rounded-md mx-1.5"}`}
                      style={collapsed ? {} : { width: "calc(100% - 12px)" }}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-primary" />
                      )}
                      <item.icon className={`h-3.5 w-3.5 shrink-0 ${
                        active ? "text-primary" : ""
                      }`} />
                      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      {/* Badge de notificação */}
                      {badge && badge > 0 && (
                        <span className={`${
                          collapsed
                            ? "absolute top-0 right-0 h-3.5 w-3.5 text-[8px]"
                            : "h-4 min-w-4 px-1 text-[10px]"
                        } rounded-full bg-red-500 text-white font-bold flex items-center justify-center shrink-0`}>
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border shrink-0 p-3">

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-2 w-full rounded-lg p-2 hover:bg-accent transition-colors ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.name ?? "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user?.email ?? user?.name}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="text-xs">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <p className="text-[10px] text-muted-foreground mb-1">Tema</p>
              <div className="flex items-center gap-1">
                {[
                  { key: "light" as const, icon: Sun, label: "Claro" },
                  { key: "gray" as const, icon: Monitor, label: "Cinza" },
                  { key: "dark" as const, icon: Moon, label: "Escuro" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setTheme(item.key)}
                    className={`flex-1 flex items-center justify-center gap-0.5 rounded-md py-1 text-[10px] transition-colors ${
                      theme === item.key
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-3 w-3" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 text-xs">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Synapse</span>
          </div>
          <p className="text-center text-muted-foreground">
            Sessão expirada ou não autenticada.
          </p>
          <Button onClick={() => setLocation("/login")} size="lg" className="w-full">
            Ir para o Login
          </Button>
        </div>
      </div>
    );
  }

  // Usuário logado mas sem empresa vinculada — exibe tela de pendência
  const isMasterRole = user?.role === "master_admin" || user?.role === "ti_master";
  if (user && !(user as any).empresaId && !isMasterRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Synapse</span>
          </div>
          <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Conta sem empresa vinculada</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Sua conta ainda não está vinculada a nenhuma empresa no sistema.
              Entre em contato com o administrador para que ele vincule sua conta a uma empresa.
            </p>
          </div>
          <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-left">
            <p className="text-xs font-semibold text-yellow-800 mb-1">O que fazer?</p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Informe ao administrador do sistema o seu e-mail de cadastro</li>
              <li>• Peça para ele acessar <strong>Sistema → Usuários</strong> e vincular sua conta a uma empresa</li>
              <li>• Após a vinculação, faça logout e login novamente</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">Usuário: <strong>{user?.name}</strong> — {user?.email}</p>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("app-user-info");
              localStorage.removeItem("synapse-auth-token");
              setLocation("/login");
            }}
            className="w-full"
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION BELL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
type Notification = {
  id: number;
  tipo: "mensagem" | "chamado" | "alerta" | "ti" | "sistema";
  titulo: string;
  descricao: string;
  lido: boolean;
  createdAt: Date;
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([
    { id: 1, tipo: "mensagem", titulo: "Nova mensagem", descricao: "Carlos enviou uma mensagem no chat", lido: false, createdAt: new Date(Date.now() - 2 * 60000) },
    { id: 2, tipo: "chamado", titulo: "Chamado SAC #0042", descricao: "Cliente BSB Transportes aguardando resposta", lido: false, createdAt: new Date(Date.now() - 15 * 60000) },
    { id: 3, tipo: "ti", titulo: "Ticket TI #0018", descricao: "Impressora do setor fiscal sem papel", lido: false, createdAt: new Date(Date.now() - 30 * 60000) },
    { id: 4, tipo: "alerta", titulo: "Estoque crítico", descricao: "Produto DIESEL S10 abaixo do mínimo", lido: true, createdAt: new Date(Date.now() - 60 * 60000) },
    { id: 5, tipo: "sistema", titulo: "Backup concluído", descricao: "Backup automático realizado com sucesso", lido: true, createdAt: new Date(Date.now() - 120 * 60000) },
  ]);

  const unread = notifs.filter((n) => !n.lido).length;

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, lido: true })));
  const markRead = (id: number) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, lido: true } : n));
  const removeNotif = (id: number) => setNotifs((prev) => prev.filter((n) => n.id !== id));

  const iconMap = {
    mensagem: <MessageSquare className="h-4 w-4 text-blue-500" />,
    chamado: <Headphones className="h-4 w-4 text-orange-500" />,
    ti: <Cpu className="h-4 w-4 text-purple-500" />,
    alerta: <AlertTriangle className="h-4 w-4 text-red-500" />,
    sistema: <CheckCircle className="h-4 w-4 text-green-500" />,
  };

  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    return `${Math.floor(mins / 60)}h`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        title="Notificações"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Notificações</span>
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Marcar todas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-accent/50 ${
                      !n.lido ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{iconMap[n.tipo]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-medium truncate ${!n.lido ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.titulo}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.descricao}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeNotif(n.id); }}
                      className="shrink-0 p-0.5 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <button className="text-xs text-primary hover:underline w-full text-center">
                Ver todas as notificações
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING ACTION BUTTONS (Chat + IA)
// ─────────────────────────────────────────────────────────────────────────────
function FloatingActions({ navigate }: { navigate: (path: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 left-4 z-30 flex flex-col-reverse items-start gap-2">
      {/* Main toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        title="Ações rápidas"
      >
        {expanded ? <X className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
      </button>

      {/* Chat button */}
      {expanded && (
        <button
          onClick={() => { navigate("/chat"); setExpanded(false); }}
          className="flex items-center gap-2 h-10 px-3 rounded-full bg-card border border-border text-foreground shadow-lg hover:bg-accent hover:scale-105 transition-all text-sm font-medium"
          title="Abrir Chat"
        >
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <span>Chat</span>
        </button>
      )}

      {/* IA button */}
      {expanded && (
        <button
          onClick={() => { navigate("/ia"); setExpanded(false); }}
          className="flex items-center gap-2 h-10 px-3 rounded-full bg-card border border-border text-foreground shadow-lg hover:bg-accent hover:scale-105 transition-all text-sm font-medium"
          title="Abrir IA Synapse"
        >
          <Brain className="h-4 w-4 text-purple-500" />
          <span>IA Synapse</span>
        </button>
      )}
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { viewAs, exitAdminView, isSimulating } = useViewAs();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200 shrink-0 relative ${
          collapsed ? "w-14" : "w-64"
        }`}
      >
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute left-10 top-4 z-50 p-1 rounded-full bg-primary text-primary-foreground shadow-md"
            title="Expandir menu"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          location={location}
          navigate={navigate}
          user={user}
          logout={logout}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-sidebar transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          collapsed={false}
          setCollapsed={() => {}}
          location={location}
          navigate={navigate}
          user={user}
          logout={logout}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background shrink-0">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <SeletorEmpresa />
          <NotificationBell />
          {isSimulating && (
            <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 rounded-lg px-3 py-1.5 text-xs font-medium">
              <Shield className="h-3.5 w-3.5" />
              <span>Visualizando como Admin — {viewAs.empresaNome}</span>
              <button
                onClick={exitAdminView}
                className="ml-1 underline hover:no-underline text-amber-700 dark:text-amber-300"
              >
                Sair
              </button>
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <FloatingActions navigate={navigate} />
    </div>
  );
}
