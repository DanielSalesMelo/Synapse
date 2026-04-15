# Mapeamento de Mudanças - Synapse

## 1. CORRIGIR LOGIN (tRPC v10 → v11)
- package.json: já atualizado para v11
- package-lock.json: já atualizado para v11
- src/lib/trpc.ts: remover transformer do createTRPCReact ✅
- src/main.tsx: transformer no httpBatchLink está OK ✅
- Precisa: commit + push para forçar npm install na Vercel com v11

## 2. MÓDULOS EXISTENTES (OK)
- Dashboard, Viagens, Carregamento, Notas Fiscais, Acerto de Carga
- Abastecimentos, Manutenções, Motoristas/Funcionários, Checklist
- Financeiro (Contas Pagar/Receber, Adiantamentos, Custos, DRE)
- Despachante (Saída Entrega/Viagem, Retorno)
- Gestão (Estoque Combustível, Multas, Acidentes, Relatos, Docs, Alertas, Calendário)
- Chat (já existe com conversas 1-1 e grupo)
- IA (Synapse AI com agentes)
- WMS (Estoque, Produtos, Movimentações, Armazéns)
- Integrações, Relatórios, Import/Export
- Master (Painel, Permissões)

## 3. MÓDULOS A TRANSFORMAR
- Recepção → Recepcionista (controle de visitantes, agendamentos, crachás)

## 4. MÓDULOS NOVOS A CRIAR
- Logística (SAC, ANVISA/VISA, rastreamento, compliance)
- CRM (Clientes, Leads, Funil, Histórico de contatos)
- Vendas (Pedidos, Propostas, Comissões, Metas)

## 5. MELHORIAS
- Home: mostrar o que é o Synapse, listar todos os módulos
- Design: melhorar visual geral
- Interligar módulos entre si
- Chat: já funciona com grupos
