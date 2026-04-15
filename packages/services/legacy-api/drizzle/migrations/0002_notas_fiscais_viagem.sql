-- Migration: criar tabela notas_fiscais_viagem
-- Rastreamento de entregas por NF vinculadas a viagens

DO $$ BEGIN
  CREATE TYPE "status_nf" AS ENUM ('pendente', 'entregue', 'devolvida', 'parcial', 'extraviada');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notas_fiscais_viagem" (
  "id"                SERIAL PRIMARY KEY,
  "empresaId"         INTEGER NOT NULL,
  "viagemId"          INTEGER NOT NULL,
  "numeroNf"          VARCHAR(20) NOT NULL,
  "serie"             VARCHAR(5),
  "chaveAcesso"       VARCHAR(44),
  "destinatario"      VARCHAR(255),
  "cnpjDestinatario"  VARCHAR(18),
  "enderecoEntrega"   VARCHAR(500),
  "cidade"            VARCHAR(100),
  "uf"                VARCHAR(2),
  "valorNf"           DECIMAL(12, 2),
  "pesoKg"            DECIMAL(8, 2),
  "volumes"           INTEGER,
  "status"            "status_nf" NOT NULL DEFAULT 'pendente',
  "dataCanhoto"       TIMESTAMP,
  "dataEntrega"       TIMESTAMP,
  "recebidoPor"       VARCHAR(255),
  "motivoDevolucao"   TEXT,
  "observacoes"       TEXT,
  "ordemEntrega"      INTEGER,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "deletedAt"         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_nfv_viagem" ON "notas_fiscais_viagem" ("viagemId");
CREATE INDEX IF NOT EXISTS "idx_nfv_empresa" ON "notas_fiscais_viagem" ("empresaId");
CREATE INDEX IF NOT EXISTS "idx_nfv_numero" ON "notas_fiscais_viagem" ("numeroNf");
