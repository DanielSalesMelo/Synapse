-- Migration: Add empresaId to users table for multi-tenant support
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "empresaId" integer;

-- Update existing admin users to empresa 1 (empresa padrão)
UPDATE "users" SET "empresaId" = 1 WHERE "role" IN ('admin') AND "empresaId" IS NULL;
-- master_admin stays NULL (can see all companies)
