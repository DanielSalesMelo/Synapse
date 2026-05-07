import { Suspense, lazy } from "react";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";

const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Veiculos = lazy(() => import("./pages/Veiculos"));
const Funcionarios = lazy(() => import("./pages/Funcionarios"));
const Abastecimentos = lazy(() => import("./pages/Abastecimentos"));
const Manutencoes = lazy(() => import("./pages/Manutencoes"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const Adiantamentos = lazy(() => import("./pages/Adiantamentos"));
const Viagens = lazy(() => import("./pages/Viagens"));
const Checklist = lazy(() => import("./pages/Checklist"));
const Empresa = lazy(() => import("./pages/Empresa"));
const Custos = lazy(() => import("./pages/Custos"));
const SimuladorViagem = lazy(() => import("./pages/SimuladorViagem"));
const Despachante = lazy(() => import("./pages/Despachante"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const SaidaEntrega = lazy(() => import("./pages/SaidaEntrega"));
const SaidaViagem = lazy(() => import("./pages/SaidaViagem"));
const RetornoVeiculo = lazy(() => import("./pages/RetornoVeiculo"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const EstoqueCombustivel = lazy(() => import("./pages/EstoqueCombustivel"));
const Multas = lazy(() => import("./pages/Multas"));
const Relatos = lazy(() => import("./pages/Relatos"));
const DocumentacaoFrota = lazy(() => import("./pages/DocumentacaoFrota"));
const Alertas = lazy(() => import("./pages/Alertas"));
const Acertos = lazy(() => import("./pages/Acertos"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Acidentes = lazy(() => import("./pages/Acidentes"));
const PlanoManutencao = lazy(() => import("./pages/PlanoManutencao"));
const PainelMaster = lazy(() => import("./pages/PainelMaster"));
const Permissoes = lazy(() => import("./pages/Permissoes"));
const Chat = lazy(() => import("./pages/Chat"));
const Omnichannel = lazy(() => import("./pages/Omnichannel"));
const Integracoes = lazy(() => import("./pages/Integracoes"));
const NotasFiscais = lazy(() => import("./pages/NotasFiscais"));
const AcertoCarga = lazy(() => import("./pages/AcertoCarga"));
const Carregamento = lazy(() => import("./pages/Carregamento"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const RelatoriosAvancados = lazy(() => import("./pages/RelatoriosAvancados"));
const DrePorPlaca = lazy(() => import("./pages/DrePorPlaca"));
const Ajuda = lazy(() => import("./pages/Ajuda"));
const IA = lazy(() => import("./pages/IA"));
const Recepcao = lazy(() => import("./pages/Recepcao"));
const WMS = lazy(() => import("./pages/WMS"));
const CRM = lazy(() => import("./pages/CRM"));
const Marketing = lazy(() => import("./pages/Marketing"));
const Vendas = lazy(() => import("./pages/Vendas"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const BI = lazy(() => import("./pages/BI"));
const TI = lazy(() => import("./pages/TI"));
const DeviceDetails = lazy(() => import("./pages/DeviceDetails"));
const Ponto = lazy(() => import("./pages/Ponto"));
const ConferenciaVeiculos = lazy(() => import("./pages/ConferenciaVeiculos"));
const Recepcionista = lazy(() => import("./pages/Recepcionista"));
const Logistica = lazy(() => import("./pages/Logistica"));
const RH = lazy(() => import("./pages/RH"));
const Tarefas = lazy(() => import("./pages/Tarefas"));
const Notas = lazy(() => import("./pages/Notas"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Pessoal = lazy(() => import("./pages/Pessoal"));

const DashboardFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

export default function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Suspense fallback={<DashboardFallback />}>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />

          <Route path="/despachante" component={Despachante} />
          <Route path="/despachante/entrega" component={SaidaEntrega} />
          <Route path="/despachante/viagem" component={SaidaViagem} />
          <Route path="/despachante/retorno" component={RetornoVeiculo} />

          <Route path="/viagens" component={Viagens} />
          <Route path="/notas-fiscais" component={NotasFiscais} />
          <Route path="/acerto-carga" component={AcertoCarga} />
          <Route path="/carregamento" component={Carregamento} />
          <Route path="/abastecimentos" component={Abastecimentos} />

          <Route path="/veiculos" component={Veiculos} />
          <Route path="/funcionarios" component={Funcionarios} />
          <Route path="/manutencoes" component={Manutencoes} />
          <Route path="/plano-manutencao" component={PlanoManutencao} />

          <Route path="/gestao/estoque-combustivel" component={EstoqueCombustivel} />
          <Route path="/gestao/multas" component={Multas} />
          <Route path="/gestao/acidentes" component={Acidentes} />
          <Route path="/gestao/acertos" component={Acertos} />
          <Route path="/checklist" component={Checklist} />
          <Route path="/gestao/relatos" component={Relatos} />
          <Route path="/gestao/documentos" component={DocumentacaoFrota} />
          <Route path="/gestao/alertas" component={Alertas} />
          <Route path="/gestao/calendario" component={Calendario} />

          <Route path="/chat" component={Chat} />
          <Route path="/omnichannel" component={Omnichannel} />
          <Route path="/relatorios" component={Relatorios} />
          <Route path="/usuarios" component={Usuarios} />
          <Route path="/empresa" component={Empresa} />

          <Route path="/financeiro" component={Financeiro} />
          <Route path="/financeiro/receber" component={Financeiro} />
          <Route path="/financeiro/adiantamentos" component={Adiantamentos} />
          <Route path="/adiantamentos" component={Adiantamentos} />
          <Route path="/custos" component={Custos} />
          <Route path="/financeiro/dre" component={DrePorPlaca} />
          <Route path="/financeiro/fluxo-caixa" component={Financeiro} />
          <Route path="/financeiro/conciliacao" component={Financeiro} />
          <Route path="/simulador-viagem" component={SimuladorViagem} />

          <Route path="/integracoes" component={Integracoes} />
          <Route path="/integracoes/arquivei" component={Integracoes} />
          <Route path="/integracoes/winthor" component={Integracoes} />

          <Route path="/relatorios-avancados" component={RelatoriosAvancados} />
          <Route path="/import-export" component={ImportExport} />
          <Route path="/ajuda" component={Ajuda} />
          <Route path="/ia" component={IA} />
          <Route path="/pessoal" component={Pessoal} />
          <Route path="/pessoal/calendario" component={Pessoal} />

          <Route path="/recepcao" component={Recepcao} />
          <Route path="/recepcao/docas" component={Recepcao} />

          <Route path="/wms" component={WMS} />
          <Route path="/wms/estoque" component={WMS} />
          <Route path="/wms/produtos" component={WMS} />
          <Route path="/wms/movimentacoes" component={WMS} />
          <Route path="/wms/armazens" component={WMS} />

          <Route path="/crm" component={CRM} />
          <Route path="/crm/clientes" component={CRM} />
          <Route path="/crm/leads" component={CRM} />
          <Route path="/crm/funil" component={CRM} />

          <Route path="/vendas" component={Vendas} />
          <Route path="/vendas/pedidos" component={Vendas} />
          <Route path="/vendas/propostas" component={Vendas} />

          <Route path="/auditoria" component={Auditoria} />
          <Route path="/bi" component={BI} />

          <Route path="/ti/dispositivos/:agentId" component={DeviceDetails} />
          <Route path="/ti/:tab?">{(params) => <TI params={params as any} />}</Route>

          <Route path="/marketing" component={Marketing} />
          <Route path="/marketing/campanhas" component={Marketing} />
          <Route path="/marketing/email" component={Marketing} />
          <Route path="/marketing/landing-pages" component={Marketing} />
          <Route path="/marketing/segmentacao" component={Marketing} />
          <Route path="/marketing/analytics" component={Marketing} />
          <Route path="/marketing/automacoes" component={Marketing} />

          <Route path="/ponto" component={Ponto} />
          <Route path="/conferencia-veiculos" component={ConferenciaVeiculos} />
          <Route path="/recepcionista" component={Recepcionista} />
          <Route path="/logistica" component={Logistica} />
          <Route path="/logistica/sac" component={Logistica} />
          <Route path="/logistica/licencas" component={Logistica} />

          <Route path="/master/painel" component={PainelMaster} />
          <Route path="/master/visao-geral" component={PainelMaster} />
          <Route path="/master/empresas" component={PainelMaster} />
          <Route path="/master/licencas" component={PainelMaster} />
          <Route path="/master/cobrancas" component={PainelMaster} />
          <Route path="/master/planos" component={PainelMaster} />
          <Route path="/master/config" component={PainelMaster} />
          <Route path="/master/permissoes" component={Permissoes} />
          <Route path="/master/ia-training" component={IA} />
          <Route path="/master/bi" component={BI} />

          <Route path="/crm/pos-venda" component={CRM} />

          <Route path="/rh" component={RH} />
          <Route path="/rh/funcionarios" component={RH} />
          <Route path="/rh/folha" component={RH} />
          <Route path="/rh/beneficios" component={RH} />
          <Route path="/rh/treinamentos" component={RH} />
          <Route path="/rh/analytics" component={RH} />
          <Route path="/rh/clima" component={RH} />

          <Route path="/wms/inventario" component={WMS} />
          <Route path="/wms/acuracidade" component={WMS} />

          <Route path="/recepcionista/agendamentos" component={Recepcionista} />

          <Route path="/logistica/temperatura" component={Logistica} />
          <Route path="/logistica/rastreabilidade" component={Logistica} />

          <Route path="/tarefas" component={Tarefas} />
          <Route path="/tarefas/kanban" component={Tarefas} />
          <Route path="/tarefas/sprint" component={Tarefas} />
          <Route path="/tarefas/lista" component={Tarefas} />

          <Route path="/notas" component={Notas} />
          <Route path="/configuracoes" component={Configuracoes} />

          <Route path="/qualidade/nao-conformidades" component={Auditoria} />
          <Route path="/qualidade/auditorias" component={Auditoria} />
          <Route path="/qualidade/documentos" component={Auditoria} />
          <Route path="/qualidade/calibracao" component={Auditoria} />

          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}
