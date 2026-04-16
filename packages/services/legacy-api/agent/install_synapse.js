const http = require('http');
const https = require('https');
const readline = require('readline');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const DEFAULT_SERVER = "https://synapse-backend.railway.app";
const CONFIG_DIR = path.join(os.homedir(), ".synapse_agent");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

console.log("\n =====================================================");
console.log("  SYNAPSE - Agente de Monitoramento - Novo Instalador");
console.log(" =====================================================\n");

async function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function getFingerprint() {
    const interfaces = os.networkInterfaces();
    let mac = '00:00:00:00:00:00';
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
                mac = iface.mac;
                break;
            }
        }
    }
    return crypto.createHash('sha256').update(os.hostname() + os.platform() + mac).digest('hex');
}

async function request(url, method, data = null, headers = {}) {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    return new Promise((resolve, reject) => {
        const req = protocol.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function main() {
    try {
        const pairCode = await ask("Digite o código de pareamento (ex: SYNC-XXXX-XXXX): ");
        if (!pairCode.startsWith("SYNC-")) {
            console.log("[ERRO] Código inválido. Deve começar com SYNC-");
            process.exit(1);
        }

        console.log(`\n[INFO] Iniciando pareamento com ${DEFAULT_SERVER}...`);

        // Tenta o endpoint direto primeiro (conforme definido no index.ts do servidor)
        const pairUrl = `${DEFAULT_SERVER}/api/agent/pair`;
        
        const payload = {
            pairCode: pairCode.trim(),
            hostname: os.hostname(),
            so: `${os.type()} ${os.release()}`,
            fingerprint: getFingerprint(),
            versao_agente: "2.0.0-node"
        };

        try {
            const result = await request(pairUrl, 'POST', payload);
            
            if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
            
            const config = {
                server_url: DEFAULT_SERVER,
                agent_token: result.token,
                empresaId: result.empresaId,
                agenteId: result.agenteId,
                last_pair: new Date().toISOString()
            };

            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            
            console.log("\n[OK] Pareamento concluído com sucesso!");
            console.log(`[INFO] Agente vinculado à empresa ID: ${result.empresaId}`);
            console.log(`[INFO] Configurações salvas em: ${CONFIG_FILE}`);
            
            console.log("\nInstalação finalizada. O agente agora pode ser iniciado.");
        } catch (err) {
            console.log(`\n[ERRO] Falha no pareamento: ${err.message}`);
            console.log("Certifique-se de que o código é válido e não expirou.");
        }

    } catch (err) {
        console.error("\n[ERRO FATAL]", err.message);
    } finally {
        rl.close();
    }
}

main();
