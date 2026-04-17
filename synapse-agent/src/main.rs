#![windows_subsystem = "windows"]

use sysinfo::System;
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::env;
use std::fs;
use std::time::Duration;
use tauri::{SystemTray, SystemTrayMenu, CustomMenuItem, SystemTrayEvent, Manager};

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
}

#[derive(Debug, Deserialize)]
struct TicketPayload {
    title: String,
    description: String,
    image_base64: Option<String>,
}

#[tauri::command]
async fn submit_ticket(payload: TicketPayload) -> Result<String, String> {
    println!("Recebido chamado: {}", payload.title);
    
    let client = reqwest::Client::new();
    let res = client.post("http://localhost:3001/api/tickets") // URL da API de tickets
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        Ok("Chamado enviado com sucesso!".to_string())
    } else {
        Err(format!("Erro na API: {}", res.status()))
    }
}

fn main() {
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("open_support".to_string(), "Abrir um Chamado de TI"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Sair"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "open_support" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![submit_ticket])
        .setup(|app| {
            let app_handle = app.handle();
            tauri::async_runtime::spawn(async move {
                run_agent_logic(app_handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Erro ao rodar aplicação Tauri");
}

async fn run_agent_logic(_app_handle: tauri::AppHandle) {
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
        let config_content = fs::read_to_string(&config_path)
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
        let res = client.post("http://localhost:3001/api/agent/pair")
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
            sys.refresh_cpu();
            sys.refresh_memory();

            let cpu_usage = sys.global_cpu_info().cpu_usage();
            let ram_usage_mb = sys.used_memory() / 1024 / 1024;

            println!("Coletando métricas: CPU {:.2}% | RAM {} MB", cpu_usage, ram_usage_mb);

            let metrics_payload = MetricsPayload {
                agent_id: id.clone(),
                cpu_usage,
                ram_usage_mb,
            };

            let _ = client.post("http://localhost:3001/api/agent/metrics")
                .json(&metrics_payload)
                .send()
                .await;

            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    }
}
