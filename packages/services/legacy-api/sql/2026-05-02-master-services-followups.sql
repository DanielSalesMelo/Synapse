CREATE TABLE IF NOT EXISTS master_services (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  checklist TEXT NULL,
  "valorMensal" NUMERIC(12,2) NULL,
  "proximaRevisao" TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_google_business_profiles (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  perfil TEXT NOT NULL,
  "linkPerfil" TEXT NULL,
  "ultimaAtualizacao" TIMESTAMPTZ NULL,
  "fotosPendentes" BOOLEAN NOT NULL DEFAULT FALSE,
  "avaliacoesPendentes" BOOLEAN NOT NULL DEFAULT FALSE,
  "postagemSemanal" BOOLEAN NOT NULL DEFAULT FALSE,
  "servicosAtualizados" BOOLEAN NOT NULL DEFAULT FALSE,
  "palavrasChave" TEXT NULL,
  "relatorioMensal" BOOLEAN NOT NULL DEFAULT FALSE,
  "checklistOtimizacao" TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_follow_ups (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  "leadId" INTEGER NULL REFERENCES master_leads(id) ON DELETE SET NULL,
  "proposalId" INTEGER NULL REFERENCES master_proposals(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'pendente',
  "dataPrevista" TIMESTAMPTZ NULL,
  resposta TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_payment_schedules (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  recorrencia TEXT NOT NULL DEFAULT 'mensal',
  vencimento TIMESTAMPTZ NULL,
  "ultimaCobranca" TIMESTAMPTZ NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS master_synapse_releases (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  versao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planejada',
  "dataPrevista" TIMESTAMPTZ NULL,
  destaques TEXT NULL,
  riscos TEXT NULL,
  "deployStatus" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_master_services_owner ON master_services ("ownerUserId", status, "proximaRevisao");
CREATE INDEX IF NOT EXISTS idx_master_google_profiles_owner ON master_google_business_profiles ("ownerUserId", "ultimaAtualizacao" DESC);
CREATE INDEX IF NOT EXISTS idx_master_follow_ups_owner ON master_follow_ups ("ownerUserId", status, "dataPrevista");
CREATE INDEX IF NOT EXISTS idx_master_payment_schedules_owner ON master_payment_schedules ("ownerUserId", status, vencimento);
CREATE INDEX IF NOT EXISTS idx_master_synapse_releases_owner ON master_synapse_releases ("ownerUserId", status, "dataPrevista");
