CREATE TYPE "public"."categoria_ticket_ti" AS ENUM('hardware', 'software', 'rede', 'acesso', 'email', 'impressora', 'outro');--> statement-breakpoint
CREATE TYPE "public"."ciclo_cobranca" AS ENUM('mensal', 'trimestral', 'semestral', 'anual');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento_saas" AS ENUM('pix', 'boleto', 'cartao_credito', 'transferencia', 'cortesia');--> statement-breakpoint
CREATE TYPE "public"."ia_agente_setor" AS ENUM('master', 'financeiro', 'frota', 'motorista', 'manutencao', 'juridico', 'operacional', 'rh', 'recepcao', 'wms', 'custom');--> statement-breakpoint
CREATE TYPE "public"."plano_cod" AS ENUM('trial', 'basico', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."prioridade_sac" AS ENUM('baixa', 'media', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."prioridade_ticket_ti" AS ENUM('baixa', 'media', 'alta', 'critica');--> statement-breakpoint
CREATE TYPE "public"."status_acerto_carga" AS ENUM('aberto', 'em_analise', 'fechado', 'pago');--> statement-breakpoint
CREATE TYPE "public"."status_carregamento" AS ENUM('montando', 'pronto', 'em_rota', 'retornado', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."status_cobranca" AS ENUM('pendente', 'pago', 'vencido', 'cancelado', 'estornado');--> statement-breakpoint
CREATE TYPE "public"."status_conferencia" AS ENUM('saida_registrada', 'em_viagem', 'retorno_registrado', 'em_conferencia', 'aguardando_motorista', 'confirmado_motorista', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."status_integracao" AS ENUM('ativa', 'inativa', 'erro', 'configurando');--> statement-breakpoint
CREATE TYPE "public"."status_item_recebimento" AS ENUM('pendente', 'conferido', 'divergencia_quantidade', 'divergencia_qualidade', 'recusado');--> statement-breakpoint
CREATE TYPE "public"."status_lead" AS ENUM('novo', 'qualificado', 'em_negociacao', 'proposta_enviada', 'ganho', 'perdido');--> statement-breakpoint
CREATE TYPE "public"."status_licenca" AS ENUM('trial', 'ativa', 'suspensa', 'vencida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."status_licenca_log" AS ENUM('pendente', 'em_analise', 'aprovada', 'vencida', 'rejeitada');--> statement-breakpoint
CREATE TYPE "public"."status_nf" AS ENUM('pendente', 'entregue', 'devolvida', 'parcial', 'extraviada');--> statement-breakpoint
CREATE TYPE "public"."status_pedido" AS ENUM('rascunho', 'enviado', 'aprovado', 'em_separacao', 'expedido', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_pneu" AS ENUM('novo', 'em_uso', 'recapado', 'sucata', 'estoque');--> statement-breakpoint
CREATE TYPE "public"."status_proposta" AS ENUM('rascunho', 'enviada', 'em_analise', 'aprovada', 'rejeitada', 'expirada');--> statement-breakpoint
CREATE TYPE "public"."status_recebimento" AS ENUM('aguardando', 'em_conferencia', 'conferido', 'divergencia', 'recusado', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."status_sac" AS ENUM('aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado');--> statement-breakpoint
CREATE TYPE "public"."status_ticket_ti" AS ENUM('aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado');--> statement-breakpoint
CREATE TYPE "public"."status_visitante" AS ENUM('agendado', 'aguardando', 'em_atendimento', 'finalizado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('cnh', 'crlv', 'aso', 'mopp', 'nota_fiscais', 'seguro', 'licenciamento', 'contrato', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_empresa" AS ENUM('independente', 'matriz', 'filial', 'grupo');--> statement-breakpoint
CREATE TYPE "public"."tipo_evento_auditoria" AS ENUM('login', 'logout', 'create', 'update', 'delete', 'restore', 'export', 'import', 'permission_change', 'config_change', 'access_denied', 'password_change', 'role_change');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimentacao_estoque" AS ENUM('entrada', 'saida', 'transferencia', 'ajuste', 'inventario', 'devolucao');--> statement-breakpoint
CREATE TYPE "public"."tipo_ponto" AS ENUM('entrada', 'saida', 'inicio_intervalo', 'fim_intervalo');--> statement-breakpoint
CREATE TYPE "public"."tipo_recebimento" AS ENUM('nf_entrada', 'devolucao', 'transferencia', 'bonificacao', 'outro');--> statement-breakpoint
CREATE TABLE "acertos_carga" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"viagemId" integer NOT NULL,
	"motoristaId" integer,
	"dataAcerto" date,
	"status" "status_acerto_carga" DEFAULT 'aberto' NOT NULL,
	"adiantamentoConcedido" numeric(10, 2) DEFAULT '0',
	"freteRecebido" numeric(10, 2) DEFAULT '0',
	"despesasPedagio" numeric(10, 2) DEFAULT '0',
	"despesasCombustivel" numeric(10, 2) DEFAULT '0',
	"despesasAlimentacao" numeric(10, 2) DEFAULT '0',
	"despesasEstacionamento" numeric(10, 2) DEFAULT '0',
	"despesasOutras" numeric(10, 2) DEFAULT '0',
	"descricaoOutras" text,
	"valorDevolvido" numeric(10, 2) DEFAULT '0',
	"percentualComissao" numeric(5, 2) DEFAULT '0',
	"valorComissao" numeric(10, 2) DEFAULT '0',
	"saldoFinal" numeric(10, 2) DEFAULT '0',
	"observacoes" text,
	"aprovadoPor" varchar(255),
	"dataAprovacao" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_pairing_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"descricao" varchar(255),
	"ativoId" integer,
	"usado" boolean DEFAULT false NOT NULL,
	"agenteId" integer,
	"criadoPor" integer NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usadoEm" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_pairing_codes_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "armazens" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(100) NOT NULL,
	"codigo" varchar(20),
	"descricao" text,
	"endereco" text,
	"capacidadeTotal" numeric(10, 2),
	"unidadeCapacidade" varchar(20) DEFAULT 'm²',
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "atividades_funil" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"negociacaoId" integer NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text,
	"dataAgendada" timestamp,
	"concluida" boolean DEFAULT false NOT NULL,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ativos_ti" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"ip" varchar(45),
	"so" varchar(100),
	"mac" varchar(100),
	"anydeskId" varchar(50),
	"token" varchar(255),
	"setor" varchar(100),
	"status" varchar(50) DEFAULT 'ativo' NOT NULL,
	"dataAquisicao" timestamp,
	"garantiaAte" timestamp,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	CONSTRAINT "ativos_ti_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auditoria_detalhada" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auditoria_detalhada_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"empresaId" integer,
	"userId" integer NOT NULL,
	"userName" varchar(255),
	"userRole" varchar(50),
	"tipoEvento" "tipo_evento_auditoria" NOT NULL,
	"modulo" varchar(100),
	"tabela" varchar(100),
	"registroId" integer,
	"descricao" text NOT NULL,
	"dadosAntes" text,
	"dadosDepois" text,
	"ip" varchar(45),
	"userAgent" text,
	"sessionId" varchar(100),
	"risco" varchar(20) DEFAULT 'baixo',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banco_horas" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"funcionarioId" integer NOT NULL,
	"data" date NOT NULL,
	"horasTrabalhadas" varchar(10),
	"horasExtras" varchar(10),
	"horasDevidas" varchar(10),
	"saldo" varchar(10),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bi_dashboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"tipo" varchar(50) DEFAULT 'custom' NOT NULL,
	"config" text,
	"publico" boolean DEFAULT false NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "bi_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"dashboardId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"fonte" varchar(100) NOT NULL,
	"metrica" varchar(100) NOT NULL,
	"filtros" text,
	"posicao" integer DEFAULT 0,
	"largura" integer DEFAULT 6,
	"altura" integer DEFAULT 4,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carregamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"numero" varchar(20),
	"data" date NOT NULL,
	"veiculoId" integer,
	"veiculoPlaca" varchar(10),
	"motoristaId" integer,
	"motoristaNome" varchar(255),
	"ajudanteId" integer,
	"ajudanteNome" varchar(255),
	"rotaDescricao" varchar(255),
	"cidadesRota" text,
	"status" "status_carregamento" DEFAULT 'montando' NOT NULL,
	"dataSaida" timestamp,
	"dataRetorno" timestamp,
	"kmSaida" integer,
	"kmRetorno" integer,
	"totalNfs" integer DEFAULT 0,
	"totalVolumes" integer DEFAULT 0,
	"totalPesoKg" numeric(10, 2) DEFAULT '0',
	"totalValorNfs" numeric(12, 2) DEFAULT '0',
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "certificados_ti" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"vencimento" timestamp NOT NULL,
	"senha" text,
	"observacoes" text,
	"alertaEnviado" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "chamados_sac" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"protocolo" varchar(20) NOT NULL,
	"clienteNome" varchar(255) NOT NULL,
	"clienteEmail" varchar(320),
	"clienteTelefone" varchar(20),
	"assunto" varchar(255) NOT NULL,
	"descricao" text NOT NULL,
	"categoria" varchar(100),
	"status" "status_sac" DEFAULT 'aberto' NOT NULL,
	"prioridade" "prioridade_sac" DEFAULT 'media' NOT NULL,
	"responsavelId" integer,
	"viagemId" integer,
	"resolucao" text,
	"resolvidoEm" timestamp,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnpjCpf" varchar(20),
	"email" varchar(320),
	"telefone" varchar(20),
	"endereco" text,
	"cidade" varchar(100),
	"estado" varchar(2),
	"segmento" varchar(100),
	"responsavelId" integer,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "cobrancas" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"licencaId" integer NOT NULL,
	"planoCod" "plano_cod" NOT NULL,
	"ciclo" "ciclo_cobranca" DEFAULT 'mensal' NOT NULL,
	"periodoInicio" timestamp NOT NULL,
	"periodoFim" timestamp NOT NULL,
	"valorBruto" numeric(10, 2) NOT NULL,
	"desconto" numeric(10, 2) DEFAULT '0',
	"valorLiquido" numeric(10, 2) NOT NULL,
	"status" "status_cobranca" DEFAULT 'pendente' NOT NULL,
	"formaPagamento" "forma_pagamento_saas",
	"dataPagamento" timestamp,
	"dataVencimento" timestamp NOT NULL,
	"comprovante" varchar(500),
	"observacoes" text,
	"criadoPor" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comissoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"vendedorId" integer NOT NULL,
	"pedidoId" integer,
	"percentual" varchar(10) NOT NULL,
	"valorBase" varchar(20) NOT NULL,
	"valorComissao" varchar(20) NOT NULL,
	"pago" boolean DEFAULT false NOT NULL,
	"dataPagamento" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conferencia_veiculos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"veiculoId" integer NOT NULL,
	"motoristaId" integer,
	"viagemId" integer,
	"status_conferencia" "status_conferencia" DEFAULT 'saida_registrada' NOT NULL,
	"despachanteSaidaId" integer,
	"dataSaida" timestamp,
	"kmSaida" varchar(20),
	"observacoesSaida" text,
	"despachanteRetornoId" integer,
	"dataRetorno" timestamp,
	"kmRetorno" varchar(20),
	"observacoesRetorno" text,
	"conferenteId" integer,
	"dataConferencia" timestamp,
	"cargaOk" boolean,
	"cargaObservacoes" text,
	"avariasEncontradas" boolean DEFAULT false,
	"avariasDescricao" text,
	"batidasEncontradas" boolean DEFAULT false,
	"batidasDescricao" text,
	"pneusOk" boolean,
	"pneusObservacoes" text,
	"limpezaOk" boolean,
	"documentosOk" boolean,
	"nivelCombustivel" varchar(20),
	"observacoesConferencia" text,
	"motoristaConfirmou" boolean DEFAULT false,
	"motoristaConfirmouEm" timestamp,
	"motoristaContestacao" text,
	"assinaturaMotorista" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contatos_crm" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"clienteId" integer,
	"leadId" integer,
	"tipo" varchar(50) NOT NULL,
	"descricao" text NOT NULL,
	"resultado" text,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "docas" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"armazemId" integer NOT NULL,
	"nome" varchar(50) NOT NULL,
	"codigo" varchar(20),
	"tipo" varchar(20) DEFAULT 'recebimento',
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"tipo" "tipo_documento" NOT NULL,
	"nome" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"extensao" varchar(10),
	"tamanho" integer,
	"veiculoId" integer,
	"funcionarioId" integer,
	"viagemId" integer,
	"manutencaoId" integer,
	"dataVencimento" date,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer
);
--> statement-breakpoint
CREATE TABLE "estoque" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"produtoId" integer NOT NULL,
	"localizacaoId" integer,
	"armazemId" integer NOT NULL,
	"quantidade" numeric(12, 3) DEFAULT '0' NOT NULL,
	"quantidadeReservada" numeric(12, 3) DEFAULT '0',
	"lote" varchar(50),
	"dataValidade" date,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etapas_funil" (
	"id" serial PRIMARY KEY NOT NULL,
	"funilId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cor" varchar(20) DEFAULT '#3b82f6',
	"posicao" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fotos_conferencia" (
	"id" serial PRIMARY KEY NOT NULL,
	"conferenciaId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"descricao" varchar(255),
	"url" text NOT NULL,
	"momento" varchar(20) NOT NULL,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funis" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"descricao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupo_empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"grupoId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"papel" varchar(20) DEFAULT 'filial' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grupos_empresariais" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnpj" varchar(18),
	"descricao" text,
	"adminUserId" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico_pneus" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"pneuId" integer NOT NULL,
	"data" timestamp DEFAULT now() NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"veiculoId" integer,
	"posicao" varchar(50),
	"kmVeiculo" integer,
	"kmPneu" integer,
	"custo" numeric(10, 2),
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ia_agentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(100) NOT NULL,
	"setor" "ia_agente_setor" DEFAULT 'custom' NOT NULL,
	"descricao" text,
	"avatar" varchar(10) DEFAULT '🤖',
	"systemPrompt" text NOT NULL,
	"instrucoes" text,
	"contextoEmpresa" text,
	"temperatura" varchar(5) DEFAULT '0.7',
	"modelo" varchar(50) DEFAULT 'gpt-4o-mini',
	"ativo" boolean DEFAULT true NOT NULL,
	"isMaster" boolean DEFAULT false NOT NULL,
	"usarIaExterna" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "ia_conhecimento" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"agenteId" integer,
	"titulo" varchar(200) NOT NULL,
	"conteudo" text NOT NULL,
	"categoria" varchar(100),
	"tags" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "ia_mensagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessaoId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"conteudo" text NOT NULL,
	"tokens" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ia_sessoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"usuarioId" integer NOT NULL,
	"agenteId" integer NOT NULL,
	"titulo" varchar(200) DEFAULT 'Nova conversa',
	"resumo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "integracoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"nome" varchar(255) NOT NULL,
	"status_integracao" "status_integracao" DEFAULT 'configurando' NOT NULL,
	"config" text,
	"webhookUrl" text,
	"webhookSecret" varchar(255),
	"ultimaSincronizacao" timestamp,
	"erroUltimo" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interacoes_sac" (
	"id" serial PRIMARY KEY NOT NULL,
	"chamadoId" integer NOT NULL,
	"userId" integer,
	"tipo" varchar(50) DEFAULT 'mensagem' NOT NULL,
	"conteudo" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_carregamento" (
	"id" serial PRIMARY KEY NOT NULL,
	"carregamentoId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"numeroNf" varchar(20) NOT NULL,
	"serie" varchar(5),
	"chaveAcesso" varchar(44),
	"destinatario" varchar(255),
	"cnpjDestinatario" varchar(18),
	"enderecoEntrega" varchar(500),
	"cidade" varchar(100),
	"uf" varchar(2),
	"valorNf" numeric(12, 2),
	"pesoKg" numeric(8, 2),
	"volumes" integer,
	"descricaoCarga" varchar(255),
	"ordemEntrega" integer,
	"status" "status_nf" DEFAULT 'pendente' NOT NULL,
	"dataCanhoto" timestamp,
	"recebidoPor" varchar(255),
	"motivoDevolucao" text,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "itens_conferencia" (
	"id" serial PRIMARY KEY NOT NULL,
	"conferenciaId" integer NOT NULL,
	"item" varchar(255) NOT NULL,
	"conforme" boolean,
	"observacao" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_pedido" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedidoId" integer NOT NULL,
	"produtoId" integer,
	"descricao" varchar(255) NOT NULL,
	"quantidade" varchar(20) NOT NULL,
	"valorUnitario" varchar(20) NOT NULL,
	"valorTotal" varchar(20) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_recebimento" (
	"id" serial PRIMARY KEY NOT NULL,
	"recebimentoId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"codigoProduto" varchar(100),
	"descricaoProduto" varchar(255) NOT NULL,
	"unidade" varchar(20),
	"ean" varchar(20),
	"quantidadeEsperada" numeric(10, 3) NOT NULL,
	"quantidadeRecebida" numeric(10, 3),
	"quantidadeDivergente" numeric(10, 3),
	"valorUnitario" numeric(10, 4),
	"valorTotal" numeric(12, 2),
	"localizacao" varchar(50),
	"status" "status_item_recebimento" DEFAULT 'pendente' NOT NULL,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"clienteId" integer,
	"nome" varchar(255) NOT NULL,
	"email" varchar(320),
	"telefone" varchar(20),
	"empresa" varchar(255),
	"origem" varchar(100),
	"status" "status_lead" DEFAULT 'novo' NOT NULL,
	"valorEstimado" varchar(20),
	"responsavelId" integer,
	"proximoContato" timestamp,
	"observacoes" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "licencas" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"planoCod" "plano_cod" DEFAULT 'trial' NOT NULL,
	"status" "status_licenca" DEFAULT 'trial' NOT NULL,
	"ciclo" "ciclo_cobranca" DEFAULT 'mensal',
	"dataInicio" timestamp DEFAULT now() NOT NULL,
	"dataFim" timestamp,
	"dataTrialFim" timestamp,
	"dataUltimoPagamento" timestamp,
	"dataProximoVencimento" timestamp,
	"valorContratado" numeric(10, 2),
	"descontoPercent" numeric(5, 2) DEFAULT '0',
	"observacoes" text,
	"motivoSuspensao" text,
	"criadoPor" integer,
	"updatedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "licencas_empresaId_unique" UNIQUE("empresaId")
);
--> statement-breakpoint
CREATE TABLE "licencas_regulatorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"tipo" varchar(100) NOT NULL,
	"numero" varchar(100),
	"orgaoEmissor" varchar(200),
	"descricao" text,
	"status_licenca_log" "status_licenca_log" DEFAULT 'pendente' NOT NULL,
	"dataEmissao" timestamp,
	"dataVencimento" timestamp,
	"arquivo" text,
	"responsavelId" integer,
	"observacoes" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "localizacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"armazemId" integer NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"corredor" varchar(10),
	"bloco" varchar(10),
	"prateleira" varchar(10),
	"posicao" varchar(10),
	"tipo" varchar(20) DEFAULT 'padrao',
	"capacidade" numeric(8, 2),
	"ocupado" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_integracoes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "log_integracoes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"integracaoId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"direcao" varchar(10) NOT NULL,
	"endpoint" varchar(500),
	"payload" text,
	"resposta" text,
	"statusCode" integer,
	"sucesso" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modulo_permissoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"role" "user_role" NOT NULL,
	"modulo" varchar(100) NOT NULL,
	"podeVer" boolean DEFAULT false NOT NULL,
	"podeCriar" boolean DEFAULT false NOT NULL,
	"podeEditar" boolean DEFAULT false NOT NULL,
	"podeDeletar" boolean DEFAULT false NOT NULL,
	"podeExportar" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitor_agentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"ativoId" integer,
	"hostname" varchar(200) NOT NULL,
	"ip" varchar(50),
	"mac" varchar(50),
	"so" varchar(100),
	"versaoAgente" varchar(20),
	"token" varchar(100) NOT NULL,
	"ultimoContato" timestamp,
	"online" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"os" varchar(256),
	"os_version" varchar(256),
	"motherboard" varchar(256),
	"cpu" varchar(256),
	"total_ram" bigint,
	"anydeskId" varchar(50),
	"ip_address" varchar(50),
	"mac_address" varchar(50),
	"status" varchar(20) DEFAULT 'offline',
	"pairingCode" varchar(20),
	"fingerprint" varchar(200),
	"ultimaVersao" varchar(20),
	"setor" varchar(100),
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "monitor_metricas" (
	"id" serial PRIMARY KEY NOT NULL,
	"agenteId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"coletadoEm" timestamp DEFAULT now() NOT NULL,
	"cpuUso" numeric(5, 2),
	"cpuTemp" numeric(5, 1),
	"cpuFreqMhz" integer,
	"ramTotalMb" integer,
	"ramUsadaMb" integer,
	"ramUsoPct" numeric(5, 2),
	"discoTotalGb" numeric(8, 2),
	"discoUsadoGb" numeric(8, 2),
	"discoUsoPct" numeric(5, 2),
	"redeEnviadoKb" numeric(12, 2),
	"redeRecebidoKb" numeric(12, 2),
	"latenciaMs" integer,
	"processos" integer,
	"usuarioLogado" varchar(100),
	"uptime" integer,
	"anydeskId" varchar(50),
	"topProcessos" jsonb
);
--> statement-breakpoint
CREATE TABLE "movimentacoes_estoque" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"produtoId" integer NOT NULL,
	"armazemId" integer NOT NULL,
	"localizacaoOrigemId" integer,
	"localizacaoDestinoId" integer,
	"tipo" "tipo_movimentacao_estoque" NOT NULL,
	"quantidade" numeric(12, 3) NOT NULL,
	"saldoAnterior" numeric(12, 3),
	"saldoAtual" numeric(12, 3),
	"lote" varchar(50),
	"documento" varchar(100),
	"recebimentoId" integer,
	"observacoes" text,
	"operadorId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negociacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"funilId" integer NOT NULL,
	"etapaId" integer NOT NULL,
	"clienteId" integer,
	"leadId" integer,
	"titulo" varchar(255) NOT NULL,
	"valor" varchar(20) DEFAULT '0',
	"responsavelId" integer,
	"probabilidade" integer DEFAULT 50,
	"previsaoFechamento" timestamp,
	"motivoPerda" text,
	"ganho" boolean,
	"observacoes" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "notas_fiscais_viagem" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"viagemId" integer NOT NULL,
	"numeroNf" varchar(20) NOT NULL,
	"serie" varchar(5),
	"chaveAcesso" varchar(44),
	"destinatario" varchar(255),
	"cnpjDestinatario" varchar(18),
	"enderecoEntrega" varchar(500),
	"cidade" varchar(100),
	"uf" varchar(2),
	"valorNf" numeric(12, 2),
	"pesoKg" numeric(8, 2),
	"volumes" integer,
	"status" "status_nf" DEFAULT 'pendente' NOT NULL,
	"dataCanhoto" timestamp,
	"dataEntrega" timestamp,
	"recebidoPor" varchar(255),
	"motivoDevolucao" text,
	"observacoes" text,
	"ordemEntrega" integer,
	"fotoCanhoto" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"clienteId" integer,
	"numero" varchar(30) NOT NULL,
	"status" "status_pedido" DEFAULT 'rascunho' NOT NULL,
	"clienteNome" varchar(255) NOT NULL,
	"valorTotal" varchar(20) DEFAULT '0',
	"desconto" varchar(20) DEFAULT '0',
	"frete" varchar(20) DEFAULT '0',
	"formaPagamento" varchar(100),
	"condicaoPagamento" varchar(100),
	"previsaoEntrega" timestamp,
	"observacoes" text,
	"vendedorId" integer,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "planos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" "plano_cod" NOT NULL,
	"nome" varchar(100) NOT NULL,
	"descricao" text,
	"precoMensal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"precoTrimestral" numeric(10, 2),
	"precoSemestral" numeric(10, 2),
	"precoAnual" numeric(10, 2),
	"limiteUsuarios" integer DEFAULT 5,
	"limiteVeiculos" integer DEFAULT 10,
	"limiteMotoristas" integer DEFAULT 10,
	"modulosAtivos" text DEFAULT 'basico',
	"temIntegracaoWinthor" boolean DEFAULT false,
	"temIntegracaoArquivei" boolean DEFAULT false,
	"temRelatoriosAvancados" boolean DEFAULT false,
	"temMultiEmpresa" boolean DEFAULT false,
	"temSuportePrioritario" boolean DEFAULT false,
	"diasTrial" integer DEFAULT 14,
	"ativo" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "planos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "pneus" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"numeroSerie" varchar(50) NOT NULL,
	"marca" varchar(100),
	"modelo" varchar(100),
	"medida" varchar(50),
	"kmInicial" integer DEFAULT 0,
	"kmAtual" integer DEFAULT 0,
	"status" "status_pneu" DEFAULT 'novo' NOT NULL,
	"veiculoId" integer,
	"posicao" varchar(50),
	"dataAquisicao" date,
	"valorAquisicao" numeric(10, 2),
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "produtos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"codigo" varchar(100) NOT NULL,
	"ean" varchar(20),
	"descricao" varchar(255) NOT NULL,
	"unidade" varchar(20) DEFAULT 'UN' NOT NULL,
	"categoria" varchar(100),
	"marca" varchar(100),
	"pesoUnitario" numeric(8, 3),
	"volumeUnitario" numeric(8, 3),
	"estoqueMinimo" numeric(10, 3) DEFAULT '0',
	"estoqueMaximo" numeric(10, 3),
	"localizacaoPadrao" varchar(30),
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "propostas" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"clienteId" integer,
	"leadId" integer,
	"numero" varchar(30) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"status" "status_proposta" DEFAULT 'rascunho' NOT NULL,
	"valorTotal" varchar(20) DEFAULT '0',
	"validade" timestamp,
	"descricao" text,
	"condicoes" text,
	"vendedorId" integer,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "recebimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"numero" varchar(50) NOT NULL,
	"tipo" "tipo_recebimento" DEFAULT 'nf_entrada' NOT NULL,
	"status" "status_recebimento" DEFAULT 'aguardando' NOT NULL,
	"fornecedorNome" varchar(255),
	"fornecedorCnpj" varchar(18),
	"origemCidade" varchar(100),
	"origemEstado" varchar(2),
	"nfNumero" varchar(50),
	"nfSerie" varchar(10),
	"nfChave" varchar(50),
	"nfValorTotal" numeric(12, 2),
	"nfDataEmissao" date,
	"transportadoraNome" varchar(255),
	"veiculoPlaca" varchar(10),
	"motoristaId" integer,
	"docaId" integer,
	"armazemId" integer,
	"dataAgendamento" timestamp,
	"dataChegada" timestamp,
	"dataInicio" timestamp,
	"dataFim" timestamp,
	"conferenteId" integer,
	"observacoes" text,
	"observacoesDivergencia" text,
	"totalItensEsperados" integer DEFAULT 0,
	"totalItensRecebidos" integer DEFAULT 0,
	"totalItensComDivergencia" integer DEFAULT 0,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "registros_ponto" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"funcionarioId" integer NOT NULL,
	"tipo_ponto" "tipo_ponto" NOT NULL,
	"dataHora" timestamp DEFAULT now() NOT NULL,
	"latitude" varchar(20),
	"longitude" varchar(20),
	"ip" varchar(45),
	"foto" text,
	"observacao" text,
	"ajustadoPor" integer,
	"motivoAjuste" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(500) NOT NULL,
	"ip" varchar(45),
	"userAgent" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets_ti" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"protocolo" varchar(20) NOT NULL,
	"solicitanteId" integer NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text NOT NULL,
	"categoria" "categoria_ticket_ti" DEFAULT 'outro' NOT NULL,
	"prioridade_ticket_ti" "prioridade_ticket_ti" DEFAULT 'media' NOT NULL,
	"status_ticket_ti" "status_ticket_ti" DEFAULT 'aberto' NOT NULL,
	"responsavelId" integer,
	"resolucao" text,
	"resolvidoEm" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_permissoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"modulo" varchar(100) NOT NULL,
	"podeVer" boolean DEFAULT false NOT NULL,
	"podeCriar" boolean DEFAULT false NOT NULL,
	"podeEditar" boolean DEFAULT false NOT NULL,
	"podeDeletar" boolean DEFAULT false NOT NULL,
	"podeExportar" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"documento" varchar(20),
	"telefone" varchar(20),
	"email" varchar(320),
	"empresa" varchar(255),
	"foto" text,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitas" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"visitanteId" integer NOT NULL,
	"status" "status_visitante" DEFAULT 'agendado' NOT NULL,
	"motivo" varchar(255) NOT NULL,
	"setor" varchar(100),
	"pessoaContato" varchar(255),
	"cracha" varchar(50),
	"dataAgendamento" timestamp,
	"dataEntrada" timestamp,
	"dataSaida" timestamp,
	"observacoes" text,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "winthor_sync" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"integracaoId" integer NOT NULL,
	"tabelaOrigem" varchar(100) NOT NULL,
	"tabelaDestino" varchar(100) NOT NULL,
	"ultimoId" integer DEFAULT 0,
	"ultimaSincronizacao" timestamp,
	"registrosSincronizados" integer DEFAULT 0,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "ativo" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "dataNascimento" date;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "estadoCivil" varchar(20);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "escolaridade" varchar(50);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "tituloEleitor" varchar(20);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "pis" varchar(20);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "ctps" varchar(20);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "serieCtps" varchar(10);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "ufCtps" varchar(2);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "dataExpedicaoRg" date;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "orgaoEmissorRg" varchar(20);--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "temPlanoSaude" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "temValeRefeicao" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "temValeTransporte" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD COLUMN "valorValeRefeicao" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "codigoConvite" varchar(50);--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "tipoEmpresa" "tipo_empresa" DEFAULT 'independente' NOT NULL;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "matrizId" integer;--> statement-breakpoint
ALTER TABLE "empresas" ADD COLUMN "grupoId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastName" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "empresaId" integer;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_codigoConvite_unique" UNIQUE("codigoConvite");