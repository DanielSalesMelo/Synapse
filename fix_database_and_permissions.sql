-- ═══════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE CORREÇÃO DE BANCO DE DADOS E PERMISSÕES - SYNAPSE
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. ATUALIZAR ENUM DE ROLES (Adicionar novos perfis)
DO $$ BEGIN
    ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'ti_master';
    ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'financeiro';
    ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'comercial';
    ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'motorista';
    ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'operador_wms';
    ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'rh';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. GARANTIR COLUNAS FALTANTES NA TABELA USERS
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "empresaId" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'approved' NOT NULL;

-- 3. GARANTIR COLUNAS FALTANTES NA TABELA EMPRESAS
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "codigoConvite" VARCHAR(50);
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "tipoEmpresa" VARCHAR(50) DEFAULT 'independente';
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "matrizId" INTEGER;
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "grupoId" INTEGER;
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN DEFAULT TRUE;

-- 4. CRIAR TABELAS DE PERMISSÕES SE NÃO EXISTIREM
CREATE TABLE IF NOT EXISTS "modulo_permissoes" (
  "id" SERIAL PRIMARY KEY,
  "empresaId" INTEGER NOT NULL,
  "role" VARCHAR(50) NOT NULL,
  "modulo" VARCHAR(100) NOT NULL,
  "podeVer" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeCriar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeEditar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeDeletar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeExportar" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "user_permissoes" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "empresaId" INTEGER NOT NULL,
  "modulo" VARCHAR(100) NOT NULL,
  "podeVer" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeCriar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeEditar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeDeletar" BOOLEAN NOT NULL DEFAULT FALSE,
  "podeExportar" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. CORREÇÃO DE PERMISSÕES: Garantir que usuários comuns tenham permissão de criação
-- Primeiro, limpa permissões genéricas para evitar duplicidade
DELETE FROM "modulo_permissoes" WHERE "role" IN ('user', 'dispatcher', 'monitor', 'financeiro', 'rh', 'comercial');

-- Adiciona permissões básicas para cada role
INSERT INTO "modulo_permissoes" ("empresaId", "role", "modulo", "podeVer", "podeCriar", "podeEditar", "podeDeletar")
SELECT e.id, r.role, m.modulo, TRUE, TRUE, TRUE, FALSE
FROM "empresas" e
CROSS JOIN (SELECT unnest(ARRAY['user', 'dispatcher', 'monitor', 'financeiro', 'rh', 'comercial']) as role) r
CROSS JOIN (SELECT unnest(ARRAY['dashboard', 'frota', 'viagens', 'funcionarios', 'financeiro', 'wms', 'recepcionista', 'logistica', 'crm', 'vendas', 'chat', 'ia', 'tarefas']) as modulo) m
ON CONFLICT DO NOTHING;

-- 6. ATUALIZAR STATUS DE USUÁRIOS PENDENTES (Opcional, mas ajuda se houver travamentos)
UPDATE "users" SET "status" = 'approved' WHERE "status" = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM DO SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════
