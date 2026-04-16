#!/usr/bin/env python3
"""
Synapse Monitoring Agent v1.0
Coleta métricas do PC (CPU, RAM, disco, rede, temperatura) e envia para o Synapse.
Funciona offline com buffer local — nunca perde dados.

Uso:
  python synapse_agent.py --pair SYNC-XXXX-XXXX          # Parear pela primeira vez
  python synapse_agent.py                                  # Rodar normalmente após parear
  python synapse_agent.py --server https://meu-backend.com # Especificar servidor
"""

import sys
import os
import json
import time
import socket
import platform
import argparse
import threading
import logging
from datetime import datetime
from pathlib import Path

# ─── Dependências opcionais ────────────────────────────────────────────────────
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("[AVISO] psutil não instalado. Execute: pip install psutil requests")

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("[AVISO] requests não instalado. Execute: pip install psutil requests")

# ─── Configuração ──────────────────────────────────────────────────────────────
VERSION = "1.0.0"
CONFIG_FILE = Path.home() / ".synapse_agent" / "config.json"
BUFFER_FILE = Path.home() / ".synapse_agent" / "buffer.jsonl"
LOG_FILE    = Path.home() / ".synapse_agent" / "agent.log"

DEFAULT_SERVER  = "https://synapse-backend.railway.app"
SEND_INTERVAL   = 30   # segundos entre envios
COLLECT_INTERVAL = 10  # segundos entre coletas
MAX_BUFFER_LINES = 1000  # máximo de métricas no buffer offline

# ─── Logging ───────────────────────────────────────────────────────────────────
CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("synapse-agent")

# ─── Configuração persistente ──────────────────────────────────────────────────
def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}

def save_config(cfg: dict):
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")

