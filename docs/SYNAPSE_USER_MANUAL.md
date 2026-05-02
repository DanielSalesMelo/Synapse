# Manual do Synapse

## Acesso
1. Abra `https://synapse-seven-nu.vercel.app`
2. Entre com e-mail e senha
3. Se a sessão antiga travar a tela, use `Ctrl + F5`

## Estrutura do sistema
O Synapse reúne operação, financeiro, RH, TI, logística, BI e uma central pessoal/profissional do master.

## Troca de empresa
- use o seletor no topo
- cada tela passa a mostrar apenas a empresa ativa
- usuários com acesso a mais de uma empresa podem alternar sem sair do sistema

## Pessoal / Central do Daniel
- agenda pessoal
- clientes
- tarefas
- campanhas
- landing pages
- leads
- propostas
- financeiro pessoal/profissional

## Financeiro
### Contas a pagar
1. Abra `Financeiro`
2. Vá em `Pagar`
3. Clique em `Nova conta`
4. Informe descrição, categoria, valor e vencimento

### Contas a receber
1. Abra `Financeiro`
2. Vá em `Receber`
3. Cadastre cliente, valor e vencimento

### Projeção
- a visão geral mostra projeção de fluxo em 7, 15 e 30 dias
- também mostra aging de pendências

## RH
### Novo colaborador
1. Abra `RH`
2. Clique em `Novo colaborador`
3. Preencha nome, função e dados essenciais
4. Se necessário, marque benefícios

### Folha
1. Abra `RH > Folha`
2. Clique em `Processar folha`
3. Escolha mês, ano e vencimento
4. O sistema gera salário, benefícios e encargos estimados no financeiro

## TI
### Abrir chamado
1. Vá em `TI > Chamados`
2. Clique em `Novo chamado`
3. Informe título, descrição e prioridade

### Compras de TI
1. Vá em `TI > Compras`
2. Cadastre item, quantidade e valor
3. O sistema calcula valor total e alçada
4. Perfis de gestão aprovam ou rejeitam

### Agente do PC
1. Vá em `TI > Agentes`
2. Gere um código
3. Baixe `Instalador .bat`
4. Execute o instalador
5. Informe código e URL do servidor

### Suporte do agente
- o agente coleta hostname, CPU, RAM, disco, uptime, usuário e AnyDesk quando existir
- o atalho/manual de suporte usa:
```powershell
C:\Users\<usuario>\AppData\Local\SynapseAgent\synapse-agent.exe --support
```

## Chat interno
- conversa entre usuários
- grupos
- anexos
- imagens
- leitura de mensagens

## Omnichannel externo
- WhatsApp
- Telegram
- Instagram

Uso:
1. Configure a integração em `Sistema > Integrações`
2. Ative o canal
3. Use `Omnichannel` no menu para responder conversas externas

## BI e relatórios
- BI consolida dados reais do banco
- relatórios mostram estado vazio honesto quando faltar base

## Erros comuns
### Não consigo entrar
- confira e-mail e senha
- tente `Ctrl + F5`
- se continuar, verifique se a sessão não expirou

### Não vejo dados
- confirme a empresa selecionada no topo
- cadastre o primeiro item no módulo correspondente

### O agente não criou atalho
- isso depende do caminho real da área de trabalho do Windows
- use o instalador mais recente
- se necessário, abra manualmente o executável pelo caminho exibido no fim da instalação
