use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;
use sysinfo::System;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, Runtime,
};
use tauri_plugin_log::{Target, TargetKind};

#[derive(Debug, Deserialize)]
struct AgentConfig {
    pairing_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Deserialize, Serialize)]
struct TicketPayload {
    #[serde(rename = "assetId")]
    asset_id: String,
    description: String,
    screenshots: Vec<String>,
}

#[tauri::command]
async fn submit_ticket(payload: TicketPayload) -> Result<String, String> {
    log::info!("Recebido chamado para o ativo: {}", payload.asset_id);

    let client = reqwest::Client::new();
    let res = client
        .post("http://localhost:8080/agent/tickets")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            log::error!("Erro ao enviar ticket: {}", e);
            e.to_string()
        })?;

    if res.status().is_success() {
        log::info!("Chamado enviado com sucesso!");
        Ok("Chamado enviado com sucesso!".to_string())
    } else {
        let err_msg = format!("Erro na API: {}", res.status());
        log::error!("{}", err_msg);
        Err(err_msg)
    }
}

async fn run_agent_logic<R: Runtime>(_app_handle: tauri::AppHandle<R>) {
    log::info!("Iniciando lógica do agente...");

    let current_exe = match env::current_exe() {
        Ok(exe) => exe,
        Err(e) => {
            log::error!("Falha ao obter o caminho do executável: {}", e);
            return;
        }
    };
    let dot = PathBuf::from(".");
    let current_dir = current_exe.parent().unwrap_or(&dot);
    let config_path = current_dir.join("synapse_config.json");
    let identity_path = current_dir.join("agent_identity.json");

    let mut pairing_code: Option<String> = None;
    let mut agent_id: Option<String> = None;

    if identity_path.exists() {
        match fs::read_to_string(&identity_path) {
            Ok(content) => match serde_json::from_str::<AgentIdentity>(&content) {
                Ok(identity) => {
                    agent_id = Some(identity.agent_id);
                    log::info!("Agent ID lido: {:?}", agent_id);
                }
                Err(e) => log::error!("Falha ao deserializar agent_identity.json: {}", e),
            },
            Err(e) => log::error!("Falha ao ler agent_identity.json: {}", e),
        }
    }

    if config_path.exists() {
        match fs::read_to_string(&config_path) {
            Ok(content) => match serde_json::from_str::<AgentConfig>(&content) {
                Ok(config) => {
                    pairing_code = config.pairing_code;
                    log::info!("Código de pareamento lido.");
                }
                Err(e) => log::error!("Falha ao deserializar synapse_config.json: {}", e),
            },
            Err(e) => log::error!("Falha ao ler synapse_config.json: {}", e),
        }
    }

    let mut sys = System::new_all();
    sys.refresh_all();

    let os_name = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let hostname = System::host_name().unwrap_or_else(|| "Unknown".to_string());
    let cpu_model = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let total_ram = sys.total_memory();

    log::info!("Sistema: {} {} | Host: {} | CPU: {}", os_name, os_version, hostname, cpu_model);

    let client = reqwest::Client::new();

    if agent_id.is_none() {
        log::info!("Registrando agente...");
        let payload = AgentPayload {
            hostname,
            os: os_name,
            os_version,
            cpu_model,
            total_ram,
            pairing_code,
        };

        let res = client
            .post("http://localhost:3001/api/agent/pair")
            .json(&payload)
            .send()
            .await;

        match res {
            Ok(response) if response.status().is_success() => {
                match response.json::<serde_json::Value>().await {
                    Ok(body) => {
                        if let Some(id) = body["agentId"].as_str() {
                            agent_id = Some(id.to_string());
                            let identity = AgentIdentity {
                                agent_id: id.to_string(),
                            };
                            if let Ok(json) = serde_json::to_string(&identity) {
                                if let Err(e) = fs::write(&identity_path, json) {
                                    log::error!("Falha ao salvar identidade: {}", e);
                                }
                            }
                            log::info!("Agente registrado: {}", id);
                        }
                    }
                    Err(e) => log::error!("Falha ao ler resposta de registro: {}", e),
                }
            }
            Ok(response) => log::error!("Erro no registro: Status {}", response.status()),
            Err(e) => log::error!("Erro de rede no registro: {}", e),
        }
    }

    if let Some(id) = agent_id {
        loop {
            sys.refresh_cpu_all();
            sys.refresh_memory();

            let cpu_usage = sys.global_cpu_usage();
            let ram_usage_mb = sys.used_memory() / 1024 / 1024;

            let metrics = MetricsPayload {
                agent_id: id.clone(),
                cpu_usage,
                ram_usage_mb,
            };

            let _ = client
                .post("http://localhost:3001/api/agent/metrics")
                .json(&metrics)
                .send()
                .await;

            tokio::time::sleep(Duration::from_secs(60)).await;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("agent".to_string()),
                    }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![submit_ticket])
        .setup(|app| {
            let handle = app.handle();

            // Menu da Bandeja
            let quit_i = MenuItem::with_id(handle, "quit", "Sair", true, None::<&str>)?;
            let open_i = MenuItem::with_id(
                handle,
                "open_support",
                "Abrir um Chamado de TI",
                true,
                None::<&str>,
            )?;
            let menu = Menu::with_items(handle, &[&open_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "open_support" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Iniciar lógica de fundo
            let app_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                run_agent_logic(app_handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
