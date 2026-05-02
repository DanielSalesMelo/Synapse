DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_integracao') THEN
    CREATE TYPE status_integracao AS ENUM ('ativa', 'inativa', 'erro', 'configurando');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS integracoes (
  id serial PRIMARY KEY,
  "empresaId" integer NOT NULL,
  tipo varchar(50) NOT NULL,
  nome varchar(255) NOT NULL,
  status_integracao status_integracao NOT NULL DEFAULT 'configurando',
  config text,
  "webhookUrl" text,
  "webhookSecret" varchar(255),
  "ultimaSincronizacao" timestamp,
  "erroUltimo" text,
  ativo boolean NOT NULL DEFAULT true,
  "createdBy" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integracoes_empresa_tipo
  ON integracoes ("empresaId", tipo);

