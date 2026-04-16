import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ViewAsProvider } from "./contexts/ViewAsContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Veiculos from "./pages/Veiculos";
import Funcionarios from "./pages/Funcionarios";
import Abastecimentos from "./pages/Abastecimentos";
import Manutencoes from "./pages/Manutencoes";
import Financeiro from "./pages/Financeiro";
import Adiantamentos from "./pages/Adiantamentos";
import Viagens from "./pages/Viagens";
import Checklist from "./pages/Checklist";
import Empresa from "./pages/Empresa";
import Custos from "./pages/Custos";
import SimuladorViagem from "./pages/SimuladorViagem";
import Despachante from "./pages/Despachante";
import Usuarios from "./pages/Usuarios";
import SaidaEntrega from "./pages/SaidaEntrega";
import SaidaViagem from "./pages/SaidaViagem";
import RetornoVeiculo from "./pages/RetornoVeiculo";
import Relatorios from "./pages/Relatorios";
import EstoqueCombustivel from "./pages/EstoqueCombustivel";
import Multas from "./pages/Multas";
import Relatos from "./pages/Relatos";
import DocumentacaoFrota from "./pages/DocumentacaoFrota";
import Alertas from "./pages/Alertas";
import Acertos from "./pages/Acertos";
import Calendario from "./pages/Calendario";
import Acidentes from "./pages/Acidentes";
import PlanoManutencao from "./pages/PlanoManutencao";
import PainelMaster from "./pages/PainelMaster";
import Permissoes from "./pages/Permissoes";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Trial from "./pages/Trial";
import Integracoes from "./pages/Integracoes";
import NotasFiscais from "./pages/NotasFiscais";
import AcertoCarga from "./pages/AcertoCarga";
import Carregamento from "./pages/Carregamento";
import ImportExport from "./pages/ImportExport";
import RelatoriosAvancados from "./pages/RelatoriosAvancados";
import DrePorPlaca from "./pages/DrePorPlaca";
import Ajuda from "./pages/Ajuda";
import IA from "./pages/IA";
import Recepcao from "./pages/Recepcao";
import WMS from "./pages/WMS";

