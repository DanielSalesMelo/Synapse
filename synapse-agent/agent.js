const os = require('os');
const axios = require('axios');
const osUtils = require('os-utils');

// Configurações
const API_BASE_URL = process.env.API_URL || 'http://localhost:8080/agent';
const REGISTER_URL = `${API_BASE_URL}/register`;
const HEARTBEAT_URL = `${API_BASE_URL}/heartbeat`;
const HEARTBEAT_INTERVAL = 60000; // 60 segundos

let assetId = null;

async function registerAgent() {
  try {
    const agentData = {
      hostname: os.hostname(),
      osType: os.type(),
      totalMemory: os.totalmem(),
    };

    console.log('--- Iniciando Registro ---');
    console.log('Coletando dados do sistema:', agentData);
    
    const response = await axios.post(REGISTER_URL, agentData);
    assetId = response.data.id;

    if (response.status === 201) {
      console.log(`✅ Agente registrado com sucesso. ID: ${assetId}`);
    } else {
      console.log(`ℹ️ Agente já possui registro. ID: ${assetId}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro no registro:', error.message);
    return false;
  }
}

async function sendHeartbeat() {
  if (!assetId) return;

  try {
    // Coletar dados de performance
    const cpuUsage = await new Promise((resolve) => {
      osUtils.cpuUsage((value) => resolve(value));
    });
    
    const heartbeatData = {
      assetId,
      hostname: os.hostname(),
      cpuUsage: (cpuUsage * 100).toFixed(2),
      freeMemory: osUtils.freeCommand() // Memória livre em MB
    };

    await axios.post(HEARTBEAT_URL, heartbeatData);
    console.log(`[${new Date().toLocaleTimeString()}] 💓 Heartbeat enviado com sucesso.`);
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Erro ao enviar heartbeat:`, error.message);
  }
}

async function start() {
  const registered = await registerAgent();
  
  if (registered) {
    console.log(`--- Iniciando Monitoramento Contínuo (Intervalo: ${HEARTBEAT_INTERVAL/1000}s) ---`);
    
    // Enviar o primeiro heartbeat imediatamente
    sendHeartbeat();
    
    // Iniciar loop
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  } else {
    console.log('Falha ao iniciar: O agente não pôde ser registrado. Tentando novamente em 30s...');
    setTimeout(start, 30000);
  }
}

start();
