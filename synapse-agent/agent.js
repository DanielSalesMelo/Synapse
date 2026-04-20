const os = require('os');
const axios = require('axios');
const osUtils = require('os-utils');
const si = require('systeminformation');

// Configurações
const API_BASE_URL = process.env.API_URL || 'http://localhost:8080/agent';
const REGISTER_URL = `${API_BASE_URL}/register`;
const HEARTBEAT_URL = `${API_BASE_URL}/heartbeat`;
const HEARTBEAT_INTERVAL = 60000; // 60 segundos

let assetId = null;

async function collectHardwareData() {
  try {
    const [cpu, mem, disk, baseboard, system, network] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.diskLayout(),
      si.baseboard(),
      si.system(),
      si.networkInterfaces()
    ]);

    // Encontrar a interface de rede ativa
    const activeNet = network.find(iface => !iface.internal && iface.operstate === 'up') || network[0];

    return {
      hostname: os.hostname(),
      osType: os.type(),
      totalMemory: mem.total,
      cpuModel: `${cpu.manufacturer} ${cpu.brand}`,
      cpuCores: cpu.cores,
      totalDiskSpace: disk.reduce((acc, d) => acc + d.size, 0).toString(),
      diskModel: disk[0]?.name || 'N/A',
      motherboardModel: `${baseboard.manufacturer} ${baseboard.model}`,
      serialNumber: system.serial || 'N/A',
      ipAddress: activeNet?.ip4 || 'N/A',
      macAddress: activeNet?.mac || 'N/A'
    };
  } catch (error) {
    console.error('Erro ao coletar dados de hardware:', error);
    return {
      hostname: os.hostname(),
      osType: os.type(),
      totalMemory: os.totalmem()
    };
  }
}

async function registerAgent() {
  try {
    const hardwareData = await collectHardwareData();

    console.log('--- Iniciando Registro com Dados de Hardware ---');
    console.log('Dados coletados:', hardwareData);
    
    const response = await axios.post(REGISTER_URL, hardwareData);
    assetId = response.data.id;

    if (response.status === 201) {
      console.log(`✅ Agente registrado com sucesso. ID: ${assetId}`);
    } else {
      console.log(`ℹ️ Registro atualizado. ID: ${assetId}`);
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
    
    const fsStats = await si.fsSize();
    const mainFs = fsStats[0];

    const heartbeatData = {
      assetId,
      hostname: os.hostname(),
      cpuUsage: (cpuUsage * 100).toFixed(2),
      freeMemory: osUtils.freeCommand(),
      diskUsage: mainFs ? mainFs.use : null
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
    sendHeartbeat();
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  } else {
    console.log('Falha ao iniciar: O agente não pôde ser registrado. Tentando novamente em 30s...');
    setTimeout(start, 30000);
  }
}

start();
