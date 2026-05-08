# Synapse Next-Gen Blueprint

Documento oficial de direção do produto para elevar o Synapse acima de helpdesk, RMM,
monitoramento, inventario e operacao remota tradicionais.

Marco base: `v0.10-electron-agent-foundation`

## 1. Tese do produto

O Synapse deve ser uma plataforma operacional inteligente para suporte, TI,
monitoramento, automacao, inventario, seguranca, auditoria e decisao executiva.

O objetivo nao e competir como "mais um helpdesk". O objetivo e unir tres mundos
que hoje costumam ficar separados:

- ITSM e atendimento: chamados, SLA, fila, chat, base de conhecimento e aprovacao.
- RMM e endpoint: agente, inventario, telemetria, acoes remotas e automacao segura.
- Observabilidade e inteligencia: dashboards, alertas, risco, IA, previsao e auditoria.

O Synapse deve parecer simples para o usuario comum, poderoso para TI/Admin e claro
para gestao executiva.

## 2. Referencias analisadas e aprendizados

As referencias nao devem ser copiadas visualmente. Elas servem como benchmark de
capacidades e maturidade operacional.

- NinjaOne: RMM com foco em simplicidade, automacao, patch management, acesso remoto
  e gerenciamento centralizado de endpoints.
- Atera: plataforma all-in-one combinando RMM, ticketing, asset management,
  reporting, automacao e IA.
- Freshservice: ITSM moderno com ITAM, ITOM, omnichannel, workflows e IA para
  produtividade de agentes.
- ServiceNow: modelo enterprise de workflows, governanca, IA, dados e automacao em
  escala.
- Zabbix, PRTG e Grafana: descoberta, metricas, alertas, dashboards e observabilidade.
- Wazuh: XDR/SIEM, deteccao, compliance, analise de logs, vulnerabilidades e higiene
  de TI.
- Lansweeper e OCS Inventory: inventario continuo, descoberta de ativos de rede,
  software e hardware.
- AnyDesk, TeamViewer Tensor e ConnectWise: suporte remoto, sessao controlada,
  auditoria e acesso tecnico.
- Jira Service Management, GLPI e ManageEngine: fluxos ITSM, categorias, ativos,
  mudancas, incidentes e operacao de TI.
- HWiNFO e CPU-Z: profundidade tecnica de hardware, mas sem virar interface bruta
  para usuario final.

Conclusao: o Synapse deve unir o que essas plataformas fazem bem, mas com experiencia
mais limpa, AI-first, preventiva, multiempresa, auditavel e integrada ao agente.

## 3. Principios obrigatorios

- Conversacional primeiro: chamados nascem de conversa, nao de formulario pesado.
- Preventivo antes de reativo: detectar risco antes de virar incidente.
- Interpretar, nao apenas listar: toda metrica importante deve virar contexto,
  score, risco ou recomendacao.
- Multiempresa real: empresa, filial, unidade, setor, equipe, grupo e responsavel.
- Permissao no backend: nada sensivel depende so de esconder componente no frontend.
- Auditoria sempre: acao critica, visualizacao sensivel e automacao geram log.
- Soft delete por padrao: arquivar, descartar, lixeira e recuperacao antes de apagar.
- Agente profissional: UI desktop sem Tkinter/Python, worker invisivel, service-ready.
- UI premium: compacta, rapida, responsiva, dark/light e sem cara de admin template.
- IA assistiva e governada: sugestao, resumo e previsao com trilha, nao automacao cega.

## 4. Mapa completo de modulos

### 4.1 Atendimento / Helpdesk

Responsavel por conversa, chamados, SLA, anexos, prints, fila e historico.

Capacidades:
- abrir chamado por chat;
- classificar por IA;
- tecnico assume atendimento;
- transferencia e escalonamento;
- SLA por prioridade, setor e tipo;
- mensagens publicas e notas internas;
- anexos, prints, logs e evidencias;
- recorrencia e problema raiz;
- aprovacao quando envolver compra, acesso remoto ou acao sensivel.

