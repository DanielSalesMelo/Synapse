BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS "deletedAt" timestamp,
  ADD COLUMN IF NOT EXISTS "deletedBy" integer,
  ADD COLUMN IF NOT EXISTS "deleteReason" text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'empresas'
      AND column_name = 'matrizid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'empresas'
      AND column_name = 'matrizId'
  ) THEN
    ALTER TABLE public.empresas RENAME COLUMN matrizid TO "matrizId";
  END IF;
END $$;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS "tipoEmpresa" varchar(20) NOT NULL DEFAULT 'independente';
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS "parent_id" integer;
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS "grupoId" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'empresas'
      AND constraint_name = 'empresas_parent_id_fkey'
  ) THEN
    ALTER TABLE public.empresas
      ADD CONSTRAINT empresas_parent_id_fkey
      FOREIGN KEY ("parent_id") REFERENCES public.empresas(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.grupos_empresariais (
  id serial PRIMARY KEY,
  nome varchar(255) NOT NULL,
  cnpj varchar(18),
  descricao text,
  "adminUserId" integer,
  ativo boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp,
  "deletedBy" integer,
  "deleteReason" text
);

CREATE TABLE IF NOT EXISTS public.user_company_access (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "empresaId" integer NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  "roleCode" varchar(50) NOT NULL,
  "canViewGroup" boolean NOT NULL DEFAULT false,
  "isDefault" boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  "createdBy" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp,
  "deletedBy" integer,
  "deleteReason" text
);

CREATE INDEX IF NOT EXISTS idx_user_company_access_user
  ON public.user_company_access ("userId");
CREATE INDEX IF NOT EXISTS idx_user_company_access_empresa
  ON public.user_company_access ("empresaId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_company_access_active_unique
  ON public.user_company_access ("userId", "empresaId", "roleCode")
  WHERE "deletedAt" IS NULL;

CREATE TABLE IF NOT EXISTS public.modulo_permissoes (
  id serial PRIMARY KEY,
  "empresaId" integer NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  "roleCode" varchar(50) NOT NULL,
  modulo varchar(100) NOT NULL,
  "podeVer" boolean NOT NULL DEFAULT false,
  "podeCriar" boolean NOT NULL DEFAULT false,
  "podeEditar" boolean NOT NULL DEFAULT false,
  "podeDeletar" boolean NOT NULL DEFAULT false,
  "podeExportar" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_modulo_permissoes_role
  ON public.modulo_permissoes ("empresaId", "roleCode", modulo);

DO $$
BEGIN
  CREATE TYPE public.tipo_evento_auditoria AS ENUM (
    'login',
    'logout',
    'create',
    'update',
    'delete',
    'restore',
    'export',
    'import',
    'permission_change',
    'config_change',
    'access_denied',
    'password_change',
    'role_change'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.auditoria_detalhada (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "empresaId" integer,
  "userId" integer NOT NULL,
  "userName" varchar(255),
  "userRole" varchar(50),
  "tipoEvento" public.tipo_evento_auditoria NOT NULL,
  modulo varchar(100),
  tabela varchar(100),
  "registroId" integer,
  descricao text NOT NULL,
  "dadosAntes" text,
  "dadosDepois" text,
  ip varchar(45),
  "userAgent" text,
  "sessionId" varchar(100),
  risco varchar(20) DEFAULT 'baixo',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_detalhada_empresa
  ON public.auditoria_detalhada ("empresaId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_auditoria_detalhada_user
  ON public.auditoria_detalhada ("userId", "createdAt");

CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "empresaId" integer,
  "userId" integer,
  tipo varchar(50) NOT NULL,
  titulo varchar(255) NOT NULL,
  mensagem text NOT NULL,
  payload jsonb,
  "readAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp
);

CREATE INDEX IF NOT EXISTS idx_notifications_empresa
  ON public.notifications ("empresaId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications ("userId", "readAt");

INSERT INTO public.grupos_empresariais (id, nome, ativo, "createdAt", "updatedAt")
SELECT DISTINCT ge."grupoId", CONCAT('Grupo ', ge."grupoId"), true, now(), now()
FROM public.grupo_empresas ge
WHERE NOT EXISTS (
  SELECT 1
  FROM public.grupos_empresariais g
  WHERE g.id = ge."grupoId"
);

SELECT setval(
  pg_get_serial_sequence('public.grupos_empresariais', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM public.grupos_empresariais), 1), 1),
  true
);

UPDATE public.empresas e
SET "grupoId" = ge."grupoId"
FROM public.grupo_empresas ge
WHERE ge."empresaId" = e.id
  AND e."grupoId" IS NULL;

INSERT INTO public.user_company_access (
  "userId",
  "empresaId",
  "roleCode",
  "canViewGroup",
  "isDefault",
  ativo,
  "createdAt",
  "updatedAt"
)
SELECT
  u.id,
  u."empresaId",
  CASE
    WHEN u.role = 'master_admin' THEN 'master_admin'
    WHEN u.role = 'admin' THEN 'admin_empresa'
    WHEN u.role = 'dispatcher' THEN 'despachante'
    WHEN u.role = 'monitor' THEN 'operacional'
    ELSE 'leitor'
  END,
  false,
  true,
  true,
  now(),
  now()
FROM public.users u
WHERE u."empresaId" IS NOT NULL
  AND u."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_company_access a
    WHERE a."userId" = u.id
      AND a."empresaId" = u."empresaId"
      AND a."deletedAt" IS NULL
  );

COMMIT;
