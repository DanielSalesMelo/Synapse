# Configuração de Banco de Dados - Rotiq

## Visão Geral

O Rotiq utiliza um banco de dados PostgreSQL compartilhado entre o ambiente local e a produção (Vercel + Railway). A configuração foi padronizada para usar a variável de ambiente `DATABASE_URL` em ambos os locais, garantindo sincronização e evitando conflitos de migração.

## Estrutura de Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                      Vercel (Frontend)                       │
│  - Hospeda o aplicativo React (dist/)                        │
│  - Proxy /api/trpc → Railway Backend                         │
│  - Sem acesso direto ao banco de dados                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Railway (Backend API)                      │
│  - Executa o servidor Express + tRPC                         │
│  - Conecta ao PostgreSQL via DATABASE_URL                    │
│  - Gerencia migrações e operações de banco                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL (Banco de Dados Compartilhado)        │
│  - Railway Postgres (crossover.proxy.rlwy.net)               │
│  - Mesmo banco para local e produção                         │
└─────────────────────────────────────────────────────────────┘
```

## Variáveis de Ambiente

### Vercel
Na dashboard da Vercel, configure as seguintes variáveis de ambiente:

```
DATABASE_URL=postgresql://postgres:JXaYfLedIWpwfXXOFuRkhSityLMAfole@crossover.proxy.rlwy.net:40549/railway
OAUTH_SERVER_URL=<seu-oauth-server>
OWNER_OPEN_ID=<seu-open-id>
```

### Railway
Na dashboard da Railway, o `DATABASE_URL` já deve estar configurado automaticamente. Adicione as outras variáveis se necessário:

```
OAUTH_SERVER_URL=<seu-oauth-server>
OWNER_OPEN_ID=<seu-open-id>
NODE_ENV=production
```

### Local (Desenvolvimento)
Crie um arquivo `.env` na raiz do projeto:

```
DATABASE_URL=postgresql://postgres:JXaYfLedIWpwfXXOFuRkhSityLMAfole@crossover.proxy.rlwy.net:40549/railway
OAUTH_SERVER_URL=<seu-oauth-server>
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
OWNER_OPEN_ID=<seu-open-id>
```

**Nota:** Para desenvolvimento local isolado, você pode usar um banco PostgreSQL local:
```
DATABASE_URL=postgresql://usuario:senha@localhost:5432/rotiq
```

## Configuração de Migrações

### Arquivos de Configuração Drizzle

Ambos os arquivos (`drizzle.config.ts` na raiz e `server/drizzle.config.ts`) agora usam a variável de ambiente `DATABASE_URL`:

**Raiz (`drizzle.config.ts`):**
```typescript
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
```

**Servidor (`server/drizzle.config.ts`):**
```typescript
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
```

## Como Executar Migrações

### Localmente
```bash
# Instalar dependências
npm install
cd server && npm install && cd ..

# Executar migrações
cd server
npm run db:migrate
cd ..
```

### Na Railway
As migrações são executadas automaticamente durante o deploy se configurado no `railway.json`:

```json
{
  "deploy": {
    "startCommand": "cd server && npm run build && npm run serve"
  }
}
```

Se precisar executar manualmente:
```bash
cd server
npm run db:migrate
```

## Troubleshooting

### Erro: "DATABASE_URL is required"
- Verifique se a variável `DATABASE_URL` está configurada no arquivo `.env` (local) ou na dashboard da plataforma (Vercel/Railway).
- Certifique-se de que o arquivo `.env` está na raiz do projeto.

### Erro: "Failed to connect to database"
- Verifique a URL de conexão PostgreSQL.
- Confirme que o banco de dados está acessível (firewall, rede, credenciais).
- Teste a conexão com um cliente PostgreSQL:
  ```bash
  psql "postgresql://postgres:senha@host:porta/database"
  ```

### Migrações conflitantes
- Se as migrações locais divergirem da produção, sincronize manualmente:
  ```bash
  cd server
  npm run db:migrate
  ```
- Verifique o histórico de migrações em `server/drizzle/migrations/`.

## Segurança

⚠️ **IMPORTANTE:** A URL do banco de dados contém credenciais sensíveis. Nunca commite o arquivo `.env` no repositório. Sempre use variáveis de ambiente fornecidas pela plataforma (Vercel, Railway).

Se as credenciais forem expostas, regenere-as imediatamente no painel da Railway.

## Referências

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