# ─── Buffer offline ────────────────────────────────────────────────────────────
def buffer_append(payload: dict):
    """Salva métrica no buffer local para envio posterior."""
    try:
        BUFFER_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(BUFFER_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
        # Limitar tamanho do buffer
        lines = BUFFER_FILE.read_text(encoding="utf-8").splitlines()
        if len(lines) > MAX_BUFFER_LINES:
            BUFFER_FILE.write_text("\n".join(lines[-MAX_BUFFER_LINES:]) + "\n", encoding="utf-8")
    except Exception as e:
        log.warning(f"Erro ao salvar no buffer: {e}")

def buffer_flush(server_url: str, token: str) -> int:
    """Tenta enviar todas as métricas do buffer. Retorna quantas foram enviadas."""
    if not BUFFER_FILE.exists():
        return 0
    lines = BUFFER_FILE.read_text(encoding="utf-8").splitlines()
    if not lines:
        return 0
    sent = 0
    remaining = []
    for line in lines:
        try:
            payload = json.loads(line)
            resp = requests.post(
                f"{server_url}/api/agent/metrics",
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                timeout=10,
            )
            if resp.status_code == 200:
                sent += 1
            else:
                remaining.append(line)
        except Exception:
            remaining.append(line)
    BUFFER_FILE.write_text("\n".join(remaining) + ("\n" if remaining else ""), encoding="utf-8")
    return sent

# ─── Coleta de métricas ────────────────────────────────────────────────────────
def get_hostname() -> str:
    return socket.gethostname()

def get_platform_info() -> dict:
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "os_release": platform.release(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
    }

def collect_metrics() -> dict:
    """Coleta todas as métricas do sistema."""
    if not HAS_PSUTIL:
        return {"error": "psutil não instalado"}

    metrics = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "hostname": get_hostname(),
        "platform": get_platform_info(),
    }

    # CPU
    try:
        metrics["cpu"] = {
            "percent": psutil.cpu_percent(interval=1),
            "count_logical": psutil.cpu_count(logical=True),
            "count_physical": psutil.cpu_count(logical=False),
            "freq_mhz": round(psutil.cpu_freq().current, 1) if psutil.cpu_freq() else None,
            "per_core": psutil.cpu_percent(percpu=True),
        }
    except Exception as e:
        metrics["cpu"] = {"error": str(e)}

    # RAM
    try:
        vm = psutil.virtual_memory()
        metrics["ram"] = {
            "total_gb": round(vm.total / (1024**3), 2),
            "used_gb": round(vm.used / (1024**3), 2),
            "available_gb": round(vm.available / (1024**3), 2),
            "percent": vm.percent,
        }
    except Exception as e:
        metrics["ram"] = {"error": str(e)}

    # Disco
    try:
        disks = []
        for part in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(part.mountpoint)
                disks.append({
                    "device": part.device,
                    "mountpoint": part.mountpoint,
                    "fstype": part.fstype,
                    "total_gb": round(usage.total / (1024**3), 2),
                    "used_gb": round(usage.used / (1024**3), 2),
                    "free_gb": round(usage.free / (1024**3), 2),
                    "percent": usage.percent,
                })
            except PermissionError:
                pass
        metrics["disks"] = disks
    except Exception as e:
        metrics["disks"] = [{"error": str(e)}]

    # Rede
    try:
        net = psutil.net_io_counters()
        metrics["network"] = {
            "bytes_sent_mb": round(net.bytes_sent / (1024**2), 2),
            "bytes_recv_mb": round(net.bytes_recv / (1024**2), 2),
            "packets_sent": net.packets_sent,
            "packets_recv": net.packets_recv,
            "errin": net.errin,
            "errout": net.errout,
        }
        # IPs da máquina
        addrs = psutil.net_if_addrs()
        ips = []
        for iface, addr_list in addrs.items():
            for addr in addr_list:
                if addr.family == socket.AF_INET and not addr.address.startswith("127."):
                    ips.append({"interface": iface, "ip": addr.address})
        metrics["network"]["ips"] = ips
    except Exception as e:
        metrics["network"] = {"error": str(e)}

    # Temperatura (se disponível)
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            temp_data = {}
            for name, entries in temps.items():
                temp_data[name] = [{"label": e.label or "core", "current": e.current, "high": e.high, "critical": e.critical} for e in entries]
            metrics["temperatures"] = temp_data
    except (AttributeError, Exception):
        pass  # Não disponível em Windows sem drivers específicos

    # Processos top 5 por CPU
    try:
        procs = []
        for p in sorted(psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]),
                        key=lambda x: x.info.get("cpu_percent") or 0, reverse=True)[:5]:
            procs.append({
                "pid": p.info["pid"],
                "name": p.info["name"],
                "cpu_percent": round(p.info.get("cpu_percent") or 0, 1),
                "memory_percent": round(p.info.get("memory_percent") or 0, 1),
            })
        metrics["top_processes"] = procs
    except Exception:
        pass

    # Uptime
    try:
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        metrics["uptime_hours"] = round(uptime_seconds / 3600, 1)
        metrics["boot_time"] = datetime.fromtimestamp(boot_time).isoformat()
    except Exception:
        pass

    return metrics

