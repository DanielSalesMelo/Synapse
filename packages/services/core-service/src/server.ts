// Importa as configurações de variáveis de ambiente primeiro
import 'dotenv/config';

// Importa as bibliotecas do Express e de segurança
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';

// Importa os arquivos de rota que o agente criou
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

// --- CONFIGURAÇÃO INICIAL DO SERVIDOR ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES DE SEGURANÇA ---
app.use(helmet()); // Protege contra vulnerabilidades conhecidas
app.use(cors({ origin: '*' })); // Permite requisições de outros domínios (TODO: restringir em produção)
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições
app.use(hpp()); // Protege contra HTTP Parameter Pollution
app.use(mongoSanitize()); // Remove caracteres maliciosos de inputs

// --- ROTA DE VERIFICAÇÃO DE SAÚDE (HEALTH CHECK) ---
// Essencial para saber se o serviço está no ar
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Core-Service' });
});

// --- CARREGAMENTO DAS ROTAS PRINCIPAIS ---
// Todas as rotas relacionadas a autenticação usarão o prefixo /auth
app.use('/auth', authRoutes);
// As rotas de administração (tenants, companies, etc.) usarão o prefixo /
app.use('/', adminRoutes);


// --- INICIALIZAÇÃO DO SERVIDOR ---
// Função que inicia o servidor e o faz "ouvir" na porta configurada
const startServer = () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Core-Service (com Segurança) rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Erro fatal ao iniciar o servidor:", error);
    process.exit(1);
  }
};

// Executa a função para iniciar o servidor
startServer();
