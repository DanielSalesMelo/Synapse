import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Truck, BarChart3, Users, Fuel, Wrench, Shield, ArrowRight,
  MapPin, FileText, Package, DollarSign, Bell, CheckSquare,
  Zap, Globe, Star, TrendingUp, Clock, Brain, PackageCheck, Warehouse,
  Target, ShoppingCart, UserCheck, Headphones, ClipboardCheck, Monitor, Activity,
  Megaphone, Building2, Layers, Lock, Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";

const MODULES = [
  { icon: Truck,       label: "Frota & Operações",   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   desc: "Veículos, viagens, manutenções, abastecimentos e despachante integrados." },
  { icon: Target,      label: "CRM & Vendas",        color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", desc: "Clientes, leads, funil de vendas, propostas com aceite digital e pós-venda." },
  { icon: Warehouse,   label: "WMS / Estoque",       color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/30",   desc: "Recebimento, armazenagem, picking, inventário e acuracidade de estoque." },
  { icon: DollarSign,  label: "Financeiro",          color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  desc: "Contas a pagar/receber, fluxo de caixa, DRE, conciliação bancária e adiantamentos." },
  { icon: Users,       label: "RH & Pessoas",        color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/30",   desc: "Folha de pagamento, ponto eletrônico, treinamentos e People Analytics." },
  { icon: Monitor,     label: "TI & Infraestrutura", color: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/30",  desc: "Chamados ITSM, inventário ITAM, monitoramento de hardware, AnyDesk e licenças." },
  { icon: Megaphone,   label: "Marketing",           color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", desc: "Campanhas multi-canal, automações, e-mail marketing e analytics com ROI." },
  { icon: Activity,    label: "BI & Relatórios",     color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/30",   desc: "Dashboards configuráveis estilo Power BI, KPIs em tempo real e exportação." },
  { icon: Brain,       label: "IA Synapse",          color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", desc: "Agentes de IA por setor, prompts configuráveis, suporte a OpenAI, Gemini e Claude." },
  { icon: MapPin,      label: "Despachante",         color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", desc: "Saída para entrega/viagem, retorno, notas fiscais, acerto de carga e carregamento." },
  { icon: Headphones,  label: "Logística",           color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/30",   desc: "Controle de temperatura, rastreabilidade de lote, SAC e licenças sanitárias." },
  { icon: Shield,      label: "Auditoria & QMS",     color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    desc: "Trilha completa de auditoria, não conformidades, calibração e documentos de qualidade." },
  { icon: CheckSquare, label: "Tarefas & Projetos",  color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", desc: "Kanban, sprints, listas, prioridades, comentários e gestão de equipes." },
  { icon: Zap,         label: "Integrações",         color: "text-lime-400",   bg: "bg-lime-500/10",   border: "border-lime-500/30",   desc: "Winthor, Serasa, NFe.io, InfinitePay, WhatsApp Business API e muito mais." },
  { icon: Building2,   label: "Multi-Empresa",       color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30",  desc: "Matriz, filiais e grupos com bancos de dados totalmente separados por empresa." },
];

const STATS = [
  { value: "15+",  label: "Módulos Integrados" },
  { value: "74",   label: "Tabelas no Banco" },
  { value: "10+",  label: "Perfis de Acesso" },
  { value: "100%", label: "Multi-Tenant" },
];

const DIFERENCIAIS = [
  { icon: Lock,      title: "Isolamento Total",      desc: "Cada empresa tem seu próprio banco de dados. Dados de uma empresa jamais se misturam com outra." },
  { icon: Brain,     title: "IA em Todo Lugar",      desc: "Agentes de IA treinados para cada setor: financeiro, TI, frota, RH e muito mais." },
  { icon: Layers,    title: "Módulos Independentes", desc: "Arquitetura modular — atualizações em um módulo não afetam os demais. Zero downtime." },
  { icon: Globe,     title: "Multi-idioma",          desc: "Interface disponível em Português, Inglês, Espanhol, Francês e Tailandês." },
  { icon: Shield,    title: "Auditoria Completa",    desc: "Trilha imutável de todas as ações no sistema com nível de risco e exportação para compliance." },
  { icon: Zap,       title: "Integrações Nativas",   desc: "Winthor, Serasa, InfinitePay, WhatsApp Business, NFe.io e dezenas de outras plataformas." },
];

const ROLES = [
  { role: "Master ADM",  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", desc: "Acesso total a todas as empresas" },
  { role: "TI Master",   color: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/20",  desc: "TI completo + todas as empresas" },
  { role: "Admin",       color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   desc: "Tudo da empresa, exceto master" },
  { role: "Financeiro",  color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  desc: "Financeiro + Relatórios" },
  { role: "Comercial",   color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", desc: "CRM + Vendas + Marketing" },
  { role: "Despachante", color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20",   desc: "Despachante + Frota" },
  { role: "Motorista",   color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20",   desc: "Viagens + Checklist" },
  { role: "Op. WMS",     color: "text-teal-400",   bg: "bg-teal-500/10",   border: "border-teal-500/20",   desc: "Estoque + Logística" },
  { role: "RH",          color: "text-rose-400",   bg: "bg-rose-500/10",   border: "border-rose-500/20",   desc: "Pessoas + Ponto" },
  { role: "Monitor",     color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  desc: "Dashboard + BI (leitura)" },
];

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);

  const handleAccess = () => {
    if (user) navigate("/dashboard");
    else navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#080812] text-white overflow-x-hidden">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#080812]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Synapse</span>
          <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">v7.0</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Button onClick={handleAccess} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 border-0 shadow-lg shadow-blue-500/25">
              Acessar Sistema <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} className="text-white/70 hover:text-white">Entrar</Button>
              <Button onClick={() => navigate("/login")} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 border-0 shadow-lg shadow-blue-500/25">
                Começar Agora
              </Button>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/15 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/60 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            Plataforma Inteligente de Gestão Empresarial
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            Gerencie sua empresa<br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">do jeito certo</span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            O Synapse é a plataforma completa que unifica Frota, CRM, Estoque, Financeiro, RH, TI, Marketing e muito mais — com IA integrada em cada módulo e bancos de dados isolados por empresa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={handleAccess} size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 border-0 shadow-xl shadow-blue-500/30 text-base px-8 h-12">
              {user ? "Acessar o Sistema" : "Entrar no Sistema"} <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-black bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MÓDULOS */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Tudo que sua empresa precisa</h2>
            <p className="text-white/40 max-w-xl mx-auto">15 módulos integrados, cada um com funcionalidades de classe mundial, todos conectados em uma única plataforma.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <div key={i} onMouseEnter={() => setHoveredModule(i)} onMouseLeave={() => setHoveredModule(null)} onClick={handleAccess}
                  className={`group relative rounded-2xl border ${mod.border} ${mod.bg} p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}>
                  <div className="flex items-start gap-4">
                    <div className={`h-11 w-11 rounded-xl ${mod.bg} border ${mod.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-5 w-5 ${mod.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm mb-1">{mod.label}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{mod.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Por que o Synapse é diferente?</h2>
            <p className="text-white/40 max-w-xl mx-auto">Construído para empresas que precisam de mais do que um ERP comum.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DIFERENCIAIS.map((d, i) => {
              const Icon = d.icon;
              return (
                <div key={i} className="flex gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm mb-1">{d.title}</h3>
                    <p className="text-xs text-white/40 leading-relaxed">{d.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MULTI-TENANT */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-6">
            <Building2 className="h-3.5 w-3.5" /> Arquitetura Multi-Empresa
          </div>
          <h2 className="text-3xl font-bold mb-4">Matriz, filiais e grupos totalmente isolados</h2>
          <p className="text-white/40 mb-10 max-w-2xl mx-auto leading-relaxed">
            Cada empresa tem seu próprio banco de dados físico. Os dados de uma empresa jamais se misturam com outra.
            Apenas usuários com perfil <strong className="text-white/70">Master ADM</strong> ou <strong className="text-white/70">TI Master</strong> podem visualizar e gerenciar múltiplas empresas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Building2, title: "Matriz",  desc: "Visão consolidada de todas as filiais com BI global." },
              { icon: Building2, title: "Filiais", desc: "Cada filial opera de forma completamente independente." },
              { icon: Shield,    title: "Grupos",  desc: "Agrupe empresas por segmento com controle centralizado." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-left">
                  <Icon className="h-6 w-6 text-amber-400 mb-3" />
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PERFIS */}
      <section className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Controle de acesso por perfil</h2>
            <p className="text-white/40 max-w-xl mx-auto">Cada usuário vê apenas o que precisa. Nada a mais, nada a menos.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {ROLES.map((p, i) => (
              <div key={i} className={`p-3 rounded-xl border ${p.border} ${p.bg} text-center`}>
                <p className={`text-sm font-bold ${p.color} mb-1`}>{p.role}</p>
                <p className="text-[10px] text-white/30 leading-tight">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl font-black mb-4">
            Pronto para transformar<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">sua gestão?</span>
          </h2>
          <p className="text-white/40 mb-8">Acesse agora e veja como o Synapse pode unificar todos os setores da sua empresa em uma única plataforma inteligente.</p>
          <Button onClick={handleAccess} size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 border-0 shadow-xl shadow-blue-500/30 text-base px-10 h-12">
            {user ? "Ir para o Dashboard" : "Acessar o Sistema"} <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-white">Synapse</span>
        </div>
        <p className="text-xs text-white/20">Plataforma Inteligente de Gestão Empresarial · v7.0</p>
      </footer>
    </div>
  );
}
