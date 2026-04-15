-- ============================================================
-- ROTIQ - Migrações Adicionais PostgreSQL
-- Compatível com PostgreSQL 14+
-- ============================================================

ALTER TABLE "viagens" ADD "tipo" text DEFAULT 'viagem' NOT NULL;ALTER TABLE "viagens" ADD "tipoCarga" text;ALTER TABLE "viagens" ADD "teveProblema" boolean DEFAULT FALSE;ALTER TABLE "viagens" ADD "voltouComCarga" boolean DEFAULT FALSE;ALTER TABLE "viagens" ADD "observacoesChegada" text;