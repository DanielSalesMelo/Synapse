# Azure Backend Checklist

Use este checklist para publicar `packages/services/legacy-api` no Azure App Service.

## 1. App Service

- Runtime: `Node 20 LTS`
- Sistema: `Linux`
- Plano: `Free (F1)` para teste
- Startup Command:

```text
npm start
```

## 2. Application Settings

Configure estas variáveis no App Service:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
FRONTEND_URL=https://synapse-seven-nu.vercel.app
OWNER_OPEN_ID=...
OAUTH_SERVER_URL=
VITE_APP_ID=synapse
```

Adicione também:

```env
WEBSITE_NODE_DEFAULT_VERSION=~20
```

IA paga deve permanecer opcional nesta fase. Quando a camada de IA for ativada,
configure provedores por variável própria, sem tornar OpenAI obrigatório.

## 3. Depois do deploy

Teste estes endpoints:

```text
https://SEU-APP.azurewebsites.net/health
https://SEU-APP.azurewebsites.net/api/trpc/auth.login?batch=1
```

Teste preflight:

```text
Origin: https://synapse-seven-nu.vercel.app
Method: OPTIONS
Path: /api/trpc/auth.login?batch=1
```

## 4. Frontend

No projeto da Vercel, atualize:

```env
VITE_API_URL=https://SEU-APP.azurewebsites.net
```

Depois faça redeploy do frontend.
