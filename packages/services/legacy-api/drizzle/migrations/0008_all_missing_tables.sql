-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION 0008 — Todas as tabelas e enums faltantes (52 tabelas, 27 enums)
-- Idempotente: usa IF NOT EXISTS em tudo
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "categoria_ticket_ti" AS ENUM ('hardware','software','rede','acesso','email','impressora','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ciclo_cobranca" AS ENUM ('mensal','trimestral','semestral','anual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "forma_pagamento_saas" AS ENUM ('cartao_credito','boleto','pix','transferencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ia_agente_setor" AS ENUM ('master','financeiro','frota','motorista','manutencao','juridico','recepcao','wms','rh','ti','comercial','marketing');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "plano_cod" AS ENUM ('starter','professional','enterprise','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "prioridade_sac" AS ENUM ('baixa','media','alta','urgente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "prioridade_ticket_ti" AS ENUM ('baixa','media','alta','critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_acerto_carga" AS ENUM ('pendente','em_analise','aprovado','rejeitado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_carregamento" AS ENUM ('planejado','em_carregamento','carregado','em_transito','entregue','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_cobranca" AS ENUM ('pendente','pago','atrasado','cancelado','estornado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_conferencia" AS ENUM ('saida_registrada','em_viagem','retorno_registrado','em_conferencia','aguardando_motorista','confirmado_motorista','finalizado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_integracao" AS ENUM ('ativa','inativa','erro','configurando');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_item_recebimento" AS ENUM ('pendente','conferido','divergente','recusado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_lead" AS ENUM ('novo','contatado','qualificado','proposta','negociacao','ganho','perdido','inativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_licenca" AS ENUM ('ativa','suspensa','cancelada','trial','expirada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_licenca_log" AS ENUM ('ativada','suspensa','cancelada','reativada','atualizada','expirada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_pedido" AS ENUM ('rascunho','enviado','aprovado','em_separacao','expedido','entregue','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_proposta" AS ENUM ('rascunho','enviada','em_analise','aprovada','rejeitada','expirada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_recebimento" AS ENUM ('agendado','em_andamento','concluido','divergente','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_sac" AS ENUM ('aberto','em_andamento','aguardando_cliente','resolvido','fechado','reaberto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_ticket_ti" AS ENUM ('aberto','em_andamento','aguardando','resolvido','fechado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "status_visitante" AS ENUM ('aguardando','em_visita','finalizado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tipo_empresa" AS ENUM ('matriz','filial','grupo','franquia','parceiro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tipo_evento_auditoria" AS ENUM ('login','logout','create','update','delete','restore','export','import','permission_change','config_change','access_denied','password_change','role_change');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tipo_movimentacao_estoque" AS ENUM ('entrada','saida','transferencia','ajuste','inventario','devolucao','perda');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tipo_ponto" AS ENUM ('entrada','saida','inicio_intervalo','fim_intervalo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "tipo_recebimento" AS ENUM ('compra','devolucao','transferencia','bonificacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TABELAS ───────────────────────────────────────────────────────────────────

-- GRUPOS EMPRESARIAIS
CREATE TABLE IF NOT EXISTS "grupos_empresariais" (
  "id" SERIAL PRIMARY KEY,
  "nome" VARCHAR(255) NOT NULL,
  "cnpj" VARCHAR(18),
  "descricao" TEXT,
  "adminUserId" INTEGER,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "grupo_empresas" (
  "id" SERIAL PRIMARY KEY,
  "grupoId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "papel" VARCHAR(20) NOT NULL DEFAULT 'filial',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PLANOS SaaS
CREATE TABLE IF NOT EXISTS "planos" (
  "id" SERIAL PRIMARY KEY,
  "codigo" "plano_cod" NOT NULL DEFAULT 'starter',
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "preco" VARCHAR(20) NOT NULL DEFAULT '0',
  "ciclo" "ciclo_cobranca" NOT NULL DEFAULT 'mensal',
  "limiteUsuarios" INTEGER DEFAULT 5,
  "limiteEmpresas" INTEGER DEFAULT 1,
  "modulosIncluidos" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "licencas" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "planoId" INTEGER,
  "status" "status_licenca" NOT NULL DEFAULT 'trial',
  "dataInicio" TIMESTAMP NOT NULL DEFAULT NOW(),
  "dataFim" TIMESTAMP,
  "trialAte" TIMESTAMP,
  "usuariosAtivos" INTEGER DEFAULT 0,
  "limiteUsuarios" INTEGER DEFAULT 5,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "cobrancas" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "licencaId" INTEGER,
  "valor" VARCHAR(20) NOT NULL,
  "status" "status_cobranca" NOT NULL DEFAULT 'pendente',
  "formaPagamento" "forma_pagamento_saas",
  "vencimento" TIMESTAMP,
  "pago" BOOLEAN NOT NULL DEFAULT FALSE,
  "dataPagamento" TIMESTAMP,
  "referencia" VARCHAR(100),
  "linkPagamento" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "licencas_regulatorias" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "tipo" VARCHAR(100) NOT NULL,
  "numero" VARCHAR(100),
  "orgaoEmissor" VARCHAR(100),
  "dataEmissao" TIMESTAMP,
  "dataVencimento" TIMESTAMP,
  "status" "status_licenca" NOT NULL DEFAULT 'ativa',
  "arquivo" TEXT,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- SESSÕES DE SEGURANÇA
CREATE TABLE IF NOT EXISTS "sessoes" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "token" VARCHAR(500) NOT NULL,
  "ip" VARCHAR(45),
  "userAgent" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastActivityAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PERMISSÕES GRANULARES
CREATE TABLE IF NOT EXISTS "modulo_permissoes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "role" VARCHAR(50) NOT NULL,
  "modulo" VARCHAR(100) NOT NULL,
  "podeVer" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeCriar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeEditar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeDeletar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeExportar" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "user_permissoes" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "modulo" VARCHAR(100) NOT NULL,
  "podeVer" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeCriar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeEditar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeDeletar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeExportar" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AUDITORIA DETALHADA
CREATE TABLE IF NOT EXISTS "auditoria_detalhada" (
  "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "empresaId" INTEGER,
  "userId" INTEGER NOT NULL,
  "userName" VARCHAR(255),
  "userRole" VARCHAR(50),
  "tipoEvento" "tipo_evento_auditoria" NOT NULL,
  "modulo" VARCHAR(100),
  "tabela" VARCHAR(100),
  "registroId" INTEGER,
  "descricao" TEXT NOT NULL,
  "dadosAntes" TEXT,
  "dadosDepois" TEXT,
  "ip" VARCHAR(45),
  "userAgent" TEXT,
  "sessionId" VARCHAR(100),
  "risco" VARCHAR(20) DEFAULT 'baixo',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CRM — CLIENTES
CREATE TABLE IF NOT EXISTS "clientes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "tipo" VARCHAR(20) NOT NULL DEFAULT 'pj',
  "nome" VARCHAR(255) NOT NULL,
  "razaoSocial" VARCHAR(255),
  "cpfCnpj" VARCHAR(20),
  "email" VARCHAR(255),
  "telefone" VARCHAR(20),
  "celular" VARCHAR(20),
  "cep" VARCHAR(10),
  "logradouro" VARCHAR(255),
  "numero" VARCHAR(20),
  "complemento" VARCHAR(100),
  "bairro" VARCHAR(100),
  "cidade" VARCHAR(100),
  "estado" VARCHAR(2),
  "segmento" VARCHAR(100),
  "origem" VARCHAR(100),
  "responsavelId" INTEGER,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "observacoes" TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

-- CRM — LEADS
CREATE TABLE IF NOT EXISTS "leads" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255),
  "telefone" VARCHAR(20),
  "empresa" VARCHAR(255),
  "cargo" VARCHAR(100),
  "status" "status_lead" NOT NULL DEFAULT 'novo',
  "origem" VARCHAR(100),
  "valorEstimado" VARCHAR(20),
  "responsavelId" INTEGER,
  "observacoes" TEXT,
  "ultimoContato" TIMESTAMP,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

-- CRM — CONTATOS
CREATE TABLE IF NOT EXISTS "contatos_crm" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "clienteId" INTEGER,
  "leadId" INTEGER,
  "tipo" VARCHAR(50) NOT NULL,
  "descricao" TEXT NOT NULL,
  "resultado" TEXT,
  "userId" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- VENDAS — FUNIL
CREATE TABLE IF NOT EXISTS "funis" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "etapas_funil" (
  "id" SERIAL PRIMARY KEY,
  "funilId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "cor" VARCHAR(20) DEFAULT '#3b82f6',
  "posicao" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "negociacoes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "funilId" INTEGER NOT NULL,
  "etapaId" INTEGER NOT NULL,
  "clienteId" INTEGER,
  "leadId" INTEGER,
  "titulo" VARCHAR(255) NOT NULL,
  "valor" VARCHAR(20) DEFAULT '0',
  "responsavelId" INTEGER,
  "probabilidade" INTEGER DEFAULT 50,
  "previsaoFechamento" TIMESTAMP,
  "motivoPerda" TEXT,
  "ganho" BOOLEAN,
  "observacoes" TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "atividades_funil" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "negociacaoId" INTEGER NOT NULL,
  "tipo" VARCHAR(50) NOT NULL,
  "titulo" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "dataAgendada" TIMESTAMP,
  "concluida" BOOLEAN NOT NULL DEFAULT FALSE,
  "userId" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- VENDAS — PEDIDOS E PROPOSTAS
CREATE TABLE IF NOT EXISTS "pedidos" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "clienteId" INTEGER,
  "numero" VARCHAR(30) NOT NULL,
  "status" "status_pedido" NOT NULL DEFAULT 'rascunho',
  "clienteNome" VARCHAR(255) NOT NULL,
  "valorTotal" VARCHAR(20) DEFAULT '0',
  "desconto" VARCHAR(20) DEFAULT '0',
  "frete" VARCHAR(20) DEFAULT '0',
  "formaPagamento" VARCHAR(100),
  "condicaoPagamento" VARCHAR(100),
  "previsaoEntrega" TIMESTAMP,
  "observacoes" TEXT,
  "vendedorId" INTEGER,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "itens_pedido" (
  "id" SERIAL PRIMARY KEY,
  "pedidoId" INTEGER NOT NULL,
  "produtoId" INTEGER,
  "descricao" VARCHAR(255) NOT NULL,
  "quantidade" VARCHAR(20) NOT NULL,
  "valorUnitario" VARCHAR(20) NOT NULL,
  "valorTotal" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "propostas" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "clienteId" INTEGER,
  "leadId" INTEGER,
  "numero" VARCHAR(30) NOT NULL,
  "titulo" VARCHAR(255) NOT NULL,
  "status" "status_proposta" NOT NULL DEFAULT 'rascunho',
  "valorTotal" VARCHAR(20) DEFAULT '0',
  "validade" TIMESTAMP,
  "descricao" TEXT,
  "condicoes" TEXT,
  "vendedorId" INTEGER,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "comissoes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "vendedorId" INTEGER NOT NULL,
  "pedidoId" INTEGER,
  "percentual" VARCHAR(10) NOT NULL,
  "valorBase" VARCHAR(20) NOT NULL,
  "valorComissao" VARCHAR(20) NOT NULL,
  "pago" BOOLEAN NOT NULL DEFAULT FALSE,
  "dataPagamento" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- WMS — ARMAZÉM
CREATE TABLE IF NOT EXISTS "armazens" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "codigo" VARCHAR(50),
  "endereco" TEXT,
  "responsavelId" INTEGER,
  "capacidadeTotal" INTEGER,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "docas" (
  "id" SERIAL PRIMARY KEY,
  "armazemId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(100) NOT NULL,
  "tipo" VARCHAR(50) DEFAULT 'recebimento',
  "status" VARCHAR(50) DEFAULT 'livre',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "produtos" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "codigo" VARCHAR(100) NOT NULL,
  "codigoBarras" VARCHAR(100),
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "categoria" VARCHAR(100),
  "unidade" VARCHAR(20) DEFAULT 'UN',
  "pesoKg" VARCHAR(20),
  "volumeM3" VARCHAR(20),
  "valorCusto" VARCHAR(20),
  "valorVenda" VARCHAR(20),
  "estoqueMinimo" INTEGER DEFAULT 0,
  "estoqueMaximo" INTEGER,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "estoque" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "armazemId" INTEGER NOT NULL,
  "produtoId" INTEGER NOT NULL,
  "quantidade" INTEGER NOT NULL DEFAULT 0,
  "quantidadeReservada" INTEGER NOT NULL DEFAULT 0,
  "localizacao" VARCHAR(100),
  "lote" VARCHAR(100),
  "dataValidade" TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "movimentacoes_estoque" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "armazemId" INTEGER NOT NULL,
  "produtoId" INTEGER NOT NULL,
  "tipo" "tipo_movimentacao_estoque" NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "quantidadeAntes" INTEGER NOT NULL DEFAULT 0,
  "quantidadeDepois" INTEGER NOT NULL DEFAULT 0,
  "motivo" TEXT,
  "documentoRef" VARCHAR(100),
  "userId" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "localizacoes" (
  "id" SERIAL PRIMARY KEY,
  "armazemId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "rua" VARCHAR(20),
  "bloco" VARCHAR(20),
  "nivel" VARCHAR(20),
  "posicao" VARCHAR(20),
  "codigo" VARCHAR(50) NOT NULL,
  "tipo" VARCHAR(50) DEFAULT 'padrao',
  "capacidade" INTEGER,
  "ocupado" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "recebimentos" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "armazemId" INTEGER NOT NULL,
  "docaId" INTEGER,
  "tipo" "tipo_recebimento" NOT NULL DEFAULT 'compra',
  "status" "status_recebimento" NOT NULL DEFAULT 'agendado',
  "fornecedor" VARCHAR(255),
  "notaFiscal" VARCHAR(100),
  "dataAgendada" TIMESTAMP,
  "dataInicio" TIMESTAMP,
  "dataConclusao" TIMESTAMP,
  "responsavelId" INTEGER,
  "observacoes" TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "itens_recebimento" (
  "id" SERIAL PRIMARY KEY,
  "recebimentoId" INTEGER NOT NULL,
  "produtoId" INTEGER,
  "descricao" VARCHAR(255) NOT NULL,
  "quantidadeEsperada" INTEGER NOT NULL,
  "quantidadeRecebida" INTEGER DEFAULT 0,
  "status" "status_item_recebimento" NOT NULL DEFAULT 'pendente',
  "observacoes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "carregamentos" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "armazemId" INTEGER NOT NULL,
  "docaId" INTEGER,
  "status" "status_carregamento" NOT NULL DEFAULT 'planejado',
  "veiculoId" INTEGER,
  "motoristaId" INTEGER,
  "dataAgendada" TIMESTAMP,
  "dataInicio" TIMESTAMP,
  "dataConclusao" TIMESTAMP,
  "responsavelId" INTEGER,
  "observacoes" TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "itens_carregamento" (
  "id" SERIAL PRIMARY KEY,
  "carregamentoId" INTEGER NOT NULL,
  "produtoId" INTEGER,
  "descricao" VARCHAR(255) NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "quantidadeCarregada" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "acertos_carga" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "carregamentoId" INTEGER,
  "motoristaId" INTEGER,
  "status" "status_acerto_carga" NOT NULL DEFAULT 'pendente',
  "valorAdiantado" VARCHAR(20),
  "valorDespesas" VARCHAR(20),
  "comprovantes" TEXT,
  "observacoes" TEXT,
  "aprovadoPor" INTEGER,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- TI — TICKETS E ATIVOS
CREATE TABLE IF NOT EXISTS "tickets_ti" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "protocolo" VARCHAR(20) NOT NULL,
  "solicitanteId" INTEGER NOT NULL,
  "titulo" VARCHAR(255) NOT NULL,
  "descricao" TEXT NOT NULL,
  "categoria" "categoria_ticket_ti" NOT NULL DEFAULT 'outro',
  "prioridade" "prioridade_ticket_ti" NOT NULL DEFAULT 'media',
  "status" "status_ticket_ti" NOT NULL DEFAULT 'aberto',
  "responsavelId" INTEGER,
  "resolucao" TEXT,
  "resolvidoEm" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ativos_ti" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "tipo" VARCHAR(100) NOT NULL,
  "marca" VARCHAR(100),
  "modelo" VARCHAR(100),
  "patrimonio" VARCHAR(50),
  "serial" VARCHAR(100),
  "responsavelId" INTEGER,
  "setor" VARCHAR(100),
  "status" VARCHAR(50) NOT NULL DEFAULT 'ativo',
  "dataAquisicao" TIMESTAMP,
  "garantiaAte" TIMESTAMP,
  "observacoes" TEXT,
  "anydesk" VARCHAR(50),
  "sistemaOperacional" VARCHAR(100),
  "processador" VARCHAR(100),
  "memoriaRam" VARCHAR(50),
  "armazenamento" VARCHAR(100),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

-- BI — DASHBOARDS E WIDGETS
CREATE TABLE IF NOT EXISTS "bi_dashboards" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "tipo" VARCHAR(50) NOT NULL DEFAULT 'custom',
  "config" TEXT,
  "publico" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "bi_widgets" (
  "id" SERIAL PRIMARY KEY,
  "dashboardId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "titulo" VARCHAR(255) NOT NULL,
  "tipo" VARCHAR(50) NOT NULL,
  "fonte" VARCHAR(100) NOT NULL,
  "metrica" VARCHAR(100) NOT NULL,
  "filtros" TEXT,
  "posicao" INTEGER DEFAULT 0,
  "largura" INTEGER DEFAULT 6,
  "altura" INTEGER DEFAULT 4,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- IA — AGENTES, SESSÕES, MENSAGENS, CONHECIMENTO
CREATE TABLE IF NOT EXISTS "ia_agentes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "setor" "ia_agente_setor" NOT NULL DEFAULT 'master',
  "nome" VARCHAR(255) NOT NULL,
  "avatar" VARCHAR(10) DEFAULT '🤖',
  "descricao" TEXT,
  "systemPrompt" TEXT NOT NULL,
  "instrucoes" TEXT,
  "contextoEmpresa" TEXT,
  "modelo" VARCHAR(100) DEFAULT 'gpt-4o-mini',
  "provedor" VARCHAR(50) DEFAULT 'openai',
  "temperatura" VARCHAR(10) DEFAULT '0.7',
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "usarIaExterna" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ia_sessoes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "agenteId" INTEGER,
  "titulo" VARCHAR(255),
  "ativa" BOOLEAN NOT NULL DEFAULT TRUE,
  "totalMensagens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ia_mensagens" (
  "id" SERIAL PRIMARY KEY,
  "sessaoId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "role" VARCHAR(20) NOT NULL DEFAULT 'user',
  "content" TEXT NOT NULL,
  "tokens" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ia_conhecimento" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "titulo" VARCHAR(255) NOT NULL,
  "conteudo" TEXT NOT NULL,
  "categoria" VARCHAR(100),
  "tags" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- INTEGRAÇÕES
CREATE TABLE IF NOT EXISTS "integracoes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "tipo" VARCHAR(50) NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "status" "status_integracao" NOT NULL DEFAULT 'configurando',
  "config" TEXT,
  "webhookUrl" TEXT,
  "webhookSecret" VARCHAR(255),
  "ultimaSincronizacao" TIMESTAMP,
  "erroUltimo" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "log_integracoes" (
  "id" BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "integracaoId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "direcao" VARCHAR(10) NOT NULL,
  "endpoint" VARCHAR(500),
  "payload" TEXT,
  "resposta" TEXT,
  "statusCode" INTEGER,
  "sucesso" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "winthor_sync" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "integracaoId" INTEGER NOT NULL,
  "tabelaOrigem" VARCHAR(100) NOT NULL,
  "tabelaDestino" VARCHAR(100) NOT NULL,
  "ultimoId" INTEGER DEFAULT 0,
  "ultimaSincronizacao" TIMESTAMP,
  "registrosSincronizados" INTEGER DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RECEPÇÃO — VISITANTES E SAC
CREATE TABLE IF NOT EXISTS "visitantes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "documento" VARCHAR(50),
  "empresa" VARCHAR(255),
  "motivo" TEXT,
  "setorDestino" VARCHAR(100),
  "responsavelId" INTEGER,
  "status" "status_visitante" NOT NULL DEFAULT 'aguardando',
  "foto" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "visitas" (
  "id" SERIAL PRIMARY KEY,
  "visitanteId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "entrada" TIMESTAMP NOT NULL DEFAULT NOW(),
  "saida" TIMESTAMP,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "chamados_sac" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "protocolo" VARCHAR(20) NOT NULL,
  "clienteId" INTEGER,
  "clienteNome" VARCHAR(255),
  "canal" VARCHAR(50) DEFAULT 'telefone',
  "assunto" VARCHAR(255) NOT NULL,
  "descricao" TEXT NOT NULL,
  "status" "status_sac" NOT NULL DEFAULT 'aberto',
  "prioridade" "prioridade_sac" NOT NULL DEFAULT 'media',
  "responsavelId" INTEGER,
  "resolucao" TEXT,
  "resolvidoEm" TIMESTAMP,
  "nps" INTEGER,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "interacoes_sac" (
  "id" SERIAL PRIMARY KEY,
  "chamadoId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "mensagem" TEXT NOT NULL,
  "interno" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PONTO ELETRÔNICO
CREATE TABLE IF NOT EXISTS "registros_ponto" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "funcionarioId" INTEGER NOT NULL,
  "tipo" "tipo_ponto" NOT NULL,
  "dataHora" TIMESTAMP NOT NULL DEFAULT NOW(),
  "latitude" VARCHAR(20),
  "longitude" VARCHAR(20),
  "ip" VARCHAR(45),
  "foto" TEXT,
  "observacao" TEXT,
  "ajustadoPor" INTEGER,
  "motivoAjuste" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "banco_horas" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "funcionarioId" INTEGER NOT NULL,
  "data" DATE NOT NULL,
  "horasTrabalhadas" VARCHAR(10),
  "horasExtras" VARCHAR(10),
  "horasDevidas" VARCHAR(10),
  "saldo" VARCHAR(10),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CONFERÊNCIA DE VEÍCULOS
CREATE TABLE IF NOT EXISTS "conferencia_veiculos" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "veiculoId" INTEGER NOT NULL,
  "motoristaId" INTEGER,
  "viagemId" INTEGER,
  "status" "status_conferencia" NOT NULL DEFAULT 'saida_registrada',
  "despachanteSaidaId" INTEGER,
  "dataSaida" TIMESTAMP,
  "kmSaida" VARCHAR(20),
  "observacoesSaida" TEXT,
  "despachanteRetornoId" INTEGER,
  "dataRetorno" TIMESTAMP,
  "kmRetorno" VARCHAR(20),
  "observacoesRetorno" TEXT,
  "conferenteId" INTEGER,
  "dataConferencia" TIMESTAMP,
  "cargaOk" BOOLEAN,
  "cargaObservacoes" TEXT,
  "avariasEncontradas" BOOLEAN DEFAULT FALSE,
  "avariasDescricao" TEXT,
  "batidasEncontradas" BOOLEAN DEFAULT FALSE,
  "batidasDescricao" TEXT,
  "pneusOk" BOOLEAN,
  "pneusObservacoes" TEXT,
  "limpezaOk" BOOLEAN,
  "documentosOk" BOOLEAN,
  "nivelCombustivel" VARCHAR(20),
  "observacoesConferencia" TEXT,
  "motoristaConfirmou" BOOLEAN DEFAULT FALSE,
  "motoristaConfirmouEm" TIMESTAMP,
  "motoristaContestacao" TEXT,
  "assinaturaMotorista" TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "fotos_conferencia" (
  "id" SERIAL PRIMARY KEY,
  "conferenciaId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "tipo" VARCHAR(50) NOT NULL,
  "descricao" VARCHAR(255),
  "url" TEXT NOT NULL,
  "momento" VARCHAR(20) NOT NULL,
  "uploadedBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "itens_conferencia" (
  "id" SERIAL PRIMARY KEY,
  "conferenciaId" INTEGER NOT NULL,
  "item" VARCHAR(255) NOT NULL,
  "conforme" BOOLEAN,
  "observacao" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON "clientes"("empresaId");
CREATE INDEX IF NOT EXISTS idx_leads_empresa ON "leads"("empresaId");
CREATE INDEX IF NOT EXISTS idx_leads_status ON "leads"("status");
CREATE INDEX IF NOT EXISTS idx_negociacoes_empresa ON "negociacoes"("empresaId");
CREATE INDEX IF NOT EXISTS idx_negociacoes_funil ON "negociacoes"("funilId");
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON "pedidos"("empresaId");
CREATE INDEX IF NOT EXISTS idx_estoque_empresa ON "estoque"("empresaId");
CREATE INDEX IF NOT EXISTS idx_estoque_produto ON "estoque"("produtoId");
CREATE INDEX IF NOT EXISTS idx_tickets_ti_empresa ON "tickets_ti"("empresaId");
CREATE INDEX IF NOT EXISTS idx_tickets_ti_status ON "tickets_ti"("status");
CREATE INDEX IF NOT EXISTS idx_ativos_ti_empresa ON "ativos_ti"("empresaId");
CREATE INDEX IF NOT EXISTS idx_ia_sessoes_empresa ON "ia_sessoes"("empresaId");
CREATE INDEX IF NOT EXISTS idx_ia_mensagens_sessao ON "ia_mensagens"("sessaoId");
CREATE INDEX IF NOT EXISTS idx_auditoria_empresa ON "auditoria_detalhada"("empresaId");
CREATE INDEX IF NOT EXISTS idx_auditoria_user ON "auditoria_detalhada"("userId");
CREATE INDEX IF NOT EXISTS idx_registros_ponto_empresa ON "registros_ponto"("empresaId");
CREATE INDEX IF NOT EXISTS idx_registros_ponto_funcionario ON "registros_ponto"("funcionarioId");
CREATE INDEX IF NOT EXISTS idx_integracoes_empresa ON "integracoes"("empresaId");
CREATE INDEX IF NOT EXISTS idx_chamados_sac_empresa ON "chamados_sac"("empresaId");
CREATE INDEX IF NOT EXISTS idx_visitantes_empresa ON "visitantes"("empresaId");
CREATE INDEX IF NOT EXISTS idx_conferencia_empresa ON "conferencia_veiculos"("empresaId");
CREATE INDEX IF NOT EXISTS idx_bi_dashboards_empresa ON "bi_dashboards"("empresaId");
