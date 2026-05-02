CREATE TABLE IF NOT EXISTS omnichannel_conversations (
  id SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  provider VARCHAR(30) NOT NULL,
  "externalId" VARCHAR(255) NOT NULL,
  "displayName" VARCHAR(255),
  phone VARCHAR(30),
  username VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ativa',
  "assignedUserId" INTEGER,
  metadata JSONB,
  "lastMessageAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_omnichannel_conversations_provider_external
  ON omnichannel_conversations ("empresaId", provider, "externalId");

CREATE TABLE IF NOT EXISTS omnichannel_messages (
  id SERIAL PRIMARY KEY,
  "conversationId" INTEGER NOT NULL REFERENCES omnichannel_conversations(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  "externalMessageId" VARCHAR(255),
  "senderName" VARCHAR(255),
  content TEXT,
  "messageType" VARCHAR(20) NOT NULL DEFAULT 'text',
  "mediaUrl" TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'recebida',
  payload JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_omnichannel_messages_conversation
  ON omnichannel_messages ("conversationId", "createdAt");

ALTER TABLE compras_ti
  ADD COLUMN IF NOT EXISTS "aprovadorId" INTEGER,
  ADD COLUMN IF NOT EXISTS "aprovadoEm" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "nivelAlcada" INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "valorTotal" NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS "observacaoAprovacao" TEXT;

CREATE TABLE IF NOT EXISTS compras_ti_historico (
  id SERIAL PRIMARY KEY,
  "compraId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "userId" INTEGER,
  acao VARCHAR(50) NOT NULL,
  "statusAnterior" VARCHAR(30),
  "statusNovo" VARCHAR(30),
  observacao TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
