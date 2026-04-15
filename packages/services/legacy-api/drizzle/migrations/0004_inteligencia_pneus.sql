CREATE TYPE "status_pneu" AS ENUM('novo', 'em_uso', 'recapado', 'sucata', 'estoque');

CREATE TABLE IF NOT EXISTS "pneus" (
"id" serial PRIMARY KEY NOT NULL,
"empresaId" integer NOT NULL,
"numeroSerie" varchar(50) NOT NULL,
"marca" varchar(100),
"modelo" varchar(100),
"medida" varchar(50),
"kmInicial" integer DEFAULT 0,
"kmAtual" integer DEFAULT 0,
"status" "status_pneu" DEFAULT 'novo' NOT NULL,
"veiculoId" integer,
"posicao" varchar(50),
"dataAquisicao" date,
"valorAquisicao" numeric(10, 2),
"observacoes" text,
"createdAt" timestamp DEFAULT now() NOT NULL,
"updatedAt" timestamp DEFAULT now() NOT NULL,
"deletedAt" timestamp,
"deletedBy" integer,
"deleteReason" text
);

CREATE TABLE IF NOT EXISTS "historico_pneus" (
"id" serial PRIMARY KEY NOT NULL,
"empresaId" integer NOT NULL,
"pneuId" integer NOT NULL,
"data" timestamp DEFAULT now() NOT NULL,
"tipo" varchar(50) NOT NULL,
"veiculoId" integer,
"posicao" varchar(50),
"kmVeiculo" integer,
"kmPneu" integer,
"custo" numeric(10, 2),
"observacoes" text,
"createdAt" timestamp DEFAULT now() NOT NULL
);