### 4.2 Monitoramento

Responsavel por heartbeat, telemetria, disponibilidade e saude operacional.

Capacidades:
- status online/offline/degradado/critico;
- CPU, RAM, disco, rede, GPU, temperatura quando disponivel;
- processos e servicos criticos;
- picos, tendencia e anomalias;
- uptime e downtime por ativo, setor e empresa;
- alertas correlacionados.

### 4.3 Inventario

Responsavel por ativos, hardware, software, licencas e ciclo de vida.

Capacidades:
- hostname, usuario, IP, MAC, dominio/workgroup;
- fabricante, modelo, serial, asset tag;
- placa-mae, socket, BIOS, TPM, secure boot;
- CPU, RAM, slots, discos, GPU;
- software instalado, versoes e risco;
- garantia, idade, custo, localizacao e responsavel;
- compatibilidade Windows 11 e upgrade recomendado.

### 4.4 Rede

Responsavel por descoberta e saude da infraestrutura.

Capacidades:
- gateway, DNS, IPs, sub-redes e adaptadores;
- latencia, perda, download/upload e congestionamento;
- mapa de rede por empresa, filial, setor e unidade;
- switches, roteadores, APs, NAS, servidores, cameras e impressoras;
- quedas coletivas por localidade;
- dispositivo desconhecido;
- agentes ponte para descoberta local.

### 4.5 Seguranca

Responsavel por postura de seguranca, protecao e eventos.

Capacidades:
- Defender/antivirus, firewall, updates, BitLocker e criptografia;
- servicos criticos e configuracoes inseguras;
- softwares suspeitos ou nao autorizados;
- tentativas de login suspeitas;
- maquina sem protecao ou sem atualizacao;
- vulnerabilidades e exposicao;
- trilha estilo XDR/SIEM para endpoint e eventos.

### 4.6 Impressoras

Responsavel por disponibilidade, consumo e custo de impressao.

Capacidades:
- impressoras por setor/unidade;
- toner/cartucho e contador de paginas;
- fila travada;
- erro recorrente;
- consumo por setor;
- previsao de compra;
- manutencao preventiva;
- impressora critica e SLA de disponibilidade.

### 4.7 Estoque

Responsavel por pecas, toner, cartuchos, perifericos, notebooks e ativos reserva.

Capacidades:
- estoque minimo;
- previsao de consumo;
- alerta de compra;
- aprovacao por alcada;
- entrada, saida, reserva e devolucao;
- custo por setor e equipamento;
- vinculo com chamado, manutencao e compra.

### 4.8 Auditoria

Responsavel por historico corporativo completo.

Tudo deve registrar:
- login/logout;
- visualizacao sensivel;
- alteracao;
- exclusao/arquivamento/recuperacao;
- anexo;
- chamado;
- automacao;
- Wake-on-LAN;
- acao remota;
- comando;
- IA;
- permissao;
- compra;
- estoque.

### 4.9 IA

Responsavel por copiloto operacional, aprendizado, previsao e documentacao.

Capacidades:
- resumir chamados;
- sugerir resposta;
- sugerir classificacao, prioridade e SLA;
- explicar logs e metricas;
- detectar padroes;
- prever falha, compra ou troca;
- recomendar upgrade;
- sugerir manutencao preventiva;
- gerar base de conhecimento;
- gerar relatorio executivo;
- sugerir treinamento para setores;
- operar inicialmente com IA local gratuita quando possivel e aceitar IA paga depois.

### 4.10 Relatorios

Responsavel por visao operacional, tecnica e executiva.

Capacidades:
- SLA, tempo medio, backlog e produtividade;
- incidentes por setor;
- custo por ativo, setor e categoria;
- saude por filial/unidade;
- disponibilidade de rede;
- consumo de toner;
- seguranca e compliance;
- tendencia de problemas;
- aging de ativos;
- exportacao PDF/CSV e dashboards salvos.

### 4.11 Alertas

Responsavel por eventos, severidade, deduplicacao e roteamento.

