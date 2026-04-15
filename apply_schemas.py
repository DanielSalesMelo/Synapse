import psycopg2

conn = psycopg2.connect(
    host="nozomi.proxy.rlwy.net",
    port=57383,
    dbname="railway",
    user="postgres",
    password="iZHgmloZvoruxJLewISJZUHwBmlHTriz"
)
conn.autocommit = True
cur = conn.cursor()

# Criar enums que podem não existir
enums = [
    ("status_visitante", ["agendado", "aguardando", "em_atendimento", "finalizado", "cancelado"]),
    ("status_sac", ["aberto", "em_andamento", "aguardando_cliente", "resolvido", "fechado"]),
    ("prioridade_sac", ["baixa", "media", "alta", "urgente"]),
    ("status_licenca_log", ["pendente", "em_analise", "aprovada", "vencida", "rejeitada"]),
    ("status_lead", ["novo", "qualificado", "em_negociacao", "proposta_enviada", "ganho", "perdido"]),
    ("status_pedido", ["rascunho", "enviado", "aprovado", "em_separacao", "expedido", "entregue", "cancelado"]),
    ("status_proposta", ["rascunho", "enviada", "em_analise", "aprovada", "rejeitada", "expirada"]),
    ("tipo_evento_auditoria", ["login", "logout", "create", "update", "delete", "restore", "export", "import", "permission_change", "config_change", "access_denied", "password_change", "role_change"]),
    ("status_ticket_ti", ["aberto", "em_andamento", "aguardando", "resolvido", "fechado"]),
    ("prioridade_ticket_ti", ["baixa", "media", "alta", "critica"]),
    ("categoria_ticket_ti", ["hardware", "software", "rede", "acesso", "email", "impressora", "outro"]),
    ("tipo_ponto", ["entrada", "saida", "inicio_intervalo", "fim_intervalo"]),
    ("status_integracao", ["ativa", "inativa", "erro", "configurando"]),
    ("status_conferencia", ["saida_registrada", "em_viagem", "retorno_registrado", "em_conferencia", "aguardando_motorista", "confirmado_motorista", "finalizado"]),
]

for name, values in enums:
    try:
        vals = ", ".join(f"'{v}'" for v in values)
        cur.execute(f"DO $$ BEGIN CREATE TYPE {name} AS ENUM ({vals}); EXCEPTION WHEN duplicate_object THEN null; END $$;")
        print(f"  Enum {name}: OK")
    except Exception as e:
        print(f"  Enum {name}: {e}")

