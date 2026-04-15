# Rotiq — Sistema ERP de Frota

## Infraestrutura
- [x] Schema do banco com 15 tabelas (soft delete em todas)
- [x] Log de auditoria (audit_log)
- [x] Multi-tenant (empresas)
- [x] Roles: user, admin, master_admin, monitor, dispatcher
- [ ] Corrigir adminProcedure para aceitar master_admin e monitor
- [ ] Router de auditoria (listar logs, restaurar registros)
- [ ] Router de viagens completo
- [ ] Router de checklist completo
- [ ] Router de adiantamentos completo
- [ ] Router de tanque de combustível

## Frontend — Páginas
- [x] Home (landing page com login)
- [x] Dashboard (KPIs básicos)
- [x] Veículos (com separação cavalo/carreta)
- [x] Funcionários (CLT + freelancer + motorista + ajudante)
- [x] Abastecimentos
- [x] Manutenções
- [x] Financeiro (contas a pagar)
- [ ] Dashboard elevado (gráficos, consumo mensal, despesas por categoria)
- [ ] Financeiro — Contas a Receber
- [ ] Financeiro — Adiantamentos (dinheiro para motorista viajar)
- [ ] Viagens (despacho com motorista + múltiplos ajudantes + cavalo/carreta)
- [ ] Checklist Digital (35 itens, conforme/não conforme/NA)
- [ ] Tanque de Combustível (controle de estoque interno)
- [ ] Auditoria (log de ações, lixeira, restauração)
- [ ] Empresa (cadastro, configurações)
- [ ] Acidentes

## Importação de Dados
- [ ] Importar veículos das planilhas Excel
- [ ] Importar motoristas das planilhas Excel
- [ ] Importar abastecimentos (2.043 registros)
- [ ] Importar manutenções (1.470 registros)
- [ ] Importar controle de tanque
- [ ] Criar empresa BSB no banco

## Melhorias Futuras
- [ ] Multilíngua (PT, EN, ES)
- [ ] Integração Winthor (cargas, rotas, peso)
- [ ] Login por e-mail (quando 4 empresas estiverem rodando)
- [ ] Módulo de CTEs (Conhecimento de Transporte Eletrônico)
- [ ] Módulo de Empilhadeiras (gás, manutenção)
- [ ] Checklist independente para carreta acoplada

## Validação e Erros
- [x] Helper centralizado de tratamento de erros (mapear erros PostgreSQL para mensagens amigáveis)
- [ ] Validação mínima em todos os routers (só campos essenciais obrigatórios)
- [ ] Mensagens de erro amigáveis no frontend (sem mensagens técnicas de banco)
- [ ] Log de erros internos para diagnóstico sem expor ao usuário

## Calculadora de Viagem
- [ ] Endpoint tRPC calcularCustoViagem (recebe veículo, distância, frete, ajudantes)
- [ ] Cálculo automático: combustível estimado (km / média consumo × preço diesel)
- [ ] Cálculo de diárias de motorista e ajudantes (valor × dias estimados)
- [ ] Cálculo de pedágios estimados (por rota)
- [ ] Margem de lucro: frete total - (combustível + diárias + pedágio + outros)
- [ ] Indicador visual: verde (lucrativo) / amarelo (margem baixa) / vermelho (prejuízo)
- [ ] Integrado na página de Viagens (antes de despachar)
- [ ] Card resumo no Dashboard Financeiro
- [ ] Histórico de precisão: comparar estimado vs real após conclusão da viagem

## Financeiro — Custo Total Real por Veículo
- [ ] Custo por km: (combustível + manutenções + pneus + seguro + IPVA) ÷ km rodado
- [ ] Manutenção preventiva por km: alertas quando veículo se aproximar do km programado
- [ ] Custo de manutenção rateado por viagem (custo médio manutenção ÷ km entre manutenções)
- [ ] Custo de pneus por km (valor pneu ÷ vida útil estimada em km)
- [ ] Custo fixo mensal por veículo (seguro, IPVA, licenciamento ÷ 12)
- [ ] Calculadora de viagem usa custo total real (não só combustível)
- [ ] Dashboard financeiro: gráfico de custo por km por veículo (comparativo)
- [ ] Alerta: veículo com custo por km acima da média da frota
- [ ] Relatório mensal: receita de fretes vs custo total operacional por veículo

