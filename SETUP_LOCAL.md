# Configuração Local - Rotiq no Windows

Este guia descreve como configurar e rodar o projeto Rotiq localmente no seu Windows.

## Pré-requisitos

1. **Node.js** (v18 ou superior)
   - Baixe em: https://nodejs.org/
   - Verifique a instalação: `node --version` e `npm --version`

2. **PostgreSQL** (v14 ou superior)
   - Baixe em: https://www.postgresql.org/download/windows/
   - Durante a instalação, defina uma senha para o usuário `postgres`
   - Verifique a instalação: `psql --version`

3. **Git** (para clonar e gerenciar o repositório)
   - Já deve estar instalado se você clonou o projeto

## Passo 1: Clonar o Repositório

```bash
git clone https://github.com/DanielSalesMelo/Rotiq.git
cd Rotiq
```

## Passo 2: Configurar o Banco de Dados PostgreSQL

### 2.1 Criar um banco de dados local

Abra o terminal (PowerShell ou CMD) e conecte ao PostgreSQL:

```bash
psql -U postgres
```

Você será solicitado a inserir a senha do usuário `postgres`. Após conectar, execute:

```sql
CREATE DATABASE rotiq;
\q
```

### 2.2 Configurar a variável de ambiente

Na raiz do projeto (`C:\Users\danie\Rotiq`), crie um arquivo `.env` com:

```
DATABASE_URL=postgresql://postgres:sua_senha_aqui@localhost:5432/rotiq
OAUTH_SERVER_URL=https://seu-oauth-server.com
OWNER_OPEN_ID=seu-open-id-aqui
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
```

**Importante:** Substitua `sua_senha_aqui` pela senha que você definiu durante a instalação do PostgreSQL.

## Passo 3: Instalar Dependências

### 3.1 Instalar dependências do servidor

```bash
cd server
npm install
```

### 3.2 Instalar dependências do cliente (em outro terminal)

```bash
cd client
npm install
```

## Passo 4: Executar as Migrações do Banco de Dados

No terminal da pasta `server`, execute:

```bash
npm run db:migrate
```

Isso criará as tabelas e estruturas necessárias no banco de dados PostgreSQL.

## Passo 5: Rodar o Sistema

### 5.1 Iniciar o Backend (Server)

No terminal da pasta `server`:

```bash
npm run start
```

Você deve ver a mensagem: `[Server] Rotiq Backend running on port 3000`

### 5.2 Iniciar o Frontend (Client)

Abra **outro** terminal na pasta `client`:

```bash
npm run dev
```

Você deve ver algo como: `VITE v5.x.x ready in xxx ms` e uma URL local (geralmente `http://localhost:5173`)

## Passo 6: Acessar a Aplicação

Abra seu navegador e acesse:

```
http://localhost:5173
```

## Troubleshooting

### Erro: "Cannot find module 'postgres'"

Execute no terminal da pasta `server`:
```bash
npm install postgres
```

### Erro: "DATABASE_URL is required"

Certifique-se de que o arquivo `.env` está na raiz do projeto e contém a variável `DATABASE_URL`.

### Erro: "Connection refused" ao conectar ao PostgreSQL

Verifique se o PostgreSQL está rodando:
- No Windows, abra "Services" e procure por "postgresql"
- Ou execute: `pg_ctl -D "C:\Program Files\PostgreSQL\14\data" start`

### Porta 3000 já está em uso

Se a porta 3000 já está em uso, você pode mudar no arquivo `.env`:
```
PORT=3001
```

## Próximos Passos

- Consulte a documentação do projeto em `GUIA_INSTALACAO_LOCAL.md` para mais detalhes
- Para deploy no Railway/Vercel, veja as configurações específicas em `vercel.json` e `railway.json`

## Suporte

Se encontrar problemas, verifique:
1. Se o Node.js e PostgreSQL estão instalados corretamente
2. Se as variáveis de ambiente estão configuradas
3. Se o banco de dados foi criado e as migrações foram executadas
