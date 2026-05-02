# Synapse Technical Guide

## Visão geral
- Frontend: Vercel, React + Vite
- Backend: Azure App Service, Node + Express + tRPC
- Banco de produção atual: Neon Postgres
- Workspace local: `C:\Dev\Synapse`

## Fonte de verdade
- Banco operacional publicado: Neon via `DATABASE_URL` do Azure
- Backend operacional: `packages/services/legacy-api`
- Schema de execução: Drizzle em `C:\Dev\Synapse\packages\services\legacy-api\drizzle\schema.ts`
- Schema de documentação/modelagem: Prisma em `C:\Dev\Synapse\prisma\schema.prisma`

## Autenticação e sessão
- Login por e-mail e senha
- Sessão via Bearer token persistido no frontend
- Atualização do frontend endurecida para não derrubar sessão por troca de bundles
- Usuário master atual:
  - email: `danielmoraessales@outlook.com.br`
  - role: `master_admin`

## SaaS multiempresa
- `grupos_empresariais`
- `grupo_empresas`
- `user_company_access`
- seletor de empresa no topo
- validação de empresa acessível no backend
- permissões por módulo e papel

## Módulos principais entregues
- Dashboard
- Pessoal / Central do Daniel
- Financeiro
- RH / Folha / Benefícios
- TI
- Chat interno
- Omnichannel externo
- Logística / Frota
- WMS
- BI
- Relatórios
- Importações
- Integrações

## TI e agente
- Chamados, histórico, notas internas, acesso remoto solicitado
- Agente Windows com pareamento por código
- Métricas de CPU, RAM, disco, usuário e uptime
- Download:
  - `/api/agent/download/windows`
  - `/api/agent/download/windows-installer`
- Omnichannel externo:
  - `omnichannel_conversations`
  - `omnichannel_messages`
  - webhook:
    - `/api/omnichannel/webhook/telegram/:empresaId`
    - `/api/omnichannel/webhook/whatsapp/:empresaId`
    - `/api/omnichannel/webhook/instagram/:empresaId`

## Financeiro empresarial
- contas a pagar
- contas a receber
- dashboard
- DRE por placa
- projeção de fluxo 7/15/30 dias
- aging
- folha integrando salário, benefícios e encargos estimados

## RH / folha
- cadastro completo de colaborador
- vencimentos documentais
- benefícios:
  - plano de saúde
  - vale refeição
  - vale transporte
- previsão de folha
- lançamento de folha com geração de contas a pagar

## Compras e governança
- `compras_ti`
- `compras_ti_historico`
- alçada automática por valor
- aprovação e rejeição restritas a perfis de gestão
- trilha de alteração de status

## Integrações
- WhatsApp / Evolution API
- Telegram
- Instagram
- Google Maps
- Google Business Profile
- Asaas
- Mercado Pago
- OFX / CNAB
- bancos / PIX / boletos
- NF-e / CT-e / MDF-e
- Clicksign
- Slack / Teams
- Serasa catalogado

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
- `npx vercel deploy --prod --yes`
- produção: `https://synapse-seven-nu.vercel.app`

### Backend
- deploy zip no Azure App Service
- health: `https://synapse-backend-ds2026.azurewebsites.net/health`

## Migrations SQL manuais relevantes
- `2026-04-30-core-saas-foundation.sql`
- `2026-04-30-master-workspace.sql`
- `2026-05-02-omnichannel-compras-governance.sql`

## Regras operacionais
- não rodar migration destrutiva automaticamente no boot
- validar empresa e permissão no backend
- usar soft delete onde suportado
- não expor stack trace cru ao usuário
- registrar trilha de auditoria em operações críticas
