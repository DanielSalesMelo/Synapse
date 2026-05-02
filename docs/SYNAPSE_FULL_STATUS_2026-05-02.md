# Synapse — Status Completo em 02/05/2026

Autor: Daniel Sales  
Base técnica desta leitura: código local em `C:\Dev\Synapse`, frontend publicado na Vercel e backend publicado no Azure.

## Resumo executivo

O Synapse já deixou de ser apenas um MVP de frota. Hoje ele funciona como uma plataforma SaaS em evolução, com:

- autenticação real
- backend online
- frontend online
- base multiempresa
- permissões centrais
- módulo TI funcional em nível intermediário
- Central do Daniel extremamente expandida
- integrações configuráveis por empresa
- relatórios, BI, importações e agente de PC já existentes

## Percentual honesto

- concluído de forma real/publicada: `68%`
- em estágio parcial/intermediário: `22%`
- ainda faltando para o objetivo final completo: `10%`

Isso significa:

- o Synapse já é utilizável em várias frentes reais
- ainda não é honesto chamar de `100%`
- a maior parte do que falta agora é fechamento enterprise, polimento global, automação avançada e unificação final de arquitetura

## Banco / arquitetura

### Em produção

- frontend: Vercel
- backend: Azure App Service
- banco ativo do backend publicado: Neon Postgres
- autenticação: JWT
- API: Node + Express + tRPC

### Já existe de forma real

- login real
- multiempresa base
- seletor de empresa
- permissões centrais
- auditoria estrutural
- soft delete inicial
- notificações persistidas

### Ainda precisa melhorar

- unificação total Prisma/Drizzle/banco em todos os módulos
- consolidação final das migrations históricas
- revisão global de constraints e índices por módulo

## Módulos já existentes no sistema

### Core SaaS

- autenticação
- usuários
- empresas
- grupos empresariais
- permissões
- acesso por empresa
- painel master

### TI

- dashboard TI
- chamados
- chat do chamado
- anexos
- histórico de status
- notas internas
- solicitação de acesso remoto
- agentes monitorados
- pareamento por código
- métricas de hardware
- alertas
- compras de TI básicas

### Agente de PC

- download do `.exe`
- download do instalador `.bat`
- pareamento por código
- envio de métricas
- exibição no módulo TI
- fallback de instalação para pasta do usuário

### Financeiro

- dashboard financeiro base
- contas a pagar
- contas a receber
- visão de fluxo
- integrações em estágio configurável

### RH

- dashboard RH base
- colaboradores
- documentos e vencimentos
- folha base
- alertas básicos

### Logística / Frota

- viagens
- carregamentos
- veículos
- simulador de viagem
- custos básicos

### WMS / Estoque

- armazéns
- produtos
- estoque
- movimentações

### Comercial / Marketing / Vendas

- leads
- propostas
- campanhas
- landing pages
- funil comercial base

### BI / Relatórios

- BI por áreas em estágio funcional
- relatórios avançados
- exportação CSV em partes do sistema

### Importações

- upload
- preview
- confirmação
- lotes de importação
- modelos parciais

### IA

- página de IA
- fallback local
- base de uso para resumo/sugestão

### Integrações

- Arquivei / Qive
- Winthor
- WhatsApp
- Telegram
- Instagram
- Serasa
- Gmail
- Google Calendar
- Google Drive
- Meta Ads
- Google Ads
- AnyDesk
- Evolution API
- Webhook genérico
- API externa
- Controle de ponto
- Ponto mobile
- OFX / CNAB
- PIX / boletos
- NF-e
- CT-e
- MDF-e
- SEFAZ / XML
- Slack
- Teams
- Google Business Profile
- Google Maps
- Mercado Pago
- Asaas
- Clicksign

## Central do Daniel — o que já existe

### Pessoal

- pessoal
- agenda pessoal
- lembretes
- saúde e energia
- faculdade e estudos
- casa e família
- hábitos e rotina
- rotina da semana
- materiais de estudo

### Trabalho e clientes

