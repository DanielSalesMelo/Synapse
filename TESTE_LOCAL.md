# Guia de Teste Local - Rotiq

Este guia explica como rodar o sistema Rotiq na sua máquina local, conectando-se ao banco de dados da Railway para garantir que tudo esteja funcionando conforme o esperado.

## Pré-requisitos

- **Node.js** (versão 18 ou superior) instalado.
- **npm** ou **pnpm** instalado.
- Acesso à internet (para conectar ao banco da Railway).

## Passo 1: Configuração do Ambiente

1. Na raiz do projeto, crie um arquivo chamado `.env`.
2. Adicione as seguintes variáveis (substitua os valores se necessário):

```env
# Banco de Dados da Railway
DATABASE_URL=postgresql://postgres:JXaYfLedIWpwfXXOFuRkhSityLMAfole@crossover.proxy.rlwy.net:40549/railway

# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações de OAuth (se aplicável)
OAUTH_SERVER_URL=https://seu-oauth-server.com
OWNER_OPEN_ID=seu-open-id-aqui

# URL do Frontend para CORS
FRONTEND_URL=http://localhost:5173
```

## Passo 2: Instalação de Dependências

Abra o terminal na raiz do projeto e execute:

```bash
# Instala as dependências do frontend e do backend
npm run install:all
```

*Se o comando acima falhar, você pode fazer manualmente:*
```bash
npm install
cd server
npm install
cd ..
```

## Passo 3: Executando o Sistema

Você precisará de dois terminais abertos:

### Terminal 1: Backend (API)
```bash
npm run dev:server
```
O servidor deve iniciar em `http://localhost:3000`.

### Terminal 2: Frontend (Interface)
```bash
npm run dev
```
O frontend deve iniciar em `http://localhost:5173`.

## Passo 4: Testando as Funcionalidades

1. Abra o navegador em `http://localhost:5173`.
2. Tente fazer login ou navegar pelas telas.
3. Verifique se os dados estão sendo carregados (isso confirma a conexão com o banco da Railway).
4. Se você fizer uma alteração no banco localmente, ela refletirá na produção (Vercel), pois ambos usam o mesmo banco.

## Dicas de Solução de Problemas

- **Erro de Conexão com o Banco:** Verifique se o seu IP não está bloqueado pela Railway ou se a URL do banco mudou.
- **Erro de Porta Ocupada:** Se a porta 3000 ou 5173 estiver em uso, o sistema tentará usar a próxima disponível. Verifique as mensagens no terminal.
- **Erro de package.json na Vercel:** Este erro geralmente ocorre se a Vercel estiver configurada para olhar para a pasta errada. Certifique-se de que o "Root Directory" na Vercel está como `./`.

---
*Este guia foi gerado para auxiliar no desenvolvimento e sincronização do projeto Rotiq.*
