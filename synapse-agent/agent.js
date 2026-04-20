const os = require('os');
const axios = require('axios');

// Configurações
const API_URL = process.env.API_URL || 'http://localhost:8080/agent/register';

async function registerAgent() {
  try {
    // Coletar informações do sistema
    const agentData = {
      hostname: os.hostname(),
      osType: os.type(),
      totalMemory: os.totalmem(),
    };

    console.log('Coletando dados do sistema:', agentData);
    console.log(`Tentando registrar no servidor: ${API_URL}`);

    // Enviar requisição de registro
    const response = await axios.post(API_URL, agentData);

    if (response.status === 201) {
      console.log(`✅ Agente registrado com sucesso com o ID: ${response.data.id}`);
    } else if (response.status === 200) {
      console.log(`ℹ️ Agente já registrado. ID existente: ${response.data.id}`);
    } else {
      console.log(`⚠️ Resposta inesperada do servidor: ${response.status}`);
      console.log(response.data);
    }
  } catch (error) {
    console.error('❌ Erro ao registrar o agente:');
    if (error.response) {
      // O servidor respondeu com um status fora do range 2xx
      console.error(`Status: ${error.response.status}`);
      console.error('Dados:', error.response.data);
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Não foi possível conectar ao servidor. Verifique se o back-end está rodando.');
    } else {
      // Erro na configuração da requisição
      console.error('Erro:', error.message);
    }
  }
}

// Executar o registro
registerAgent();