## Bugs reportados (20/03/2026)
- [x] 404 em /empresa — rota não registrada no App.tsx
- [x] 404 em /financeiro/adiantamentos — rota não registrada
- [x] 404 em /checklist — rota não registrada
- [x] Criar página Empresa (configurações da empresa)
- [x] Criar página Adiantamentos completa
- [x] Criar página Checklist digital (35 itens)
- [x] Criar página Gerenciamento de Usuários (permissões por empresa)
- [x] Custos Operacionais — item de menu não clicável (falta rota e página)
- [x] Filtros em Abastecimentos: por data (período), veículo, motorista, tipo (diesel/arla/gasolina)
- [x] Filtros em Manutenções: por data, veículo, empresa/oficina, tipo de serviço
- [ ] Filtros em Viagens: por data, motorista, veículo, destino, status
- [ ] Filtros em Financeiro (Contas): por data, status (pago/pendente), categoria
- [x] Criar página Custos Operacionais com gráficos e filtros por veículo/período
- [x] Painel do Despachante — tela dedicada para registrar saída/chegada, motorista, ajudantes, KM
- [x] Página Custos Operacionais (/custos) — criar página e rota
- [x] Filtros em Manutenções — adicionar painel de filtros na tela
- [ ] Contas a Receber — página separada da Contas a Pagar
- [x] Gerenciamento de Usuários — dar/revogar acesso por nível de permissão
- [x] Seletor de tema: claro, escuro e cinza (salvo por usuário, persiste entre sessões)
- [x] Responsividade completa: mobile, tablet e desktop em todas as páginas
- [ ] Bug: ícone duplo/sobreposto no item Despachante do menu
- [ ] Bug: menu lateral desorganizado — seções e itens fora de ordem
- [ ] Bug: Despachante não abre ao clicar
- [ ] Bug: Despachante — erro "Select.Item must have a non-empty value" ao abrir a página

## Funcionalidades do Sistema Antigo (FrotaSegura) a Implementar

- [x] Reorganizar menu: seções DESPACHANTE, OPERACIONAL, FROTA, GESTÃO, SISTEMA, MASTER
- [x] Criar página Saída de Entrega (/despachante/entrega) - entrega local, sai e volta no mesmo dia
- [x] Criar página Saída de Viagem (/despachante/viagem) - viagens longas
- [x] Criar página Retorno de Veículo (/despachante/retorno) com checklist de inspeção
- [x] Criar página Plano de Manutenção (/plano-manutencao)
- [x] Criar página Estoque de Combustível (/gestao/estoque-combustivel)
- [x] Criar página Multas (/gestao/multas)
- [x] Criar página Acidentes (/gestao/acidentes)
- [x] Criar página Acertos (/gestao/acertos)
- [x] Criar página Relatos (/gestao/relatos)
- [x] Criar página Documentos (/gestao/documentos)
- [x] Criar página Alertas (/gestao/alertas)
- [x] Criar página Calendário (/gestao/calendario)
- [x] Criar página Relatórios com abas Viagens/Abastecimentos/Manutenções (/relatorios)
- [ ] Adicionar campo ARLA (litros) no formulário de Abastecimento

## Bugs reportados (20/03/2026 — sessão 2)
- [x] Custos Operacionais — cards KPI com valores grandes quebrando linha (ex: "R$ 81.641,75" não cabe)
- [x] Dashboard — ícones sobrepostos nos títulos dos cards KPI em telas pequenas
- [x] Custos Operacionais — valores grandes cortados nos cards KPI

## Módulos a Implementar (sessão 20/03/2026 — tarde)
- [x] Estoque de Combustível — gauge circular + KPIs + histórico + botão Adicionar Combustível
- [x] Multas — interface completa: formulário + listagem + filtros + status
- [x] Relatos de Ocorrências — formulário com veículo, motorista, tipo, urgência, descrição
- [x] Documentação da Frota — CRLV, seguro, status por veículo, KPIs vencidos/a vencer/em dia
- [x] Alertas automáticos — documentos vencendo, manutenções atrasadas, multas a vencer
- [x] Acertos — fechamento financeiro de viagens com motoristas
- [x] Painel Master — gestão de empresas e licenças (acesso exclusivo do dono)
- [x] Gestão de Permissões — perfis de acesso por módulo
- [x] Scripts .bat + .env para instalação local no Windows

## Bugs reportados (20/03/2026 — sessão 3)
- [x] Menu lateral desaparece ao navegar para Painel Master, Permissões e outras páginas que não usam DashboardLayout

## Bugs reportados (20/03/2026 — sessão 4)
- [x] Menu lateral: ao clicar em alguns itens, o scroll do menu volta para o topo em vez de manter a posição

