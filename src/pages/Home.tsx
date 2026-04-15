import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Truck, BarChart3, Users, Fuel, Wrench, Shield, ArrowRight,
  MapPin, FileText, Package, DollarSign, Bell, CheckSquare,
  Zap, Globe, ChevronRight, Star, TrendingUp, Clock, Lock, X,
} from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

// ─── Tipo dos módulos ───────────────────────────────────────────────────────
type ModuleItem = {
  icon: React.ElementType; label: string; color: string; bg: string;
  border: string; route: string; tagline: string; desc: string; features: string[];
};

// ─── Modal ───────────────────────────────────────────────────────────────────
function ModuleModal({ mod, lang, onClose, onAccess }: {
  mod: ModuleItem; lang: string; onClose: () => void; onAccess: () => void;
}) {
  const Icon = mod.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-lg rounded-3xl border ${mod.border} bg-[#0f0f1a] overflow-hidden shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.2s ease-out" }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        <div className={`h-1 w-full ${mod.bg}`} style={{ opacity: 0.9 }} />
        <div className="p-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-2xl ${mod.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-7 w-7 ${mod.color}`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{mod.label}</h2>
              <p className={`text-sm font-medium ${mod.color} mt-0.5`}>{mod.tagline}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors flex-shrink-0 mt-1">
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>
        <div className="px-6 pb-4">
          <p className="text-white/55 text-sm leading-relaxed">{mod.desc}</p>
        </div>
        <div className="px-6 pb-6">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
            {lang === "pt" ? "Funcionalidades incluídas" : "Included features"}
          </p>
          <ul className="space-y-2">
            {mod.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                <span className={`inline-block h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${mod.color.replace("text-","bg-")}`} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className={`px-6 py-4 border-t ${mod.border} bg-white/2 flex items-center justify-between gap-4`}>
          <p className="text-xs text-white/30">{lang === "pt" ? "Disponível no sistema" : "Available in the system"}</p>
          <Button size="sm" onClick={onAccess}
            className={`border ${mod.border} text-sm font-semibold px-4 bg-white/5 hover:bg-white/10 ${mod.color}`}>
            {lang === "pt" ? "Acessar módulo" : "Access module"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { loading } = useAuth();
  const [, setLocation] = useLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language || "pt";
  const [selectedModule, setSelectedModule] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const modules: ModuleItem[] = [
    { icon: Truck,       label: lang === "pt" ? "Viagens"         : "Trips",        color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   route: "/viagens",
      tagline: lang === "pt" ? "Controle total de cada rota percorrida" : "Full control of every route",
      desc: lang === "pt" ? "Crie, acompanhe e encerre viagens de transporte. Vincule motoristas, veículos, notas fiscais e calcule automaticamente KM rodado e consumo de combustível." : "Create, track and close transport trips. Link drivers, vehicles, invoices and automatically calculate mileage and fuel consumption.",
      features: lang === "pt" ? ["Criação rápida com seleção de motorista e veículo","Status: Planejada → Em Andamento → Concluída","Vinculação de múltiplas Notas Fiscais por viagem","Cálculo automático de KM rodado e consumo","Histórico completo por motorista e veículo","Integração direta com Acerto de Carga"] : ["Quick creation with driver and vehicle selection","Status: Planned → In Progress → Completed","Link multiple invoices per trip","Automatic mileage and fuel consumption calculation","Complete history by driver and vehicle","Direct integration with Cargo Settlement"] },
    { icon: Package,     label: lang === "pt" ? "Carregamento"    : "Loading",      color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", route: "/carregamento",
      tagline: lang === "pt" ? "Monte a carga e gere o romaneio em segundos" : "Build the load and generate the manifest in seconds",
      desc: lang === "pt" ? "Organize todas as notas fiscais de uma carga, defina a ordem de entrega e gere o Romaneio em PDF automaticamente para o motorista." : "Organize all invoices for a load, define delivery order and automatically generate a PDF Manifest for the driver.",
      features: lang === "pt" ? ["Montagem visual da carga com lista de NFs","Geração automática de Romaneio em PDF","Controle de peso total e número de volumes","Registro de canhoto (comprovante de entrega)","Rastreamento de status por NF: entregue, devolvida, ocorrência","Histórico de carregamentos por veículo"] : ["Visual load assembly with invoice list","Automatic PDF Manifest generation","Total weight and volume count control","Proof of delivery registration","Status tracking per invoice: delivered, returned, incident","Loading history by vehicle"] },
    { icon: FileText,    label: lang === "pt" ? "Notas Fiscais"   : "Invoices",     color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  route: "/notas-fiscais",
      tagline: lang === "pt" ? "Rastreie cada NF-e do início ao fim" : "Track every invoice from start to finish",
      desc: lang === "pt" ? "Controle o ciclo de vida completo de cada Nota Fiscal: emissão, trânsito, entrega ou devolução. Integração com Arquivei para download de XML e DANFE." : "Control the full lifecycle of each invoice: issuance, transit, delivery or return. Integration with Arquivei for XML and DANFE download.",
      features: lang === "pt" ? ["Status: Pendente, Em Trânsito, Entregue, Devolvida, Ocorrência","Busca por número ou chave de acesso (44 dígitos)","Download de XML e DANFE via integração Arquivei","Vinculação automática com viagem e carregamento","Alertas de NFs em aberto há mais de X dias","Relatório por período, motorista ou destinatário"] : ["Status: Pending, In Transit, Delivered, Returned, Incident","Search by number or access key (44 digits)","XML and DANFE download via Arquivei integration","Automatic link with trip and loading","Alerts for open invoices older than X days","Report by period, driver or recipient"] },
    { icon: DollarSign,  label: lang === "pt" ? "Acerto de Carga" : "Settlement",   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", route: "/acerto",
      tagline: lang === "pt" ? "Feche o financeiro de cada viagem com precisão" : "Close the financials for each trip accurately",
      desc: lang === "pt" ? "Calcule automaticamente a comissão do motorista, desconte adiantamentos e outros débitos, e gere o comprovante de pagamento em PDF." : "Automatically calculate driver commission, deduct advances and other debits, and generate a PDF payment receipt.",
      features: lang === "pt" ? ["Cálculo automático: Frete × % Comissão","Desconto automático de adiantamentos registrados","Campos para outros descontos (multas, combustível, danos)","Campos para acréscimos (bônus, ajuda de custo)","Geração de comprovante de pagamento em PDF","Histórico de acertos por motorista"] : ["Automatic calculation: Freight × % Commission","Automatic deduction of registered advances","Fields for other deductions (fines, fuel, damages)","Fields for additions (bonus, expense allowance)","PDF payment receipt generation","Settlement history by driver"] },
    { icon: Fuel,        label: lang === "pt" ? "Abastecimentos"  : "Fuel",         color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", route: "/abastecimentos",
      tagline: lang === "pt" ? "Controle cada litro da sua frota" : "Control every liter of your fleet",
      desc: lang === "pt" ? "Registre abastecimentos externos e movimentações do tanque interno. O sistema calcula automaticamente o consumo médio (km/l) por veículo." : "Record external refueling and internal tank movements. The system automatically calculates average consumption (km/l) per vehicle.",
      features: lang === "pt" ? ["Registro de abastecimentos externos e tanque interno","Controle de estoque de Diesel e ARLA","Cálculo automático de consumo médio (km/l)","Alertas de nível baixo no tanque interno","Relatório de custo de combustível por veículo/período","Vinculação com KM do hodômetro"] : ["External and internal tank refueling records","Diesel and ARLA stock control","Automatic average consumption calculation (km/l)","Low tank level alerts","Fuel cost report by vehicle/period","Odometer mileage linkage"] },
    { icon: Wrench,      label: lang === "pt" ? "Manutenções"     : "Maintenance",  color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    route: "/manutencoes",
      tagline: lang === "pt" ? "Mantenha sua frota sempre em dia" : "Keep your fleet always up to date",
      desc: lang === "pt" ? "Registre manutenções corretivas e preventivas, crie planos por KM ou dias, e receba alertas automáticos quando estiver na hora de agir." : "Record corrective and preventive maintenance, create plans by KM or days, and receive automatic alerts.",
      features: lang === "pt" ? ["Registro de manutenções corretivas e preventivas","Planos de manutenção por intervalo de KM ou dias","Alertas automáticos de manutenção vencida","Histórico completo por veículo","Controle de custo por tipo de serviço","Relatório de manutenções pendentes"] : ["Corrective and preventive maintenance records","Maintenance plans by KM or day interval","Automatic overdue maintenance alerts","Complete history by vehicle","Cost control by service type","Pending maintenance report"] },
    { icon: Users,       label: lang === "pt" ? "Motoristas"      : "Drivers",      color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   route: "/motoristas",
      tagline: lang === "pt" ? "Gerencie toda a sua equipe de campo" : "Manage your entire field team",
      desc: lang === "pt" ? "Cadastre motoristas, ajudantes e freelancers com todos os dados pessoais, profissionais e de CNH. Controle vencimentos e receba alertas automáticos." : "Register drivers, helpers and freelancers with all personal, professional and license data. Control expirations and receive automatic alerts.",
      features: lang === "pt" ? ["Cadastro completo: dados pessoais, profissionais e CNH","Suporte a motoristas, ajudantes e freelancers","Alertas de CNH vencendo (30 dias antes)","Histórico de viagens por motorista","Controle de adiantamentos e acertos","Relatório de desempenho por motorista"] : ["Complete registration: personal, professional and license data","Support for drivers, helpers and freelancers","License expiry alerts (30 days in advance)","Trip history by driver","Advance and settlement control","Driver performance report"] },
    { icon: CheckSquare, label: lang === "pt" ? "Checklist"       : "Checklist",    color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/30",   route: "/checklist",
      tagline: lang === "pt" ? "Inspeção de veículos antes de cada saída" : "Vehicle inspection before every departure",
      desc: lang === "pt" ? "Registre a inspeção do veículo antes de cada viagem com uma lista padronizada. Garanta segurança e conformidade operacional." : "Record vehicle inspection before each trip with a standardized checklist. Ensure safety and operational compliance.",
      features: lang === "pt" ? ["Lista padronizada: pneus, luzes, fluidos, documentação, freios","Registro de itens com defeito e observações","Upload de fotos dos defeitos encontrados","Alertas automáticos para itens críticos","Histórico de inspeções por veículo","Relatório de não-conformidades"] : ["Standardized list: tires, lights, fluids, documents, brakes","Record defective items with observations","Photo upload for defects found","Automatic alerts for critical items","Inspection history by vehicle","Non-compliance report"] },
    { icon: BarChart3,   label: lang === "pt" ? "Financeiro"      : "Financial",    color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", route: "/financeiro",
      tagline: lang === "pt" ? "Controle total de entradas e saídas" : "Full control of income and expenses",
      desc: lang === "pt" ? "Gerencie contas a pagar, contas a receber e adiantamentos para motoristas. Tenha uma visão clara do fluxo de caixa da operação." : "Manage accounts payable, accounts receivable and driver advances. Get a clear view of the operation's cash flow.",
      features: lang === "pt" ? ["Contas a pagar com categorias e vencimentos","Contas a receber vinculadas a viagens e CTEs","Adiantamentos para motoristas com desconto automático","Dashboard de fluxo de caixa semanal/mensal","Alertas de contas vencidas","Relatório financeiro por período"] : ["Accounts payable with categories and due dates","Accounts receivable linked to trips and CTEs","Driver advances with automatic deduction","Weekly/monthly cash flow dashboard","Overdue account alerts","Financial report by period"] },
    { icon: MapPin,      label: lang === "pt" ? "Despachante"     : "Dispatcher",   color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/30",   route: "/despachante",
      tagline: lang === "pt" ? "Controle de saída e retorno de veículos" : "Vehicle departure and return control",
      desc: lang === "pt" ? "Módulo exclusivo para despachantes: registre saídas para entrega e para viagem, e confirme o retorno dos veículos com KM e observações." : "Exclusive module for dispatchers: record departures for delivery and trips, and confirm vehicle returns with mileage and notes.",
      features: lang === "pt" ? ["Saída para entrega com vinculação de NFs","Saída para viagem com romaneio","Retorno de veículo com KM de chegada","Upload de canhoto no retorno","Painel de veículos em campo vs. disponíveis","Histórico de saídas e retornos por data"] : ["Delivery departure with invoice linking","Trip departure with manifest","Vehicle return with arrival mileage","Proof of delivery upload on return","Panel of vehicles in field vs. available","Departure and return history by date"] },
    { icon: Bell,        label: lang === "pt" ? "Alertas"         : "Alerts",       color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  route: "/alertas",
      tagline: lang === "pt" ? "Nunca perca um prazo importante" : "Never miss an important deadline",
      desc: lang === "pt" ? "Central de alertas inteligentes: documentos vencendo, manutenções pendentes, NFs em aberto e situações críticas da operação." : "Smart alert center: expiring documents, pending maintenance, open invoices and critical situations.",
      features: lang === "pt" ? ["Alertas de documentos vencendo (CRLV, CNH, Seguro, Tacógrafo)","Alertas de manutenções preventivas próximas","NFs em aberto há mais de X dias","Contas vencidas sem pagamento","Veículos sem checklist de saída","Painel com prioridade: crítico, atenção, informativo"] : ["Expiring document alerts (CRLV, License, Insurance, Tachograph)","Upcoming preventive maintenance alerts","Invoices open for more than X days","Overdue unpaid accounts","Vehicles without departure checklist","Alert panel with priority: critical, warning, informational"] },
    { icon: Zap,         label: lang === "pt" ? "Integrações"     : "Integrations", color: "text-lime-400",   bg: "bg-lime-500/10",   border: "border-lime-500/30",   route: "/integracoes",
      tagline: lang === "pt" ? "Conectado ao seu ecossistema" : "Connected to your ecosystem",
      desc: lang === "pt" ? "Integração nativa com Arquivei para consulta e download de NF-e, e Winthor com 65 rotinas disponíveis para sincronização de dados com o Oracle." : "Native integration with Arquivei for NF-e query and download, and Winthor with 65 routines for Oracle data synchronization.",
      features: lang === "pt" ? ["Arquivei: busca de NF-e por chave de acesso (44 dígitos)","Download de XML e DANFE via Arquivei/Qive","Winthor: 65 rotinas reais (521, 901–1474)","Conexão Oracle: Host, Porta, Usuário, Senha, SID","Módulos: Veículos, Carregamento, Acerto, Expedição, Rota, Vendas","Exportação de relatórios em PDF e Excel"] : ["Arquivei: NF-e search by access key (44 digits)","XML and DANFE download via Arquivei/Qive","Winthor: 65 real routines (521, 901–1474)","Oracle connection: Host, Port, User, Password, SID","Modules: Vehicles, Loading, Settlement, Dispatch, Route, Sales","Report export in PDF and Excel"] },
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: lang === "pt" ? "Visibilidade Total" : "Full Visibility",
      desc: lang === "pt"
        ? "Dashboard em tempo real com KPIs de frota, financeiro e operacional em uma única tela."
        : "Real-time dashboard with fleet, financial and operational KPIs on a single screen.",
    },
    {
      icon: Clock,
      title: lang === "pt" ? "Economia de Tempo" : "Time Savings",
      desc: lang === "pt"
        ? "Automatize romaneios, acertos de carga e notas fiscais. Elimine planilhas e retrabalho."
        : "Automate loading lists, cargo settlements and invoices. Eliminate spreadsheets and rework.",
    },
    {
      icon: Lock,
      title: lang === "pt" ? "Controle por Empresa" : "Multi-Company Control",
      desc: lang === "pt"
        ? "Gerencie matriz e filiais com hierarquia de permissões. Cada empresa com seus dados isolados."
        : "Manage headquarters and branches with permission hierarchy. Each company with isolated data.",
    },
    {
      icon: Globe,
      title: lang === "pt" ? "Integrações Nativas" : "Native Integrations",
      desc: lang === "pt"
        ? "Conecte-se ao Arquivei para busca de NF-e e ao Winthor com 65 rotinas disponíveis."
        : "Connect to Arquivei for NF-e search and Winthor with 65 available routines.",
    },
  ];

  const stats = [
    { value: "12+",  label: lang === "pt" ? "Módulos Integrados" : "Integrated Modules" },
    { value: "65",   label: lang === "pt" ? "Rotinas Winthor"    : "Winthor Routines" },
    { value: "5",    label: lang === "pt" ? "Idiomas Suportados" : "Supported Languages" },
    { value: "100%", label: lang === "pt" ? "Web & Mobile"       : "Web & Mobile" },
  ];

  const languages = [
    { code: "pt", label: "🇧🇷", title: "Português" },
    { code: "en", label: "🇺🇸", title: "English" },
    { code: "es", label: "🇪🇸", title: "Español" },
    { code: "fr", label: "🇫🇷", title: "Français" },
    { code: "zh", label: "🇹🇼", title: "繁體中文" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 backdrop-blur-sm bg-black/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Rotiq</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  title={l.title}
                  className={`px-2 py-1 rounded text-sm transition-all ${
                    i18n.language === l.code
                      ? "bg-blue-600 text-white font-bold scale-105"
                      : "hover:bg-white/10 text-white/70"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setLocation("/login")}
              className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/30"
            >
              {lang === "pt" ? "Entrar" : lang === "en" ? "Login" : lang === "es" ? "Entrar" : lang === "fr" ? "Connexion" : "登入"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium px-4 py-2 rounded-full">
            <Star className="h-3.5 w-3.5" />
            {lang === "pt" ? "Sistema de Gestão de Frota e Logística" : lang === "en" ? "Fleet & Logistics Management System" : lang === "es" ? "Sistema de Gestión de Flota y Logística" : lang === "fr" ? "Système de Gestion de Flotte et Logistique" : "車隊與物流管理系統"}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            {lang === "pt" ? "Gerencie sua frota" : lang === "en" ? "Manage your fleet" : lang === "es" ? "Administre su flota" : lang === "fr" ? "Gérez votre flotte" : "智能管理"}
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {lang === "pt" ? "com inteligência" : lang === "en" ? "with intelligence" : lang === "es" ? "con inteligencia" : lang === "fr" ? "avec intelligence" : "您的車隊"}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            {lang === "pt"
              ? "Controle veículos, motoristas, abastecimentos, manutenções, finanças e integrações em um único sistema. Substitua planilhas por dados em tempo real."
              : lang === "en"
              ? "Control vehicles, drivers, fuel, maintenance, finances and integrations in one system. Replace spreadsheets with real-time data."
              : lang === "es"
              ? "Controle vehículos, conductores, combustible, mantenimiento, finanzas e integraciones en un solo sistema."
              : lang === "fr"
              ? "Contrôlez les véhicules, conducteurs, carburant, maintenance, finances et intégrations dans un seul système."
              : "在一個系統中控制車輛、駕駛員、燃料、維護、財務和整合。"}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={() => setLocation("/trial")}
              className="bg-blue-600 hover:bg-blue-500 text-white border-0 text-base px-8 py-6 shadow-xl shadow-blue-600/30 rounded-xl"
            >
              {lang === "pt" ? "Testar grátis por 14 dias" : lang === "en" ? "Try free for 14 days" : lang === "es" ? "Probar gratis 14 días" : lang === "fr" ? "Essai gratuit 14 jours" : "免費試用14天"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <button
              onClick={() => setLocation("/login")}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm"
            >
              {lang === "pt" ? "Já tenho conta" : lang === "en" ? "I already have an account" : lang === "es" ? "Ya tengo cuenta" : lang === "fr" ? "J'ai déjà un compte" : "已有帳號"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-10 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center px-3 py-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl md:text-4xl font-extrabold text-cyan-400 leading-none">
                {s.value}
              </div>
              <div className="text-xs sm:text-sm text-white/60 mt-2 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {lang === "pt" ? "Tudo que sua operação precisa" : lang === "en" ? "Everything your operation needs" : lang === "es" ? "Todo lo que su operación necesita" : lang === "fr" ? "Tout ce dont votre opération a besoin" : "您的運營所需的一切"}
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              {lang === "pt"
                ? "12 módulos integrados cobrindo toda a cadeia logística — do despacho ao financeiro."
                : "12 integrated modules covering the entire logistics chain — from dispatch to finance."}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {modules.map((m, idx) => (
              <button
                key={m.label}
                onClick={() => setSelectedModule(idx)}
                className={`group p-4 rounded-2xl border border-white/5 bg-white/3 hover:bg-white/6 hover:${m.border} transition-all text-left cursor-pointer`}
              >
                <div className={`h-10 w-10 rounded-xl ${m.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                </div>
                <p className="font-semibold text-sm text-white/90 mb-1">{m.label}</p>
                <p className="text-xs text-white/30 group-hover:text-white/50 transition-colors">
                  {lang === "pt" ? "Saiba mais →" : "Learn more →"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 py-20 px-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {lang === "pt" ? "Por que escolher o Rotiq?" : lang === "en" ? "Why choose Rotiq?" : lang === "es" ? "¿Por qué elegir Rotiq?" : lang === "fr" ? "Pourquoi choisir Rotiq?" : "為什麼選擇 Rotiq？"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="flex gap-5 p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-white/3 to-transparent hover:border-blue-500/20 transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <b.icon className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">{b.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Zap className="h-3.5 w-3.5" />
            {lang === "pt" ? "Integrações Nativas" : "Native Integrations"}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {lang === "pt" ? "Conectado ao seu ecossistema" : "Connected to your ecosystem"}
          </h2>
          <p className="text-white/50 mb-10 max-w-xl mx-auto">
            {lang === "pt"
              ? "Integração nativa com Arquivei para consulta e download de NF-e, e Winthor com 65 rotinas disponíveis para sincronização de dados."
              : "Native integration with Arquivei for NF-e query and download, and Winthor with 65 routines available for data synchronization."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {[
              { name: "Arquivei",    desc: lang === "pt" ? "Consulta e download de NF-e" : "NF-e query and download", color: "from-green-500/20 to-green-600/10 border-green-500/20" },
              { name: "Winthor",     desc: lang === "pt" ? "65 rotinas de sincronização" : "65 sync routines",        color: "from-blue-500/20 to-blue-600/10 border-blue-500/20" },
              { name: "PDF / Excel", desc: lang === "pt" ? "Exportação de relatórios"    : "Report export",           color: "from-orange-500/20 to-orange-600/10 border-orange-500/20" },
            ].map((int) => (
              <div key={int.name} className={`flex-1 max-w-xs p-5 rounded-2xl border bg-gradient-to-br ${int.color}`}>
                <p className="font-bold text-lg mb-1">{int.name}</p>
                <p className="text-white/50 text-sm">{int.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-purple-600/5">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              {lang === "pt" ? "Pronto para modernizar sua frota?" : lang === "en" ? "Ready to modernize your fleet?" : lang === "es" ? "¿Listo para modernizar su flota?" : lang === "fr" ? "Prêt à moderniser votre flotte?" : "準備好現代化您的車隊了嗎？"}
            </h2>
            <p className="text-white/50 mb-8 text-lg">
              {lang === "pt"
                ? "Acesse agora e tenha controle total da sua operação logística."
                : "Access now and have full control of your logistics operation."}
            </p>
            <Button
              size="lg"
              onClick={() => setLocation("/login")}
              className="bg-blue-600 hover:bg-blue-500 text-white border-0 text-base px-10 py-6 shadow-xl shadow-blue-600/30 rounded-xl"
            >
              {lang === "pt" ? "Acessar o Rotiq" : lang === "en" ? "Access Rotiq" : lang === "es" ? "Acceder a Rotiq" : lang === "fr" ? "Accéder à Rotiq" : "訪問 Rotiq"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white/80">Rotiq</span>
          </div>
          <p className="text-white/30 text-sm">
            © 2025 Rotiq —{" "}
            {lang === "pt" ? "Sistema de Gestão de Frota e Logística" : lang === "en" ? "Fleet & Logistics Management System" : lang === "es" ? "Sistema de Gestión de Flota y Logística" : lang === "fr" ? "Système de Gestion de Flotte et Logistique" : "車隊與物流管理系統"}
          </p>
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                title={l.title}
                className={`px-2 py-1 rounded text-sm transition-all ${
                  i18n.language === l.code ? "bg-blue-600 text-white font-bold" : "hover:bg-white/10 text-white/50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {selectedModule !== null && (
        <ModuleModal
          mod={modules[selectedModule]}
          lang={lang}
          onClose={() => setSelectedModule(null)}
          onAccess={() => { setSelectedModule(null); setLocation("/login"); }}
        />
      )}
    </div>
  );
}
