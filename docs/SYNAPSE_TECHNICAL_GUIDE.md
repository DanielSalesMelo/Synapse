# Synapse Technical Guide

## Arquitetura atual
- Frontend: Vercel, React + Vite
- Backend: Azure App Service, Node + Express + tRPC
- Banco em producao: Neon Postgres
- Workspace local: `C:\Dev\Synapse`

## Banco oficial atual
- O ambiente publicado hoje usa a `DATABASE_URL` configurada no Azure.
- Essa URL aponta para Neon Postgres.
- O banco em producao precisa ser tratado como fonte de verdade atual.

## Estrutura principal
- `src/`: frontend
- `packages/services/legacy-api/`: backend
- `prisma/schema.prisma`: schema Prisma alinhado com a base SaaS atual
- `packages/services/legacy-api/drizzle/schema.ts`: schema Drizzle usado pelo backend
- `packages/services/legacy-api/sql/`: migrations SQL aplicadas manualmente

## Autenticacao
- Login local por email e senha
- Sessao via token Bearer salvo no frontend
- Validacao de usuario no backend
- Usuario master atual:
  - email: `danielmoraessales@outlook.com.br`
  - role: `master_admin`

## Base SaaS
- `grupos_empresariais`
- `grupo_empresas`
- `user_company_access`
- `modulo_permissoes`
- `audit_log`
- `auditoria_detalhada`
- `notifications`

## Central do Daniel
- Router: `packages/services/legacy-api/routers/master.ts`
- Tabelas:
  - `master_clients`
  - `master_tasks`
  - `master_financial_transactions`
  - `master_calendar_events`
  - `master_reminders`

## Build local
### Frontend
```powershell
cd C:\Dev\Synapse
npm install
npm run dev
```

### Backend
```powershell
cd C:\Dev\Synapse\packages\services\legacy-api
npm install
npm run build
npm run start
```

## Deploy
### Frontend
- comando usado: `npx vercel deploy --prod --yes`
- URL ativa: `https://synapse-seven-nu.vercel.app`

### Backend
- deploy por zip no Azure App Service
- healthcheck: `https://synapse-backend-ds2026.azurewebsites.net/health`

## Migrations aplicadas manualmente
- `2026-04-30-core-saas-foundation.sql`
- `2026-04-30-master-workspace.sql`

## Regras operacionais
- nao rodar migrations perigosas automaticamente no boot em producao
- validar empresa e permissao no backend
- usar soft delete em entidades criticas
- nao expor erro tecnico cru ao usuario
