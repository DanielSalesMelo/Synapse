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
  Globe, Plug, Zap, Search, ChevronDown, ChevronUp,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { SeletorEmpresa } from "./SeletorEmpresa";
import { useRef, useState } from "react";
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
// ESTRUTURA DO MENU — Organizada, sem duplicatas, com todos os módulos
// ─────────────────────────────────────────────────────────────────────────────
const getMenuGroups = (t: any): MenuGroup[] => [
  // ── PRINCIPAL ──────────────────────────────────────────────────────────────
  {
    label: "Principal",
    icon: LayoutDashboard,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: Brain, label: "Synapse AI", path: "/ia" },
      { icon: MessageSquare, label: "Chat", path: "/chat" },
      { icon: Bell, label: "Alertas", path: "/gestao/alertas" },
      { icon: Calendar, label: "Calendário", path: "/gestao/calendario" },
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
    ],
  },

  // ── OPERACIONAL ────────────────────────────────────────────────────────────
  {
    label: "Operacional",
    icon: Navigation,
    items: [
      { icon: Navigation, label: "Viagens", path: "/viagens" },
      { icon: Fuel, label: "Abastecimentos", path: "/abastecimentos" },
      { icon: Calculator, label: "Simulador de Viagem", path: "/simulador-viagem" },
      { icon: ClipboardCheck, label: "Checklist", path: "/checklist" },
      { icon: BookOpen, label: "Relatos / Ocorrências", path: "/gestao/relatos" },
      { icon: AlertTriangle, label: "Multas", path: "/gestao/multas" },
      { icon: Shield, label: "Acidentes", path: "/gestao/acidentes" },
      { icon: FileText, label: "Documentos da Frota", path: "/gestao/documentos" },
    ],
  },

  // ── FROTA ──────────────────────────────────────────────────────────────────
  {
    label: "Frota",
    icon: Truck,
    items: [
      { icon: Truck, label: "Veículos", path: "/veiculos" },
      { icon: Users, label: "Motoristas", path: "/funcionarios" },
      { icon: Wrench, label: "Manutenções", path: "/manutencoes" },
      { icon: ClipboardList, label: "Plano de Manutenção", path: "/plano-manutencao" },
      { icon: Gauge, label: "Estoque de Combustível", path: "/gestao/estoque-combustivel" },
      { icon: ClipboardCheck, label: "Conferência de Veículos", path: "/conferencia-veiculos" },
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

  // ── CRM & VENDAS ───────────────────────────────────────────────────────────
  {
    label: "CRM & Vendas",
    icon: Target,
    items: [
      { icon: Target, label: "Clientes & Leads", path: "/crm" },
      { icon: Users, label: "Leads", path: "/crm/leads" },
      { icon: BarChart3, label: "Funil de Vendas", path: "/crm/funil" },
      { icon: ShoppingCart, label: "Pedidos de Venda", path: "/vendas" },
      { icon: FileText, label: "Propostas Comerciais", path: "/vendas/propostas" },
      { icon: HeartHandshake, label: "Pós-Venda / CS", path: "/crm/pos-venda" },
    ],
  },

  // ── MARKETING ─────────────────────────────────────────────────────────────
  {
    label: "Marketing",
    icon: Megaphone,
    items: [
      { icon: Megaphone, label: "Campanhas", path: "/marketing/campanhas" },
      { icon: FileText, label: "E-mail Marketing", path: "/marketing/email" },
      { icon: Globe, label: "Landing Pages", path: "/marketing/landing-pages" },
      { icon: Users, label: "Segmentação de Leads", path: "/marketing/segmentacao" },
      { icon: BarChart3, label: "Análise de Performance", path: "/marketing/analytics" },
      { icon: Zap, label: "Automações", path: "/marketing/automacoes" },
    ],
  },

  // ── WMS ────────────────────────────────────────────────────────────────────
  {
    label: "WMS / Armazém",
    icon: Warehouse,
    items: [
      { icon: PackageCheck, label: "Recebimento (Putaway)", path: "/recepcao" },
      { icon: Package, label: "Docas", path: "/recepcao/docas" },
      { icon: Warehouse, label: "Estoque", path: "/wms/estoque" },
      { icon: Package, label: "Produtos", path: "/wms/produtos" },
      { icon: ArrowLeftRight, label: "Movimentações", path: "/wms/movimentacoes" },
      { icon: MapPin, label: "Endereçamento", path: "/wms/armazens" },
      { icon: ClipboardCheck, label: "Inventário", path: "/wms/inventario" },
      { icon: BarChart3, label: "Acuracidade de Estoque", path: "/wms/acuracidade" },
    ],
  },

  // ── LOGÍSTICA ──────────────────────────────────────────────────────────────
  {
    label: "Logística",
    icon: Headphones,
    items: [
      { icon: Headphones, label: "SAC / Atendimento", path: "/logistica" },
      { icon: Shield, label: "Licenças ANVISA/VISA", path: "/logistica/licencas" },
      { icon: Thermometer, label: "Controle de Temperatura", path: "/logistica/temperatura" },
      { icon: Leaf, label: "Rastreabilidade de Lote", path: "/logistica/rastreabilidade" },
    ],
  },

  // ── RH ─────────────────────────────────────────────────────────────────────
  {
    label: "RH / Pessoas",
    icon: UserPlus,
    items: [
      { icon: Users, label: "Funcionários", path: "/rh/funcionarios" },
      { icon: Clock, label: "Ponto Eletrônico", path: "/ponto" },
      { icon: DollarSign, label: "Folha de Pagamento", path: "/rh/folha" },
      { icon: Award, label: "Benefícios", path: "/rh/beneficios" },
      { icon: GraduationCap, label: "Treinamentos", path: "/rh/treinamentos" },
      { icon: PieChart, label: "People Analytics", path: "/rh/analytics" },
      { icon: HeartHandshake, label: "Clima Organizacional", path: "/rh/clima" },
    ],
  },

  // ── TI ─────────────────────────────────────────────────────────────────────
  {
    label: "TI / Infraestrutura",
    icon: Monitor,
    items: [
      { icon: Bug, label: "Chamados (ITSM)", path: "/ti" },
      { icon: HardDrive, label: "Inventário de Ativos", path: "/ti/inventario" },
      { icon: Cpu, label: "Monitoramento de Hardware", path: "/ti/hardware" },
      { icon: Server, label: "Servidores & Rede", path: "/ti/servidores" },
      { icon: Key, label: "Acessos Remotos (AnyDesk)", path: "/ti/acessos" },
      { icon: Shield, label: "Licenças de Software", path: "/ti/licencas" },
      { icon: GitMerge, label: "Gestão de Mudanças", path: "/ti/mudancas" },
      { icon: ShoppingCart, label: "Compras de TI", path: "/ti/compras" },
      { icon: Network, label: "CMDB", path: "/ti/cmdb" },
    ],
  },

  // ── RECEPÇÃO ───────────────────────────────────────────────────────────────
  {
    label: "Recepção",
    icon: UserCheck,
    items: [
      { icon: UserCheck, label: "Controle de Visitas", path: "/recepcionista" },
      { icon: ClipboardList, label: "Agendamentos", path: "/recepcionista/agendamentos" },
    ],
  },

  // ── QUALIDADE ──────────────────────────────────────────────────────────────
  {
    label: "Qualidade (QMS)",
    icon: Microscope,
    items: [
      { icon: Clipboard, label: "Não Conformidades", path: "/qualidade/nao-conformidades" },
      { icon: Microscope, label: "Auditorias", path: "/qualidade/auditorias" },
      { icon: FileText, label: "Documentos da Qualidade", path: "/qualidade/documentos" },
      { icon: Thermometer, label: "Calibração", path: "/qualidade/calibracao" },
    ],
  },

  // ── BI & RELATÓRIOS ────────────────────────────────────────────────────────
  {
    label: "BI & Relatórios",
    icon: Activity,
    items: [
      { icon: Activity, label: "Business Intelligence", path: "/bi" },
      { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
      { icon: TrendingUp, label: "Relatórios Avançados", path: "/relatorios-avancados" },
      { icon: FileSpreadsheet, label: "Importar / Exportar", path: "/import-export" },
    ],
  },

  // ── SISTEMA ────────────────────────────────────────────────────────────────
  {
    label: "Sistema",
    icon: Settings,
    items: [
      { icon: UserCog, label: "Usuários", path: "/usuarios" },
      { icon: Settings, label: "Configurações da Empresa", path: "/empresa" },
      { icon: HelpCircle, label: "Ajuda e Documentação", path: "/ajuda" },
    ],
  },

  // ── INTEGRAÇÕES ────────────────────────────────────────────────────────────
  {
    label: "Integrações",
    icon: Plug,
    requiredRole: "admin_or_master",
    items: [
      { icon: Plug, label: "Integrações", path: "/integracoes" },
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
  const { t, i18n } = useTranslation();
  const navRef = useRef<HTMLElement>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const isActive = (path: string) =>
    location === path || (path !== "/" && location.startsWith(path + "/"));

  const isGroupActive = (items: MenuItem[]) =>
    items.some((item) => isActive(item.path));

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const roleLabel =
    user?.role === "master_admin" ? "Master ADM" :
    user?.role === "admin" ? "Administrador" :
    user?.role === "dispatcher" ? "Despachante" :
    user?.role === "monitor" ? "Monitor" : "Usuário";

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

  const visibleGroups = filteredGroups.filter(
    (group) =>
      !group.requiredRole ||
      user?.role === group.requiredRole ||
      (group.requiredRole === "admin_or_master" &&
        (user?.role === "admin" || user?.role === "master_admin"))
  );

  const languages = [
    { code: "pt", label: "PT", flag: "🇧🇷" },
    { code: "en", label: "EN", flag: "🇺🇸" },
    { code: "es", label: "ES", flag: "🇪🇸" },
    { code: "fr", label: "FR", flag: "🇫🇷" },
    { code: "zh", label: "TW", flag: "🇹🇼" },
  ];

  return (
    <div className="flex flex-col h-full">
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

          return (
            <div key={group.label} className="mb-0.5">
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors rounded-md mx-1 ${
                    isGroupActive(group.items)
                      ? "text-primary"
                      : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/50"
                  }`}
                  style={{ width: "calc(100% - 8px)" }}
                >
                  {GroupIcon && <GroupIcon className="h-3.5 w-3.5 shrink-0" />}
                  <span className="flex-1 text-left truncate">{group.label}</span>
                  {expanded ? (
                    <ChevronUp className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  )}
                </button>
              ) : (
                <div className="h-1" />
              )}

              {(expanded || collapsed) &&
                group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      title={item.label}
                      className={`w-full flex items-center gap-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      } ${collapsed ? "justify-center px-2" : "px-4"}`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                      {!collapsed && <span className="truncate text-xs">{item.label}</span>}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border shrink-0 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 mb-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                title={lang.label}
                className={`flex-1 flex items-center justify-center rounded-md py-1 text-[10px] transition-colors ${
                  i18n.language === lang.code
                    ? "bg-background text-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{lang.flag}</span>
              </button>
            ))}
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {[
              { key: "light" as const, icon: Sun, label: "Claro" },
              { key: "gray" as const, icon: Monitor, label: "Cinza" },
              { key: "dark" as const, icon: Moon, label: "Escuro" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTheme(item.key)}
                className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs transition-colors ${
                  theme === item.key
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="h-3 w-3" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

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
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {user?.email ?? user?.name}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600">
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

  return <AppShell>{children}</AppShell>;
}

// ─────────────────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
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
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0 relative ${
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
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-card transition-transform duration-200 md:hidden ${
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
    </div>
  );
}
