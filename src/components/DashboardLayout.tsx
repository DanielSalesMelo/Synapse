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
  ChevronRight, Calculator, MessageSquare, Scale, FileSpreadsheet, HelpCircle, Brain,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { SeletorEmpresa } from "./SeletorEmpresa";
import { useRef, useState } from "react";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { Globe, Plug } from "lucide-react";

// Grupos de menu com controle de acesso por role
type MenuGroup = {
  label: string;
  requiredRole?: string;
  items: { icon: any; label: string; path: string }[];
};

const getMenuGroups = (t: any): MenuGroup[] => [
  {
    label: t("menu.principal"),
    items: [{ icon: LayoutDashboard, label: t("common.dashboard"), path: "/dashboard" }],
  },
  {
    label: t("menu.despachante"),
    items: [
      { icon: MapPin, label: t("pages.saida_entrega"), path: "/despachante/entrega" },
      { icon: Send, label: t("pages.saida_viagem"), path: "/despachante/viagem" },
      { icon: RotateCcw, label: t("pages.retorno_veiculo"), path: "/despachante/retorno" },
    ],
  },
  {
    label: t("menu.operacional"),
    items: [
      { icon: Navigation, label: t("pages.viagens"), path: "/viagens" },
      { icon: ClipboardList, label: t("pages.carregamento") || "Carregamento", path: "/carregamento" },
      { icon: FileText, label: t("pages.notas_fiscais") || "Notas Fiscais", path: "/notas-fiscais" },
      { icon: Scale, label: t("pages.acerto_carga") || "Acerto de Carga", path: "/acerto-carga" },
      { icon: Fuel, label: t("pages.abastecimentos"), path: "/abastecimentos" },
      { icon: Calculator, label: t("pages.simulador_viagem"), path: "/simulador-viagem" },
    ],
  },
  {
    label: t("menu.frota"),
    items: [
      { icon: Truck, label: t("pages.veiculos"), path: "/veiculos" },
      { icon: Users, label: t("pages.motoristas"), path: "/funcionarios" },
      { icon: Wrench, label: t("pages.manutencoes"), path: "/manutencoes" },
      { icon: ClipboardList, label: t("pages.plano_manutencao"), path: "/plano-manutencao" },
    ],
  },
  {
    label: t("menu.gestao"),
    items: [
      { icon: Gauge, label: t("pages.estoque_combustivel"), path: "/gestao/estoque-combustivel" },
      { icon: AlertTriangle, label: t("pages.multas"), path: "/gestao/multas" },
      { icon: Shield, label: t("pages.acidentes"), path: "/gestao/acidentes" },
      { icon: DollarSign, label: t("pages.acertos"), path: "/gestao/acertos" },
      { icon: ClipboardCheck, label: t("pages.checklist"), path: "/checklist" },
      { icon: BookOpen, label: t("pages.relatos"), path: "/gestao/relatos" },
      { icon: FileText, label: t("pages.documentos"), path: "/gestao/documentos" },
      { icon: Bell, label: t("pages.alertas"), path: "/gestao/alertas" },
      { icon: Calendar, label: t("pages.calendario"), path: "/gestao/calendario" },
    ],
  },
  {
    label: t("menu.sistema"),
    items: [
      { icon: MessageSquare, label: t("common.chat"), path: "/chat" },
      { icon: BarChart3, label: t("pages.relatorios"), path: "/relatorios" },
      { icon: TrendingUp, label: "Relatórios Avançados", path: "/relatorios-avancados" },
      { icon: FileSpreadsheet, label: "Importar/Exportar", path: "/import-export" },
      { icon: HelpCircle, label: "Ajuda e Documentação", path: "/ajuda" },
      { icon: Brain, label: "Synapse AI", path: "/ia" },
      { icon: UserCog, label: t("common.users"), path: "/usuarios" },
      { icon: Settings, label: t("common.settings"), path: "/empresa" },
    ],
  },
  {
    label: t("menu.financeiro"),
    items: [
      { icon: TrendingDown, label: t("pages.contas_pagar"), path: "/financeiro" },
      { icon: TrendingUp, label: t("pages.contas_receber"), path: "/financeiro/receber" },
      { icon: Wallet, label: t("pages.adiantamentos"), path: "/financeiro/adiantamentos" },
      { icon: BarChart3, label: t("pages.custos_operacionais"), path: "/custos" },
      { icon: Calculator, label: "DRE por Placa", path: "/financeiro/dre" },
    ],
  },
  {
    label: t("menu.integracoes") || "Integrações",
    requiredRole: "admin_or_master",
    items: [
      { icon: Plug, label: t("pages.integracoes") || "Integrações", path: "/integracoes" },
    ],
  },
  {
    label: t("menu.master"),
    requiredRole: "master_admin",
    items: [
      { icon: Star, label: t("pages.painel_master"), path: "/master/painel" },
      { icon: Shield, label: t("pages.permissoes"), path: "/master/permissoes" },
    ],
  },
];

// Sidebar as a stable component — never re-mounts on navigation, preserves scroll
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

  const isActive = (path: string) =>
    location === path || (path !== "/" && location.startsWith(path + "/"));

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

  const menuGroups = getMenuGroups(t);

  const languages = [
    { code: 'pt', label: 'PT', flag: '🇧🇷' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'es', label: 'ES', flag: '🇪🇸' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'zh', label: 'TW', flag: '🇹🇼' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-foreground tracking-tight">Synapse</span>
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

      {/* Menu items */}
      <nav ref={navRef} className="flex-1 overflow-y-auto py-2">
        {menuGroups.filter(group => !group.requiredRole || user?.role === group.requiredRole || (group.requiredRole === "admin_or_master" && (user?.role === "admin" || user?.role === "master_admin"))).map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </span>
              </div>
            )}
            {collapsed && <div className="h-2" />}
            {group.items.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  } ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border shrink-0 p-3 space-y-2">
        {/* Language Selector */}
        {!collapsed && (
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1 mb-2">
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
              { key: "light" as const, icon: Sun, label: t("common.dashboard") === "Dashboard" ? "Claro" : "Light" },
              { key: "gray" as const, icon: Monitor, label: t("common.dashboard") === "Dashboard" ? "Cinza" : "Gray" },
              { key: "dark" as const, icon: Moon, label: t("common.dashboard") === "Dashboard" ? "Escuro" : "Dark" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs transition-colors ${
                  theme === t.key
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3 w-3" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-2 w-full rounded-lg p-2 hover:bg-accent transition-colors ${collapsed ? "justify-center" : ""}`}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-foreground truncate">{user?.name ?? "Usuário"}</p>
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
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Se estiver carregando, mostra o esqueleto do dashboard
  if (loading) return <DashboardLayoutSkeleton />;

  // Se não estiver autenticado, redireciona para o login de forma suave
  if (!user && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Synapse</span>
          </div>
          <p className="text-center text-muted-foreground">Sessão expirada ou não autenticada.</p>
          <Button onClick={() => { setLocation("/login"); }} size="lg" className="w-full">
            Ir para o Login
          </Button>
        </div>
      </div>
    );
  }

  // Se o usuário existe, renderiza o Shell do App
  return <AppShell>{children}</AppShell>;
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
      {/* Desktop sidebar — stable component, never re-mounts */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0 relative ${
          collapsed ? "w-14" : "w-60"
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
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-border bg-card transition-transform duration-200 md:hidden ${
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
          {/* Indicador de modo simulação */}
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
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
