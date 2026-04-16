-- Tabela para gerenciar certificados digitais
CREATE TABLE IF NOT EXISTS "certificados_ti" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "tipo" VARCHAR(50) NOT NULL, -- A1, A3, SSL, etc.
  "vencimento" TIMESTAMP NOT NULL,
  "senha" TEXT, -- Senha do certificado (armazenada de forma simples por enquanto, conforme solicitado)
  "observacoes" TEXT,
  "alertaEnviado" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "deletedAt" TIMESTAMP
);

-- Index para busca por empresa
CREATE INDEX IF NOT EXISTS "certificados_ti_empresa_id_idx" ON "certificados_ti" ("empresaId");