# ─── Pareamento ────────────────────────────────────────────────────────────────
def pair_device(pair_code: str, server_url: str):
    """Pareia este PC com o Synapse usando o código de pareamento."""
    if not HAS_REQUESTS:
        print("[ERRO] requests não instalado. Execute: pip install psutil requests")
        sys.exit(1)

    log.info(f"Pareando com o servidor {server_url} usando código {pair_code}...")
    try:
        resp = requests.post(
            f"{server_url}/api/agent/pair",
            json={
                "pairCode": pair_code,
                "hostname": get_hostname(),
                "platform": get_platform_info(),
                "agentVersion": VERSION,
            },
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            cfg = load_config()
            cfg["server_url"] = server_url
            cfg["agent_token"] = data["token"]
            cfg["device_id"] = data["deviceId"]
            cfg["hostname"] = get_hostname()
            cfg["paired_at"] = datetime.utcnow().isoformat() + "Z"
            save_config(cfg)
            log.info(f"✅ Pareamento realizado com sucesso! Device ID: {data['deviceId']}")
            log.info(f"   O agente está pronto. Execute novamente sem --pair para iniciar o monitoramento.")
        else:
            log.error(f"❌ Falha no pareamento: {resp.status_code} — {resp.text}")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        log.error(f"❌ Não foi possível conectar ao servidor: {server_url}")
        sys.exit(1)
    except Exception as e:
        log.error(f"❌ Erro no pareamento: {e}")
        sys.exit(1)

# ─── Loop principal ────────────────────────────────────────────────────────────
def run_agent(server_url: str, token: str, device_id: str):
    """Loop principal do agente."""
    log.info(f"🚀 Synapse Agent v{VERSION} iniciado")
    log.info(f"   Servidor: {server_url}")
    log.info(f"   Device ID: {device_id}")
    log.info(f"   Hostname: {get_hostname()}")
    log.info(f"   Intervalo de coleta: {COLLECT_INTERVAL}s | Envio: {SEND_INTERVAL}s")

    last_send = 0
    metrics_queue = []

    while True:
        try:
            # Coletar métricas
            m = collect_metrics()
            m["deviceId"] = device_id
            metrics_queue.append(m)
            log.debug(f"Métrica coletada — CPU: {m.get('cpu', {}).get('percent', '?')}% | RAM: {m.get('ram', {}).get('percent', '?')}%")

            now = time.time()
            if now - last_send >= SEND_INTERVAL:
                # Tentar enviar fila + buffer
                if HAS_REQUESTS:
                    # Enviar fila atual
                    failed = []
                    for payload in metrics_queue:
                        try:
                            resp = requests.post(
                                f"{server_url}/api/agent/metrics",
                                json=payload,
                                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                                timeout=10,
                            )
                            if resp.status_code != 200:
                                buffer_append(payload)
                                log.warning(f"Métrica salva no buffer (HTTP {resp.status_code})")
                            else:
                                log.info(f"✅ {len(metrics_queue)} métrica(s) enviada(s)")
                        except Exception as e:
                            buffer_append(payload)
                            log.warning(f"Offline — métrica salva no buffer: {e}")
                    metrics_queue = failed

                    # Tentar enviar buffer acumulado
                    flushed = buffer_flush(server_url, token)
                    if flushed > 0:
                        log.info(f"📤 {flushed} métrica(s) do buffer enviada(s)")

                last_send = now

        except KeyboardInterrupt:
            log.info("Agente encerrado pelo usuário.")
            break
        except Exception as e:
            log.error(f"Erro no loop principal: {e}")

        time.sleep(COLLECT_INTERVAL)

# ─── Ponto de entrada ──────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description=f"Synapse Monitoring Agent v{VERSION}",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python synapse_agent.py --pair SYNC-XXXX-XXXX
  python synapse_agent.py --pair SYNC-XXXX-XXXX --server https://meu-backend.com
  python synapse_agent.py
        """,
    )
    parser.add_argument("--pair", metavar="CODIGO", help="Código de pareamento gerado no Synapse")
    parser.add_argument("--server", metavar="URL", help=f"URL do servidor Synapse (padrão: {DEFAULT_SERVER})")
    parser.add_argument("--version", action="version", version=f"Synapse Agent {VERSION}")
    args = parser.parse_args()

    cfg = load_config()
    server_url = args.server or cfg.get("server_url") or DEFAULT_SERVER
    server_url = server_url.rstrip("/")

    if args.pair:
        pair_device(args.pair, server_url)
        return

    # Verificar se já está pareado
    token = cfg.get("agent_token")
    device_id = cfg.get("device_id")

    if not token or not device_id:
        print("❌ Agente não pareado. Use --pair CODIGO para parear primeiro.")
        print(f"   Gere um código em: {server_url} → TI & Infraestrutura → Monitoramento → Códigos de Pareamento")
        sys.exit(1)

    if not HAS_PSUTIL or not HAS_REQUESTS:
        print("❌ Dependências faltando. Execute:")
        print("   pip install psutil requests")
        sys.exit(1)

    run_agent(server_url, token, device_id)

if __name__ == "__main__":
    main()
