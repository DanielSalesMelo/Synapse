CREATE TABLE IF NOT EXISTS master_module_entries (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER NULL REFERENCES master_clients(id) ON DELETE SET NULL,
  "moduleKey" TEXT NOT NULL,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  "dataRef" TIMESTAMPTZ NULL,
  "campoA" TEXT NULL,
  "campoB" TEXT NULL,
  "campoC" TEXT NULL,
  observacoes TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_master_module_entries_owner ON master_module_entries ("ownerUserId", "moduleKey", status, "dataRef");
