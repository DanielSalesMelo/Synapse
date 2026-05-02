CREATE TABLE IF NOT EXISTS master_home_items (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'casa',
  status TEXT NOT NULL DEFAULT 'pendente',
  prioridade TEXT NOT NULL DEFAULT 'media',
  "dataAlvo" TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_habits (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  frequencia TEXT NOT NULL DEFAULT 'diaria',
  meta TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  "ultimoCheckin" TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_meetings (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente',
  inicio TIMESTAMPTZ NULL,
  local TEXT NULL,
  pauta TEXT NULL,
  status TEXT NOT NULL DEFAULT 'agendada',
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_vendors (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'fornecedor',
  contato TEXT NULL,
  whatsapp TEXT NULL,
  email TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_content_plans (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'instagram',
  status TEXT NOT NULL DEFAULT 'ideia',
  "dataPublicacao" TIMESTAMPTZ NULL,
  objetivo TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_weekly_routines (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semana DATE NOT NULL,
  area TEXT NOT NULL DEFAULT 'vida',
  foco TEXT NOT NULL,
  rotina TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ativa',
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_product_ideas (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'synapse',
  impacto TEXT NULL,
  status TEXT NOT NULL DEFAULT 'backlog',
  descricao TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_client_deliveries (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  prazo TIMESTAMPTZ NULL,
  responsavel TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_partnerships (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'parceria',
  status TEXT NOT NULL DEFAULT 'lead',
  contato TEXT NULL,
  beneficio TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_document_registers (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'documento',
  status TEXT NOT NULL DEFAULT 'ativo',
  link TEXT NULL,
  "dataRevisao" TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_master_home_items_owner ON master_home_items ("ownerUserId", status, "dataAlvo");
CREATE INDEX IF NOT EXISTS idx_master_habits_owner ON master_habits ("ownerUserId", status, "ultimoCheckin");
CREATE INDEX IF NOT EXISTS idx_master_meetings_owner ON master_meetings ("ownerUserId", status, inicio);
CREATE INDEX IF NOT EXISTS idx_master_vendors_owner ON master_vendors ("ownerUserId", status);
CREATE INDEX IF NOT EXISTS idx_master_content_plans_owner ON master_content_plans ("ownerUserId", status, "dataPublicacao");
CREATE INDEX IF NOT EXISTS idx_master_weekly_routines_owner ON master_weekly_routines ("ownerUserId", semana DESC);
CREATE INDEX IF NOT EXISTS idx_master_product_ideas_owner ON master_product_ideas ("ownerUserId", status);
CREATE INDEX IF NOT EXISTS idx_master_client_deliveries_owner ON master_client_deliveries ("ownerUserId", status, prazo);
CREATE INDEX IF NOT EXISTS idx_master_partnerships_owner ON master_partnerships ("ownerUserId", status);
CREATE INDEX IF NOT EXISTS idx_master_document_registers_owner ON master_document_registers ("ownerUserId", status, "dataRevisao");