## Novas features (20/03/2026 — sessão 5)
- [x] Simulador de Viagem: Google Maps com autocomplete de cidades, 3 rotas alternativas, KM, tempo, custo combustível, pedágio manual
- [x] Simulador de Viagem: mapa visual com rotas traçadas
- [x] Simulador de Viagem: integrar dados do veículo (consumo médio) do cadastro
- [ ] Viagens: adicionar autocomplete de origem/destino e dados de rota (KM, tempo) na criação de viagem
- [x] Estoque Combustível: custo médio ponderado do tanque interno (registrar compras com preço e calcular média)
- [x] Estoque Combustível: histórico de compras com data, fornecedor, litros, valor unitário, valor total
- [x] Abastecimentos: adicionar lista dos principais postos de combustível do Brasil (Ipiranga, BR, Shell, Ale, etc.) no campo de posto externo

## Importação e Planilha (20/03/2026 — sessão 6)
- [x] Importar compras do tanque diesel (CIAPETRO): 04/02 NF112126 10000L R$5,28; 05/03 NF113065 5000L R$5,75; 20/03 NF125078 (pendente)
- [x] Criar planilha Excel de abastecimentos com coluna tipo (interno/externo), veículos, motoristas, Nota Fiscal e postos
- [x] Bug: Viagens — erro "Select.Item must have a non-empty value" ao abrir a página
- [x] Google Maps autocomplete em todos os campos de origem/destino: Viagens, Saída de Entrega, Saída de Viagem, Despachante
- [x] Simulador de Viagem: calculadora completa de frete já estava presente (custos, margem, diárias, combustível estimado, indicador lucro/prejuízo) junto com o mapa
- [x] Adicionar campo Nota Fiscal nos formulários de Abastecimento e Viagem
- [x] Empresa BSB — precisa ser criada via "Nova Empresa" no Painel Master (não é bug)
- [ ] Modo de teste: criar contas de demonstração com usuário/senha, tempo limitado e dados fictícios para prospects
- [x] Abastecimento: filtrar veículos por status (interno=na base, externo=em viagem) e auto-preencher motorista vinculado
- [x] Painel Master: admin master pode promover outro usuário a admin master
- [x] Simulador de Viagem: mover mapa para abaixo dos dados de simulação
- [x] Bug: Painel Master — botão de promover usuário a master admin não funcionava pois owner estava como admin em vez de master_admin (corrigido no db.ts e banco)
- [ ] Bug: Dashboard — card "Combustível (mês)" mostra R$ 0,00 mesmo com abastecimentos cadastrados

## Bugs reportados (23/03/2026)
- [ ] Permissões: módulo Master visível para todos, mas deve aparecer apenas para master_admin
- [ ] Permissões: admin comum consegue acessar Painel Master e Permissões (sem guard de acesso)
- [ ] Dashboard: card "Combustível (mês)" mostra R$ 0,00 — valorTotal dos abastecimentos está NULL no banco

## Chat Interno (nova feature)
- [x] Schema: tabelas chat_conversations, chat_messages, chat_members
- [x] Backend: routers/chat.ts com procedures para criar/listar/enviar mensagens
- [x] Frontend: página Chat.tsx com lista de conversas e painel de mensagens
- [x] Frontend: criar conversa individual (selecionar usuário)
- [ ] Frontend: criar grupo (selecionar múltiplos usuários, nomear grupo)
- [ ] Frontend: controle de permissões em grupo (admin define se membros podem se comunicar)
- [ ] Frontend: indicador de mensagens não lidas
- [ ] Frontend: busca em conversas e mensagens
- [x] Realtime: polling básico a cada 3s implementado no frontend


## Relatórios — Filtros Avançados e Exportação (nova feature)
- [ ] Relatórios: painel de filtros por período (data inicial/final)
- [ ] Relatórios: filtro por veículo (select com lista de veículos)
- [ ] Relatórios: filtro por motorista/responsável
- [ ] Relatórios: filtro por status (viagens: concluída/cancelada/em andamento)
- [ ] Relatórios: filtro por categoria (manutenções: preventiva/corretiva/revisão)
- [ ] Relatórios: indicador de quantos registros correspondem aos filtros
- [ ] Relatórios: botão "Exportar CSV" — gera arquivo separado por vírgula
- [ ] Relatórios: botão "Exportar Excel" — gera arquivo .xlsx com formatação e múltiplas abas
- [ ] Relatórios: exportação mantém filtros aplicados (exporta apenas dados filtrados)
- [ ] Relatórios: preview dos dados antes de exportar
- [ ] Backend: endpoint para exportação CSV (retorna arquivo binário)
- [ ] Backend: endpoint para exportação Excel (retorna arquivo binário)


## Bugs de Layout (23/03/2026)
- [ ] Estoque Combustível: números grandes saindo dos cards KPI (Custo Médio/L, Total Comprado, etc.)
- [ ] Estoque Combustível: tabela de histórico com colunas apertadas, texto quebrando
- [ ] Melhorar responsividade dos cards em telas pequenas