// Novos módulos
import CRM from "./pages/CRM";
import Marketing from "./pages/Marketing";
import Vendas from "./pages/Vendas";
import Auditoria from "./pages/Auditoria";
import BI from "./pages/BI";
import TI from "./pages/TI";
import Ponto from "./pages/Ponto";
import ConferenciaVeiculos from "./pages/ConferenciaVeiculos";
import Recepcionista from "./pages/Recepcionista";
import Logistica from "./pages/Logistica";

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        {/* Dashboard */}
        <Route path="/dashboard" component={Dashboard} />

        {/* Despachante */}
        <Route path="/despachante" component={Despachante} />
        <Route path="/despachante/entrega" component={SaidaEntrega} />
        <Route path="/despachante/viagem" component={SaidaViagem} />
        <Route path="/despachante/retorno" component={RetornoVeiculo} />

        {/* Operacional */}
        <Route path="/viagens" component={Viagens} />
        <Route path="/notas-fiscais" component={NotasFiscais} />
        <Route path="/acerto-carga" component={AcertoCarga} />
        <Route path="/carregamento" component={Carregamento} />
        <Route path="/abastecimentos" component={Abastecimentos} />

        {/* Frota */}
        <Route path="/veiculos" component={Veiculos} />
        <Route path="/funcionarios" component={Funcionarios} />
        <Route path="/manutencoes" component={Manutencoes} />
        <Route path="/plano-manutencao" component={PlanoManutencao} />

        {/* Gestão */}
        <Route path="/gestao/estoque-combustivel" component={EstoqueCombustivel} />
        <Route path="/gestao/multas" component={Multas} />
        <Route path="/gestao/acidentes" component={Acidentes} />
        <Route path="/gestao/acertos" component={Acertos} />
        <Route path="/checklist" component={Checklist} />
        <Route path="/gestao/relatos" component={Relatos} />
        <Route path="/gestao/documentos" component={DocumentacaoFrota} />
        <Route path="/gestao/alertas" component={Alertas} />
        <Route path="/gestao/calendario" component={Calendario} />

        {/* Sistema */}
        <Route path="/chat" component={Chat} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/usuarios" component={Usuarios} />
        <Route path="/empresa" component={Empresa} />

        {/* Financeiro */}
        <Route path="/financeiro" component={Financeiro} />
        <Route path="/financeiro/receber" component={Financeiro} />
        <Route path="/financeiro/adiantamentos" component={Adiantamentos} />
        <Route path="/adiantamentos" component={Adiantamentos} />
        <Route path="/custos" component={Custos} />
        <Route path="/financeiro/dre" component={DrePorPlaca} />
        <Route path="/financeiro/fluxo-caixa" component={Financeiro} />
        <Route path="/financeiro/conciliacao" component={Financeiro} />
        <Route path="/simulador-viagem" component={SimuladorViagem} />

        {/* Integrações */}
        <Route path="/integracoes" component={Integracoes} />
        <Route path="/integracoes/arquivei" component={Integracoes} />
        <Route path="/integracoes/winthor" component={Integracoes} />

        {/* Relatórios e Dados */}
        <Route path="/relatorios-avancados" component={RelatoriosAvancados} />
        <Route path="/import-export" component={ImportExport} />
        <Route path="/ajuda" component={Ajuda} />
        <Route path="/ia" component={IA} />

        {/* Recepção (legado) */}
        <Route path="/recepcao" component={Recepcao} />
        <Route path="/recepcao/docas" component={Recepcao} />

        {/* WMS */}
        <Route path="/wms/estoque" component={WMS} />
        <Route path="/wms/produtos" component={WMS} />
        <Route path="/wms/movimentacoes" component={WMS} />
        <Route path="/wms/armazens" component={WMS} />

        {/* === NOVOS MÓDULOS === */}

        {/* CRM */}
        <Route path="/crm" component={CRM} />
        <Route path="/crm/clientes" component={CRM} />
        <Route path="/crm/leads" component={CRM} />
        <Route path="/crm/funil" component={CRM} />

        {/* Vendas */}
        <Route path="/vendas" component={Vendas} />
        <Route path="/vendas/pedidos" component={Vendas} />
        <Route path="/vendas/propostas" component={Vendas} />

        {/* Auditoria */}
        <Route path="/auditoria" component={Auditoria} />

        {/* BI - Business Intelligence */}
        <Route path="/bi" component={BI} />

        {/* TI - ITSM & ITAM */}
        <Route path="/ti" component={TI} />
        <Route path="/ti/inventario" component={TI} />
        <Route path="/ti/hardware" component={TI} />
        <Route path="/ti/servidores" component={TI} />
        <Route path="/ti/acessos" component={TI} />
        <Route path="/ti/licencas" component={TI} />
        <Route path="/ti/mudancas" component={TI} />
        <Route path="/ti/compras" component={TI} />
        <Route path="/ti/cmdb" component={TI} />

        {/* Marketing */}
        <Route path="/marketing/campanhas" component={Marketing} />
        <Route path="/marketing/email" component={Marketing} />
        <Route path="/marketing/landing-pages" component={Marketing} />
        <Route path="/marketing/segmentacao" component={Marketing} />
        <Route path="/marketing/analytics" component={Marketing} />
        <Route path="/marketing/automacoes" component={Marketing} />

        {/* Ponto Eletrônico */}
        <Route path="/ponto" component={Ponto} />

        {/* Conferência de Veículos */}
        <Route path="/conferencia-veiculos" component={ConferenciaVeiculos} />

        {/* Recepcionista (visitantes) */}
        <Route path="/recepcionista" component={Recepcionista} />

        {/* Logística (SAC, ANVISA, VISA) */}
        <Route path="/logistica" component={Logistica} />
        <Route path="/logistica/sac" component={Logistica} />
        <Route path="/logistica/licencas" component={Logistica} />

        {/* Master */}
        <Route path="/master/painel" component={PainelMaster} />
        <Route path="/master/empresas" component={PainelMaster} />
        <Route path="/master/permissoes" component={Permissoes} />
        <Route path="/master/ia-training" component={IA} />
        <Route path="/master/bi" component={BI} />

        {/* CRM extras */}
        <Route path="/crm/pos-venda" component={CRM} />

        {/* RH extras */}
        <Route path="/rh/funcionarios" component={Funcionarios} />
        <Route path="/rh/folha" component={Financeiro} />
        <Route path="/rh/beneficios" component={Funcionarios} />
        <Route path="/rh/treinamentos" component={Funcionarios} />
        <Route path="/rh/analytics" component={BI} />
        <Route path="/rh/clima" component={Funcionarios} />

        {/* WMS extras */}
        <Route path="/wms/inventario" component={WMS} />
        <Route path="/wms/acuracidade" component={WMS} />

        {/* Recepcionista extras */}
        <Route path="/recepcionista/agendamentos" component={Recepcionista} />

        {/* Logística extras */}
        <Route path="/logistica/temperatura" component={Logistica} />
        <Route path="/logistica/rastreabilidade" component={Logistica} />

        {/* Qualidade */}
        <Route path="/qualidade/nao-conformidades" component={Auditoria} />
        <Route path="/qualidade/auditorias" component={Auditoria} />
        <Route path="/qualidade/documentos" component={Auditoria} />
        <Route path="/qualidade/calibracao" component={Auditoria} />

        {/* Fallback dentro do dashboard */}
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Landing page sem sidebar */}
      <Route path="/" component={Home} />

      {/* Login page */}
      <Route path="/login" component={Login} />

      {/* Trial / cadastro público */}
      <Route path="/trial" component={Trial} />

      {/* 404 explícito */}
      <Route path="/404" component={NotFound} />

      {/* Todas as outras rotas com DashboardLayout persistente */}
      <Route>
        <DashboardRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <ViewAsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ViewAsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
