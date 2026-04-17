#![windows_subsystem = "windows"]

use sysinfo::System;
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::env;
use std::fs;
use std::time::Duration;

#[derive(Debug, Deserialize)]
struct AgentConfig {
    pairing_code: Option<String>,
}

#[derive(Debug, Serialize)]
struct AgentIdentity {
    agent_id: String,
}

#[derive(Debug, Serialize)]
struct AgentPayload {
    hostname: String,
    os: String,
    os_version: String,
    cpu_model: String,
    total_ram: u64,
    pairing_code: Option<String>,
}

#[derive(Debug, Serialize)]
struct MetricsPayload {
    agent_id: String,
    cpu_usage: f32,
    ram_usage_mb: u64,
    // Adicione outros campos de métricas conforme necessário
}

#[tokio::main]
async fn main() {
    // Determinar o caminho do executável
    let current_exe = env::current_exe().expect("Falha ao obter o caminho do executável");
    let current_dir = current_exe.parent().expect("Falha ao obter o diretório do executável");
    let config_path = current_dir.join("synapse_config.json");

    let mut pairing_code: Option<String> = None;
    let identity_path = current_dir.join("agent_identity.json");
    let mut agent_id: Option<String> = None;

    // Tentar ler o arquivo de identidade do agente
    if identity_path.exists() {
        println!("Arquivo de identidade encontrado: {:?}", identity_path);
        let identity_content = fs::read_to_string(&identity_path)
            .expect("Falha ao ler agent_identity.json");
        let identity: AgentIdentity = serde_json::from_str(&identity_content)
            .expect("Falha ao deserializar agent_identity.json");
        agent_id = Some(identity.agent_id);
        println!("Agent ID lido do arquivo: {:?}", agent_id);
    } else {
        println!("Arquivo agent_identity.json não encontrado em {:?}", identity_path);
    }

    // Tentar ler o arquivo de configuração
    if config_path.exists() {
        println!("Arquivo de configuração encontrado: {:?}", config_path);
        let config_content = std::fs::read_to_string(&config_path)
            .expect("Falha ao ler synapse_config.json");
        let config: AgentConfig = serde_json::from_str(&config_content)
            .expect("Falha ao deserializar synapse_config.json");
        pairing_code = config.pairing_code;
        if pairing_code.is_some() {
            println!("Código de pareamento lido do arquivo.");
        } else {
            println!("Nenhum código de pareamento encontrado no arquivo.");
        }
    } else {
        println!("Arquivo synapse_config.json não encontrado em {:?}", config_path);
    }

    // Inicializar o System da biblioteca sysinfo
    let mut sys = System::new_all();

    // Atualizar as informações do sistema para garantir dados recentes
    sys.refresh_all();

    // Coletar informações do sistema
    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let hostname = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    
    // Coletar modelo do processador (CPU)
    // Pegamos o nome do primeiro processador encontrado
    let cpu_model = sys.cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    // Quantidade total de Memória RAM (em bytes)
    let total_ram = sys.total_memory();

    // Exibir os Dados Coletados
    println!("OS: {}", os_name);
    println!("OS Version: {}", os_version);
    println!("Hostname: {}", hostname);
    println!("CPU: {}", cpu_model);
    println!("Total RAM: {} bytes", total_ram);

    // Construir o payload
    let payload = AgentPayload {
        hostname,
        os: os_name,
        os_version,
        cpu_model,
        total_ram,
        pairing_code,
    };

    // Enviar para a API
    let client = reqwest::Client::new();
    
    if agent_id.is_none() {
        println!("Registrando agente pela primeira vez...");
        let res = client.post("http://localhost:3001/api/agent/pair") // TODO: Configurar URL da API
            .json(&payload)
            .send()
            .await;

        match res {
            Ok(response) => {
                if response.status().is_success() {
                    println!("Agente registrado com sucesso na API!");
                    let response_body: serde_json::Value = response.json().await.expect("Falha ao ler JSON da resposta");
                    if let Some(id) = response_body["agentId"].as_str() {
                        agent_id = Some(id.to_string());
                        let identity = AgentIdentity { agent_id: id.to_string() };
                        fs::write(&identity_path, serde_json::to_string(&identity).expect("Falha ao serializar identidade"))
                            .expect("Falha ao salvar agent_identity.json");
                        println!("Agent ID salvo localmente: {}", id);
                    } else {
                        eprintln!("ID do agente não encontrado na resposta da API.");
                    }
                } else {
                    eprintln!("Erro ao registrar agente na API: Status {}", response.status());
                    eprintln!("Corpo da resposta: {:?}", response.text().await);
                }
            },
            Err(e) => {
                eprintln!("Erro de rede ao registrar agente na API: {}", e);
            }
        }
    } else {
        println!("Agente já registrado. Usando ID salvo: {:?}", agent_id);
    }

    // Loop de monitoramento contínuo
    if let Some(id) = agent_id {
        let mut sys = System::new_all();
        loop {
            sys.refresh_cpu(); // Atualiza informações da CPU
            sys.refresh_memory(); // Atualiza informações da memória

            let cpu_usage = sys.global_cpu_info().cpu_usage();
            let ram_usage_mb = sys.used_memory() / 1024 / 1024; // RAM usada em MB

            println!("Coletando métricas: CPU {:.2}% | RAM {} MB", cpu_usage, ram_usage_mb);

            let metrics_payload = MetricsPayload {
                agent_id: id.clone(),
                cpu_usage,
                ram_usage_mb,
            };

            let res = client.post("http://localhost:3001/api/agent/metrics") // TODO: Configurar URL da API
                .json(&metrics_payload)
                .send()
                .await;

            match res {
                Ok(response) => {
                    if response.status().is_success() {
                        println!("Métricas enviadas com sucesso para a API!");
                    } else {
                        eprintln!("Erro ao enviar métricas para a API: Status {}", response.status());
                        eprintln!("Corpo da resposta: {:?}", response.text().await);
                    }
                },
                Err(e) => {
                    eprintln!("Erro de rede ao enviar métricas para a API: {}", e);
                }
            }

            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    } else {
        eprintln!("Não foi possível iniciar o monitoramento: Agent ID não disponível.");
    }
}