- clientes
- tarefas
- financeiro do Daniel
- agenda rápida
- campanhas
- landing pages
- leads
- propostas
- serviços e entregas
- Google Meu Negócio
- follow-ups comerciais
- agenda de cobrança
- reuniões
- fornecedores e parceiros
- conteúdo e postagens
- entregas de clientes
- parcerias estratégicas
- saúde dos clientes
- pesquisas e referências

### Synapse como produto

- projetos e roadmap
- notas da IA
- planejamento diário
- releases do Synapse
- ideias do produto
- metas e OKRs
- decisões estratégicas
- biblioteca de assets
- regras de automação
- benchmark de concorrentes
- snapshots de KPI
- documentos e revisões

## Diferença entre Agente e Dispositivo no TI

Hoje a regra prática do Synapse é:

- `Agente`: o software instalado no PC
- `Dispositivo`: o registro desse PC dentro do Synapse

Na prática, eles representam o mesmo ativo em dois ângulos:

- agente = lado do software
- dispositivo = lado do inventário/vínculo

Por isso o módulo TI foi ajustado para deixar essa relação mais clara. Ainda vale melhorar mais a UX, mas conceitualmente não são dois produtos diferentes.

## Pode testar o agente no PC?

Sim.

Fluxo recomendado hoje:

1. abrir `TI > Agentes e Dispositivos`
2. gerar código de pareamento
3. baixar `Instalador .bat`
4. executar o instalador
5. informar o código e a URL do servidor

Observações reais:

- o `.bat` é o caminho mais seguro hoje
- o `.exe` ainda pode acionar SmartScreen por não estar assinado digitalmente
- isso é um aviso do Windows, não necessariamente um erro do Synapse

## Principais melhorias já feitas recentemente

- estabilidade do frontend após atualização
- mitigação de cache quebrado do PWA
- correção de crash em produção
- IA com fallback
- notificações persistidas
- expansão forte da Central do Daniel
- expansão do catálogo de integrações
- clareza melhor entre agente e dispositivo no TI

## O que ainda falta para o objetivo final

### Crítico

- unificação final Prisma/Drizzle/banco em todos os módulos
- fechamento enterprise de permissões por ação em todos os pontos sensíveis
- revisão total mobile em todos os módulos densos
- assinatura digital/código assinado para o agente Windows
- melhoria do chat para ficar mais próximo de WhatsApp em experiência

### Alto impacto

- financeiro empresarial completo no nível da planilha real
- RH completo no nível operacional/estratégico final
- folha completa com todos os fluxos
- benefícios completos integrados
- compras e aprovações em nível final
- AnyDesk/consentimento ainda mais forte
- BI mais refinado
- relatórios em Excel/CSV/PDF mais completos
- importações mais maduras por domínio

### Produto / UX

- design system premium global
- revisão de responsividade tela a tela
- onboarding por módulo
- automações mais profundas
- filtros persistidos melhores
- comparativos por grupo empresarial
- dashboards mais executivos

## Concorrência e usabilidade

Onde o Synapse já está ficando forte:

- amplitude de módulos
- visão integrada de operação + TI + comercial + central pessoal
- capacidade de vender por pacote/módulo
- estrutura de empresa + grupo empresarial

Onde ainda está atrás dos melhores concorrentes:

- refinamento visual global
- simplicidade de fluxos muito usados
- automações de alto nível
- experiência mobile completamente polida
- chat/inbox omnichannel

## Percentual por macroárea

- Core SaaS: `80%`
- TI: `72%`
- Agente de PC: `70%`
- Financeiro: `58%`
- RH: `56%`
- Logística/Frota: `60%`
- Estoque/WMS: `55%`
- Comercial/Marketing/Vendas: `68%`
- BI/Relatórios: `57%`
- Importações: `52%`
- IA: `48%`
- Integrações: `62%`
- Central do Daniel: `82%`
- UX/Responsividade global: `50%`

## Conclusão honesta

O Synapse já é um sistema grande, real e publicado, e hoje está bem além da fase de protótipo.  
Mas ainda não é correto afirmar `sistema 100%`.

O ponto atual é:

- já dá para operar muita coisa real
- já dá para demonstrar valor sério
- ainda falta fechamento importante para dizer que toda a visão final foi concluída
