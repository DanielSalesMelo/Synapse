CREATE TABLE IF NOT EXISTS master_clients (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  contato VARCHAR(255),
  whatsapp VARCHAR(30),
  email VARCHAR(320),
  servicos TEXT,
  "valorMensal" NUMERIC(12,2),
  status VARCHAR(30) NOT NULL DEFAULT 'lead',
  "dataInicio" DATE,
  "proximaAcao" TEXT,
  observacoes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_clients_owner ON master_clients("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_clients_status ON master_clients(status);

CREATE TABLE IF NOT EXISTS master_tasks (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER REFERENCES master_clients(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  area VARCHAR(30) NOT NULL DEFAULT 'synapse',
  status VARCHAR(30) NOT NULL DEFAULT 'a_fazer',
  prioridade VARCHAR(20) NOT NULL DEFAULT 'media',
  periodo VARCHAR(20) NOT NULL DEFAULT 'manha',
  "dataLimite" TIMESTAMP,
  "concluidaEm" TIMESTAMP,
  ordem INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_tasks_owner ON master_tasks("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_tasks_status ON master_tasks(status);
CREATE INDEX IF NOT EXISTS idx_master_tasks_deadline ON master_tasks("dataLimite");

CREATE TABLE IF NOT EXISTS master_financial_transactions (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER REFERENCES master_clients(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL,
  categoria VARCHAR(100),
  descricao VARCHAR(255) NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  vencimento DATE,
  "pagoEm" TIMESTAMP,
  "formaPagamento" VARCHAR(50),
  observacoes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_financial_owner ON master_financial_transactions("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_financial_vencimento ON master_financial_transactions(vencimento);
CREATE INDEX IF NOT EXISTS idx_master_financial_status ON master_financial_transactions(status);

CREATE TABLE IF NOT EXISTS master_calendar_events (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER REFERENCES master_clients(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  area VARCHAR(30) NOT NULL DEFAULT 'vida',
  tipo VARCHAR(50) NOT NULL DEFAULT 'compromisso',
  inicio TIMESTAMP NOT NULL,
  fim TIMESTAMP,
  local VARCHAR(255),
  "lembreteMinutos" INTEGER DEFAULT 30,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_calendar_owner ON master_calendar_events("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_calendar_inicio ON master_calendar_events(inicio);

CREATE TABLE IF NOT EXISTS master_reminders (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  "lembrarEm" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_reminders_owner ON master_reminders("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_reminders_when ON master_reminders("lembrarEm");
