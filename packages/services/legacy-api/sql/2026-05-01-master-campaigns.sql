CREATE TABLE IF NOT EXISTS master_campaigns (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER REFERENCES master_clients(id) ON DELETE SET NULL,
  plataforma VARCHAR(50) NOT NULL DEFAULT 'meta_ads',
  nome VARCHAR(255) NOT NULL,
  objetivo VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'ativa',
  orcamento NUMERIC(12,2),
  "custoPorLead" NUMERIC(12,2),
  "ultimaRevisao" DATE,
  "proximaRevisao" DATE,
  resultado TEXT,
  pendencias TEXT,
  observacoes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_campaigns_owner ON master_campaigns("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_campaigns_client ON master_campaigns("clientId");
CREATE INDEX IF NOT EXISTS idx_master_campaigns_status ON master_campaigns(status);
