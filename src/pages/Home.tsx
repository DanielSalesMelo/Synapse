import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Truck, BarChart3, Users, Fuel, Wrench, Shield, ArrowRight,
  MapPin, FileText, Package, DollarSign, Bell, CheckSquare,
  Zap, Globe, ChevronRight, Star, TrendingUp, Clock, Lock, X, Brain, PackageCheck, Warehouse,
  Target, ShoppingCart, UserCheck, Headphones, ClipboardCheck, Monitor, Activity,
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
    { icon: Brain,       label: lang === "pt" ? "Synapse AI"      : "Synapse AI",   color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30", route: "/ia",
      tagline: lang === "pt" ? "Inteligência artificial integrada" : "Integrated artificial intelligence",
      desc: lang === "pt" ? "5 agentes especializados com IA generativa: assistente geral, analista financeiro, suporte ao motorista, especialista em manutenção e assistente jurídico. Powered by OpenAI." : "5 specialized AI agents: general assistant, financial analyst, driver support, maintenance expert and legal assistant. Powered by OpenAI.",
      features: lang === "pt" ? ["Synapse AI: assistente geral de frota e logística","Analista Financeiro: custo por km, DRE e margens","Suporte ao Motorista: dúvidas operacionais e procedimentos","Especialista em Manutenção: diagnóstico e planos preventivos","Assistente Jurídico: legislação ANTT, multas e compliance","Análise automática de dados da empresa com nota de desempenho"] : ["Synapse AI: general fleet and logistics assistant","Financial Analyst: cost per km, P&L and margins","Driver Support: operational questions and procedures","Maintenance Expert: diagnosis and preventive plans","Legal Assistant: ANTT legislation, fines and compliance","Automatic company data analysis with performance score"] },
    { icon: PackageCheck, label: lang === "pt" ? "Recepção" : "Receiving", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", route: "/recepcao",
      tagline: lang === "pt" ? "Controle total de recebimentos" : "Full receiving control",
      desc: lang === "pt" ? "Gerencie recebimentos de mercadorias, docas, conferência de itens e status de entrega em tempo real." : "Manage goods receiving, docks, item inspection and delivery status in real time.",
      features: lang === "pt" ? ["Cadastro de recebimentos com NF e fornecedor","Controle de docas e agendamento","Conferência de itens com status","Histórico completo de recebimentos","Alertas de divergências e avarias","Integração com WMS para entrada no estoque"] : ["Receiving registration with invoice and supplier","Dock control and scheduling","Item inspection with status","Complete receiving history","Divergence and damage alerts","WMS integration for stock entry"] },
    { icon: Warehouse, label: lang === "pt" ? "WMS" : "WMS", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30", route: "/wms",
      tagline: lang === "pt" ? "Gestão completa de armazém" : "Complete warehouse management",
      desc: lang === "pt" ? "Sistema completo de gestão de armazém: controle de estoque, produtos, movimentações, armazéns e localizações." : "Complete warehouse management system: stock control, products, movements, warehouses and locations.",
      features: lang === "pt" ? ["Cadastro de produtos com código e EAN","Controle de estoque por armazém e localização","Movimentações: entrada, saída, ajuste, transferência","Alertas de estoque mínimo","Inventário e rastreabilidade","Relatórios de giro e posição de estoque"] : ["Product registration with code and EAN","Stock control by warehouse and location","Movements: entry, exit, adjustment, transfer","Minimum stock alerts","Inventory and traceability","Turnover and stock position reports"] },
    { icon: Target, label: "CRM", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", route: "/crm",
      tagline: lang === "pt" ? "Gestão de clientes e leads" : "Customer & lead management",
      desc: lang === "pt" ? "Gerencie clientes, leads e o funil de vendas com visão kanban. Acompanhe oportunidades e converta mais negócios." : "Manage customers, leads and the sales funnel with kanban view.",
      features: lang === "pt" ? ["Cadastro completo de clientes e contatos","Funil de vendas estilo kanban","Gestão de leads com origem e status","Histórico de interações","Integração com módulo de Vendas","Relatórios de conversão"] : ["Complete customer and contact registration","Kanban-style sales funnel","Lead management with source and status","Interaction history","Integration with Sales module","Conversion reports"] },
    { icon: ShoppingCart, label: lang === "pt" ? "Vendas" : "Sales", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", route: "/vendas",
      tagline: lang === "pt" ? "Pedidos, propostas e comissões" : "Orders, proposals and commissions",
      desc: lang === "pt" ? "Gerencie pedidos de venda, propostas comerciais e comissões. Controle todo o ciclo de vendas." : "Manage sales orders, commercial proposals and commissions.",
      features: lang === "pt" ? ["Pedidos com status completo","Propostas comerciais com validade","Controle de comissões por vendedor","Integração com CRM e Financeiro","Relatórios de vendas e desempenho","Histórico completo por cliente"] : ["Orders with complete status","Commercial proposals with validity","Commission control by salesperson","Integration with CRM and Finance","Sales and performance reports","Complete history by customer"] },
    { icon: UserCheck, label: lang === "pt" ? "Recepcionista" : "Receptionist", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", route: "/recepcionista",
      tagline: lang === "pt" ? "Controle de visitantes e visitas" : "Visitor and visit control",
      desc: lang === "pt" ? "Controle a entrada e saída de visitantes, emita crachás e registre agendamentos." : "Control visitor entry and exit, issue badges and register appointments.",
      features: lang === "pt" ? ["Cadastro de visitantes com documento","Agendamento de visitas","Registro de entrada e saída","Emissão de crachá","Controle por setor e pessoa de contato","Histórico completo de visitas"] : ["Visitor registration with document","Visit scheduling","Entry and exit registration","Badge issuance","Control by sector and contact person","Complete visit history"] },
    { icon: Headphones, label: lang === "pt" ? "Logística" : "Logistics", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", route: "/logistica",
      tagline: lang === "pt" ? "SAC e licenças regulatórias" : "Customer service and regulatory licenses",
      desc: lang === "pt" ? "Módulo de SAC e gestão de licenças regulatórias como ANVISA, VISA e IBAMA." : "Customer service module and regulatory license management.",
      features: lang === "pt" ? ["Chamados SAC com protocolo único","Histórico de interações por chamado","Priorização: baixa, média, alta, urgente","Gestão de licenças ANVISA/VISA/IBAMA","Alertas de vencimento de licenças","Relatórios de atendimento e SLA"] : ["Customer service tickets with unique protocol","Interaction history per ticket","Prioritization: low, medium, high, urgent","ANVISA/VISA/IBAMA license management","License expiration alerts","Service and SLA reports"] },
    { icon: ClipboardCheck, label: lang === "pt" ? "Conferência" : "Inspection", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", route: "/conferencia-veiculos",
      tagline: lang === "pt" ? "Conferência completa de veículos" : "Complete vehicle inspection",
      desc: lang === "pt" ? "Fluxo completo: despachante registra saída, veículo retorna, conferente verifica carga e avarias com fotos, motorista confirma digitalmente." : "Complete flow: dispatcher registers departure, inspector checks cargo and damage with photos, driver confirms digitally.",
      features: lang === "pt" ? ["Registro de saída com KM","Conferência de carga, pneus e documentos","Registro de avarias e batidas com fotos","Confirmação digital do motorista","Histórico completo por veículo","Alertas de avarias encontradas"] : ["Departure registration with KM","Cargo, tire and document inspection","Damage and collision registration with photos","Digital driver confirmation","Complete history by vehicle","Damage alerts"] },
    { icon: Clock, label: lang === "pt" ? "Ponto Eletrônico" : "Time Clock", color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/30", route: "/ponto",
      tagline: lang === "pt" ? "Registro de ponto e banco de horas" : "Time tracking and hour bank",
      desc: lang === "pt" ? "Registre entrada, saída e intervalos. Controle banco de horas e horas extras." : "Register entry, exit and breaks. Control hour bank and overtime.",
      features: lang === "pt" ? ["Registro de entrada, saída e intervalos","Banco de horas automático","Controle de horas extras","Ajuste de ponto pelo administrador","Relatórios de frequência","Integração com módulo de Funcionários"] : ["Entry, exit and break registration","Automatic hour bank","Overtime control","Time adjustment by administrator","Attendance reports","Integration with Employees module"] },
    { icon: Activity, label: "BI", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30", route: "/bi",
      tagline: lang === "pt" ? "Business Intelligence para decisões" : "Business Intelligence for decisions",
      desc: lang === "pt" ? "Visão 360° com métricas de frota, financeiro, vendas e RH. Gráficos de tendência para tomada de decisão." : "360° view with fleet, financial, sales and HR metrics.",
      features: lang === "pt" ? ["Dashboard executivo consolidado","Métricas de frota e operacional","Métricas financeiras: pagar, receber, DRE","Métricas comerciais: clientes, leads, pedidos","Gráficos de tendência 30 dias","Exportação de relatórios"] : ["Consolidated executive dashboard","Fleet and operational metrics","Financial metrics: payable, receivable, P&L","Commercial metrics: customers, leads, orders","30-day trend charts","Report export"] },
    { icon: Monitor, label: "TI", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30", route: "/ti",
      tagline: lang === "pt" ? "Suporte técnico e gestão de ativos" : "Technical support and asset management",
      desc: lang === "pt" ? "Tickets de suporte de TI e gestão de ativos (computadores, impressoras, redes)." : "IT support tickets and asset management.",
      features: lang === "pt" ? ["Tickets com protocolo e prioridade","Categorias: hardware, software, rede","Gestão de ativos com patrimônio","Histórico de manutenções","SLA e tempo de resolução","Relatórios de atendimento"] : ["Tickets with protocol and priority","Categories: hardware, software, network","Asset management with patrimony","Maintenance history","SLA and resolution time","Service reports"] },
    { icon: Shield, label: lang === "pt" ? "Auditoria" : "Audit", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", route: "/auditoria",
      tagline: lang === "pt" ? "Trilha completa de auditoria" : "Complete audit trail",
      desc: lang === "pt" ? "Trilha de auditoria de todas as ações. Admin master vê quem fez o quê, quando e de onde." : "Audit trail of all actions. Master admin sees who did what, when and from where.",
      features: lang === "pt" ? ["Log de todas as ações do sistema","Classificação de risco: baixo a crítico","Filtros por módulo e período","Registro de IP e dispositivo","Alertas de eventos críticos","Exportação para compliance"] : ["Log of all system actions","Risk classification: low to critical","Filters by module and period","IP and device registration","Critical event alerts","Export for compliance"] },
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
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Synapse</span>
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
              {lang === "pt" ? "Por que escolher o Synapse?" : lang === "en" ? "Why choose Synapse?" : lang === "es" ? "¿Por qué elegir Synapse?" : lang === "fr" ? "Pourquoi choisir Synapse?" : "為什麼選擇 Synapse？"}
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
              {lang === "pt" ? "Acessar o Synapse" : lang === "en" ? "Access Synapse" : lang === "es" ? "Acceder a Synapse" : lang === "fr" ? "Accéder à Synapse" : "訪問 Synapse"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white/80">Synapse</span>
          </div>
          <p className="text-white/30 text-sm">
            © 2026 Synapse —{" "}
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
