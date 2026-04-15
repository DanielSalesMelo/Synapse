-- Adiciona valor 'grupo' ao enum tipo_empresa (empresas do mesmo dono, CNPJs diferentes)
-- Usa IF NOT EXISTS para ser idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'grupo'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_empresa')
  ) THEN
    ALTER TYPE tipo_empresa ADD VALUE 'grupo';
  END IF;
END$$;

-- Adiciona coluna grupoId na tabela empresas (se não existir)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS "grupoId" INTEGER;

-- Índice para buscas por grupo
CREATE INDEX IF NOT EXISTS idx_empresas_grupoId ON empresas("grupoId");
