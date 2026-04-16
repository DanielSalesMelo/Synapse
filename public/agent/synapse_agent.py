#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SYNAPSE MONITORING AGENT v1.1.0                         ║
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
VERSION = "1.1.0"
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
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "DELETE FROM metricas_buffer WHERE enviado = 1 AND id NOT IN (SELECT id FROM metricas_buffer ORDER BY id DESC LIMIT ?)",
        (max_size,)
    )
    conn.commit()
    conn.close()

# ─── Detecção de AnyDesk ──────────────────────────────────────────────────────
def get_anydesk_id() -> Optional[str]:
    try:
        if platform.system() == "Windows":
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
def collect_metrics(config: Dict) -> Dict:
    metrics = {
        "hostname": socket.gethostname(),
        "coletado_em": datetime.now(timezone.utc).isoformat(),
        "anydesk_id": get_anydesk_id(),
        "so": f"{platform.system()} {platform.release()}",
        "cpu": {"percent": 0},
        "ram": {"percent": 0, "used_gb": 0, "total_gb": 0},
        "disk": {"percent": 0, "used_gb": 0, "total_gb": 0},
        "network": {"sent_mb": 0, "recv_mb": 0},
        "top_processes": []
    }

    if not HAS_PSUTIL:
        return metrics

    try:
        metrics["cpu"]["percent"] = psutil.cpu_percent(interval=0.5)
        ram = psutil.virtual_memory()
        metrics["ram"] = {
            "percent": ram.percent,
            "used_gb": round(ram.used / (1024**3), 2),
            "total_gb": round(ram.total / (1024**3), 2)
        }
        disk = psutil.disk_usage('/')
        metrics["disk"] = {
            "percent": disk.percent,
            "used_gb": round(disk.used / (1024**3), 2),
            "total_gb": round(disk.total / (1024**3), 2)
        }
        
        # Top processos
        procs = []
        for p in psutil.process_iter(['name', 'cpu_percent', 'memory_percent']):
            try:
                procs.append(p.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        metrics["top_processes"] = sorted(procs, key=lambda x: x['cpu_percent'], reverse=True)[:5]
        
    except Exception as e:
        log.error(f"Erro ao coletar métricas: {e}")

    return metrics

# ─── Comunicação com Servidor ─────────────────────────────────────────────────
def send_batch(config: Dict, batch: List[Dict]):
    if not HAS_REQUESTS or not config.get("token"):
        return False
    
    url = f"{config['server_url'].rstrip('/')}/api/agent/metrics"
    headers = {"Authorization": f"Bearer {config['token']}"}
    
    # O backend espera uma métrica por vez ou um formato específico. 
    # Baseado no index.ts, ele pega req.body diretamente para uma métrica.
    # Vamos enviar a mais recente do lote para simplificar ou adaptar se necessário.
    for item in batch:
        try:
            resp = requests.post(url, json=item["payload"], headers=headers, timeout=10)
            if resp.status_code == 200:
                mark_sent([item["id"]])
            elif resp.status_code == 401:
                log.error("[Send] Token inválido. Pareamento necessário.")
                config["token"] = ""
                save_config(config)
                break
        except Exception as e:
            log.error(f"[Send] Erro ao enviar: {e}")
            break

def pair_agent(config: Dict, codigo: str) -> Optional[str]:
    """Realiza o pareamento com o código SYNC-XXXX-XXXX e retorna o token."""
    if not HAS_REQUESTS:
        return None
    try:
        url = f"{config['server_url'].rstrip('/')}/api/agent/pair"
        hostname = socket.gethostname()
        try:
            ip = socket.gethostbyname(hostname)
        except Exception:
            ip = "0.0.0.0"
        
        payload = {
            "pairCode": codigo,
            "hostname": hostname,
            "ip": ip,
            "so": f"{platform.system()} {platform.release()}",
            "mac": get_mac_address(),
            "fingerprint": get_hardware_fingerprint(),
            "anydesk_id": get_anydesk_id(),
            "versao_agente": VERSION,
        }
        
        log.info(f"[Pair] Tentando pareamento em: {url}")
        resp = requests.post(url, json=payload, timeout=15)
        
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("token")
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

def get_mac_address() -> str:
    try:
        mac = uuid.getnode()
        return ':'.join(('%012X' % mac)[i:i+2] for i in range(0, 12, 2))
    except Exception:
        return "00:00:00:00:00:00"

def get_hardware_fingerprint() -> str:
    try:
        return str(uuid.getnode())
    except Exception:
        return socket.gethostname()

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

    log.info(f"Synapse Monitoring Agent v{VERSION}")
    log.info(f"Hostname: {socket.gethostname()}")

    if not HAS_PSUTIL or not HAS_REQUESTS:
        log.error("Dependências faltando. Execute: pip install psutil requests")
        sys.exit(1)

    config = load_config()
    init_db()

    if not config.get("token"):
        log.warning("[Agent] Agente não vinculado. Use --pair SYNC-XXXX-XXXX")

    last_send = 0
    while _running:
        try:
            metrics = collect_metrics(config)
            buffer_metrica(metrics)

            now = time.time()
            if now - last_send >= config["send_interval"]:
                pending = get_pending_metricas(limit=10)
                if pending:
                    send_batch(config, pending)
                last_send = now

        except Exception as e:
            log.error(f"[Agent] Erro: {e}")

        time.sleep(config["collect_interval"])

# ─── Ponto de entrada ─────────────────────────────────────────────────────────
if __name__ == "__main__":
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
                    print(f"Erro ao ler config: {e}")

    if "--pair" in sys.argv or "--pair-only" in sys.argv:
        config = load_config()
        codigo = None
        if "--pair" in sys.argv:
            idx = sys.argv.index("--pair")
            if len(sys.argv) > idx + 1:
                codigo = sys.argv[idx + 1].strip().upper()
        
        if not codigo and config.get("pair_code"):
            codigo = config["pair_code"]

        if not codigo:
            print("Uso: python synapse_agent.py --pair SYNC-XXXX-XXXX")
            sys.exit(1)

        token = pair_agent(config, codigo)
        if token:
            config["token"] = token
            save_config(config)
            print("✅ Pareamento concluído com sucesso!")
            if "--pair-only" in sys.argv: sys.exit(0)
        else:
            print("❌ Falha no pareamento.")
            sys.exit(1)

    main()
