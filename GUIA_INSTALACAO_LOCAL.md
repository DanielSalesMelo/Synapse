# Rotiq — Guia de Instalação Local (Windows)

## Pré-requisitos

| Software | Versão Mínima | Download |
|----------|--------------|----------|
| Node.js | 22 LTS | https://nodejs.org/ |
| PostgreSQL | 14+ | https://www.postgresql.org/download/ |
| pnpm | 9+ | Instalado automaticamente pelo script |
| VS Code | Qualquer | https://code.visualstudio.com/ |

**Alternativa ao PostgreSQL:** Pode usar Docker: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=root postgres:16`

---

## Instalação Passo a Passo

### 1. Extrair os arquivos

Extraia o ZIP do projeto para uma pasta, por exemplo: `C:\Projetos\Rotiq`

### 2. Criar o banco de dados

**Opção A — Usando o script automático:**

Dê duplo clique em `criar-banco.bat` e siga as instruções na tela.

**Opção B — Manualmente via psql CLI:**

```sql
CREATE DATABASE rotiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Depois importe os arquivos SQL na ordem:

```
sql/01_schema_inicial.sql
sql/02_migracao_adicional.sql
```

Crie o usuário admin:

```sql
INSERT INTO users (openId, name, email, role, createdAt, updatedAt) 
VALUES ('admin', 'Administrador', 'admin@rotiq.local', 'admin', NOW(), NOW());
```

### 3. Configurar variáveis de ambiente

Copie `.env.exemplo` para `.env`:

```
copy .env.exemplo .env
```

Edite o arquivo `.env` com o Notepad ou VS Code e preencha:

```env
DATABASE_URL=postgresql://postgres:sua_senha@localhost:5432/rotiq
JWT_SECRET=gere_uma_chave_aleatoria_aqui
OWNER_OPEN_ID=admin
OWNER_NAME=Administrador
```

**Para gerar o JWT_SECRET**, abra o terminal e execute:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Instalar dependências

Dê duplo clique em `instalar-local.bat` ou execute no terminal:

```
pnpm install
```

### 5. Iniciar o sistema

Dê duplo clique em `iniciar.bat` ou execute no terminal:

```
pnpm dev
```

O sistema abrirá automaticamente em: **http://localhost:3000**

---

## Estrutura de Pastas

```
Rotiq/
├── client/                 ← Frontend (React 19 + Tailwind 4)
│   ├── src/
│   │   ├── pages/          ← Páginas do sistema
│   │   ├── components/     ← Componentes reutilizáveis
│   │   └── App.tsx         ← Rotas e layout
│   └── index.html
├── server/                 ← Backend (Express + tRPC)
│   ├── routers/            ← Endpoints da API
│   ├── routers.ts          ← Registro de todos os routers
│   └── _core/              ← Infraestrutura (NÃO editar)
├── drizzle/                ← Schema do banco de dados
│   └── schema.ts           ← Definição das tabelas
├── sql/                    ← Scripts SQL para instalação
│   ├── 01_schema_inicial.sql
│   └── 02_migracao_adicional.sql
├── .env.exemplo            ← Modelo de configuração
├── instalar-local.bat      ← Script de instalação
├── iniciar.bat             ← Script para iniciar
├── criar-banco.bat         ← Script para criar banco
└── package.json
```

---

## Sobre a Autenticação

O sistema na plataforma Manus usa OAuth (login via Manus). Para uso local, o sistema precisa ser adaptado para login por usuário e senha. Existem duas opções:

**Opção 1 — Manter o OAuth da Manus (mais simples):**
Se o sistema estiver publicado na Manus, o login funciona automaticamente. Use esta opção se for acessar via link da Manus.

**Opção 2 — Login local por usuário/senha:**
Requer modificação no código do servidor para implementar autenticação local com bcrypt. Esta mudança pode ser feita em uma sessão futura.

---

## Módulos Implementados

| Módulo | Status | Rota |
|--------|--------|------|
| Dashboard | Funcional | /dashboard |
| Saída de Entrega | Funcional | /despachante/entrega |
| Saída de Viagem | Funcional | /despachante/viagem |
| Retorno de Veículo | Funcional | /despachante/retorno |
| Viagens | Funcional | /viagens |
| Abastecimentos | Funcional | /abastecimentos |
| Simulador de Viagem | Funcional | /simulador-viagem |
| Veículos | Funcional | /veiculos |
| Motoristas | Funcional | /funcionarios |
| Manutenções | Funcional | /manutencoes |
| Plano de Manutenção | Funcional | /plano-manutencao |
| Estoque de Combustível | Funcional | /gestao/estoque-combustivel |
| Multas | Funcional | /gestao/multas |
| Acidentes | Funcional | /gestao/acidentes |
| Acertos | Funcional | /gestao/acertos |
| Checklist | Funcional | /checklist |
| Relatos | Funcional | /gestao/relatos |
| Documentação da Frota | Funcional | /gestao/documentos |
| Alertas | Funcional | /gestao/alertas |
| Calendário | Funcional | /gestao/calendario |
| Relatórios | Funcional | /relatorios |
| Usuários | Funcional | /usuarios |
| Configurações | Funcional | /empresa |
| Financeiro | Funcional | /financeiro |
| Adiantamentos | Funcional | /financeiro/adiantamentos |
| Custos Operacionais | Funcional | /custos |
| Painel Master | Funcional | /master/painel |
| Permissões | Funcional | /master/permissoes |

---

## Solução de Problemas

**Erro "ECONNREFUSED" ao iniciar:**
O PostgreSQL não está rodando. Inicie o serviço PostgreSQL.

**Erro "Access denied for user":**
Verifique o usuário e senha do PostgreSQL no arquivo `.env`.

**Erro "Unknown database 'rotiq'":**
Execute o `criar-banco.bat` primeiro.

**Porta 3000 já em uso:**
Altere a porta no `.env`: `PORT=3001`

**Tela branca ao acessar:**
Limpe o cache do navegador (Ctrl+Shift+Del) e recarregue.
