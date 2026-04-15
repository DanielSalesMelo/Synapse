CREATE TYPE "tipo_documento" AS ENUM('cnh', 'crlv', 'aso', 'mopp', 'nota_fiscais', 'seguro', 'licenciamento', 'contrato', 'outro');

CREATE TABLE IF NOT EXISTS "documentos" (
"id" serial PRIMARY KEY NOT NULL,
"empresaId" integer NOT NULL,
"tipo" "tipo_documento" NOT NULL,
"nome" varchar(255) NOT NULL,
"url" text NOT NULL,
"extensao" varchar(10),
"tamanho" integer,
"veiculoId" integer,
"funcionarioId" integer,
"viagemId" integer,
"manutencaoId" integer,
"dataVencimento" date,
"observacoes" text,
"createdAt" timestamp DEFAULT now() NOT NULL,
"updatedAt" timestamp DEFAULT now() NOT NULL,
"deletedAt" timestamp,
"deletedBy" integer
);
