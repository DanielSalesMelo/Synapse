CREATE TABLE IF NOT EXISTS import_batches (
  id SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  modulo VARCHAR(100) NOT NULL,
  "fileName" VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'preview',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "validRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  preview JSONB,
  errors JSONB,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_empresa_modulo
  ON import_batches ("empresaId", modulo, "createdAt" DESC);

CREATE TABLE IF NOT EXISTS simulation_history (
  id SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  "distanceKm" NUMERIC(10,2),
  "durationSec" INTEGER,
  "idaVolta" BOOLEAN NOT NULL DEFAULT FALSE,
  consumo NUMERIC(10,2),
  "precoCombustivel" NUMERIC(10,2),
  pedagio NUMERIC(10,2),
  "outrosCustos" NUMERIC(10,2),
  "valorFrete" NUMERIC(10,2),
  "custoTotal" NUMERIC(10,2),
  lucro NUMERIC(10,2),
  margem NUMERIC(10,2),
  "rotaResumo" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_history_empresa_created
  ON simulation_history ("empresaId", "createdAt" DESC);
