# Synapse Enterprise Productization Matrix

Data: 12/05/2026
Timezone operacional: America/Sao_Paulo
Baseline auditada: commit 3cd96fbc75bfeedec9f0e79fa4afcd357e487b11

Esta matriz separa produto real em runtime, lacuna objetiva e roadmap. A regra de produto e validação continua: sem Tkinter, sem sistema paralelo, sem mockup solto, sem dados falsos, sem botão morto e sem operação destrutiva sem arquivar/auditar.

## Matriz de Produto

| Módulo | Existe? | Incompleto? | Qualidade atual | Prioridade | Impacto comercial | Impacto técnico | Arquivos afetados |
|---|---:|---:|---|---|---|---|---|
| Helpdesk | Sim | Sim | Bom núcleo: tickets, chat, anexos, status, auditoria básica. Falta aprovação, macros, merge e omnichannel completo. | P0 | Muito alto | Alto | `src/pages/TI.tsx`, `packages/services/legacy-api/routers/ti.ts` |
| Portal de Serviços | Parcial | Sim | Agora integrado ao runtime como catálogo que abre chamado real; aprovações/automação ficam condicionadas à modelagem. | P0 | Muito alto | Médio | `src/pages/TI.tsx`, `src/components/DashboardLayout.tsx` |
| RMM | Sim | Sim | Heartbeat, inventário técnico, métricas e ações estão presentes; políticas, scripts em massa e patching são roadmap. | P0 | Muito alto | Alto | `src/pages/TI.tsx`, `src/pages/DeviceDetails.tsx`, `apps/synapse-desktop/*`, `routers/ti.ts` |
| Monitoramento | Sim | Sim | Online/offline, métricas e score v1 existem; engine avançada de threshold/policy ainda precisa persistência dedicada. | P0 | Muito alto | Alto | `src/pages/TI.tsx`, `routers/ti.ts` |
| Inventário | Sim | Sim | Ativos, licenças, certificados e vínculos existem; software instalado, garantia e ciclo completo são roadmap. | P0 | Alto | Médio | `src/pages/TI.tsx`, `routers/ti.ts` |
| Auditoria | Sim | Sim | Ações críticas principais registram auditoria; retenção/exportação e relatório assinado são roadmap. | P0 | Alto | Médio | `src/pages/Auditoria.tsx`, `routers/ti.ts` |
| IA | Sim | Sim | Arquitetura híbrida cloud > local opcional > humano existe; RAG produtivo depende de ingestão e fontes homologadas. | P0 | Muito alto | Alto | `packages/services/legacy-api/_core/llm.ts`, `src/pages/TI.tsx`, `src/pages/IA.tsx` |
| Knowledge | Estrutura | Sim | Estrutura enterprise criada; gestão editorial, index vetorial e aprovação ficam roadmap sem dados homologados. | P1 | Alto | Alto | `packages/services/legacy-api/knowledge/*`, `docs/SYNAPSE_AI_KNOWLEDGE_ARCHITECTURE.md` |
| Segurança | Parcial | Sim | Dashboard não inventa coleta; Defender/firewall/update/risco aguardam agente/coleta homologada. | P1 | Alto | Alto | `src/pages/TI.tsx`, `routers/corporativo.ts` |
| Estoque | Sim | Sim | WMS/estoque existe fora do TI; lifecycle de peças de TI e previsão são roadmap. | P1 | Médio | Médio | `src/pages/WMS.tsx`, `packages/services/legacy-api/schema.ts` |
| Impressoras | Parcial | Sim | Chamados/categoria e inventário suportam impressora; SNMP/toner/páginas/fila são roadmap. | P1 | Médio | Alto | `src/pages/TI.tsx`, futuro coletor |
| Relatórios | Sim | Sim | BI e relatórios existem; relatórios ITSM/RMM executivos precisam datasets consolidados. | P1 | Alto | Médio | `src/pages/BI.tsx`, `src/pages/ExecutiveOps.tsx` |
| Dashboards | Sim | Sim | Cockpit TI e cards executivos existem com dados reais ou "Não coletado"; gráficos ricos são roadmap. | P0 | Muito alto | Médio | `src/pages/TI.tsx`, `src/pages/ExecutiveOps.tsx` |
| Configurações | Sim | Sim | Configurações gerais existem; políticas RMM, SLA por cliente e branding avançado são roadmap. | P1 | Alto | Médio | `src/pages/Configuracoes.tsx`, `src/pages/PainelMaster.tsx` |
| Integrações | Sim | Sim | Catálogo de integrações existe; conectores profundos dependem credenciais e escopo comercial. | P1 | Alto | Alto | `src/pages/Integracoes.tsx`, `routers/integracoes.ts` |
| Permissões | Sim | Sim | RBAC por perfil principal existe; entitlement por plano/feature flag é roadmap. | P0 | Muito alto | Médio | `src/components/DashboardLayout.tsx`, `src/pages/Permissoes.tsx` |
| Mobile Ready | Parcial | Sim | Rotas e APIs são web/mobile-ready; app mobile nativo e push ficam roadmap. | P2 | Médio | Alto | APIs existentes, futuro app |
| Admin Global | Sim | Sim | Master admin, empresas e permissões existem; billing/licenças comerciais são roadmap. | P1 | Alto | Médio | `src/pages/PainelMaster.tsx`, `src/pages/Permissoes.tsx` |
| Multiempresa | Sim | Sim | Contexto de empresa e view-as existem; hardening de isolamento e billing ficam roadmap. | P0 | Muito alto | Alto | `contexts/ViewAsContext.tsx`, backend routers |
| Automação | Parcial | Sim | Tarefas/projetos e ações pontuais existem; runbooks, scripts e n8n/webhook completo são roadmap. | P1 | Alto | Alto | `src/pages/Tarefas.tsx`, `routers/integracoes.ts` |

