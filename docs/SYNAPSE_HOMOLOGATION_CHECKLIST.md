# Synapse Homologation Checklist

## Ambiente
- [x] Frontend publicado na Vercel
- [x] Backend publicado no Azure
- [x] Banco de producao ativo
- [x] Healthcheck do backend responde `200`

## Login
- [x] Login master admin valido
- [x] Token retornado pelo backend
- [x] Frontend com limpeza de sessao antiga

## SaaS Base
- [x] `user_company_access`
- [x] `grupos_empresariais`
- [x] `modulo_permissoes`
- [x] `notifications`
- [x] `auditoria_detalhada`

## Isolamento
- [x] Validacao automatizada de empresa A e empresa B no backend
- [ ] cadastrar empresas reais
- [ ] cadastrar usuarios reais por empresa

## Central do Daniel
- [x] dashboard master persistido
- [x] clientes persistidos
- [x] tarefas persistidas
- [x] financeiro persistido
- [x] agenda persistida
- [x] lembretes persistidos

## Ainda precisa de homologacao completa
- [ ] importacoes
- [ ] RH completo
- [ ] folha
- [ ] beneficios
- [ ] TI completo no fluxo ITSM final
- [ ] agente `.exe`
- [ ] relatorios completos
- [ ] BI completo
- [ ] documentacao final em PDF
