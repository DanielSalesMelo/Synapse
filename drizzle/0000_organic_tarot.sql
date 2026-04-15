CREATE TYPE "public"."categoria_conta_pagar" AS ENUM('combustivel', 'manutencao', 'salario', 'freelancer', 'pedagio', 'seguro', 'ipva', 'licenciamento', 'pneu', 'outro');--> statement-breakpoint
CREATE TYPE "public"."categoria_conta_receber" AS ENUM('frete', 'cte', 'devolucao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."chat_message_type" AS ENUM('text', 'image', 'file');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."ciclo_cobranca" AS ENUM('mensal', 'trimestral', 'semestral', 'anual');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento" AS ENUM('dinheiro', 'pix', 'transferencia', 'cartao');--> statement-breakpoint
CREATE TYPE "public"."forma_pagamento_saas" AS ENUM('pix', 'boleto', 'cartao_credito', 'transferencia', 'cortesia');--> statement-breakpoint
CREATE TYPE "public"."funcao" AS ENUM('motorista', 'ajudante', 'despachante', 'gerente', 'admin', 'outro');--> statement-breakpoint
CREATE TYPE "public"."item_checklist" AS ENUM('conforme', 'nao_conforme', 'na');--> statement-breakpoint
CREATE TYPE "public"."operacao_tanque" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."plano_cod" AS ENUM('trial', 'basico', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."status_acerto_carga" AS ENUM('aberto', 'em_analise', 'fechado', 'pago');--> statement-breakpoint
CREATE TYPE "public"."status_acidente" AS ENUM('aberto', 'em_reparo', 'resolvido');--> statement-breakpoint
CREATE TYPE "public"."status_adiantamento" AS ENUM('pendente', 'acertado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_carregamento" AS ENUM('montando', 'pronto', 'em_rota', 'retornado', 'encerrado');--> statement-breakpoint
CREATE TYPE "public"."status_cobranca" AS ENUM('pendente', 'pago', 'vencido', 'cancelado', 'estornado');--> statement-breakpoint
CREATE TYPE "public"."status_conta_pagar" AS ENUM('pendente', 'pago', 'vencido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_conta_receber" AS ENUM('pendente', 'recebido', 'vencido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_licenca" AS ENUM('trial', 'ativa', 'suspensa', 'vencida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."status_nf" AS ENUM('pendente', 'entregue', 'devolvida', 'parcial', 'extraviada');--> statement-breakpoint
CREATE TYPE "public"."status_pneu" AS ENUM('novo', 'em_uso', 'recapado', 'sucata', 'estoque');--> statement-breakpoint
CREATE TYPE "public"."status_viagem" AS ENUM('planejada', 'em_andamento', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."tipo_abastecimento" AS ENUM('interno', 'externo');--> statement-breakpoint
CREATE TYPE "public"."tipo_checklist" AS ENUM('saida', 'retorno');--> statement-breakpoint
CREATE TYPE "public"."tipo_cobranca" AS ENUM('diaria', 'mensal', 'por_viagem');--> statement-breakpoint
CREATE TYPE "public"."tipo_combustivel" AS ENUM('diesel', 'arla', 'gasolina', 'etanol', 'gas', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_conta" AS ENUM('corrente', 'poupanca', 'pix');--> statement-breakpoint
CREATE TYPE "public"."tipo_contrato" AS ENUM('clt', 'freelancer', 'terceirizado', 'estagiario');--> statement-breakpoint
CREATE TYPE "public"."tipo_despesa" AS ENUM('combustivel', 'pedagio', 'borracharia', 'estacionamento', 'oficina', 'telefone', 'descarga', 'diaria', 'alimentacao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_documento" AS ENUM('cnh', 'crlv', 'aso', 'mopp', 'nota_fiscais', 'seguro', 'licenciamento', 'contrato', 'outro');--> statement-breakpoint
CREATE TYPE "public"."tipo_empresa" AS ENUM('independente', 'matriz', 'filial');--> statement-breakpoint
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
	"deleteReason" text,
	"ativo" boolean DEFAULT true,
	"dataNascimento" date,
	"estadoCivil" varchar(20),
	"escolaridade" varchar(50),
	"tituloEleitor" varchar(20),
	"pis" varchar(20),
	"ctps" varchar(20),
	"serieCtps" varchar(10),
	"ufCtps" varchar(2),
	"dataExpedicaoRg" date,
	"orgaoEmissorRg" varchar(20),
	"temPlanoSaude" boolean DEFAULT false,
	"temValeRefeicao" boolean DEFAULT false,
	"temValeTransporte" boolean DEFAULT false,
	"valorValeRefeicao" numeric(10, 2)
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
CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(255) NOT NULL,
	"cnpj" varchar(18),
	"telefone" varchar(20),
	"email" varchar(320),
	"endereco" text,
	"cidade" varchar(100),
	"estado" varchar(2),
	"codigoConvite" varchar(50),
	"tipoEmpresa" "tipo_empresa" DEFAULT 'independente' NOT NULL,
	"matrizId" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp,
	"deletedBy" integer,
	"deleteReason" text,
	CONSTRAINT "empresas_codigoConvite_unique" UNIQUE("codigoConvite")
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
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"lastName" text,
	"email" varchar(320),
	"phone" varchar(20),
	"loginMethod" varchar(64),
	"password" varchar(255),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"empresaId" integer,
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
