CREATE TABLE IF NOT EXISTS master_landing_pages (
  id SERIAL PRIMARY KEY,
  "ownerUserId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "clientId" INTEGER REFERENCES master_clients(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  url VARCHAR(500),
  dominio VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
  "dataPublicacao" DATE,
  "formularioOk" BOOLEAN NOT NULL DEFAULT FALSE,
  "whatsappOk" BOOLEAN NOT NULL DEFAULT FALSE,
  "pixelInstalado" BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  melhorias TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_landing_pages_owner ON master_landing_pages("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_master_landing_pages_client ON master_landing_pages("clientId");
CREATE INDEX IF NOT EXISTS idx_master_landing_pages_status ON master_landing_pages(status);
