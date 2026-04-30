# Synapse Audit - 2026-04-30

## Escopo desta auditoria
- Frontend Vercel
- Backend Azure App Service
- Banco Supabase/PostgreSQL
- Alinhamento entre Prisma, Drizzle e banco real
- Multiempresa, permissões e segurança
- Módulo TI, agente, chat, notificações e áreas master

## Achados críticos já confirmados
1. O sistema ainda nao esta pronto para empresas reais.
2. Existe divergencia entre `prisma/schema.prisma`, `packages/services/legacy-api/drizzle/schema.ts` e o banco real.
3. O banco de producao ainda nao tem base SaaS validada:
   - apenas 1 usuario
   - 1 master admin
   - 0 empresas ativas
   - 0 tickets, 0 mensagens de ticket, 0 agentes e 0 metricas
4. As permissoes ainda nao sao impostas de forma consistente no backend.
5. O modulo TI possui base funcional, mas ainda nao entrega o fluxo ITSM completo.
6. O agente do PC esta dividido entre duas arquiteturas:
   - `monitor_agentes` / `monitor_metricas` / `agent_pairing_codes`
   - `agent_devices` / `agent_metrics` / `agent_pair_codes`
7. A Central do Daniel ainda nao existe como modulo real separado.
8. Ainda existem telas e indicadores com comportamento de demonstracao ou em implantacao.

## Riscos imediatos para uso real
- vazamento entre empresas por validacao insuficiente no backend
- divergencia de schema causando regressao em deploy e migration
- menu/rota visivelmente disponivel sem cobertura total de persistencia
- agente e pareamento sem modelo consolidado
- ausencia de notificacoes persistidas
- ausencia de trilha completa de auditoria LGPD por modulo

## Ordem segura de entrega
### Fase 1
- consolidar arquitetura de dados
- alinhar multiempresa
- reforcar permissoes e seguranca
- remover comportamentos fake visiveis

### Fase 2
- fechar fluxo TI real: status, historico, SLA, anexos, triagem, acesso remoto

### Fase 3
- consolidar agente, pareamento, download e monitoramento

### Fase 4
- Central do Daniel, financeiro pessoal/produtivo e documentacao final

## Regra de aceite desta base
- nenhum modulo deve parecer funcional se ainda nao persistir no banco
- estados vazios devem substituir mocks
- funcionalidades em implantacao devem ser sinalizadas
