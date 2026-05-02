CREATE TABLE IF NOT EXISTS master_health_logs (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referencia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  humor INTEGER NULL,
  energia INTEGER NULL,
  "sonoHoras" NUMERIC(10,2) NULL,
  "pesoKg" NUMERIC(10,2) NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_college_tasks (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  disciplina TEXT NOT NULL,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'a_fazer',
  prazo TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_projects (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'synapse',
  status TEXT NOT NULL DEFAULT 'planejamento',
  progresso INTEGER NOT NULL DEFAULT 0,
  descricao TEXT NULL,
  "proximaEntrega" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_ai_notes (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NULL,
  conteudo TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_daily_plans (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referencia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "focoPrincipal" TEXT NOT NULL,
  top3 TEXT NULL,
  manha TEXT NULL,
  tarde TEXT NULL,
  noite TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_master_health_logs_owner ON master_health_logs ("ownerUserId", referencia DESC);
CREATE INDEX IF NOT EXISTS idx_master_college_tasks_owner ON master_college_tasks ("ownerUserId", status, prazo);
CREATE INDEX IF NOT EXISTS idx_master_projects_owner ON master_projects ("ownerUserId", status);
CREATE INDEX IF NOT EXISTS idx_master_ai_notes_owner ON master_ai_notes ("ownerUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_master_daily_plans_owner ON master_daily_plans ("ownerUserId", referencia DESC);
