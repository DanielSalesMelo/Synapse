-- Adiciona colunas faltantes na tabela users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "empresaId" integer;