Capacidades:
- criticidade por regra e IA;
- agrupamento por incidente;
- supressao de ruido;
- escalonamento;
- alerta por setor/filial;
- recomendacao de acao;
- abertura automatica de chamado quando politica permitir.

### 4.12 Automacao

Responsavel por remediacao segura e workflows.

Capacidades:
- jobs auditaveis;
- aprovacao;
- allowlist/blocklist;
- comandos e scripts;
- manutencao automatica;
- coleta diagnostica;
- Wake-on-LAN;
- limpar cache, reiniciar spooler, coletar logs;
- rotinas programadas;
- rollback ou plano de reversao quando aplicavel.

### 4.13 Gestao de ativos

Responsavel pelo ciclo completo do equipamento.

Estados:
- ativo;
- em estoque;
- em manutencao;
- emprestado;
- aguardando pareamento;
- despareado;
- arquivado;
- descartado;
- removido do monitoramento;
- excluido apenas quando seguro.

### 4.14 Gestao de setores

Responsavel por organizacao empresarial e analise por area.

Dimensoes:
- empresa;
- filial;
- unidade;
- setor;
- equipe;
- grupo;
- responsavel;
- centro de custo.

Indicadores por setor:
- chamados abertos;
- incidentes;
- consumo de toner;
- maquinas criticas;
- downtime;
- custo;
- recorrencia;
- necessidade de treinamento;
- risco operacional.

### 4.15 Usuarios e permissoes

Responsavel por RBAC, escopo e governanca.

Papeis base:
- usuario comum;
- tecnico TI;
- supervisor;
- auditor;
- admin;
- master_admin.

Permissoes granulares:
- visualizar;
- editar;
- arquivar;
- excluir;
- recuperar;
- executar acao remota;
- ver seguranca;
- ver auditoria;
- aprovar automacao;
- aprovar compra;
- acessar IA;
- ver dados tecnicos;
- ver dados financeiros;
- gerenciar usuarios.

### 4.16 Preventivo

Responsavel por transformar dados em manutencao antecipada.

Capacidades:
- score de saude do ativo;
- score de risco;
- vida util estimada;
- gargalo identificado;
- upgrade recomendado;
- risco de disco;
- RAM insuficiente;
- maquina apta ou nao para Windows 11;
- setor com padrao anormal;
- previsao de compra de peca;
- recomendacao de manutencao.

### 4.17 Dashboard executivo

Responsavel por uma visao clara para diretoria e gestores.

Cards obrigatorios:
- saude geral da empresa;
- chamados abertos;
- SLA;
- tempo medio;
- maquinas criticas;
- impressoras criticas;
- estoque critico;
- seguranca;
- antivirus/firewall/update;
- rede;
- uptime;
- custos;
- produtividade;
- tendencia de problemas;
- setores com maior impacto.

## 5. Experiencia por perfil

### 5.1 Usuario comum

Deve ver somente:
- chat;
- abrir chamado;
- chamados proprios;
- anexos e prints;
- historico;
- notificacoes;
- status do atendimento;
- aprovacao de acesso quando politica exigir.

Nao deve ver:
- AnyDesk;
- hardware detalhado;
- outros ativos;
- outros usuarios;
- comandos;
- PowerShell/CMD;
- dados sensiveis;
- auditoria;
- modulos TI/Admin.

### 5.2 Tecnico TI

Deve ver:
- fila de chamados;
- ativos relacionados;
- diagnostico basico;
- inventario permitido;
- anexos;
- chat;
- scripts aprovados;
- logs autorizados;
- acoes remotas permitidas;
- copiloto IA.

### 5.3 Supervisor

Deve ver:
- SLA;
- qualidade;
- produtividade;
- gargalos por setor;
- relatorios;
- riscos;
- custos;
- tendencia.

Nao necessariamente executa comandos tecnicos.

### 5.4 Auditor

Deve ver:
- logs;
- trilhas;
- acessos;
- alteracoes;
- comandos;
- anexos;
- recuperacoes;
- evidencias.

Nao altera operacao por padrao.

### 5.5 Admin

