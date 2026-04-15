import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import axios from 'axios';

const app = express();
const PORT = process.env.AI_SERVICE_PORT || 3001;

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'ai-service' });
});

app.post('/api/v1/ai/chat', async (req: Request, res: Response) => {
  const { question, userId, tenantId, userRole } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'A pergunta é obrigatória.' });
  }

  console.log(`[ai-service] Recebida pergunta de ${userId} no tenant ${tenantId}: "${question}"`);

  try {
    let coreyResponse = `Olá! Eu sou o Corey. Você perguntou: "${question}". Esta é uma ótima pergunta.`;

    if (question.toLowerCase().includes('funil de vendas')) {
        coreyResponse = "Para visualizar seu funil de vendas, navegue até a seção 'Vendas' no menu principal. Lá você verá um quadro Kanban com seus negócios organizados por etapas.";
    }

    res.status(200).json({
      answer: coreyResponse,
      source: 'Corey (Powered by NexCore AI)',
    });

  } catch (error) {
    console.error('[ai-service] Erro ao processar a pergunta:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao contatar o assistente de IA.' });
  }
});

app.listen(PORT, () => {
  console.log(`[ai-service] 🤖 AI Service (Corey) rodando na porta ${PORT}`);
});
