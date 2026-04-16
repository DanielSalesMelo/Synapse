#!/usr/bin/env python3
"""
SYNAPSE MONITORING AGENT v1.4.0 - TRPC COMPATIBLE VERSION
"""

import os
import sys
import json
import time
import sqlite3
import socket
import platform
import logging
import signal
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

# ─── Dependências ─────────────────────────────────────────────────────────────
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# ─── Configuração FIXA ────────────────────────────────────────────────────────
VERSION = "1.4.0"
SERVER_URL = "https://synapse-backend.railway.app"
AGENT_DIR = Path(os.environ.get("SYNAPSE_AGENT_DIR", Path.home() / ".synapse-agent"))
CONFIG_FILE = AGENT_DIR / "config.json"
DB_FILE = AGENT_DIR / "buffer.db"
LOG_FILE = AGENT_DIR / "agent.log"

AGENT_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler(LOG_FILE, encoding="utf-8"), logging.StreamHandler(sys.stdout)]
)
log = logging.getLogger("synapse-agent")

def load_config() -> Dict:
    config = {"server_url": SERVER_URL, "token": "", "collect_interval": 60, "send_interval": 60}
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                config.update(json.load(f))
        except: pass
    config["server_url"] = SERVER_URL
    return config

def save_config(config: Dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

def init_db():
    conn = sqlite3.connect(DB_FILE)
    conn.execute("CREATE TABLE IF NOT EXISTS metricas_buffer (id INTEGER PRIMARY KEY AUTOINCREMENT, coletado_em TEXT, payload TEXT, enviado INTEGER DEFAULT 0)")
    conn.commit()
    conn.close()

def get_anydesk_id() -> Optional[str]:
    try:
        if platform.system() == "Windows":
            p = Path(os.environ.get("APPDATA", "")) / "AnyDesk" / "user.conf"
            if p.exists():
                for line in p.read_text(errors="ignore").splitlines():
                    if "ad.anynet.id" in line: return line.split("=")[1].strip()
    except: pass
    return None

def collect_metrics() -> Dict:
    m = {
        "hostname": socket.gethostname(),
        "coletado_em": datetime.now(timezone.utc).isoformat(),
        "anydesk_id": get_anydesk_id(),
        "so": f"{platform.system()} {platform.release()}",
        "cpu_uso": psutil.cpu_percent(interval=0.1) if HAS_PSUTIL else 0,
        "ram_uso_pct": psutil.virtual_memory().percent if HAS_PSUTIL else 0,
        "disco_uso_pct": psutil.disk_usage('/').percent if HAS_PSUTIL else 0,
    }
    return m

def pair_agent(codigo: str) -> bool:
    if not HAS_REQUESTS: return False
    try:
        # Usa o endpoint tRPC que está funcionando no backend
        url = f"{SERVER_URL}/api/trpc/ti.pairAgent"
        payload = {
            "0": {
                "json": {
                    "codigo": codigo,
                    "hostname": socket.gethostname(),
                    "so": f"{platform.system()} {platform.release()}",
                    "anydesk_id": get_anydesk_id(),
                    "versao_agente": VERSION,
                    "fingerprint": str(uuid.getnode())
                }
            }
        }
        log.info(f"Pareando via tRPC com {codigo}...")
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            # tRPC retorna um array de resultados
            result = data[0].get("result", {}).get("data", {}).get("json", {})
            token = result.get("token")
            if token:
                config = load_config()
                config["token"] = token
                save_config(config)
                log.info("✅ Pareamento realizado com sucesso!")
                return True
        log.error(f"Falha no pareamento: {resp.status_code} - {resp.text}")
    except Exception as e:
        log.error(f"Erro no pareamento: {e}")
    return False

def send_metrics(config: Dict):
    if not HAS_REQUESTS or not config.get("token"): return
    conn = sqlite3.connect(DB_FILE)
    rows = conn.execute("SELECT id, payload FROM metricas_buffer WHERE enviado = 0 LIMIT 10").fetchall()
    if not rows:
        conn.close()
        return

    metricas_list = [json.loads(r[1]) for r in rows]
    ids = [r[0] for r in rows]

    try:
        # Usa o endpoint tRPC de ingestão de métricas
        url = f"{SERVER_URL}/api/trpc/ti.ingestMetrics"
        payload = {
            "0": {
                "json": {
                    "token": config["token"],
                    "metricas": metricas_list
                }
            }
        }
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            placeholders = ",".join("?" * len(ids))
            conn.execute(f"UPDATE metricas_buffer SET enviado = 1 WHERE id IN ({placeholders})", ids)
            conn.commit()
    except Exception as e:
        log.error(f"Erro ao enviar métricas: {e}")
    
    conn.close()

def main():
    log.info(f"Iniciando Agente Synapse v{VERSION}")
    init_db()
    while True:
        config = load_config()
        if config.get("token"):
            try:
                m = collect_metrics()
                conn = sqlite3.connect(DB_FILE)
                conn.execute("INSERT INTO metricas_buffer (coletado_em, payload) VALUES (?, ?)", (m["coletado_em"], json.dumps(m)))
                conn.commit()
                conn.close()
                send_metrics(config)
            except Exception as e: log.error(f"Erro no loop: {e}")
        else:
            log.warning("Agente não pareado.")
        time.sleep(60)

if __name__ == "__main__":
    if "--pair" in sys.argv:
        idx = sys.argv.index("--pair")
        if len(sys.argv) > idx + 1:
            if pair_agent(sys.argv[idx+1]): sys.exit(0)
            else: sys.exit(1)
    main()