Gerencia:
- usuarios;
- empresas;
- setores;
- permissoes;
- politicas;
- integracoes;
- automacoes;
- estoque e workflows.

### 5.6 Master Admin

Tem contexto global administrativo:
- nao depende de empresa fixa;
- pode operar globalmente;
- pode alternar contexto com seguranca;
- visualiza dados por empresa, grupo, filial, setor e unidade;
- toda acao continua auditada.

## 6. Experiencia desktop Electron

O app desktop e a porta local do Synapse para o usuario e para TI.

Regras:
- sem Tkinter;
- sem VBS;
- sem console visivel;
- sem PowerShell piscando;
- sem menus duplicados;
- sem layout cortado;
- compacto, moderno e responsivo;
- tray icon;
- notificacoes;
- inicializacao com Windows;
- reparo, remocao e limpeza de vinculo pelo instalador oficial.

Modo usuario comum:
- chat central;
- abertura de chamado por conversa;
- anexar arquivo;
- colar print com Ctrl+V;
- drag and drop;
- historico;
- status;
- notificacoes.

Modo TI/Admin:
- area tecnica separada;
- inventario;
- diagnostico;
- logs;
- AnyDesk quando permitido;
- acoes remotas por politica;
- automacoes;
- relatorios;
- IA.

## 7. Agente e arquitetura operacional

Direcao oficial:
- Synapse para Windows em Electron para UI;
- Synapse.Agent v2 em .NET 8 como caminho definitivo para worker/service;
- Python apenas legado/fallback temporario;
- Windows Service real para coleta e operacao continua;
- single instance lock;
- reconnect;
- logs estruturados;
- update manager futuro.

Modulos do agente:
- identidade;
- pareamento;
- heartbeat;
- inventario;
- telemetria;
- rede;
- seguranca;
- impressoras;
- command jobs;
- PowerShell SDK controlado;
- policy validator local;
- audit sender;
- update manager;
- health monitor.

## 8. Diagnostico inteligente

Dados brutos devem virar interpretacao.

Exemplos:
- "RAM insuficiente para o perfil de uso deste setor."
- "SSD proximo do limite e com tendencia de crescimento acelerada."
- "Equipamento apto para Windows 11, mas recomenda upgrade de RAM."
- "Disco apresenta risco por uso e idade."
- "Setor Financeiro apresenta incidencia alta de lentidao."
- "Gateway com latencia acima do normal em duas unidades."
- "Fila da impressora critica esta travada ha 18 minutos."
- "Antivirus ausente em equipamento com acesso a dados sensiveis."

Scores:
- saude do ativo;
- risco de falha;
- risco de seguranca;
- criticidade para negocio;
- custo estimado;
- prioridade de acao;
- confiabilidade dos dados.

## 9. IA e aprendizado

Fluxo recomendado:
1. Coletar chamados, resolucoes, logs, metricas e acoes.
2. Remover ou mascarar dados sensiveis quando necessario.
3. Classificar por empresa, setor, categoria, ativo e problema raiz.
4. Gerar embeddings/base de conhecimento local.
5. Sugerir resposta e solucao.
6. Registrar se a sugestao foi aceita, editada ou rejeitada.
7. Aprender com a resolucao final.
8. Gerar artigo de conhecimento quando recorrente.
9. Detectar padroes e alertar preventivamente.

IA nao deve:
- executar comandos sem politica;
- acessar dados de outro tenant;
- expor dados sensiveis para usuario comum;
- tomar acao critica sem aprovacao;
- apagar historico.

## 10. Rede e infraestrutura

O Synapse deve conseguir responder:
- a internet caiu na empresa toda ou em um setor?
- o problema e DNS, gateway, Wi-Fi, switch ou endpoint?
- quais dispositivos sumiram juntos?
- ha dispositivo desconhecido na rede?
- qual unidade tem mais perda de pacote?
- qual impressora esta impactando mais chamados?

Modelo:
- agente local coleta visao do endpoint;
- agentes ponte fazem descoberta controlada de rede;
- SNMP/ICMP/ARP/DNS quando permitido;
- mapa por empresa, filial, unidade, setor e subnet;
- correlacao entre downtime de ativos.

