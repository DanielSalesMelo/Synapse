use sysinfo::System;
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::env;

#[derive(Debug, Deserialize)]
struct AgentConfig {
    pairing_code: Option<String>,
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

#[tokio::main]
async fn main() {
    // Determinar o caminho do executável
    let current_exe = env::current_exe().expect("Falha ao obter o caminho do executável");
    let current_dir = current_exe.parent().expect("Falha ao obter o diretório do executável");
    let config_path = current_dir.join("synapse_config.json");

    let mut pairing_code: Option<String> = None;

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
    let res = client.post("http://localhost:3001/api/agent/pair") // TODO: Configurar URL da API
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(response) => {
            if response.status().is_success() {
                println!("Dados enviados com sucesso para a API!");
            } else {
                eprintln!("Erro ao enviar dados para a API: Status {}", response.status());
                eprintln!("Corpo da resposta: {:?}", response.text().await);
            }
        },
        Err(e) => {
            eprintln!("Erro de rede ao enviar dados para a API: {}", e);
        }
    }
}
