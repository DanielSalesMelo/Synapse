CREATE TABLE IF NOT EXISTS master_goals (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'synapse',
  status TEXT NOT NULL DEFAULT 'ativa',
  meta TEXT NULL,
  progresso INTEGER NOT NULL DEFAULT 0,
  prazo TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_decisions (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  contexto TEXT NULL,
  decisao TEXT NOT NULL,
  impacto TEXT NULL,
  status TEXT NOT NULL DEFAULT 'vigente',
  "dataDecisao" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_asset_library (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'arquivo',
  link TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  tags TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_automation_rules (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  gatilho TEXT NOT NULL,
  acao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa',
  area TEXT NOT NULL DEFAULT 'synapse',
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_client_health_checks (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'atencao',
  nota INTEGER NOT NULL DEFAULT 3,
  risco TEXT NULL,
  proximaAcao TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_research_items (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  fonte TEXT NULL,
  categoria TEXT NOT NULL DEFAULT 'mercado',
  status TEXT NOT NULL DEFAULT 'aberto',
  resumo TEXT NULL,
  link TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_support_items (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'cliente',
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'aberto',
  responsavel TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_benchmark_items (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concorrente TEXT NOT NULL,
  modulo TEXT NOT NULL,
  diferencial TEXT NULL,
  gap TEXT NULL,
  prioridade TEXT NOT NULL DEFAULT 'media',
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_learning_materials (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'curso',
  link TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  progresso INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_kpi_snapshots (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referencia TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  area TEXT NOT NULL DEFAULT 'synapse',
  indicador TEXT NOT NULL,
  valor TEXT NOT NULL,
  meta TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_master_goals_owner ON master_goals ("ownerUserId", status, prazo);
CREATE INDEX IF NOT EXISTS idx_master_decisions_owner ON master_decisions ("ownerUserId", "dataDecisao" DESC);
CREATE INDEX IF NOT EXISTS idx_master_asset_library_owner ON master_asset_library ("ownerUserId", status);
CREATE INDEX IF NOT EXISTS idx_master_automation_rules_owner ON master_automation_rules ("ownerUserId", status, area);
CREATE INDEX IF NOT EXISTS idx_master_client_health_checks_owner ON master_client_health_checks ("ownerUserId", status, nota);
CREATE INDEX IF NOT EXISTS idx_master_research_items_owner ON master_research_items ("ownerUserId", status, categoria);
CREATE INDEX IF NOT EXISTS idx_master_support_items_owner ON master_support_items ("ownerUserId", status, prioridade);
CREATE INDEX IF NOT EXISTS idx_master_benchmark_items_owner ON master_benchmark_items ("ownerUserId", modulo, prioridade);
CREATE INDEX IF NOT EXISTS idx_master_learning_materials_owner ON master_learning_materials ("ownerUserId", status, progresso);
CREATE INDEX IF NOT EXISTS idx_master_kpi_snapshots_owner ON master_kpi_snapshots ("ownerUserId", referencia DESC, area);