## 11. Wake-on-LAN e automacao

Capacidades:
- detectar suporte WoL;
- detectar estado habilitado/desabilitado;
- configurar quando permitido;
- enviar pacote WoL por agente ponte;
- registrar auditoria;
- exigir permissao;
- mostrar sucesso/falha;
- agendar manutencao fora do horario comercial.

## 12. Impressoras e estoque preventivo

O Synapse deve cruzar:
- contador de paginas;
- nivel de toner;
- consumo historico;
- setor dono;
- estoque disponivel;
- lead time de compra;
- custo por pagina;
- criticidade da impressora.

Resultados:
- alerta de compra antes de acabar;
- previsao de troca;
- chamado automatico para fila travada;
- manutencao preventiva;
- custo por setor;
- sugestao de redistribuicao de impressoras.

## 13. Auditoria, lixeira e recuperacao

Nada operacional deve sumir silenciosamente.

Estados e recuperacao:
- ativo;
- arquivado;
- descartado;
- removido;
- lixeira;
- restaurado;
- excluido definitivo apenas se seguro.

Cada acao deve manter:
- quem fez;
- quando;
- de onde;
- objeto afetado;
- antes/depois;
- motivo;
- permissao usada;
- impacto;
- vinculo com chamado/comando/automacao.

## 14. Dados principais

Entidades essenciais:
- organizations;
- branches;
- units;
- departments;
- teams;
- users;
- roles;
- permissions;
- devices;
- device_assignments;
- device_inventory_snapshots;
- device_telemetry;
- device_health_scores;
- network_devices;
- network_observations;
- printers;
- printer_counters;
- stock_items;
- stock_movements;
- tickets;
- ticket_messages;
- ticket_attachments;
- ticket_sla_events;
- command_jobs;
- automation_jobs;
- automation_approvals;
- audit_logs;
- security_findings;
- ai_memories;
- ai_suggestions;
- knowledge_articles.

Regra: toda entidade operacional precisa ter escopo por empresa e, quando fizer
sentido, filial/unidade/setor.

## 15. Interface e UX

Direcao visual:
- premium;
- compacta;
- clara;
- dark/light;
- cards inteligentes;
- graficos legiveis;
- filtros avancados;
- pesquisa global;
- atalhos;
- command palette;
- drag and drop;
- menu de contexto;
- timeline;
- copiloto lateral;
- sem GLPI/ERP/admin template.

Padroes:
- usuario comum: ChatGPT + Intercom;
- TI/Admin: Linear + Datadog + Warp + Vercel;
- executivo: dashboards limpos, poucos numeros, contexto e tendencia.

## 16. Roadmap de implementacao

### Fase 0 - Baseline estavel

Status: concluida em `v0.10-electron-agent-foundation`.

Inclui:
- backend e frontend publicados;
- download unico do Synapse para Windows;
- app Electron inicial;
- worker legado invisivel;
- permissoes base;
- acoes de limpeza de agentes;
- metricas de rede;
- timezone Sao Paulo;
- controle de duplicados por hostname/fingerprint.

### Fase 1 - Fundacao corporativa

Objetivo: organizar empresa, setor, auditoria e navegacao.

Entregas:
- modelo filial/unidade/setor/equipe/responsavel;
- tela de setores;
- vinculo de usuarios e ativos a setores;
- audit log unificado;
- lixeira/arquivados/descartados global;
- dashboard executivo v1;
- permissao granular v1.

### Fase 2 - Helpdesk/chat premium

Objetivo: transformar chamados em experiencia conversacional real.

Entregas:
- inbox TI;
- chat realtime;
- composer moderno;
- Ctrl+V print;
- drag and drop;
- anexos com preview;
- unread/badges;
- typing indicator;
- SLA visual;
- timeline do chamado;
- notas internas;
- IA resumindo e sugerindo resposta.

### Fase 3 - Synapse.Agent v2 .NET

