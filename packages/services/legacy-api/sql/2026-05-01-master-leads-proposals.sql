CREATE TABLE IF NOT EXISTS master_leads (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  contato VARCHAR(255),
  whatsapp VARCHAR(30),
  email VARCHAR(320),
  origem VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'novo',
  interesse TEXT,
  "proximaAcao" TEXT,
  observacoes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_leads_owner ON master_leads("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_leads_status ON master_leads(status);

CREATE TABLE IF NOT EXISTS master_proposals (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER REFERENCES master_clients(id) ON DELETE SET NULL,
  "leadId" INTEGER REFERENCES master_leads(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  valor NUMERIC(12,2),
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  validade DATE,
  descricao TEXT,
  observacoes TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_proposals_owner ON master_proposals("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_proposals_status ON master_proposals(status);