## Integrações Recomendadas

Agora:
- AnyDesk/RustDesk/TeamViewer: acesso remoto vinculado a ativo e ticket.
- Microsoft/Entra ID ou Google Workspace: identidade corporativa e provisionamento.
- Email/SMTP: email-to-ticket e notificações transacionais.
- TOTVS/Winthor e SEFAZ: base de conhecimento e contexto ERP/fiscal.
- Webhooks/n8n: automação de eventos de ticket, alerta e ativo.

Depois:
- Zabbix, Grafana, PRTG e Wazuh para ingestão de alertas externos.
- Intune/Windows Update for Business para patching/políticas.
- Power BI para clientes que exigem camada executiva externa.
- WhatsApp/Teams/Slack para omnichannel com trilha auditável.

## Information Architecture por Perfil

Usuário final:
- Portal de Serviços, Meus Chamados, Chat, Base de Conhecimento, Ajuda e notificações.
- Sem IP, hostname, SO, hardware, AnyDesk, inventário, monitoramento ou auditoria técnica.

Técnico:
- Cockpit TI, Chamados, Portal de Serviços, Inventário, Monitoramento, Acessos Remotos, Agentes, Alertas e Base de Conhecimento.

Supervisor:
- Fila, SLA operacional, chamados sem responsável, criticidade, equipe, produtividade e relatórios.

Gestor:
- Dashboard executivo, saúde operacional, risco, disponibilidade, tendências, custos e setores críticos.

Master admin:
- Multiempresa, branding, integrações, permissões, automações, feature flags/licenças e configurações globais.

## Design System Enterprise

Direção aplicada no runtime:
- Densidade compacta: fonte base 13/14px em superfícies operacionais e títulos contidos.
- Cards com raio controlado, borda discreta, hover leve e informação acionável.
- Menus por perfil e sem itens técnicos para usuário comum.
- Estados vazios claros, badges contextuais e indicadores de saúde/risco.
- Operação dark premium com contraste suficiente e sem painel CRUD isolado.

Padrões a manter:
- Nenhum botão visível sem ação.
- Tabelas com ação contextual, busca e filtros.
- "Não coletado" para dado ausente, nunca valor inventado.
- Ação destrutiva só como arquivar/soft-delete/remover monitoramento com auditoria.

## Comercialização e Plataforma

Pronto para fortalecer no próximo ciclo de produto:
- Planos por tenant, usuário e agente.
- Entitlements por feature flag.
- Branding por cliente.
- API pública com OAuth/API key, rate limit, webhooks e eventos auditáveis.
- Exportação de auditoria e retenção por plano.
- Assistente de onboarding: primeiro tenant, primeiro admin, primeiro agente, primeira política e primeira integração.

## Mobile-ready

Contratos que devem ser preservados:
- Usuário: chamados, fotos/anexos, notificações, aprovações.
- Técnico: fila, resposta, resumo de ativo, ações seguras.
- Gestor: dashboard executivo, aprovações e alertas.
- Futuro QR scan de ativo deve consumir o mesmo identificador de ativo/agente usado no web.

## Roadmap Honesto

Não foi marcado como entregue:
- Coleta real de Defender, firewall, BitLocker, Windows Update, toner, páginas impressas e software instalado quando o coletor ainda não envia esses campos.
- Billing/licenciamento comercial com cobrança.
- Aprovação formal de catálogo com workflow persistido.
- Mobile nativo, push notification e QR scanner.
- RAG vetorial produtivo com fontes TOTVS/SEFAZ homologadas.
- Patching, scripts em massa e runbooks remotos com política de segurança.

## Critérios de Aceite Enterprise

- Usuário comum vê somente atendimento, catálogo, chat, histórico, anexos, ajuda e notificações.
- TI/Admin vê cockpit operacional, chamados, ativos, monitoramento, alertas, inventário, ações e auditoria.
- Master admin vê administração global, permissões, integrações, multiempresa e módulos técnicos.
- Datas e horários aparecem como `DD/MM/YYYY HH:mm BRT`.
- Ações críticas arquivam/soft-delete/auditam por padrão.
- O instalador oficial é Electron 2.4.0 e o download público não pode servir versão antiga.
