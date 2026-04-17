use sysinfo::System;

fn main() {
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
}
