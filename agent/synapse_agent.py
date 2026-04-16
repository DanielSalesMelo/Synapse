#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SYNAPSE MONITORING AGENT v1.0.0                         ║
║                                                                              ║
║  Coleta métricas do PC e envia para o servidor Synapse.                     ║
║  Buffer SQLite local: nunca perde dados mesmo sem internet.                 ║
║  Funciona como serviço Windows (NSSM) ou daemon Linux (systemd).           ║
╚══════════════════════════════════════════════════════════════════════════════╝

Dependências: pip install psutil requests
"""

import os
import sys
import json
import time
import sqlite3
import socket
import platform
import threading
import subprocess
import logging
import signal
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

# ─── Tenta importar psutil ────────────────────────────────────────────────────
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("[WARN] psutil não instalado. Execute: pip install psutil requests")

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("[WARN] requests não instalado. Execute: pip install psutil requests")

# ─── Configuração ─────────────────────────────────────────────────────────────
VERSION = "1.0.0"
AGENT_DIR = Path(os.environ.get("SYNAPSE_AGENT_DIR", Path.home() / ".synapse-agent"))
CONFIG_FILE = AGENT_DIR / "config.json"
DB_FILE = AGENT_DIR / "buffer.db"
LOG_FILE = AGENT_DIR / "agent.log"

# Configurações padrão (sobrescritas pelo config.json)
DEFAULT_CONFIG = {
    "server_url": os.environ.get("SYNAPSE_SERVER_URL", "https://synapse-backend.railway.app"),
    "token": os.environ.get("SYNAPSE_TOKEN", ""),
    "collect_interval": 60,      # segundos entre coletas
    "send_interval": 300,        # segundos entre envios (5 min)
    "max_buffer_size": 10000,    # máximo de registros no buffer local
    "retry_interval": 30,        # segundos entre tentativas de reenvio
    "anydesk_path": "",          # caminho do AnyDesk (auto-detectado)
    "debug": False,
}

# ─── Logging ──────────────────────────────────────────────────────────────────
AGENT_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger("synapse-agent")

# ─── Configuração ─────────────────────────────────────────────────────────────
def load_config() -> Dict:
    config = DEFAULT_CONFIG.copy()
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                saved = json.load(f)
            config.update(saved)
        except Exception as e:
            log.warning(f"Erro ao carregar config: {e}")
    return config

def save_config(config: Dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

# ─── Buffer SQLite ────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_FILE)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS metricas_buffer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coletado_em TEXT NOT NULL,
            payload TEXT NOT NULL,
            enviado INTEGER DEFAULT 0,
            tentativas INTEGER DEFAULT 0,
            criado_em TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS eventos_buffer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ocorrido_em TEXT NOT NULL,
            tipo TEXT NOT NULL,
            descricao TEXT,
            severidade TEXT DEFAULT 'info',
            valor REAL,
            enviado INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agent_state (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()
    conn.close()

def buffer_metrica(payload: Dict):
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "INSERT INTO metricas_buffer (coletado_em, payload) VALUES (?, ?)",
        (datetime.now(timezone.utc).isoformat(), json.dumps(payload))
    )
    conn.commit()
    conn.close()

def buffer_evento(tipo: str, descricao: str, severidade: str = "info", valor: float = None):
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "INSERT INTO eventos_buffer (ocorrido_em, tipo, descricao, severidade, valor) VALUES (?, ?, ?, ?, ?)",
        (datetime.now(timezone.utc).isoformat(), tipo, descricao, severidade, valor)
    )
    conn.commit()
    conn.close()

def get_pending_metricas(limit: int = 100) -> List[Dict]:
    conn = sqlite3.connect(DB_FILE)
    rows = conn.execute(
        "SELECT id, coletado_em, payload FROM metricas_buffer WHERE enviado = 0 ORDER BY id LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [{"id": r[0], "coletado_em": r[1], "payload": json.loads(r[2])} for r in rows]

def mark_sent(ids: List[int]):
    if not ids:
        return
    conn = sqlite3.connect(DB_FILE)
    placeholders = ",".join("?" * len(ids))
    conn.execute(f"UPDATE metricas_buffer SET enviado = 1 WHERE id IN ({placeholders})", ids)
    conn.commit()
    conn.close()

def cleanup_old_records(max_size: int):
    """Remove registros antigos já enviados para não encher o disco."""
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "DELETE FROM metricas_buffer WHERE enviado = 1 AND id NOT IN (SELECT id FROM metricas_buffer ORDER BY id DESC LIMIT ?)",
        (max_size,)
    )
    conn.commit()
    conn.close()

# ─── Detecção de AnyDesk ──────────────────────────────────────────────────────
def get_anydesk_id() -> Optional[str]:
    """Tenta obter o ID do AnyDesk instalado na máquina."""
    try:
        if platform.system() == "Windows":
            # Tenta ler o ID do arquivo de configuração do AnyDesk
            paths = [
                Path(os.environ.get("APPDATA", "")) / "AnyDesk" / "user.conf",
                Path("C:/ProgramData/AnyDesk/user.conf"),
                Path(os.environ.get("APPDATA", "")) / "AnyDesk" / "system.conf",
            ]
            for p in paths:
                if p.exists():
                    content = p.read_text(errors="ignore")
                    for line in content.splitlines():
                        if "ad.anynet.id" in line:
                            parts = line.split("=")
                            if len(parts) >= 2:
                                return parts[1].strip()
            # Tenta via processo
            result = subprocess.run(
                ["C:/Program Files (x86)/AnyDesk/AnyDesk.exe", "--get-id"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return result.stdout.strip()
        elif platform.system() == "Linux":
            paths = [
                Path.home() / ".anydesk" / "user.conf",
                Path("/etc/anydesk/user.conf"),
            ]
            for p in paths:
                if p.exists():
                    content = p.read_text(errors="ignore")
                    for line in content.splitlines():
                        if "ad.anynet.id" in line:
                            parts = line.split("=")
                            if len(parts) >= 2:
                                return parts[1].strip()
    except Exception:
        pass
    return None

# ─── Coleta de métricas ───────────────────────────────────────────────────────
_prev_net = None
_prev_net_time = None

def collect_metrics(config: Dict) -> Dict:
    global _prev_net, _prev_net_time

    metrics = {
        "hostname": socket.gethostname(),
        "coletado_em": datetime.now(timezone.utc).isoformat(),
        "anydesk_id": get_anydesk_id(),
        "so": f"{platform.system()} {platform.release()}",
        "usuario_logado": None,
        "uptime": None,
        "cpu_uso": None,
        "cpu_temp": None,
        "cpu_freq_mhz": None,
        "ram_total_mb": None,
        "ram_usada_mb": None,
        "ram_uso_pct": None,
        "disco_total_gb": None,
        "disco_usado_gb": None,
        "disco_uso_pct": None,
        "rede_enviado_kb": None,
        "rede_recebido_kb": None,
        "latencia_ms": None,
        "processos": None,
        "top_processos": [],
        "discos": [],
        "interfaces_rede": [],
    }

    if not HAS_PSUTIL:
        return metrics

    try:
        # CPU
        metrics["cpu_uso"] = round(psutil.cpu_percent(interval=1), 1)
        freq = psutil.cpu_freq()
        if freq:
            metrics["cpu_freq_mhz"] = int(freq.current)

        # Temperatura CPU (nem sempre disponível)
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for name, entries in temps.items():
                    if entries:
                        metrics["cpu_temp"] = round(entries[0].current, 1)
                        break
        except Exception:
            pass

        # RAM
        ram = psutil.virtual_memory()
        metrics["ram_total_mb"] = int(ram.total / 1024 / 1024)
        metrics["ram_usada_mb"] = int(ram.used / 1024 / 1024)
        metrics["ram_uso_pct"] = round(ram.percent, 1)

        # Disco principal
        disk = psutil.disk_usage("/")
        metrics["disco_total_gb"] = round(disk.total / 1024 / 1024 / 1024, 2)
        metrics["disco_usado_gb"] = round(disk.used / 1024 / 1024 / 1024, 2)
        metrics["disco_uso_pct"] = round(disk.percent, 1)

        # Todos os discos
        discos = []
        for part in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(part.mountpoint)
                discos.append({
                    "device": part.device,
                    "mountpoint": part.mountpoint,
                    "fstype": part.fstype,
                    "total_gb": round(usage.total / 1024**3, 2),
                    "usado_gb": round(usage.used / 1024**3, 2),
                    "pct": round(usage.percent, 1),
                })
            except Exception:
                pass
        metrics["discos"] = discos

        # Rede — calcula delta desde a última coleta
        net = psutil.net_io_counters()
        now = time.time()
        if _prev_net is not None and _prev_net_time is not None:
            elapsed = now - _prev_net_time
            if elapsed > 0:
                sent_kb = round((net.bytes_sent - _prev_net.bytes_sent) / 1024 / elapsed, 2)
                recv_kb = round((net.bytes_recv - _prev_net.bytes_recv) / 1024 / elapsed, 2)
                metrics["rede_enviado_kb"] = max(0, sent_kb)
                metrics["rede_recebido_kb"] = max(0, recv_kb)
        _prev_net = net
        _prev_net_time = now

        # Interfaces de rede
        addrs = psutil.net_if_addrs()
        ifaces = []
        for iface, addr_list in addrs.items():
            for addr in addr_list:
                if addr.family == socket.AF_INET:
                    ifaces.append({"interface": iface, "ip": addr.address})
        metrics["interfaces_rede"] = ifaces[:5]

        # Latência (ping ao servidor)
        try:
            server_host = config["server_url"].replace("https://", "").replace("http://", "").split("/")[0]
            start = time.time()
            socket.setdefaulttimeout(3)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((server_host, 443))
            s.close()
            metrics["latencia_ms"] = int((time.time() - start) * 1000)
        except Exception:
            pass

        # Processos
        procs = list(psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]))
        metrics["processos"] = len(procs)

        # Top 5 processos por CPU
        top = sorted(
            [p.info for p in procs if p.info.get("cpu_percent", 0) > 0],
            key=lambda x: x.get("cpu_percent", 0),
            reverse=True
        )[:5]
        metrics["top_processos"] = [
            {"nome": p.get("name", "?"), "cpu_pct": round(p.get("cpu_percent", 0), 1), "ram_pct": round(p.get("memory_percent", 0), 1)}
            for p in top
        ]

        # Uptime
        metrics["uptime"] = int(time.time() - psutil.boot_time())

        # Usuário logado
        try:
            users_logged = psutil.users()
            if users_logged:
                metrics["usuario_logado"] = users_logged[0].name
        except Exception:
            pass

    except Exception as e:
        log.error(f"Erro na coleta de métricas: {e}")

    return metrics

# ─── Detecção de eventos ──────────────────────────────────────────────────────
_prev_metrics = {}

def detect_events(metrics: Dict):
    """Detecta eventos críticos e registra no buffer."""
    global _prev_metrics

    cpu = metrics.get("cpu_uso")
    ram = metrics.get("ram_uso_pct")
    disco = metrics.get("disco_uso_pct")

    if cpu is not None and cpu > 90:
        buffer_evento("cpu_alto", f"CPU em {cpu}% — acima de 90%", "critico", cpu)
    elif cpu is not None and cpu > 75:
        buffer_evento("cpu_alto", f"CPU em {cpu}% — acima de 75%", "atencao", cpu)

    if ram is not None and ram > 90:
        buffer_evento("ram_alta", f"RAM em {ram}% — acima de 90%", "critico", ram)
    elif ram is not None and ram > 80:
        buffer_evento("ram_alta", f"RAM em {ram}% — acima de 80%", "atencao", ram)

    if disco is not None and disco > 90:
        buffer_evento("disco_cheio", f"Disco em {disco}% — acima de 90%", "critico", disco)
    elif disco is not None and disco > 80:
        buffer_evento("disco_cheio", f"Disco em {disco}% — acima de 80%", "atencao", disco)

    _prev_metrics = metrics

# ─── Envio para o servidor ────────────────────────────────────────────────────
def send_batch(config: Dict, pending: List[Dict]) -> bool:
    """Envia lote de métricas para o servidor."""
    if not HAS_REQUESTS or not config.get("token") or not config.get("server_url"):
        return False

    try:
        url = f"{config['server_url'].rstrip('/')}/api/trpc/ti.ingestMetrics"
        payload = {
            "0": {
                "json": {
                    "token": config["token"],
                    "metricas": [p["payload"] for p in pending],
                }
            }
        }
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            mark_sent([p["id"] for p in pending])
            log.info(f"[Send] ✅ {len(pending)} métricas enviadas")
            return True
        else:
            log.warning(f"[Send] Servidor retornou {resp.status_code}: {resp.text[:100]}")
            return False
    except requests.exceptions.ConnectionError:
        log.warning("[Send] Sem conexão — métricas salvas no buffer local")
        return False
    except Exception as e:
        log.error(f"[Send] Erro: {e}")
        return False

def get_hardware_fingerprint() -> str:
    """Gera fingerprint único baseado no hardware do PC."""
    import hashlib
    parts = []
    try:
        mac = get_mac_address()
        parts.append(f"mac:{mac}")
    except Exception:
        pass
    parts.append(f"host:{socket.gethostname()}")
    if platform.system() == "Windows":
        try:
            result = subprocess.run(["wmic","baseboard","get","serialnumber"],
                capture_output=True, text=True, timeout=5)
            serial = result.stdout.strip().split('\n')[-1].strip()
            if serial and serial.lower() not in ('serialnumber',''):
                parts.append(f"mb:{serial}")
        except Exception:
            pass
    elif platform.system() == "Linux":
        try:
            with open("/sys/class/dmi/id/board_serial") as f:
                serial = f.read().strip()
                if serial:
                    parts.append(f"mb:{serial}")
        except Exception:
            pass
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:32]


def pair_agent(config: Dict, codigo: str) -> Optional[str]:
    """Realiza o pareamento com o código SYNC-XXXX-XXXX e retorna o token."""
    if not HAS_REQUESTS:
        return None
    try:
        url = f"{config['server_url'].rstrip('/')}/trpc/ti.pairAgent"
        hostname = socket.gethostname()
        try:
            ip = socket.gethostbyname(hostname)
        except Exception:
            ip = "0.0.0.0"
        payload = {
            "json": {
                "codigo": codigo,
                "hostname": hostname,
                "ip": ip,
                "so": f"{platform.system()} {platform.release()}",
                "mac": get_mac_address(),
                "fingerprint": get_hardware_fingerprint(),
                "anydesk_id": get_anydesk_id(),
                "versao_agente": VERSION,
            }
        }
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            result = data.get("result", {}).get("data", {}).get("json", data.get("result", {}).get("data", {}))
            token = result.get("token") if isinstance(result, dict) else None
            if token:
                log.info(f"[Pair] ✅ Pareamento realizado! Token: {token[:16]}...")
                return token
            else:
                log.error(f"[Pair] Servidor não retornou token: {data}")
        else:
            log.error(f"[Pair] HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.error(f"[Pair] Erro: {e}")
    return None


def register_agent(config: Dict) -> Optional[str]:
    """Registra o agente no servidor e obtém um token (método legado)."""
    if not HAS_REQUESTS:
        return None
    try:
        url = f"{config['server_url'].rstrip('/')}/trpc/ti.registerAgent"
        payload = {
            "json": {
                "hostname": socket.gethostname(),
                "ip": socket.gethostbyname(socket.gethostname()),
                "so": f"{platform.system()} {platform.release()}",
                "mac": get_mac_address(),
                "versao_agente": VERSION,
                "anydesk_id": get_anydesk_id(),
                "fingerprint": get_hardware_fingerprint(),
            }
        }
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("result", {}).get("data", {}).get("json", {}).get("token")
            if token:
                log.info(f"[Register] ✅ Agente registrado com token: {token[:8]}...")
                return token
    except Exception as e:
        log.error(f"[Register] Erro: {e}")
    return None

def get_mac_address() -> str:
    try:
        import uuid as _uuid
        mac = _uuid.getnode()
        return ':'.join(('%012X' % mac)[i:i+2] for i in range(0, 12, 2))
    except Exception:
        return ""

# ─── Loop principal ───────────────────────────────────────────────────────────
_running = True

def signal_handler(sig, frame):
    global _running
    log.info("[Agent] Recebido sinal de parada. Encerrando...")
    _running = False

def main():
    global _running

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    log.info(f"╔══════════════════════════════════════════╗")
    log.info(f"║  Synapse Monitoring Agent v{VERSION}        ║")
    log.info(f"║  Hostname: {socket.gethostname():<30}║")
    log.info(f"╚══════════════════════════════════════════╝")

    if not HAS_PSUTIL or not HAS_REQUESTS:
        log.error("Dependências faltando. Execute: pip install psutil requests")
        sys.exit(1)

    config = load_config()
    init_db()

    # Registrar agente se não tiver token
    if not config.get("token"):
        log.info("[Agent] Sem token — use --pair SYNC-XXXX-XXXX para vincular este PC ao Synapse")
        log.warning("[Agent] Agente não vinculado. Métricas serão salvas localmente até o pareamento.")

    log.info(f"[Agent] Servidor: {config['server_url']}")
    log.info(f"[Agent] Coleta a cada {config['collect_interval']}s | Envio a cada {config['send_interval']}s")
    log.info(f"[Agent] Buffer local: {DB_FILE}")

    last_send = 0
    last_cleanup = 0

    while _running:
        try:
            # Coleta métricas
            metrics = collect_metrics(config)
            buffer_metrica(metrics)
            detect_events(metrics)

            if config.get("debug"):
                log.debug(f"CPU: {metrics.get('cpu_uso')}% | RAM: {metrics.get('ram_uso_pct')}% | Disco: {metrics.get('disco_uso_pct')}%")

            # Envia lote se passou o intervalo
            now = time.time()
            if now - last_send >= config["send_interval"]:
                pending = get_pending_metricas(limit=200)
                if pending:
                    send_batch(config, pending)
                last_send = now

            # Limpeza periódica do buffer (a cada hora)
            if now - last_cleanup >= 3600:
                cleanup_old_records(config["max_buffer_size"])
                last_cleanup = now

        except Exception as e:
            log.error(f"[Agent] Erro no loop principal: {e}")

        # Aguarda próxima coleta
        for _ in range(config["collect_interval"]):
            if not _running:
                break
            time.sleep(1)

    log.info("[Agent] Agente encerrado.")

# ─── Instalador Windows ───────────────────────────────────────────────────────
def install_windows():
    """Instala o agente como serviço Windows usando NSSM."""
    print("\n=== Instalador Synapse Agent (Windows) ===\n")

    server_url = input("URL do servidor Synapse (ex: https://synapse-backend.railway.app): ").strip()
    token = input("Token do agente (deixe em branco para registrar automaticamente): ").strip()

    config = DEFAULT_CONFIG.copy()
    config["server_url"] = server_url
    config["token"] = token

    AGENT_DIR.mkdir(parents=True, exist_ok=True)
    save_config(config)

    # Copia o script para a pasta do agente
    import shutil
    dest = AGENT_DIR / "synapse_agent.py"
    shutil.copy2(__file__, dest)

    # Instala dependências
    print("\nInstalando dependências...")
    subprocess.run([sys.executable, "-m", "pip", "install", "psutil", "requests"], check=True)

    # Verifica NSSM
    nssm_path = Path("C:/nssm/nssm.exe")
    if not nssm_path.exists():
        print("\n[INFO] NSSM não encontrado em C:/nssm/nssm.exe")
        print("Baixe em: https://nssm.cc/download")
        print(f"\nPara instalar manualmente, execute como Administrador:")
        print(f'  nssm install SynapseAgent "{sys.executable}" "{dest}"')
        print(f'  nssm set SynapseAgent AppEnvironmentExtra SYNAPSE_SERVER_URL={server_url}')
        print(f"  nssm start SynapseAgent")
    else:
        subprocess.run([str(nssm_path), "install", "SynapseAgent", sys.executable, str(dest)])
        subprocess.run([str(nssm_path), "set", "SynapseAgent", "AppDirectory", str(AGENT_DIR)])
        subprocess.run([str(nssm_path), "set", "SynapseAgent", "DisplayName", "Synapse Monitoring Agent"])
        subprocess.run([str(nssm_path), "set", "SynapseAgent", "Description", "Agente de monitoramento Synapse"])
        subprocess.run([str(nssm_path), "start", "SynapseAgent"])
        print("\n✅ Serviço SynapseAgent instalado e iniciado!")

    print(f"\nConfiguração salva em: {CONFIG_FILE}")
    print(f"Logs em: {LOG_FILE}")

def install_linux():
    """Instala o agente como serviço systemd no Linux."""
    print("\n=== Instalador Synapse Agent (Linux) ===\n")

    server_url = input("URL do servidor Synapse (ex: https://synapse-backend.railway.app): ").strip()
    token = input("Token do agente (deixe em branco para registrar automaticamente): ").strip()

    config = DEFAULT_CONFIG.copy()
    config["server_url"] = server_url
    config["token"] = token

    AGENT_DIR.mkdir(parents=True, exist_ok=True)
    save_config(config)

    import shutil
    dest = AGENT_DIR / "synapse_agent.py"
    shutil.copy2(__file__, dest)
    dest.chmod(0o755)

    # Instala dependências
    print("\nInstalando dependências...")
    subprocess.run([sys.executable, "-m", "pip", "install", "psutil", "requests"])

    # Cria serviço systemd
    service_content = f"""[Unit]
