import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, BookOpen, HelpCircle, MessageSquare,
  ChevronRight, Copy, Check,
  Truck, BarChart3, Users, Fuel, Wrench, Shield,
  MapPin, FileText, Package, DollarSign, Bell, CheckSquare,
  Zap, Settings, Building2, AlertTriangle, Calendar,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SEÇÕES DO MANUAL
// ─────────────────────────────────────────────────────────────────────────────
const SECOES = [
  {
    id: "introducao",
    icon: BookOpen,
    titulo: "Introdução",
    descricao: "O que é o Synapse e como começar",
    badge: "Início",
    badgeColor: "bg-blue-500/20 text-blue-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O **Synapse** é um sistema ERP especializado em gestão de frotas de transporte e distribuição. Ele centraliza o controle de veículos, motoristas, viagens, carregamentos, notas fiscais, financeiro e muito mais — eliminando planilhas e retrabalho.",
      },
      {
        tipo: "titulo",
        conteudo: "Perfis de Acesso",
      },
      {
        tipo: "tabela",
        cabecalho: ["Perfil", "O que pode fazer"],
        linhas: [
          ["Master Admin", "Acesso total ao sistema. Gerencia todas as empresas, usuários e configurações globais."],
          ["Admin", "Acesso total à sua empresa. Gerencia usuários, dados e configurações da empresa."],
          ["Despachante", "Acesso operacional: viagens, carregamento, notas fiscais e retorno de veículos."],
          ["Monitor", "Apenas consulta. Não pode criar, editar ou excluir registros."],
          ["Usuário", "Acesso limitado conforme permissões definidas pelo Admin."],
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Primeiro Acesso",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse o sistema em synapse-seven-nu.vercel.app",
          "Clique em 'Entrar' e informe seu email e senha",
          "Se for o primeiro acesso, aguarde aprovação do administrador",
          "Após aprovado, você será redirecionado ao Dashboard",
          "Configure seu perfil clicando no avatar no canto inferior esquerdo",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Navegação",
      },
      {
        tipo: "texto",
        conteudo: "O menu lateral esquerdo organiza os módulos em grupos: **MAIN** (Dashboard), **DISPATCHER** (Despachante), **OPERATIONAL** (Operacional), **FLEET** (Frota), **MANAGEMENT** (Gestão), **ANALYTICS** (Análises) e **ADMIN** (Administração). Clique em qualquer item para navegar.",
      },
    ],
  },
  {
    id: "dashboard",
    icon: BarChart3,
    titulo: "Dashboard",
    descricao: "Visão geral da operação em tempo real",
    badge: "Principal",
    badgeColor: "bg-green-500/20 text-green-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O Dashboard é a tela inicial após o login. Ele exibe os principais indicadores da operação em tempo real, agrupados em cards informativos.",
      },
      {
        tipo: "titulo",
        conteudo: "Cards do Dashboard",
      },
      {
        tipo: "tabela",
        cabecalho: ["Card", "O que mostra"],
        linhas: [
          ["Vehicles", "Total de veículos na frota e quantos estão em campo"],
          ["Drivers", "Total de motoristas/ajudantes cadastrados"],
          ["Trips", "Viagens planejadas para o período atual"],
          ["Alerts", "Documentos vencendo, manutenções pendentes, situações críticas"],
          ["Accounts Payable", "Total de contas a pagar e valor vencido"],
          ["Accounts Receivable", "Total de fretes e CTEs a receber"],
          ["Advances", "Adiantamentos aguardando acerto com motoristas"],
          ["Fuel", "Litros de combustível disponíveis no tanque interno"],
          ["Maintenance", "Serviços de manutenção em aberto"],
          ["Tanque Interno", "Nível atual de Diesel e ARLA no tanque da empresa"],
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Seletor de Empresa (Multi-empresa)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Se você tem acesso a múltiplas empresas (matriz/filiais), clique no nome da empresa no topo do menu lateral",
          "Uma lista de empresas disponíveis será exibida",
          "Clique na empresa desejada para alternar",
          "O sistema recarrega automaticamente com os dados daquela empresa",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Modo 'Ver como Admin' (Apenas Master Admin)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Vá para Admin → Master Panel (Painel Master)",
          "Clique na aba 'Empresas'",
          "Localize a empresa desejada e clique em 'Ver como Admin'",
          "Um banner amarelo aparecerá no topo indicando que você está simulando a visão de admin",
          "Para sair da simulação, clique em 'Sair' no banner amarelo",
        ],
      },
    ],
  },
  {
    id: "despachante",
    icon: MapPin,
    titulo: "Despachante",
    descricao: "Saída de entrega, viagem e retorno de veículos",
    badge: "Operacional",
    badgeColor: "bg-purple-500/20 text-purple-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo Despachante centraliza as operações de saída e retorno de veículos. É dividido em três sub-módulos: Saída para Entrega, Saída para Viagem e Retorno de Veículo.",
      },
      {
        tipo: "titulo",
        conteudo: "Saída para Entrega (Delivery Dispatch)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Dispatcher → Delivery Dispatch no menu lateral",
          "Clique em '+ Nova Saída para Entrega'",
          "Selecione o Veículo e o Motorista",
          "Informe a Data/Hora de Saída e o Destino",
          "Adicione as Notas Fiscais que serão entregues",
          "Clique em 'Confirmar Saída'",
          "O sistema registra a saída e atualiza o status do veículo para 'Em Campo'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Saída para Viagem (Trip Dispatch)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Dispatcher → Trip Dispatch no menu lateral",
          "Clique em '+ Nova Saída para Viagem'",
          "Selecione o Veículo, Motorista e Ajudante (opcional)",
          "Informe Origem, Destino, Data/Hora de Saída",
          "Vincule o Carregamento (Romaneio) se já estiver criado",
          "Clique em 'Confirmar Saída'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Retorno de Veículo (Vehicle Return)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Dispatcher → Vehicle Return no menu lateral",
          "Localize o veículo que retornou na lista",
          "Clique em 'Registrar Retorno'",
          "Informe: KM de chegada, Observações, Status das entregas",
          "Faça upload do canhoto (foto da assinatura do destinatário) se disponível",
          "Clique em 'Confirmar Retorno'",
          "O sistema atualiza o status do veículo para 'Disponível'",
        ],
      },
    ],
  },
  {
    id: "viagens",
    icon: Truck,
    titulo: "Viagens",
    descricao: "Criação e acompanhamento de viagens",
    badge: "Operacional",
    badgeColor: "bg-blue-500/20 text-blue-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Viagens permite criar, acompanhar e encerrar viagens de transporte. Cada viagem pode ter múltiplas notas fiscais associadas e um acerto financeiro ao final.",
      },
      {
        tipo: "titulo",
        conteudo: "Criar Nova Viagem",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Operational → Trips no menu lateral",
          "Clique em '+ Nova Viagem' no canto superior direito",
          "Preencha os dados obrigatórios: Motorista, Veículo, Origem, Destino",
          "Informe: Data de Saída, KM Inicial, Valor do Frete",
          "Adicione Ajudante se necessário",
          "Selecione o Tipo de Frete: CTE, NF, Contrato",
          "Clique em 'Criar Viagem'",
          "A viagem é criada com status 'Planejada'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Status das Viagens",
      },
      {
        tipo: "tabela",
        cabecalho: ["Status", "Significado"],
        linhas: [
          ["Planejada", "Viagem criada, aguardando saída do veículo"],
          ["Em Andamento", "Veículo saiu e está em rota"],
          ["Concluída", "Viagem encerrada com sucesso"],
          ["Cancelada", "Viagem cancelada antes ou durante a execução"],
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Encerrar Viagem",
      },
      {
        tipo: "passos",
        conteudo: [
          "Localize a viagem na lista com status 'Em Andamento'",
          "Clique na viagem para abrir os detalhes",
          "Clique em 'Encerrar Viagem'",
          "Informe: KM Final, Data/Hora de Chegada, Observações",
          "Confirme o encerramento",
          "O sistema calcula automaticamente: KM Rodado, Consumo de Combustível",
          "A viagem fica disponível para Acerto de Carga",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Notas Fiscais na Viagem",
      },
      {
        tipo: "passos",
        conteudo: [
          "Abra os detalhes de uma viagem",
          "Clique na aba 'Notas Fiscais'",
          "Clique em '+ Adicionar NF'",
          "Informe: Número da NF, Chave de Acesso, Destinatário, Valor",
          "Selecione o Status: Pendente, Em Trânsito, Entregue, Devolvida, Ocorrência",
          "Clique em 'Salvar'",
          "Para atualizar o status, clique no ícone de edição ao lado da NF",
        ],
      },
    ],
  },
  {
    id: "carregamento",
    icon: Package,
    titulo: "Carregamento (Romaneio)",
    descricao: "Montagem de carga e geração de romaneio em PDF",
    badge: "Operacional",
    badgeColor: "bg-purple-500/20 text-purple-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Carregamento permite montar a carga de um veículo, listar todas as notas fiscais e gerar o Romaneio em PDF para acompanhar o motorista.",
      },
      {
        tipo: "titulo",
        conteudo: "Criar Novo Carregamento",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Operational → Load Management no menu lateral",
          "Clique em '+ Novo Carregamento'",
          "Selecione: Veículo, Motorista, Data de Saída",
          "Informe o Destino principal da carga",
          "Adicione as Notas Fiscais: clique em '+ Adicionar NF' para cada nota",
          "Para cada NF informe: Número, Destinatário, Endereço de Entrega, Peso (kg), Volumes",
          "O sistema calcula automaticamente o peso total e número de volumes",
          "Clique em 'Salvar Carregamento'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Gerar Romaneio em PDF",
      },
      {
        tipo: "passos",
        conteudo: [
          "Abra o carregamento desejado",
          "Clique no botão 'Gerar Romaneio PDF'",
          "O sistema gera automaticamente um PDF com: cabeçalho da empresa, lista de NFs, destinatários, endereços, pesos e volumes",
          "O PDF é aberto em nova aba para impressão ou download",
          "Entregue o romaneio impresso ao motorista antes da saída",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Registrar Canhoto (Comprovante de Entrega)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Após o retorno do motorista, abra o carregamento",
          "Localize a NF entregue na lista",
          "Clique em 'Registrar Canhoto'",
          "Faça upload da foto do canhoto assinado pelo destinatário",
          "Clique em 'Confirmar'",
          "O status da NF é atualizado para 'Entregue com Canhoto'",
        ],
      },
    ],
  },
  {
    id: "notas-fiscais",
    icon: FileText,
    titulo: "Notas Fiscais",
    descricao: "Rastreamento de NF-e por viagem",
    badge: "Operacional",
    badgeColor: "bg-green-500/20 text-green-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Notas Fiscais permite rastrear o status de cada NF-e associada a uma viagem, desde a saída até a entrega ou devolução.",
      },
      {
        tipo: "titulo",
        conteudo: "Status das Notas Fiscais",
      },
      {
        tipo: "tabela",
        cabecalho: ["Status", "Significado", "Cor"],
        linhas: [
          ["Pendente", "NF criada, aguardando saída", "Cinza"],
          ["Em Trânsito", "Veículo saiu com a NF", "Azul"],
          ["Entregue", "NF entregue e confirmada pelo destinatário", "Verde"],
          ["Devolvida", "NF retornou sem entrega", "Laranja"],
          ["Ocorrência", "Problema na entrega (avaria, recusa, etc.)", "Vermelho"],
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Atualizar Status de uma NF",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Operational → Fiscal Notes no menu lateral",
          "Localize a NF pelo número ou chave de acesso",
          "Clique no ícone de edição (lápis) ao lado da NF",
          "Selecione o novo status no dropdown",
          "Adicione observações se necessário (ex: motivo da devolução)",
          "Clique em 'Salvar'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Buscar NF-e via Arquivei",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Integrations → Arquivei no menu lateral",
          "Certifique-se que as credenciais do Arquivei estão configuradas",
          "Cole a chave de acesso da NF-e (44 dígitos) no campo de busca",
          "Clique em 'Buscar NF-e'",
          "O sistema retorna: número, série, valor, emitente, destinatário",
          "Clique em 'Baixar XML' para o arquivo XML da NF",
          "Clique em 'Baixar DANFE' para o PDF da NF",
        ],
      },
    ],
  },
  {
    id: "acerto",
    icon: DollarSign,
    titulo: "Acerto de Carga",
    descricao: "Fechamento financeiro de viagens com comissão",
    badge: "Financeiro",
    badgeColor: "bg-yellow-500/20 text-yellow-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O Acerto de Carga é o fechamento financeiro de uma viagem. Ele calcula a comissão do motorista, desconta adiantamentos e gera o comprovante de pagamento.",
      },
      {
        tipo: "titulo",
        conteudo: "Criar Acerto de Carga",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Operational → Load Settlement no menu lateral",
          "Clique em '+ Novo Acerto'",
          "Selecione a Viagem que será acertada (apenas viagens concluídas aparecem)",
          "O sistema preenche automaticamente: Motorista, Veículo, KM Rodado, Valor do Frete",
          "Informe o Percentual de Comissão do motorista (ex: 10%)",
          "O sistema calcula: Valor Bruto, Comissão, Descontos",
          "Adicione Descontos se necessário: adiantamentos, multas, danos",
          "Adicione Acréscimos se necessário: bônus, ajuda de custo extra",
          "Revise o Valor Líquido a pagar ao motorista",
          "Clique em 'Finalizar Acerto'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Campos do Acerto",
      },
      {
        tipo: "tabela",
        cabecalho: ["Campo", "Descrição"],
        linhas: [
          ["Valor do Frete", "Receita bruta da viagem (CTE + NFs)"],
          ["% Comissão", "Percentual acordado com o motorista"],
          ["Valor Comissão", "Calculado automaticamente: Frete × % Comissão"],
          ["Adiantamentos", "Valores já pagos ao motorista antes da viagem"],
          ["Outros Descontos", "Multas, combustível, pedágio, danos"],
          ["Acréscimos", "Bônus, ajuda de custo, horas extras"],
          ["Valor Líquido", "Valor final a pagar: Comissão - Descontos + Acréscimos"],
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Gerar Comprovante",
      },
      {
        tipo: "passos",
        conteudo: [
          "Após finalizar o acerto, clique em 'Gerar Comprovante PDF'",
          "O PDF inclui: dados da viagem, motorista, cálculo detalhado e assinatura",
          "Imprima e assine junto com o motorista",
          "O acerto fica registrado no histórico do motorista",
        ],
      },
    ],
  },
  {
    id: "abastecimentos",
    icon: Fuel,
    titulo: "Abastecimentos",
    descricao: "Controle de combustível e tanque interno",
    badge: "Frota",
    badgeColor: "bg-orange-500/20 text-orange-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Abastecimentos controla todo o consumo de combustível da frota, incluindo abastecimentos externos e movimentações do tanque interno da empresa.",
      },
      {
        tipo: "titulo",
        conteudo: "Registrar Abastecimento",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Operational → Fuel no menu lateral",
          "Clique em '+ Novo Abastecimento'",
          "Selecione o Veículo e o Motorista",
          "Informe: Data, Tipo de Combustível (Diesel/ARLA), Litros, Valor por Litro",
          "Selecione a Origem: Posto Externo ou Tanque Interno",
          "Informe o KM atual do veículo",
          "Adicione o número do Cupom Fiscal se disponível",
          "Clique em 'Salvar'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Tanque Interno (Estoque de Combustível)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Management → Fuel Stock no menu lateral",
          "Clique em '+ Entrada de Combustível' para registrar compra",
          "Informe: Tipo (Diesel/ARLA), Litros, Valor Total, Fornecedor, Nota Fiscal",
          "Clique em 'Salvar Entrada'",
          "O nível do tanque é atualizado automaticamente",
          "Quando um abastecimento usa o tanque interno, o estoque é debitado automaticamente",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Relatório de Consumo",
      },
      {
        tipo: "texto",
        conteudo: "O sistema calcula automaticamente o consumo médio (km/l) por veículo. Acesse Analytics → Reports e filtre por 'Combustível' para ver o relatório completo com consumo por veículo, período e motorista.",
      },
    ],
  },
  {
    id: "frota",
    icon: Wrench,
    titulo: "Frota",
    descricao: "Veículos, motoristas e manutenções",
    badge: "Frota",
    badgeColor: "bg-red-500/20 text-red-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Frota centraliza o cadastro e gestão de veículos, motoristas/ajudantes, manutenções e planos de manutenção preventiva.",
      },
      {
        tipo: "titulo",
        conteudo: "Cadastrar Veículo",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Fleet → Vehicles no menu lateral",
          "Clique em '+ Novo Veículo'",
          "Preencha os dados obrigatórios: Placa, Tipo (Caminhão/Carreta/Van), Marca, Modelo, Ano",
          "Preencha dados adicionais: Cor, RENAVAM, Chassi, Capacidade de Carga (kg)",
          "Selecione o Motorista Padrão (opcional)",
          "Adicione documentos: CRLV, Seguro, Tacógrafo (datas de vencimento)",
          "Clique em 'Salvar Veículo'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Cadastrar Motorista / Ajudante",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Fleet → Drivers no menu lateral",
          "Clique em '+ Novo Motorista'",
          "Preencha dados pessoais: Nome completo, CPF, RG, Data de Nascimento, Telefone, Email",
          "Preencha dados profissionais: Função (Motorista/Ajudante/Freelancer), Tipo de Contrato, Salário",
          "Para motoristas, preencha dados da CNH: Número, Categoria, Data de Vencimento, MOPP",
          "Adicione foto do motorista (opcional)",
          "Clique em 'Salvar'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Registrar Manutenção",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Fleet → Maintenance no menu lateral",
          "Clique em '+ Nova Manutenção'",
          "Selecione o Veículo",
          "Informe: Data, Tipo (Preventiva/Corretiva/Preditiva), Descrição do Serviço",
          "Informe: Oficina/Empresa, Valor Total, KM Atual do Veículo",
          "Informe a data da Próxima Manutenção prevista",
          "Clique em 'Salvar'",
          "O sistema alertará quando a próxima manutenção estiver próxima",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Plano de Manutenção Preventiva",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Fleet → Maintenance Plan no menu lateral",
          "Clique em '+ Novo Plano'",
          "Selecione o Veículo e o Tipo de Serviço (ex: Troca de Óleo)",
          "Defina o Intervalo em KM (ex: a cada 10.000 km)",
          "Defina o Intervalo em Dias (ex: a cada 90 dias)",
          "Clique em 'Salvar Plano'",
          "O sistema monitora automaticamente e gera alertas quando o prazo se aproxima",
        ],
      },
    ],
  },
  {
    id: "checklist",
    icon: CheckSquare,
    titulo: "Checklist",
    descricao: "Inspeção de veículos antes da saída",
    badge: "Frota",
    badgeColor: "bg-teal-500/20 text-teal-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O Checklist permite registrar a inspeção do veículo antes de cada saída, garantindo que o veículo está em condições seguras de operação.",
      },
      {
        tipo: "titulo",
        conteudo: "Criar Checklist de Saída",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Management → Checklist no menu lateral",
          "Clique em '+ Novo Checklist'",
          "Selecione o Veículo e o Motorista responsável",
          "Informe a Data/Hora da inspeção e o KM atual",
          "Preencha cada item da lista: marque OK, Com Defeito ou N/A",
          "Para itens com defeito, adicione uma observação descrevendo o problema",
          "Adicione fotos dos defeitos encontrados (opcional)",
          "Clique em 'Finalizar Checklist'",
          "Se houver itens críticos com defeito, o sistema alerta o administrador",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Itens do Checklist",
      },
      {
        tipo: "tabela",
        cabecalho: ["Categoria", "Itens Verificados"],
        linhas: [
          ["Documentação", "CRLV, CNH do motorista, Tacógrafo, Seguro"],
          ["Pneus", "Calibragem, desgaste, estepe, macaco"],
          ["Luzes", "Faróis, lanternas, setas, freio, ré"],
          ["Fluidos", "Óleo do motor, água, freio, direção"],
          ["Freios", "Freio de serviço, freio de mão, ABS"],
          ["Cabine", "Cinto de segurança, espelhos, limpadores"],
          ["Baú/Carroceria", "Travas, lonas, amarrações, estado geral"],
        ],
      },
    ],
  },
  {
    id: "financeiro",
    icon: DollarSign,
    titulo: "Financeiro",
    descricao: "Contas a pagar, receber e adiantamentos",
    badge: "Financeiro",
    badgeColor: "bg-yellow-500/20 text-yellow-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo Financeiro centraliza o controle de contas a pagar, contas a receber e adiantamentos para motoristas.",
      },
      {
        tipo: "titulo",
        conteudo: "Contas a Pagar",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Admin → Accounts Payable no menu lateral",
          "Clique em '+ Nova Conta a Pagar'",
          "Informe: Descrição, Fornecedor, Valor, Data de Vencimento, Categoria",
          "Selecione a Forma de Pagamento: Boleto, PIX, Transferência, Dinheiro",
          "Clique em 'Salvar'",
          "Para marcar como pago: localize a conta e clique em 'Registrar Pagamento'",
          "Informe a Data de Pagamento e o Valor pago",
          "Clique em 'Confirmar Pagamento'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Contas a Receber",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Admin → Accounts Receivable no menu lateral",
          "Clique em '+ Nova Conta a Receber'",
          "Informe: Descrição, Cliente, Valor, Data de Vencimento",
          "Vincule a uma Viagem ou CTE se aplicável",
          "Clique em 'Salvar'",
          "Para registrar recebimento: clique em 'Registrar Recebimento'",
          "Informe a Data e o Valor recebido",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Adiantamentos para Motoristas",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Admin → Advances no menu lateral",
          "Clique em '+ Novo Adiantamento'",
          "Selecione o Motorista e informe o Valor",
          "Informe a Data e o Motivo (ex: viagem, despesa pessoal)",
          "Selecione a Forma de Pagamento",
          "Clique em 'Salvar'",
          "O adiantamento fica registrado e será descontado automaticamente no próximo Acerto de Carga",
        ],
      },
    ],
  },
  {
    id: "gestao",
    icon: AlertTriangle,
    titulo: "Gestão",
    descricao: "Multas, acidentes, acertos e documentos",
    badge: "Gestão",
    badgeColor: "bg-amber-500/20 text-amber-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Gestão reúne funcionalidades complementares: registro de multas, acidentes, acertos de motoristas, documentação da frota e alertas.",
      },
      {
        tipo: "titulo",
        conteudo: "Registrar Multa de Trânsito",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Management → Fines no menu lateral",
          "Clique em '+ Nova Multa'",
          "Selecione o Veículo e o Motorista responsável",
          "Informe: Data da Infração, Descrição, Valor, Auto de Infração",
          "Selecione o Status: Pendente, Paga, Recorrida",
          "Clique em 'Salvar'",
          "O valor pode ser descontado no Acerto de Carga do motorista",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Registrar Acidente",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Management → Accidents no menu lateral",
          "Clique em '+ Novo Acidente'",
          "Selecione o Veículo e o Motorista",
          "Informe: Data, Local, Descrição detalhada do ocorrido",
          "Informe: Danos ao veículo, Danos a terceiros, Valor estimado",
          "Adicione fotos do acidente",
          "Informe o número do Boletim de Ocorrência (BO)",
          "Clique em 'Salvar'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Documentação da Frota",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Management → Documents no menu lateral",
          "Selecione o Veículo ou Motorista",
          "Clique em '+ Adicionar Documento'",
          "Selecione o Tipo: CRLV, CNH, Seguro, Tacógrafo, MOPP, etc.",
          "Informe a Data de Vencimento",
          "Faça upload do arquivo PDF ou imagem",
          "Clique em 'Salvar'",
          "O sistema alertará 30 dias antes do vencimento",
        ],
      },
    ],
  },
  {
    id: "integracoes",
    icon: Zap,
    titulo: "Integrações",
    descricao: "Arquivei (NF-e) e Winthor (65 rotinas)",
    badge: "Integração",
    badgeColor: "bg-lime-500/20 text-lime-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O Synapse possui integrações nativas com Arquivei (consulta e download de NF-e) e Winthor (sistema Oracle com 65 rotinas disponíveis).",
      },
      {
        tipo: "titulo",
        conteudo: "Configurar Arquivei",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Integrations → Arquivei no menu lateral",
          "Clique em 'Configurar Credenciais'",
          "Informe o App ID e a API Key fornecidos pelo Arquivei/Qive",
          "Clique em 'Salvar Credenciais'",
          "As credenciais são salvas de forma segura e criptografada",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Buscar NF-e via Arquivei",
      },
      {
        tipo: "passos",
        conteudo: [
          "Com as credenciais configuradas, vá para a aba 'Consultar NF-e'",
          "Cole a chave de acesso da NF-e (44 dígitos) no campo de busca",
          "Clique em 'Buscar NF-e'",
          "O sistema retorna: Número, Série, Valor, Emitente, Destinatário, Data de Emissão",
          "Clique em 'Baixar XML' para obter o arquivo XML da NF",
          "Clique em 'Baixar DANFE' para obter o PDF da NF",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Configurar Winthor",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Integrations → Winthor no menu lateral",
          "Clique em 'Configurar Conexão Oracle'",
          "Informe: Host, Porta, Usuário, Senha, SID do banco Oracle",
          "Clique em 'Testar Conexão'",
          "Se a conexão for bem-sucedida, clique em 'Salvar'",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Rotinas Winthor Disponíveis",
      },
      {
        tipo: "tabela",
        cabecalho: ["Módulo", "Rotinas", "Quantidade"],
        linhas: [
          ["Veículos/Motoristas", "521, 929, 965, 969, 970, 971", "6"],
          ["Carregamento", "901–996 (selecionadas)", "20"],
          ["Acerto/Motorista", "407–422 (selecionadas)", "10"],
          ["Expedição", "931–959 (selecionadas)", "6"],
          ["Rota/Frete", "911–1474 (selecionadas)", "19"],
          ["Vendas", "316, 317, 1425, 1428", "4"],
          ["Total", "—", "65"],
        ],
      },
    ],
  },
  {
    id: "relatorios",
    icon: BarChart3,
    titulo: "Relatórios",
    descricao: "Análises e KPIs gerenciais",
    badge: "Analytics",
    badgeColor: "bg-indigo-500/20 text-indigo-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Relatórios Avançados oferece KPIs gerenciais em 4 dimensões: Operacional, Financeiro, RH e Risco. Todos os dados podem ser filtrados por período.",
      },
      {
        tipo: "titulo",
        conteudo: "Acessar Relatórios Avançados",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Analytics → Relatórios Avançados no menu lateral",
          "Selecione o Período: Última Semana, Último Mês, Último Trimestre ou Último Ano",
          "Navegue pelas abas: Operacional, Financeiro, RH, Risco",
          "Cada aba exibe cards com KPIs e gráficos interativos",
          "Clique em 'Exportar' para baixar o relatório em PDF ou Excel",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "KPIs por Dimensão",
      },
      {
        tipo: "tabela",
        cabecalho: ["Dimensão", "KPIs Principais"],
        linhas: [
          ["Operacional", "Viagens realizadas, KM total, combustível gasto, taxa de atraso, desempenho por motorista"],
          ["Financeiro", "Receita total, despesas, lucro líquido, margem, contas vencidas, fluxo de caixa"],
          ["RH", "Motoristas ativos, custo RH, rotatividade, idade média, distribuição por experiência"],
          ["Risco", "Acidentes, multas, manutenções pendentes, documentos vencendo, alertas de segurança"],
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Importar / Exportar Dados",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Analytics → Importar/Exportar no menu lateral",
          "Para exportar: selecione o módulo e clique em 'Exportar Excel'",
          "Para importar: baixe o template Excel do módulo desejado",
          "Preencha o template com seus dados",
          "Clique em 'Importar' e selecione o arquivo preenchido",
          "O sistema valida os dados e exibe um resumo antes de confirmar",
          "Clique em 'Confirmar Importação'",
        ],
      },
    ],
  },
  {
    id: "administracao",
    icon: Building2,
    titulo: "Administração",
    descricao: "Empresas, usuários e permissões",
    badge: "Admin",
    badgeColor: "bg-pink-500/20 text-pink-400",
    conteudo: [
      {
        tipo: "texto",
        conteudo: "O módulo de Administração é acessível apenas para Master Admin e Admin. Permite gerenciar empresas, usuários e permissões do sistema.",
      },
      {
        tipo: "titulo",
        conteudo: "Painel Master (Apenas Master Admin)",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Admin → Master Panel no menu lateral",
          "Aba 'Usuários': visualize, aprove, rejeite e gerencie todos os usuários do sistema",
          "Aba 'Empresas': crie, edite e gerencie todas as empresas (matriz e filiais)",
          "Para criar empresa: clique em '+ Nova Empresa', preencha CNPJ, Nome, Tipo (Independente/Matriz/Filial)",
          "Para vincular filial: selecione a empresa filial e escolha a Matriz",
          "Para simular visão de admin: clique em 'Ver como Admin' ao lado da empresa",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Gerenciar Usuários",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Admin → Users no menu lateral",
          "Para convidar usuário: clique em '+ Convidar Usuário'",
          "Informe o Email e selecione o Papel (Admin/Despachante/Monitor/Usuário)",
          "Clique em 'Enviar Convite'",
          "O usuário recebe email com código de convite para criar conta",
          "Para alterar papel: clique no usuário e selecione o novo papel",
          "Para desativar: clique em 'Desativar' ao lado do usuário",
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Papéis e Permissões",
      },
      {
        tipo: "tabela",
        cabecalho: ["Papel", "Criar", "Editar", "Excluir", "Relatórios", "Admin"],
        linhas: [
          ["Master Admin", "✅", "✅", "✅", "✅", "✅"],
          ["Admin", "✅", "✅", "✅", "✅", "✅ (empresa)"],
          ["Despachante", "✅ (operacional)", "✅ (operacional)", "❌", "✅ (básico)", "❌"],
          ["Monitor", "❌", "❌", "❌", "✅", "❌"],
          ["Usuário", "Configurável", "Configurável", "❌", "Configurável", "❌"],
        ],
      },
      {
        tipo: "titulo",
        conteudo: "Configurações da Empresa",
      },
      {
        tipo: "passos",
        conteudo: [
          "Acesse Admin → Settings no menu lateral",
          "Configure: Nome da empresa, CNPJ, Endereço, Telefone, Logo",
          "Configure Integrações: Arquivei, Winthor",
          "Configure Notificações: quais alertas receber e por qual canal",
          "Clique em 'Salvar Configurações'",
        ],
      },
    ],
  },
  {
    id: "faq",
    icon: HelpCircle,
    titulo: "FAQ",
    descricao: "Perguntas frequentes",
    badge: "Suporte",
    badgeColor: "bg-cyan-500/20 text-cyan-400",
    conteudo: [
      {
        tipo: "titulo",
        conteudo: "Perguntas Frequentes",
      },
      {
        tipo: "tabela",
        cabecalho: ["Pergunta", "Resposta"],
        linhas: [
          ["Como recuperar uma viagem deletada?", "Viagens deletadas ficam em soft-delete por 30 dias. Contate o suporte para recuperação."],
          ["Posso usar o Synapse offline?", "Não. O Synapse é um sistema web que requer conexão com a internet."],
          ["Como exportar todos os dados?", "Vá para Analytics → Importar/Exportar e clique em 'Exportar' em cada módulo."],
          ["Qual é o limite de usuários?", "Não há limite. Você pode criar quantos usuários precisar."],
          ["Como mudar a empresa de um usuário?", "Vá para Admin → Master Panel → Usuários, clique no usuário e selecione a nova empresa."],
          ["O sistema faz backup automático?", "Sim. O banco de dados PostgreSQL é salvo automaticamente pelo Railway a cada 24h."],
          ["Como gerar o romaneio em PDF?", "Abra o Carregamento desejado e clique em 'Gerar Romaneio PDF'."],
          ["Como configurar o Arquivei?", "Vá para Integrations → Arquivei e informe o App ID e API Key fornecidos pelo Arquivei."],
          ["Posso ter múltiplas empresas?", "Sim. O sistema suporta matriz e filiais com dados completamente isolados."],
          ["Como alterar minha senha?", "Clique no seu avatar no canto inferior esquerdo e selecione 'Alterar Senha'."],
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Ajuda() {
  const [busca, setBusca] = useState("");
  const [secaoAtiva, setSecaoAtiva] = useState("introducao");
  const [copiado, setCopiado] = useState(false);

  const secoesFiltradas = SECOES.filter(
    (s) =>
      s.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      s.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  const secaoAtual = SECOES.find((s) => s.id === secaoAtiva);

  const handleCopiarEmail = () => {
    navigator.clipboard.writeText("suporte@synapse.com.br");
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const renderConteudo = (item: any, idx: number) => {
    if (item.tipo === "texto") {
      const parts = item.conteudo.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={idx} className="text-sm text-muted-foreground leading-relaxed mb-3">
          {parts.map((part: string, i: number) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={i} className="text-foreground font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    }

    if (item.tipo === "titulo") {
      return (
        <h3 key={idx} className="font-bold text-base mt-6 mb-3 text-foreground border-b border-border pb-1">
          {item.conteudo}
        </h3>
      );
    }

    if (item.tipo === "passos") {
      return (
        <ol key={idx} className="space-y-2 mb-4">
          {item.conteudo.map((passo: string, i: number) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span className="text-muted-foreground leading-relaxed">{passo}</span>
            </li>
          ))}
        </ol>
      );
    }

    if (item.tipo === "tabela") {
      return (
        <div key={idx} className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {item.cabecalho.map((col: string, i: number) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-foreground text-xs">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.linhas.map((linha: string[], i: number) => (
                <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                  {linha.map((cel: string, j: number) => (
                    <td key={j} className="px-3 py-2 text-muted-foreground text-xs leading-relaxed">
                      {cel}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ajuda e Documentação</h1>
          <p className="text-muted-foreground text-sm">Manual completo do sistema Synapse</p>
        </div>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar módulo ou funcionalidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Módulos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pb-4">
              {secoesFiltradas.map((secao) => {
                const Icon = secao.icon;
                return (
                  <button
                    key={secao.id}
                    onClick={() => setSecaoAtiva(secao.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 ${
                      secaoAtiva === secao.id
                        ? "bg-blue-500/15 text-blue-500 font-medium"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground text-sm"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-sm">{secao.titulo}</span>
                    {secaoAtiva === secao.id && <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo */}
        <div className="lg:col-span-3 space-y-4">
          {secaoAtual && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <secaoAtual.icon className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{secaoAtual.titulo}</CardTitle>
                      <CardDescription>{secaoAtual.descricao}</CardDescription>
                    </div>
                  </div>
                  <Badge className={`text-xs px-2 py-1 ${secaoAtual.badgeColor} border-0 flex-shrink-0`}>
                    {secaoAtual.badge}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {secaoAtual.conteudo.map((item, idx) => renderConteudo(item, idx))}
              </CardContent>
            </Card>
          )}

          {/* Navegação entre seções */}
          <div className="flex items-center justify-between gap-4">
            {(() => {
              const idx = SECOES.findIndex((s) => s.id === secaoAtiva);
              const prev = SECOES[idx - 1];
              const next = SECOES[idx + 1];
              return (
                <>
                  {prev ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSecaoAtiva(prev.id)}
                      className="flex items-center gap-2"
                    >
                      ← {prev.titulo}
                    </Button>
                  ) : <div />}
                  {next ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSecaoAtiva(next.id)}
                      className="flex items-center gap-2"
                    >
                      {next.titulo} →
                    </Button>
                  ) : <div />}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Suporte */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Ainda tem dúvidas?
          </CardTitle>
          <CardDescription>Entre em contato com o suporte técnico</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Email de Suporte</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 font-mono">
                suporte@synapse.com.br
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopiarEmail}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                {copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Chat Interno</p>
            <p className="text-xs text-muted-foreground">
              Use o chat interno do sistema (ícone de mensagem no menu lateral) para comunicação rápida com sua equipe.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Versão do Sistema</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">v2.0.0</Badge>
              <span className="text-xs text-muted-foreground">Synapse</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
