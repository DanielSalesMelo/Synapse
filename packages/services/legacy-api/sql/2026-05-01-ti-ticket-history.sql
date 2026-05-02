DO $$
BEGIN
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'triagem_ia';
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'aguardando_usuario';
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'aguardando_ti';
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'acesso_remoto_solicitado';
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'em_acesso_remoto';
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'encerrado';
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'cancelado';
  ALTER TYPE status_ticket_ti ADD VALUE IF NOT EXISTS 'reaberto';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES tickets_ti(id) ON DELETE CASCADE,
  "empresaId" INTEGER NOT NULL,
  "changedBy" INTEGER,
  "fromStatus" VARCHAR(50),
  "toStatus" VARCHAR(50) NOT NULL,
  motivo TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_status_history_ticket ON ticket_status_history("ticketId");
CREATE INDEX IF NOT EXISTS idx_ticket_status_history_empresa ON ticket_status_history("empresaId");

CREATE TABLE IF NOT EXISTS ticket_internal_notes (
  id SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES tickets_ti(id) ON DELETE CASCADE,
  "empresaId" INTEGER NOT NULL,
  "autorId" INTEGER,
  conteudo TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_internal_notes_ticket ON ticket_internal_notes("ticketId");

CREATE TABLE IF NOT EXISTS remote_access_requests (
  id SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL REFERENCES tickets_ti(id) ON DELETE CASCADE,
  "empresaId" INTEGER NOT NULL,
  "solicitadoPor" INTEGER,
  "autorizadoPor" INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'solicitado',
  "anydeskId" VARCHAR(50),
  consentimento BOOLEAN,
  "solicitadoEm" TIMESTAMP NOT NULL DEFAULT NOW(),
  "autorizadoEm" TIMESTAMP,
  "encerradoEm" TIMESTAMP,
  observacoes TEXT
);

CREATE INDEX IF NOT EXISTS idx_remote_access_requests_ticket ON remote_access_requests("ticketId");