Description=Synapse Monitoring Agent
After=network.target

[Service]
Type=simple
User={os.environ.get('USER', 'root')}
ExecStart={sys.executable} {dest}
Restart=always
RestartSec=10
Environment=SYNAPSE_SERVER_URL={server_url}
Environment=SYNAPSE_TOKEN={token}
Environment=SYNAPSE_AGENT_DIR={AGENT_DIR}

[Install]
WantedBy=multi-user.target
"""
    service_path = Path("/etc/systemd/system/synapse-agent.service")
    try:
        service_path.write_text(service_content)
        subprocess.run(["systemctl", "daemon-reload"])
        subprocess.run(["systemctl", "enable", "synapse-agent"])
        subprocess.run(["systemctl", "start", "synapse-agent"])
        print("\n✅ Serviço synapse-agent instalado e iniciado!")
        print("  Status: systemctl status synapse-agent")
        print("  Logs:   journalctl -u synapse-agent -f")
    except PermissionError:
        print("\n[ERRO] Execute como root: sudo python3 synapse_agent.py --install")
        print(f"\nArquivo de serviço gerado:")
        print(service_content)

    print(f"\nConfiguração salva em: {CONFIG_FILE}")
    print(f"Logs em: {LOG_FILE}")

# ─── Ponto de entrada ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Suporte a flags do instalador legado
    if "--config" in sys.argv:
        idx = sys.argv.index("--config")
        if len(sys.argv) > idx + 1:
            conf_file = Path(sys.argv[idx + 1])
            if conf_file.exists():
                try:
                    content = conf_file.read_text()
                    config = load_config()
                    for line in content.splitlines():
                        if "=" in line:
                            k, v = line.split("=", 1)
                            if k.strip() == "SERVER_URL": config["server_url"] = v.strip()
                            if k.strip() == "PAIR_CODE": config["pair_code"] = v.strip()
                    save_config(config)
                except Exception as e:
                    print(f"Erro ao ler config legada: {e}")

    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "--pair" or "--pair-only" in sys.argv:
            config = load_config()
            codigo = None
            
            if cmd == "--pair" and len(sys.argv) > 2:
                codigo = sys.argv[2].strip().upper()
            elif config.get("pair_code"):
                codigo = config["pair_code"].strip().upper()
            
            if not codigo:
                print("Uso: python synapse_agent.py --pair SYNC-XXXX-XXXX")
                sys.exit(1)

            if not config.get("server_url") or config["server_url"] == DEFAULT_CONFIG["server_url"]:
                server_url = input("URL do servidor Synapse (ex: https://api.seudominio.com): ").strip()
                if not server_url.startswith("http"):
                    server_url = "https://" + server_url
                config["server_url"] = server_url
                save_config(config)

            print(f"\nVinculando PC ao Synapse com código: {codigo}")
            print(f"Servidor: {config['server_url']}")
            token = pair_agent(config, codigo)
            if token:
                config["token"] = token
                save_config(config)
                print(f"\n✅ PC vinculado com sucesso!")
                if "--pair-only" in sys.argv:
                    sys.exit(0)
                print(f"\nIniciando monitoramento...")
                main()
            else:
                print("\n❌ Falha no pareamento. Verifique o código e a URL do servidor.")
                sys.exit(1)
        elif cmd == "--install":
            if platform.system() == "Windows":
                install_windows()
            else:
                install_linux()
        elif cmd == "--status":
            config = load_config()
            print(f"Synapse Agent v{VERSION}")
            print(f"Servidor: {config.get('server_url', 'não configurado')}")
            print(f"Token: {'configurado' if config.get('token') else 'não configurado'}")
            print(f"Buffer: {DB_FILE}")
            if DB_FILE.exists():
                conn = sqlite3.connect(DB_FILE)
                total = conn.execute("SELECT COUNT(*) FROM metricas_buffer").fetchone()[0]
                pendentes = conn.execute("SELECT COUNT(*) FROM metricas_buffer WHERE enviado=0").fetchone()[0]
                conn.close()
                print(f"Métricas no buffer: {total} total, {pendentes} pendentes")
        elif cmd == "--config":
            config = load_config()
            if len(sys.argv) > 3:
                key, value = sys.argv[2], sys.argv[3]
                config[key] = value
                save_config(config)
                print(f"✅ {key} = {value}")
            else:
                print(json.dumps(config, indent=2))
        elif cmd == "--test":
            print("Testando coleta de métricas...")
            config = load_config()
            metrics = collect_metrics(config)
            print(json.dumps(metrics, indent=2, default=str))
        elif cmd == "--version":
            print(f"Synapse Agent v{VERSION}")
        else:
            print(f"Uso: synapse_agent.py [--install|--status|--config|--test|--version]")
    else:
        main()
