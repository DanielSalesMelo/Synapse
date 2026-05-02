# Synapse Acceptance Baseline

Este documento registra a nota do Daniel como especificacao oficial de produto e criterio de aceite do Synapse.

## Principios obrigatorios
- sem mock em producao
- sem botao sem funcao
- sem dado fake
- sem erro tecnico exposto ao usuario
- persistencia real no banco
- validacao de permissao no backend
- isolamento por empresa
- auditoria e soft delete

## Ordem de execucao adotada
1. Base SaaS: empresas, grupo empresarial, acessos, permissoes e seguranca
2. Modulo TI real: chamados, chat, anexos, historico, SLA e fila operacional
3. Agente real: pareamento, download, monitoramento e inventario
4. Central do Daniel: area exclusiva do master admin
5. Documentacao, manual, homologacao e material de registro

## Regras tecnicas
- `schema.prisma`, Drizzle e banco real precisam refletir a mesma verdade
- migrations perigosas nao devem rodar automaticamente no boot
- toda tabela operacional precisa de escopo de empresa
- toda acao critica precisa de trilha de auditoria
- modulos incompletos devem ficar ocultos ou marcados como `Em implantacao`

## Entregas minimas por etapa
### Base SaaS
- modelo multiempresa
- acesso por empresa e por grupo
- perfis e permissoes
- sanitizacao, logs e tratamento de erro amigavel

### TI
- chamado com ciclo de vida completo
- chat persistido
- anexos validados
- historico de status
- solicitacao e consentimento para acesso remoto

### Agente
- download real
- instalacao simples
- vinculo a empresa e usuario
- metricas persistidas
- status online/offline confiavel

### Central do Daniel
- area isolada do cliente
- tarefas, agenda, financeiro e clientes