# Criar todas as tabelas
tables = [
    # Visitantes / Recepcionista
    """CREATE TABLE IF NOT EXISTS visitantes (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, nome VARCHAR(255) NOT NULL,
        documento VARCHAR(20), telefone VARCHAR(20), email VARCHAR(320),
        empresa VARCHAR(255), foto TEXT, observacoes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS visitas (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "visitanteId" INT NOT NULL,
        status status_visitante DEFAULT 'agendado' NOT NULL, motivo VARCHAR(255) NOT NULL,
        setor VARCHAR(100), "pessoaContato" VARCHAR(255), cracha VARCHAR(50),
        "dataAgendamento" TIMESTAMP, "dataEntrada" TIMESTAMP, "dataSaida" TIMESTAMP,
        observacoes TEXT, "createdBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "deletedAt" TIMESTAMP
    )""",
    # SAC / Logística
    """CREATE TABLE IF NOT EXISTS chamados_sac (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, protocolo VARCHAR(20) NOT NULL,
        "clienteNome" VARCHAR(255) NOT NULL, "clienteEmail" VARCHAR(320), "clienteTelefone" VARCHAR(20),
        assunto VARCHAR(255) NOT NULL, descricao TEXT NOT NULL, categoria VARCHAR(100),
        status status_sac DEFAULT 'aberto' NOT NULL, prioridade prioridade_sac DEFAULT 'media' NOT NULL,
        "responsavelId" INT, "viagemId" INT, resolucao TEXT, "resolvidoEm" TIMESTAMP,
        "createdBy" INT, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL, "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS interacoes_sac (
        id SERIAL PRIMARY KEY, "chamadoId" INT NOT NULL, "userId" INT,
        tipo VARCHAR(50) DEFAULT 'mensagem' NOT NULL, conteudo TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS licencas_regulatorias (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, tipo VARCHAR(100) NOT NULL,
        numero VARCHAR(100), "orgaoEmissor" VARCHAR(200), descricao TEXT,
        status status_licenca_log DEFAULT 'pendente' NOT NULL,
        "dataEmissao" TIMESTAMP, "dataVencimento" TIMESTAMP, arquivo TEXT,
        "responsavelId" INT, observacoes TEXT, "createdBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "deletedAt" TIMESTAMP
    )""",
    # CRM
    """CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, nome VARCHAR(255) NOT NULL,
        "cnpjCpf" VARCHAR(20), email VARCHAR(320), telefone VARCHAR(20),
        endereco TEXT, cidade VARCHAR(100), estado VARCHAR(2), segmento VARCHAR(100),
        "responsavelId" INT, observacoes TEXT, ativo BOOLEAN DEFAULT TRUE NOT NULL,
        "createdBy" INT, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL, "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "clienteId" INT,
        nome VARCHAR(255) NOT NULL, email VARCHAR(320), telefone VARCHAR(20),
        empresa VARCHAR(255), origem VARCHAR(100), status status_lead DEFAULT 'novo' NOT NULL,
        "valorEstimado" VARCHAR(20), "responsavelId" INT, "proximoContato" TIMESTAMP,
        observacoes TEXT, "createdBy" INT, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL, "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS contatos_crm (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "clienteId" INT, "leadId" INT,
        tipo VARCHAR(50) NOT NULL, descricao TEXT NOT NULL, resultado TEXT,
        "userId" INT, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Vendas
    """CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "clienteId" INT,
        numero VARCHAR(30) NOT NULL, status status_pedido DEFAULT 'rascunho' NOT NULL,
        "clienteNome" VARCHAR(255) NOT NULL, "valorTotal" VARCHAR(20) DEFAULT '0',
        desconto VARCHAR(20) DEFAULT '0', frete VARCHAR(20) DEFAULT '0',
        "formaPagamento" VARCHAR(100), "condicaoPagamento" VARCHAR(100),
        "previsaoEntrega" TIMESTAMP, observacoes TEXT, "vendedorId" INT,
        "createdBy" INT, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL, "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS itens_pedido (
        id SERIAL PRIMARY KEY, "pedidoId" INT NOT NULL, "produtoId" INT,
        descricao VARCHAR(255) NOT NULL, quantidade VARCHAR(20) NOT NULL,
        "valorUnitario" VARCHAR(20) NOT NULL, "valorTotal" VARCHAR(20) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS propostas (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "clienteId" INT, "leadId" INT,
        numero VARCHAR(30) NOT NULL, titulo VARCHAR(255) NOT NULL,
        status status_proposta DEFAULT 'rascunho' NOT NULL,
        "valorTotal" VARCHAR(20) DEFAULT '0', validade TIMESTAMP,
        descricao TEXT, condicoes TEXT, "vendedorId" INT, "createdBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS comissoes (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "vendedorId" INT NOT NULL,
        "pedidoId" INT, percentual VARCHAR(10) NOT NULL, "valorBase" VARCHAR(20) NOT NULL,
        "valorComissao" VARCHAR(20) NOT NULL, pago BOOLEAN DEFAULT FALSE NOT NULL,
        "dataPagamento" TIMESTAMP, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Permissões
    """CREATE TABLE IF NOT EXISTS modulo_permissoes (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, role user_role NOT NULL,
        modulo VARCHAR(100) NOT NULL, "podeVer" BOOLEAN DEFAULT FALSE NOT NULL,
        "podeCriar" BOOLEAN DEFAULT FALSE NOT NULL, "podeEditar" BOOLEAN DEFAULT FALSE NOT NULL,
        "podeDeletar" BOOLEAN DEFAULT FALSE NOT NULL, "podeExportar" BOOLEAN DEFAULT FALSE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS user_permissoes (
        id SERIAL PRIMARY KEY, "userId" INT NOT NULL, "empresaId" INT NOT NULL,
        modulo VARCHAR(100) NOT NULL, "podeVer" BOOLEAN DEFAULT FALSE NOT NULL,
        "podeCriar" BOOLEAN DEFAULT FALSE NOT NULL, "podeEditar" BOOLEAN DEFAULT FALSE NOT NULL,
        "podeDeletar" BOOLEAN DEFAULT FALSE NOT NULL, "podeExportar" BOOLEAN DEFAULT FALSE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Auditoria Detalhada
    """CREATE TABLE IF NOT EXISTS auditoria_detalhada (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "empresaId" INT, "userId" INT NOT NULL, "userName" VARCHAR(255),
        "userRole" VARCHAR(50), "tipoEvento" tipo_evento_auditoria NOT NULL,
        modulo VARCHAR(100), tabela VARCHAR(100), "registroId" INT,
        descricao TEXT NOT NULL, "dadosAntes" TEXT, "dadosDepois" TEXT,
        ip VARCHAR(45), "userAgent" TEXT, "sessionId" VARCHAR(100),
        risco VARCHAR(20) DEFAULT 'baixo',
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # TI
    """CREATE TABLE IF NOT EXISTS tickets_ti (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, protocolo VARCHAR(20) NOT NULL,
        "solicitanteId" INT NOT NULL, titulo VARCHAR(255) NOT NULL, descricao TEXT NOT NULL,
        categoria categoria_ticket_ti DEFAULT 'outro' NOT NULL,
        prioridade prioridade_ticket_ti DEFAULT 'media' NOT NULL,
        status status_ticket_ti DEFAULT 'aberto' NOT NULL,
        "responsavelId" INT, resolucao TEXT, "resolvidoEm" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS ativos_ti (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, tipo VARCHAR(100) NOT NULL,
        marca VARCHAR(100), modelo VARCHAR(100), patrimonio VARCHAR(50),
        serial VARCHAR(100), "responsavelId" INT, setor VARCHAR(100),
        status VARCHAR(50) DEFAULT 'ativo' NOT NULL,
        "dataAquisicao" TIMESTAMP, "garantiaAte" TIMESTAMP, observacoes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "deletedAt" TIMESTAMP
    )""",
    # BI
    """CREATE TABLE IF NOT EXISTS bi_dashboards (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, nome VARCHAR(255) NOT NULL,
        descricao TEXT, tipo VARCHAR(50) DEFAULT 'custom' NOT NULL,
        config TEXT, publico BOOLEAN DEFAULT FALSE NOT NULL, "createdBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS bi_widgets (
        id SERIAL PRIMARY KEY, "dashboardId" INT NOT NULL, "empresaId" INT NOT NULL,
        titulo VARCHAR(255) NOT NULL, tipo VARCHAR(50) NOT NULL,
        fonte VARCHAR(100) NOT NULL, metrica VARCHAR(100) NOT NULL,
        filtros TEXT, posicao INT DEFAULT 0, largura INT DEFAULT 6, altura INT DEFAULT 4,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Grupos Empresariais
    """CREATE TABLE IF NOT EXISTS grupos_empresariais (
        id SERIAL PRIMARY KEY, nome VARCHAR(255) NOT NULL, cnpj VARCHAR(18),
        descricao TEXT, "adminUserId" INT, ativo BOOLEAN DEFAULT TRUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS grupo_empresas (
        id SERIAL PRIMARY KEY, "grupoId" INT NOT NULL, "empresaId" INT NOT NULL,
        papel VARCHAR(20) DEFAULT 'filial' NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Sessões
    """CREATE TABLE IF NOT EXISTS sessoes (
        id SERIAL PRIMARY KEY, "userId" INT NOT NULL, token VARCHAR(500) NOT NULL,
        ip VARCHAR(45), "userAgent" TEXT, ativo BOOLEAN DEFAULT TRUE NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "lastActivityAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Ponto Eletrônico
    """CREATE TABLE IF NOT EXISTS registros_ponto (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "funcionarioId" INT NOT NULL,
        tipo tipo_ponto NOT NULL, "dataHora" TIMESTAMP DEFAULT NOW() NOT NULL,
        latitude VARCHAR(20), longitude VARCHAR(20), ip VARCHAR(45),
        foto TEXT, observacao TEXT, "ajustadoPor" INT, "motivoAjuste" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS banco_horas (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "funcionarioId" INT NOT NULL,
        data DATE NOT NULL, "horasTrabalhadas" VARCHAR(10), "horasExtras" VARCHAR(10),
        "horasDevidas" VARCHAR(10), saldo VARCHAR(10),
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Funil de Vendas
    """CREATE TABLE IF NOT EXISTS funis (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, nome VARCHAR(255) NOT NULL,
        descricao TEXT, ativo BOOLEAN DEFAULT TRUE NOT NULL, "createdBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS etapas_funil (
        id SERIAL PRIMARY KEY, "funilId" INT NOT NULL, "empresaId" INT NOT NULL,
        nome VARCHAR(255) NOT NULL, cor VARCHAR(20) DEFAULT '#3b82f6',
        posicao INT DEFAULT 0 NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS negociacoes (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "funilId" INT NOT NULL,
        "etapaId" INT NOT NULL, "clienteId" INT, "leadId" INT,
        titulo VARCHAR(255) NOT NULL, valor VARCHAR(20) DEFAULT '0',
        "responsavelId" INT, probabilidade INT DEFAULT 50,
        "previsaoFechamento" TIMESTAMP, "motivoPerda" TEXT, ganho BOOLEAN,
        observacoes TEXT, "createdBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "deletedAt" TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS atividades_funil (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "negociacaoId" INT NOT NULL,
        tipo VARCHAR(50) NOT NULL, titulo VARCHAR(255) NOT NULL, descricao TEXT,
        "dataAgendada" TIMESTAMP, concluida BOOLEAN DEFAULT FALSE NOT NULL,
        "userId" INT, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Integrações
    """CREATE TABLE IF NOT EXISTS integracoes (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, tipo VARCHAR(50) NOT NULL,
        nome VARCHAR(255) NOT NULL, status status_integracao DEFAULT 'configurando' NOT NULL,
        config TEXT, "webhookUrl" TEXT, "webhookSecret" VARCHAR(255),
        "ultimaSincronizacao" TIMESTAMP, "erroUltimo" TEXT,
        ativo BOOLEAN DEFAULT TRUE NOT NULL, "createdBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS log_integracoes (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "integracaoId" INT NOT NULL, "empresaId" INT NOT NULL,
        direcao VARCHAR(10) NOT NULL, endpoint VARCHAR(500),
        payload TEXT, resposta TEXT, "statusCode" INT,
        sucesso BOOLEAN DEFAULT TRUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS winthor_sync (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "integracaoId" INT NOT NULL,
        "tabelaOrigem" VARCHAR(100) NOT NULL, "tabelaDestino" VARCHAR(100) NOT NULL,
        "ultimoId" INT DEFAULT 0, "ultimaSincronizacao" TIMESTAMP,
        "registrosSincronizados" INT DEFAULT 0, ativo BOOLEAN DEFAULT TRUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL, "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    # Conferência de Veículos
    """CREATE TABLE IF NOT EXISTS conferencia_veiculos (
        id SERIAL PRIMARY KEY, "empresaId" INT NOT NULL, "veiculoId" INT NOT NULL,
        "motoristaId" INT, "viagemId" INT,
        status status_conferencia DEFAULT 'saida_registrada' NOT NULL,
        "despachanteSaidaId" INT, "dataSaida" TIMESTAMP, "kmSaida" VARCHAR(20),
        "observacoesSaida" TEXT,
        "despachanteRetornoId" INT, "dataRetorno" TIMESTAMP, "kmRetorno" VARCHAR(20),
        "observacoesRetorno" TEXT,
        "conferenteId" INT, "dataConferencia" TIMESTAMP,
        "cargaOk" BOOLEAN, "cargaObservacoes" TEXT,
        "avariasEncontradas" BOOLEAN DEFAULT FALSE, "avariasDescricao" TEXT,
        "batidasEncontradas" BOOLEAN DEFAULT FALSE, "batidasDescricao" TEXT,
        "pneusOk" BOOLEAN, "pneusObservacoes" TEXT,
        "limpezaOk" BOOLEAN, "documentosOk" BOOLEAN,
        "nivelCombustivel" VARCHAR(20), "observacoesConferencia" TEXT,
        "motoristaConfirmou" BOOLEAN DEFAULT FALSE,
        "motoristaConfirmouEm" TIMESTAMP, "motoristaContestacao" TEXT,
        "assinaturaMotorista" TEXT,
        "createdBy" INT, "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS fotos_conferencia (
        id SERIAL PRIMARY KEY, "conferenciaId" INT NOT NULL, "empresaId" INT NOT NULL,
        tipo VARCHAR(50) NOT NULL, descricao VARCHAR(255), url TEXT NOT NULL,
        momento VARCHAR(20) NOT NULL, "uploadedBy" INT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS itens_conferencia (
        id SERIAL PRIMARY KEY, "conferenciaId" INT NOT NULL,
        item VARCHAR(255) NOT NULL, conforme BOOLEAN, observacao TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
    )""",
]

print("Criando tabelas...")
for sql in tables:
    try:
        cur.execute(sql)
        tname = sql.split("IF NOT EXISTS ")[1].split(" (")[0].strip()
        print(f"  {tname}: OK")
    except Exception as e:
        print(f"  ERRO: {e}")
        conn.rollback()
        conn.autocommit = True

cur.close()
conn.close()
print("\nTodas as tabelas criadas com sucesso!")
