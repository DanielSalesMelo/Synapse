CREATE TYPE "public"."categoria_conta_pagar" AS ENUM('combustivel', 'manutencao', 'salario', 'freelancer', 'pedagio', 'seguro', 'ipva', 'licenciamento', 'pneu', 'outro');--> statement-breakpoint
CREATE TYPE "public"."categoria_conta_receber" AS ENUM('frete', 'cte', 'devolucao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."chat_message_type" AS ENUM('text', 'image', 'file');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento" AS ENUM('dinheiro', 'pix', 'transferencia', 'cartao');--> statement-breakpoint
CREATE TYPE "public"."funcao" AS ENUM('motorista', 'ajudante', 'despachante', 'gerente', 'admin', 'outro');--> statement-breakpoint
CREATE TYPE "public"."item_checklist" AS ENUM('conforme', 'nao_conforme', 'na');--> statement-breakpoint
CREATE TYPE "public"."operacao_tanque" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."status_acidente" AS ENUM('aberto', 'em_reparo', 'resolvido');--> statement-breakpoint
CREATE TYPE "public"."status_adiantamento" AS ENUM('pendente', 'acertado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_conta_pagar" AS ENUM('pendente', 'pago', 'vencido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_conta_receber" AS ENUM('pendente', 'recebido', 'vencido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_viagem" AS ENUM('planejada', 'em_andamento', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."tipo_abastecimento" AS ENUM('interno', 'externo');--> statement-breakpoint
CREATE TYPE "public"."tipo_checklist" AS ENUM('saida', 'retorno');--> statement-breakpoint
CREATE TYPE "public"."tipo_cobranca" AS ENUM('diaria', 'mensal', 'por_viagem');--> statement-breakpoint
CREATE TYPE "public"."tipo_combustivel" AS ENUM('diesel', 'arla', 'gasolina', 'etanol', 'gas', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_conta" AS ENUM('corrente', 'poupanca', 'pix');--> statement-breakpoint
CREATE TYPE "public"."tipo_contrato" AS ENUM('clt', 'freelancer', 'terceirizado', 'estagiario');--> statement-breakpoint
CREATE TYPE "public"."tipo_despesa" AS ENUM('combustivel', 'pedagio', 'borracharia', 'estacionamento', 'oficina', 'telefone', 'descarga', 'diaria', 'alimentacao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_manutencao" AS ENUM('preventiva', 'corretiva', 'revisao', 'pneu', 'eletrica', 'funilaria', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_tanque" AS ENUM('diesel', 'arla');--> statement-breakpoint
CREATE TYPE "public"."tipo_veiculo" AS ENUM('van', 'toco', 'truck', 'cavalo', 'carreta', 'empilhadeira', 'paletera', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_viagem" AS ENUM('entrega', 'viagem');--> statement-breakpoint
CREATE TYPE "public"."turno" AS ENUM('manha', 'tarde', 'noite');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'master_admin', 'monitor', 'dispatcher');--> statement-breakpoint
CREATE TABLE "abastecimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"veiculoId" integer NOT NULL,
	"motoristaId" integer,
	"data" date NOT NULL,
	"tipoCombustivel" "tipo_combustivel" NOT NULL,
	"quantidade" numeric(8, 3) NOT NULL,
	"valorUnitario" numeric(8, 3),
	"valorTotal" numeric(10, 2),
	"kmAtual" integer,
	"kmRodado" integer,
	"mediaConsumo" numeric(5, 2),
	"local" varchar(255),
	"tipoAbastecimento" "tipo_abastecimento" DEFAULT 'interno',
	"notaFiscal" varchar(50),
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "acidentes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"veiculoId" integer NOT NULL,
	"motoristaId" integer,
	"data" date NOT NULL,
	"local" varchar(255),
	"descricao" text NOT NULL,
	"boletimOcorrencia" varchar(50),
	"valorDano" numeric(10, 2),
	"status" "status_acidente" DEFAULT 'aberto' NOT NULL,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "adiantamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"funcionarioId" integer NOT NULL,
	"viagemId" integer,
	"valor" numeric(10, 2) NOT NULL,
	"formaPagamento" "forma_pagamento" NOT NULL,
	"data" date NOT NULL,
	"status" "status_adiantamento" DEFAULT 'pendente' NOT NULL,
	"valorAcertado" numeric(10, 2),
	"dataAcerto" date,
	"saldo" numeric(10, 2),
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"empresaId" integer,
	"userId" integer NOT NULL,
	"userName" varchar(255),
	"acao" varchar(50) NOT NULL,
	"tabela" varchar(100) NOT NULL,
	"registroId" integer NOT NULL,
	"dadosAntes" text,
	"dadosDepois" text,
	"ip" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"name" varchar(255),
	"isGroup" boolean DEFAULT false NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "chat_role" DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"lastReadAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"content" text NOT NULL,
	"type" "chat_message_type" DEFAULT 'text' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"veiculoId" integer NOT NULL,
	"cavaloPrincipalId" integer,
	"motoristaId" integer,
	"turno" "turno",
	"tipo" "tipo_checklist" DEFAULT 'retorno' NOT NULL,
	"cracha" "item_checklist",
	"cnh" "item_checklist",
	"documentosVeiculo" "item_checklist",
	"epi" "item_checklist",
	"computadorBordo" "item_checklist",
	"cinto" "item_checklist",
	"banco" "item_checklist",
	"direcao" "item_checklist",
	"luzesPainel" "item_checklist",
	"tacografo" "item_checklist",
	"extintor" "item_checklist",
	"portas" "item_checklist",
	"limpador" "item_checklist",
	"buzina" "item_checklist",
	"freioDeMao" "item_checklist",
	"alarmeCacamba" "item_checklist",
	"cabineLimpa" "item_checklist",
	"objetosSoltos" "item_checklist",
	"pneus" "item_checklist",
	"vazamentos" "item_checklist",
	"trianguloCones" "item_checklist",
	"espelhos" "item_checklist",
	"lonaCarga" "item_checklist",
	"faixasRefletivas" "item_checklist",
	"luzesLaterais" "item_checklist",
	"luzesFreio" "item_checklist",
	"farol" "item_checklist",
	"piscaAlerta" "item_checklist",
	"re" "item_checklist",
	"setas" "item_checklist",
	"macacoEstepe" "item_checklist",
	"lanternas" "item_checklist",
	"itensNaoConformes" integer DEFAULT 0,
	"observacoes" text,
	"assinaturaMotorista" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "contas_pagar" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"descricao" text NOT NULL,
	"categoria" "categoria_conta_pagar" NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"dataVencimento" date NOT NULL,
	"dataPagamento" date,
	"status" "status_conta_pagar" DEFAULT 'pendente' NOT NULL,
	"fornecedor" varchar(255),
	"notaFiscal" varchar(50),
	"veiculoId" integer,
	"funcionarioId" integer,
	"viagemId" integer,
	"comprovante" text,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "contas_receber" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"descricao" text NOT NULL,
	"categoria" "categoria_conta_receber" NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"dataVencimento" date NOT NULL,
	"dataRecebimento" date,
	"status" "status_conta_receber" DEFAULT 'pendente' NOT NULL,
	"cliente" varchar(255),
	"notaFiscal" varchar(50),
	"cteNumero" varchar(50),
	"viagemId" integer,
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "controle_tanque" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"tipo" "tipo_tanque" NOT NULL,
	"data" date NOT NULL,
	"operacao" "operacao_tanque" NOT NULL,
	"quantidade" numeric(8, 3) NOT NULL,
	"valorUnitario" numeric(8, 3),
	"valorTotal" numeric(10, 2),
	"fornecedor" varchar(255),
	"notaFiscal" varchar(50),
	"veiculoId" integer,
	"motoristaId" integer,
	"saldoAnterior" numeric(8, 3),
	"saldoAtual" numeric(8, 3),
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "despesas_viagem" (
	"id" serial PRIMARY KEY NOT NULL,
	"viagemId" integer NOT NULL,
	"empresaId" integer NOT NULL,
	"tipo" "tipo_despesa" NOT NULL,
	"descricao" text,
	"valor" numeric(10, 2) NOT NULL,
	"data" date,
	"comprovante" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnpj" varchar(18),
	"telefone" varchar(20),
	"email" varchar(320),
	"endereco" text,
	"cidade" varchar(100),
	"estado" varchar(2),
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "funcionarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cpf" varchar(14),
	"rg" varchar(20),
	"telefone" varchar(20),
	"email" varchar(320),
	"funcao" "funcao" NOT NULL,
	"tipoContrato" "tipo_contrato" NOT NULL,
	"salario" numeric(10, 2),
	"dataAdmissao" date,
	"dataDemissao" date,
	"valorDiaria" numeric(10, 2),
	"valorMensal" numeric(10, 2),
	"tipoCobranca" "tipo_cobranca",
	"dataInicioContrato" date,
	"dataFimContrato" date,
	"diaPagamento" integer,
	"cnh" varchar(20),
	"categoriaCnh" varchar(5),
	"vencimentoCnh" date,
	"mopp" boolean DEFAULT false,
	"vencimentoMopp" date,
	"vencimentoAso" date,
	"banco" varchar(100),
	"agencia" varchar(10),
	"conta" varchar(20),
	"tipoConta" "tipo_conta",
	"chavePix" varchar(255),
	"observacoes" text,
	"foto" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "manutencoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"veiculoId" integer NOT NULL,
	"data" date NOT NULL,
	"tipo" "tipo_manutencao" NOT NULL,
	"descricao" text NOT NULL,
	"empresa" varchar(255),
	"valor" numeric(10, 2),
	"kmAtual" integer,
	"proximaManutencaoKm" integer,
	"proximaManutencaoData" date,
	"notaFiscal" varchar(50),
	"observacoes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"password" varchar(255),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "veiculos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"placa" varchar(10) NOT NULL,
	"tipo" "tipo_veiculo" NOT NULL,
	"cavaloPrincipalId" integer,
	"marca" varchar(100),
	"modelo" varchar(100),
	"ano" integer,
	"cor" varchar(50),
	"renavam" varchar(20),
	"chassi" varchar(30),
	"capacidadeCarga" numeric(8, 2),
	"motoristaId" integer,
	"ajudanteId" integer,
	"kmAtual" integer,
	"mediaConsumo" numeric(5, 2),
	"vencimentoCrlv" date,
	"vencimentoSeguro" date,
	"classificacao" integer DEFAULT 0,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
--> statement-breakpoint
CREATE TABLE "viagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresaId" integer NOT NULL,
	"tipo" "tipo_viagem" DEFAULT 'viagem' NOT NULL,
	"veiculoId" integer NOT NULL,
	"cavaloPrincipalId" integer,
	"motoristaId" integer,
	"ajudante1Id" integer,
	"ajudante2Id" integer,
	"ajudante3Id" integer,
	"origem" varchar(255),
	"destino" varchar(255),
	"dataSaida" timestamp,
	"dataChegada" timestamp,
	"kmSaida" integer,
	"kmChegada" integer,
	"kmRodado" integer,
	"descricaoCarga" text,
	"tipoCarga" text,
	"pesoCarga" numeric(8, 2),
	"freteTotalIda" numeric(10, 2),
	"freteTotalVolta" numeric(10, 2),
	"freteTotal" numeric(10, 2),
	"adiantamento" numeric(10, 2),
	"saldoViagem" numeric(10, 2),
	"totalDespesas" numeric(10, 2),
	"mediaConsumo" numeric(5, 2),
	"notaFiscal" varchar(50),
	"status" "status_viagem" DEFAULT 'planejada' NOT NULL,
	"observacoes" text,
	"teveProblema" boolean DEFAULT false,
	"voltouComCarga" boolean DEFAULT false,
	"observacoesChegada" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text
);
