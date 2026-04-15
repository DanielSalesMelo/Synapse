-- Add tipo_empresa enum type
CREATE TYPE tipo_empresa AS ENUM ('independente', 'matriz', 'filial');

-- Add tipoEmpresa and matrizId columns to empresas table
ALTER TABLE empresas ADD COLUMN tipoEmpresa tipo_empresa DEFAULT 'independente' NOT NULL;
ALTER TABLE empresas ADD COLUMN matrizId INTEGER;

-- Create index for faster lookups by matriz
CREATE INDEX idx_empresas_matrizId ON empresas(matrizId);