Objetivo: substituir worker Python como arquitetura principal.

Entregas:
- Worker Service;
- Windows Service;
- heartbeat;
- inventario real;
- telemetria real;
- logs estruturados;
- auto reconnect;
- single instance;
- PowerShell SDK controlado;
- command jobs v1;
- service installer integrado.

### Fase 4 - Inventario e diagnostico inteligente

Objetivo: transformar dados de maquina em saude, risco e recomendacao.

Entregas:
- snapshots de inventario;
- score de saude;
- score de risco;
- compatibilidade Windows 11;
- recomendacao de upgrade;
- timeline do ativo;
- historico de manutencao;
- software/licencas.

### Fase 5 - Rede, impressoras e estoque

Objetivo: sair do endpoint isolado e enxergar infraestrutura.

Entregas:
- discovery de rede;
- mapa por setor/unidade;
- SNMP/ICMP quando permitido;
- impressoras;
- toner/cartucho;
- contador de paginas;
- estoque minimo;
- alerta de compra;
- queda coletiva.

### Fase 6 - Seguranca e compliance

Objetivo: postura de seguranca operacional.

Entregas:
- Defender/firewall/update/BitLocker;
- softwares suspeitos;
- vulnerabilidades basicas;
- eventos de login;
- findings por severidade;
- relatorio de higiene de TI.

### Fase 7 - Automacao e Remote Operations

Objetivo: acoes tecnicas seguras e auditaveis.

Entregas:
- command jobs;
- approvals;
- allowlist/blocklist;
- scripts aprovados;
- Wake-on-LAN;
- execucao remota controlada;
- terminal seguro;
- output realtime;
- auditoria completa.

### Fase 8 - AI Ops

Objetivo: copiloto operacional e previsao.

Entregas:
- memoria por empresa;
- base de conhecimento automatica;
- sugestoes com feedback;
- deteccao de padroes;
- previsao de falha/compra;
- relatorios gerados por IA;
- recomendacoes executivas.

## 17. Proximas entregas recomendadas

Ordem profissional para evitar retrabalho:

1. Criar modelo de setores/unidades e vincular usuarios/ativos/chamados.
2. Reorganizar navegacao web em workspace operacional premium.
3. Entregar inbox/chat premium em TI e usuario comum.
4. Criar dashboard executivo v1 com dados reais.
5. Evoluir Synapse.Agent v2 .NET como Windows Service real.
6. Criar audit log unificado e lixeira global.
7. Criar health score de ativos.
8. Criar timeline completa do ativo.
9. Criar modulo inicial de impressoras/estoque preventivo.
10. Criar policy engine/command jobs para operacoes remotas.

## 18. Criterio de aceite final

Uma entrega so esta aprovada quando:
- build frontend passa;
- build backend passa;
- desktop build passa;
- runtime local passa;
- producao abre sem tela branca;
- permissoes estao validadas no backend;
- usuario comum nao ve dados tecnicos;
- TI/Admin ve o que tem permissao;
- master_admin opera globalmente com seguranca;
- dados reais substituem mocks;
- acoes criticas geram auditoria;
- UX nao parece painel improvisado;
- qualquer pendencia real fica documentada.

## 19. Fontes de referencia

- NinjaOne RMM: https://www.ninjaone.com/rmm/
- Atera RMM: https://www.atera.com/products/rmm/
- Freshservice ITSM: https://www.freshworks.com/freshservice/it-service-desk-software/
- Freshservice ITAM: https://www.freshworks.com/freshservice/it-asset-management/
- ServiceNow ITSM: https://www.servicenow.com/products/itsm.html
- ServiceNow Autonomous Workforce: https://newsroom.servicenow.com/press-releases/details/2026/ServiceNow-brings-Autonomous-Workforce-to-every-major-business-function/default.aspx
- Zabbix features: https://www.zabbix.com/features
- Grafana: https://grafana.com/
- Wazuh platform: https://wazuh.com/platform/
- Lansweeper Discovery: https://docs.lansweeper.com/docs/lansweeper-discovery
