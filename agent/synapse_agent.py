#!/usr/bin/env python3
"""
SYNAPSE MONITORING AGENT.

Coleta metricas do PC e envia para o servidor Synapse.
Usa buffer SQLite local para nao perder dados sem internet.
Pode rodar como servico no Windows (NSSM) ou daemon Linux (systemd).

Dependencias: pip install psutil requests
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
import webbrowser
import signal
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# --- Tenta importar psutil ----------------------------------------------------
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

# --- Configuração -------------------------------------------------------------
VERSION = "2.3.0"
AGENT_DIR = Path(os.environ.get("SYNAPSE_AGENT_DIR", Path.home() / ".synapse-agent"))
CONFIG_FILE = AGENT_DIR / "config.json"
DB_FILE = AGENT_DIR / "buffer.db"
LOG_FILE = AGENT_DIR / "agent.log"

# Configurações padrão (sobrescritas pelo config.json)
DEFAULT_CONFIG = {
    "server_url": os.environ.get("SYNAPSE_SERVER_URL", "https://synapse-backend-ds2026.azurewebsites.net"),
    "token": os.environ.get("SYNAPSE_TOKEN", ""),
    "collect_interval": 60,      # segundos entre coletas
    "send_interval": 300,        # segundos entre envios (5 min)
    "max_buffer_size": 10000,    # máximo de registros no buffer local
    "retry_interval": 30,        # segundos entre tentativas de reenvio
    "anydesk_path": "",          # caminho do AnyDesk (auto-detectado)
    "agent_mode": "simple",      # simple=usuário final | ti=avançado
    "allow_local_shell": False,  # shell local só é liberado por configuração explícita
    "debug": False,
}

# --- Logging ------------------------------------------------------------------
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

def get_last_buffered_metrics() -> Optional[Dict[str, Any]]:
    if not DB_FILE.exists():
        return None
    conn = sqlite3.connect(DB_FILE)
    row = conn.execute(
        "SELECT payload FROM metricas_buffer ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    if not row:
        return None
    try:
        return json.loads(row[0])
    except Exception:
        return None

TI_MANAGER_ROLES = {
    "master_admin",
    "admin",
    "administrador",
    "ti",
    "ti_master",
    "supervisor_geral",
    "supervisor_ti",
}

def is_ti_user(config: Dict) -> bool:
    role = str(config.get("user_role") or "").strip().lower()
    return bool(config.get("user_is_ti") or role in TI_MANAGER_ROLES)

def is_ti_scope(config: Dict) -> bool:
    return str(config.get("agent_mode") or "simple").lower() == "ti" and is_ti_user(config)

def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "sim", "yes", "on", "enabled"}

def hidden_subprocess_kwargs() -> Dict[str, Any]:
    """Evita janelas de console para coletas auxiliares no Windows."""
    if platform.system() != "Windows":
        return {}
    startupinfo = subprocess.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = 0
    return {
        "startupinfo": startupinfo,
        "creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0),
    }

def get_primary_ip() -> Optional[str]:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(0.2)
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
            if ip and not ip.startswith("127."):
                return ip
        except Exception:
            pass
    return None

# --- Buffer SQLite ------------------------------------------------------------
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

# --- Detecção de AnyDesk ------------------------------------------------------
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
                capture_output=True, text=True, timeout=5, **hidden_subprocess_kwargs()
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

# --- Coleta de métricas -------------------------------------------------------
_prev_net = None
_prev_net_time = None

def _collect_windows_hardware_info(metrics: Dict[str, Any]) -> None:
    """Coleta inventário de hardware via PowerShell/CIM no Windows."""
    if platform.system() != "Windows":
        return
    try:
        ps_script = r"""
$ErrorActionPreference = "SilentlyContinue"
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name,SocketDesignation
$mb = Get-CimInstance Win32_BaseBoard | Select-Object -First 1 Manufacturer,Product,SerialNumber
$bios = Get-CimInstance Win32_BIOS | Select-Object -First 1 SMBIOSBIOSVersion,SerialNumber
$system = Get-CimInstance Win32_ComputerSystemProduct | Select-Object -First 1 UUID,IdentifyingNumber,Vendor,Name
$gpu = Get-CimInstance Win32_VideoController | Select-Object Name
$mem = Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity,Speed,Manufacturer,PartNumber
$obj = [PSCustomObject]@{
  cpu_model = $cpu.Name
  socket_cpu = $cpu.SocketDesignation
  placa_mae_fabricante = $mb.Manufacturer
  placa_mae_modelo = $mb.Product
  placa_mae_serial = $mb.SerialNumber
  bios_versao = $bios.SMBIOSBIOSVersion
  serial_number = $(if ($bios.SerialNumber) { $bios.SerialNumber } elseif ($system.IdentifyingNumber) { $system.IdentifyingNumber } else { $mb.SerialNumber })
  asset_tag = $system.UUID
  gpus = @($gpu | ForEach-Object { @{ name = $_.Name } })
  memory_slots = @($mem | ForEach-Object {
    @{
      capacidade_gb = [Math]::Round(($_.Capacity / 1GB), 2)
      velocidade_mhz = $_.Speed
      fabricante = $_.Manufacturer
      part_number = $_.PartNumber
    }
  })
}
$obj | ConvertTo-Json -Depth 6 -Compress
"""
        result = subprocess.run(
            ["powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=10,
            **hidden_subprocess_kwargs(),
        )
        if result.returncode == 0 and result.stdout.strip():
            info = json.loads(result.stdout.strip())
            metrics["cpu_model"] = info.get("cpu_model")
            metrics["socket_cpu"] = info.get("socket_cpu")
            metrics["placa_mae_fabricante"] = info.get("placa_mae_fabricante")
            metrics["placa_mae_modelo"] = info.get("placa_mae_modelo")
            metrics["bios_versao"] = info.get("bios_versao")
            metrics["serial_number"] = info.get("serial_number") or info.get("placa_mae_serial")
            metrics["asset_tag"] = info.get("asset_tag") or metrics.get("serial_number")
            metrics["gpus"] = info.get("gpus") or []
            metrics["memory_slots"] = info.get("memory_slots") or []
            metrics["hardware"] = {
                "cpu_model": metrics.get("cpu_model"),
                "cpu_socket": metrics.get("socket_cpu"),
                "motherboard": {
                    "vendor": metrics.get("placa_mae_fabricante"),
                    "model": metrics.get("placa_mae_modelo"),
                    "serial": info.get("placa_mae_serial"),
                },
                "bios": {"version": metrics.get("bios_versao")},
                "serial_number": metrics.get("serial_number"),
                "asset_tag": metrics.get("asset_tag"),
                "gpus": metrics.get("gpus") or [],
                "memory_slots": metrics.get("memory_slots") or [],
            }
    except Exception:
        pass

def collect_metrics(config: Dict) -> Dict:
    global _prev_net, _prev_net_time

    metrics = {
        "hostname": socket.gethostname(),
        "ip": get_primary_ip(),
        "coletado_em": datetime.now(timezone.utc).isoformat(),
        "anydesk_id": get_anydesk_id(),
        "so": f"{platform.system()} {platform.release()}",
        "agent_version": VERSION,
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
        "cpu_model": None,
        "socket_cpu": None,
        "placa_mae_modelo": None,
        "placa_mae_fabricante": None,
        "bios_versao": None,
        "gpus": [],
        "memory_slots": [],
        "hardware": {},
        "serial_number": None,
        "asset_tag": None,
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

        _collect_windows_hardware_info(metrics)

    except Exception as e:
        log.error(f"Erro na coleta de métricas: {e}")

    return metrics

# --- Detecção de eventos ------------------------------------------------------
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

# --- Envio para o servidor ----------------------------------------------------
def send_batch(config: Dict, pending: List[Dict]) -> bool:
    """Envia lote de métricas para o servidor."""
    if not HAS_REQUESTS or not config.get("token") or not config.get("server_url"):
        return False

    try:
        url = f"{config['server_url'].rstrip('/')}/api/agent/metrics"
        sent_ids = []
        headers = {"Authorization": f"Bearer {config['token']}"}
        for item in pending:
            resp = requests.post(url, json=item["payload"], headers=headers, timeout=15)
            if resp.status_code == 200:
                sent_ids.append(item["id"])
            else:
                log.warning(f"[Send] Servidor retornou {resp.status_code}: {resp.text[:120]}")
                break

        if sent_ids:
            mark_sent(sent_ids)
            log.info(f"[Send] [OK] {len(sent_ids)} metricas enviadas")
            return True
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
                capture_output=True, text=True, timeout=5, **hidden_subprocess_kwargs())
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


def pair_agent(config: Dict, codigo: str) -> Optional[Dict[str, Any]]:
    """Realiza o pareamento com o código SYNC-XXXX-XXXX e retorna dados do vínculo."""
    if not HAS_REQUESTS:
        return None
    try:
        # Tenta o endpoint de API direta primeiro (mais comum em versões novas)
        url = f"{config['server_url'].rstrip('/')}/api/agent/pair"
        hostname = socket.gethostname()
        ip = get_primary_ip() or "0.0.0.0"
        
        payload = {
            "pairCode": codigo,
            "hostname": hostname,
            "ip": ip,
            "platform": f"{platform.system()} {platform.release()}",
            "mac": get_mac_address(),
            "fingerprint": get_hardware_fingerprint(),
            "anydeskId": get_anydesk_id(),
            "agentVersion": VERSION,
        }
        
        log.info(f"[Pair] Tentando pareamento em: {url}")
        resp = requests.post(url, json=payload, timeout=15)
        
        # Se falhar com 404, tenta o endpoint tRPC (legado)
        if resp.status_code == 404:
            log.info("[Pair] Endpoint /api/agent/pair não encontrado, tentando /trpc/ti.pairAgent...")
            url = f"{config['server_url'].rstrip('/')}/trpc/ti.pairAgent"
            trpc_payload = {"json": payload}
            trpc_payload["json"]["codigo"] = codigo # tRPC usa 'codigo' em vez de 'pairCode'
            resp = requests.post(url, json=trpc_payload, timeout=15)

        if resp.status_code == 200:
            data = resp.json()
            # Tenta extrair o token de diferentes formatos de resposta (API direta ou tRPC)
            result = data.get("result", {}).get("data", {}).get("json", data.get("result", {}).get("data", data))
            token = result.get("token") if isinstance(result, dict) else None
            if token:
                log.info(f"[Pair] [OK] Pareamento realizado! Token: {token[:16]}...")
                return {
                    "token": token,
                    "device_id": result.get("deviceId") or result.get("agenteId"),
                    "empresa_id": result.get("empresaId"),
                }
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
                log.info(f"[Register] [OK] Agente registrado com token: {token[:8]}...")
                return token
    except Exception as e:
        log.error(f"[Register] Erro: {e}")
    return None

def agent_request(config: Dict, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Optional[Any]:
    if not HAS_REQUESTS or not config.get("token"):
        return None
    try:
        url = f"{config['server_url'].rstrip('/')}{path}"
        response = requests.request(
            method.upper(),
            url,
            headers={
                "Authorization": f"Bearer {config['token']}",
                "X-Synapse-Agent-Mode": "ti" if is_ti_scope(config) else "simple",
            },
            json=payload,
            timeout=20,
        )
        if response.status_code >= 400:
            log.error(f"[Agent API] {method.upper()} {path} => {response.status_code}: {response.text[:200]}")
            return None
        return response.json() if response.content else None
    except Exception as e:
        log.error(f"[Agent API] Erro em {method.upper()} {path}: {e}")
        return None

def fetch_agent_profile(config: Dict) -> Optional[Dict[str, Any]]:
    result = agent_request(config, "GET", "/api/agent/profile")
    return result if isinstance(result, dict) else None

def fetch_agent_tickets(config: Dict) -> List[Dict[str, Any]]:
    path = "/api/agent/ti/tickets" if is_ti_scope(config) else "/api/agent/tickets"
    result = agent_request(config, "GET", path)
    return result if isinstance(result, list) else []

def open_support_ticket(config: Dict, titulo: str, descricao: str, categoria: str = "hardware", prioridade: str = "media") -> Optional[Dict[str, Any]]:
    return agent_request(
        config,
        "POST",
        "/api/agent/tickets/open",
        {
            "titulo": titulo,
            "descricao": descricao,
            "categoria": categoria,
            "prioridade": prioridade,
        },
    )

def fetch_ticket_messages(config: Dict, ticket_id: int) -> List[Dict[str, Any]]:
    base = "/api/agent/ti/tickets" if is_ti_scope(config) else "/api/agent/tickets"
    result = agent_request(config, "GET", f"{base}/{ticket_id}/messages")
    return result if isinstance(result, list) else []

def send_ticket_message(config: Dict, ticket_id: int, conteudo: str) -> Optional[Dict[str, Any]]:
    base = "/api/agent/ti/tickets" if is_ti_scope(config) else "/api/agent/tickets"
    return agent_request(
        config,
        "POST",
        f"{base}/{ticket_id}/messages",
        {"conteudo": conteudo},
    )

def send_ticket_attachment(config: Dict, ticket_id: int, file_name: str, file_type: str, data_url: str, conteudo: str = "") -> Optional[Dict[str, Any]]:
    base = "/api/agent/ti/tickets" if is_ti_scope(config) else "/api/agent/tickets"
    return agent_request(
        config,
        "POST",
        f"{base}/{ticket_id}/messages",
        {
            "conteudo": conteudo or "",
            "fileUrl": data_url,
            "fileName": file_name,
            "fileType": file_type or "application/octet-stream",
        },
    )

def update_ticket_status(config: Dict, ticket_id: int, status: str) -> Optional[Dict[str, Any]]:
    if not is_ti_scope(config):
        log.warning("[Agent API] Tentativa de alterar status fora do modo TI autorizado.")
        return None
    return agent_request(
        config,
        "PATCH",
        f"/api/agent/ti/tickets/{ticket_id}/status",
        {"status": status},
    )

def agent_login(config: Dict, email: str, password: str) -> Optional[Dict[str, Any]]:
    if not HAS_REQUESTS:
        return None
    try:
        url = f"{config['server_url'].rstrip('/')}/api/agent/auth/login"
        payload = {
            "email": email.strip().lower(),
            "password": password,
            "deviceId": config.get("device_id"),
            "token": config.get("token"),
        }
        resp = requests.post(url, json=payload, timeout=20)
        if resp.status_code >= 400:
            log.error(f"[Agent Login] {resp.status_code}: {resp.text[:200]}")
            return None
        return resp.json()
    except Exception as e:
        log.error(f"[Agent Login] Erro: {e}")
        return None

def launch_support_center():
    config = load_config()
    if not config.get("token"):
        print("Agente ainda não pareado. Execute o instalador e vincule este PC ao Synapse.")
        return

    try:
        import tkinter as tk
        from tkinter import ttk, messagebox, simpledialog, scrolledtext, filedialog
        import base64
    except Exception as e:
        print(f"Não foi possível abrir a central visual de suporte: {e}")
        return

    root = tk.Tk()
    root.title(f"Synapse Support Center v{VERSION}")
    # Tamanho inicial adaptativo para monitores diferentes
    sw = root.winfo_screenwidth()
    sh = root.winfo_screenheight()
    w = max(1024, int(sw * 0.86))
    h = max(700, int(sh * 0.84))
    root.geometry(f"{w}x{h}")
    root.minsize(980, 660)
    root.configure(bg="#0b1020")

    style = ttk.Style()
    try:
        style.theme_use("clam")
    except Exception:
        pass
    style.configure("TButton", font=("Segoe UI", 10), padding=8)
    style.configure("TLabel", font=("Segoe UI", 10))

    header = tk.Frame(root, bg="#0f172a", padx=18, pady=14)
    header.pack(fill="x")

    title = tk.Label(header, text="Synapse Support Center", fg="white", bg="#0f172a", font=("Segoe UI", 18, "bold"))
    title.pack(anchor="w")
    is_ti_mode = str(config.get("agent_mode") or "simple").lower() == "ti"
    def is_ti_authorized() -> bool:
        return is_ti_scope(config)

    subtitle_text = "Abra chamados e converse com o TI em tempo real."
    if is_ti_mode:
        subtitle_text = "Modo TI avançado: chat/chamados e painel técnico local."
    subtitle = tk.Label(header, text=subtitle_text, fg="#94a3b8", bg="#0f172a", font=("Segoe UI", 10))
    subtitle.pack(anchor="w", pady=(4, 0))

    saved_email = str(config.get("user_email") or "").strip()
    info_var = tk.StringVar(
        value=f"Sessão salva: {saved_email}" if saved_email else "Carregando perfil do dispositivo..."
    )
    info = tk.Label(header, textvariable=info_var, fg="#cbd5e1", bg="#0f172a", font=("Segoe UI", 10))
    info.pack(anchor="w", pady=(8, 0))
    version_info = tk.Label(header, text=f"Versão do app: {VERSION}", fg="#64748b", bg="#0f172a", font=("Segoe UI", 9))
    version_info.pack(anchor="w", pady=(2, 0))

    body = tk.Frame(root, bg="#0b1020", padx=14, pady=14)
    body.pack(fill="both", expand=True)
    body.grid_columnconfigure(0, weight=2)
    body.grid_columnconfigure(1, weight=3)
    body.grid_rowconfigure(1, weight=1)

    metrics_var = tk.StringVar(value="Sem métricas ainda.")
    if is_ti_mode:
        metrics_card = tk.LabelFrame(body, text=" Desempenho do PC (local) ", bg="#111827", fg="white", padx=12, pady=10, font=("Segoe UI", 10, "bold"))
        metrics_card.grid(row=0, column=0, sticky="nsew", padx=(0, 10), pady=(0, 10))
        tk.Label(metrics_card, textvariable=metrics_var, justify="left", fg="#e5e7eb", bg="#111827", font=("Consolas", 10)).pack(anchor="w")
    else:
        support_card = tk.LabelFrame(body, text=" Atendimento Synapse ", bg="#111827", fg="white", padx=12, pady=10, font=("Segoe UI", 10, "bold"))
        support_card.grid(row=0, column=0, sticky="nsew", padx=(0, 10), pady=(0, 10))
        tk.Label(
            support_card,
            text="Este app é para abrir chamado e conversar com TI.\nUse “Anexar arquivo” para enviar print/imagem/PDF no chat.",
            justify="left",
            fg="#e5e7eb",
            bg="#111827",
            font=("Segoe UI", 10),
        ).pack(anchor="w")

    actions_card = tk.LabelFrame(body, text=" Ações rápidas ", bg="#111827", fg="white", padx=12, pady=10, font=("Segoe UI", 10, "bold"))
    actions_card.grid(row=0, column=1, sticky="nsew", pady=(0, 10))

    tickets_title = " Chamados do Synapse " if is_ti_mode else " Chamados deste usuário "
    tickets_card = tk.LabelFrame(body, text=tickets_title, bg="#111827", fg="white", padx=12, pady=10, font=("Segoe UI", 10, "bold"))
    tickets_card.grid(row=1, column=0, sticky="nsew", padx=(0, 10))
    chat_card = tk.LabelFrame(body, text=" Conversa do chamado ", bg="#111827", fg="white", padx=12, pady=10, font=("Segoe UI", 10, "bold"))
    chat_card.grid(row=1, column=1, sticky="nsew")

    tickets_list = tk.Listbox(tickets_card, bg="#0f172a", fg="white", selectbackground="#2563eb", activestyle="none", font=("Segoe UI", 10))
    tickets_list.pack(fill="both", expand=True)

    chat_text = scrolledtext.ScrolledText(chat_card, bg="#0f172a", fg="white", insertbackground="white", wrap="word", font=("Segoe UI", 10))
    chat_text.pack(fill="both", expand=True)
    chat_text.configure(state="disabled")

    composer = tk.Frame(chat_card, bg="#111827")
    composer.pack(fill="x", pady=(10, 0))
    msg_entry = tk.Entry(composer, bg="#1f2937", fg="white", insertbackground="white", relief="flat", font=("Segoe UI", 10))
    msg_entry.pack(side="left", fill="x", expand=True, padx=(0, 10), ipady=8)

    selected_ticket = {"id": None}
    tickets_cache: List[Dict[str, Any]] = []
    logged_user = {"name": "", "email": ""}
    if saved_email:
        logged_user["email"] = saved_email
        logged_user["name"] = str(config.get("user_name") or "")

    def render_metrics():
        data = get_last_buffered_metrics() or {}
        lines = [
            f"Hostname: {data.get('hostname', socket.gethostname())}",
            f"IP: {data.get('ip') or get_primary_ip() or '—'}",
            f"Usuário logado: {data.get('usuario_logado') or '—'}",
            f"SO: {data.get('so') or f'{platform.system()} {platform.release()}'}",
            f"CPU: {data.get('cpu_uso') or 0}%",
            f"RAM: {data.get('ram_uso_pct') or 0}%",
            f"Disco: {data.get('disco_uso_pct') or 0}%",
            f"AnyDesk: {data.get('anydesk_id') or 'não identificado'}",
            f"Serial/Asset: {data.get('serial_number') or data.get('asset_tag') or 'não identificado'}",
            f"Versão: {VERSION}",
        ]
        metrics_var.set("\n".join(lines))

    def refresh_profile():
        profile = fetch_agent_profile(config)
        if profile:
            if not is_ti_mode or not is_ti_authorized():
                if profile.get("usuario_nome"):
                    logged_user["name"] = profile.get("usuario_nome") or ""
                    logged_user["email"] = profile.get("usuario_email") or ""
                info_var.set(
                    f"Atendimento conectado"
                    + (f" · Usuário: {profile.get('usuario_nome')}" if profile.get("usuario_nome") else "")
                )
                return
            if is_ti_mode and is_ti_authorized() and not profile.get("technicalProfileAllowed"):
                info_var.set("Perfil técnico restrito. Faça login novamente com usuário TI/Admin autorizado.")
                metrics_var.set("Dados técnicos indisponíveis para esta sessão.")
                return
            info_var.set(
                f"PC: {profile.get('hostname') or socket.gethostname()} · Empresa: {profile.get('empresa_nome') or '—'} · "
                f"Usuário: {profile.get('usuario_nome') or 'não vinculado'}"
            )
            latest = profile.get("ultima_metrica") or {}
            if profile.get("usuario_nome"):
                logged_user["name"] = profile.get("usuario_nome") or ""
                logged_user["email"] = profile.get("usuario_email") or ""
            if is_ti_mode and is_ti_authorized() and latest:
                metrics_var.set(
                    "\n".join(
                        [
                            f"Hostname: {profile.get('hostname') or socket.gethostname()}",
                            f"IP: {profile.get('ip') or latest.get('ipLocal') or '—'}",
                            f"Usuário logado: {latest.get('usuarioLogado') or '—'}",
                            f"CPU: {latest.get('cpuUso') or 0}%",
                            f"RAM: {latest.get('ramUsoPct') or 0}%",
                            f"Disco: {latest.get('discoUsoPct') or 0}%",
                            f"AnyDesk: {latest.get('anydeskId') or 'não identificado'}",
                            f"Serial/Asset: {profile.get('serialNumber') or profile.get('assetTag') or latest.get('serialNumber') or 'não identificado'}",
                            f"Versão: {profile.get('versaoAgente') or VERSION}",
                        ]
                    )
                )
        else:
            info_var.set("Perfil indisponível no momento. O agente continuará coletando dados localmente.")
            render_metrics()

    def login_action():
        email = simpledialog.askstring("Login Synapse", "E-mail:", parent=root)
        if not email:
            return
        password = simpledialog.askstring("Login Synapse", "Senha:", parent=root, show="*")
        if not password:
            return
        result = agent_login(config, email, password)
        if not result or not result.get("success"):
            messagebox.showerror("Synapse", "Não foi possível autenticar. Verifique e-mail e senha.")
            return
        user = result.get("user") or {}
        logged_user["name"] = user.get("name") or ""
        logged_user["email"] = user.get("email") or ""
        config["user_role"] = user.get("role") or ""
        config["user_is_ti"] = bool(user.get("isTiManager"))
        config["user_email"] = logged_user["email"] or email
        config["user_name"] = logged_user["name"] or ""
        save_config(config)
        messagebox.showinfo("Synapse", f"Login realizado com sucesso: {logged_user['email'] or email}")
        refresh_profile()
        refresh_tickets()

    def repair_pairing_action():
        codigo = simpledialog.askstring("Parear novamente", "Código de pareamento (SYNC-XXXX-XXXX):", parent=root)
        if not codigo:
            return
        codigo = codigo.strip().upper()
        server_url = simpledialog.askstring(
            "Servidor Synapse",
            "URL do servidor:",
            initialvalue=str(config.get("server_url") or DEFAULT_CONFIG["server_url"]),
            parent=root,
        )
        if not server_url:
            return
        server_url = server_url.strip()
        if not server_url.startswith("http"):
            server_url = "https://" + server_url
        config["server_url"] = server_url
        save_config(config)
        result = pair_agent(config, codigo)
        if not result or not result.get("token"):
            messagebox.showerror("Synapse", "Não foi possível parear com esse código. Gere um novo e tente novamente.")
            return
        config["token"] = result.get("token")
        if result.get("device_id"):
            config["device_id"] = result.get("device_id")
        if result.get("empresa_id"):
            config["empresa_id"] = result.get("empresa_id")
        save_config(config)
        messagebox.showinfo("Synapse", "Pareamento atualizado com sucesso.")
        refresh_profile()
        refresh_tickets()

    def refresh_tickets():
        nonlocal tickets_cache
        if is_ti_mode and not is_ti_authorized():
            tickets_cache = []
            tickets_list.delete(0, tk.END)
            tickets_list.insert(tk.END, "Modo TI requer login com usuário TI/Admin do Synapse.")
            selected_ticket["id"] = None
            return
        tickets_cache = fetch_agent_tickets(config)
        tickets_list.delete(0, tk.END)
        for ticket in tickets_cache:
            tickets_list.insert(
                tk.END,
                f"#{ticket.get('id')} · {ticket.get('titulo')} · {ticket.get('status')}"
                + (f" · {ticket.get('solicitante_nome')}" if ticket.get("solicitante_nome") else "")
            )
        if not tickets_cache:
            tickets_list.insert(tk.END, "Nenhum chamado associado a este usuário ainda.")
            selected_ticket["id"] = None

    def render_messages(ticket_id: int):
        messages = fetch_ticket_messages(config, ticket_id)
        chat_text.configure(state="normal")
        chat_text.delete("1.0", tk.END)
        for message in messages:
            author = message.get("autor_nome") or message.get("autorNome") or "Synapse"
            when = str(message.get("createdAt") or "")[:16].replace("T", " ")
            content = message.get("conteudo") or ""
            file_url = message.get("fileUrl") or message.get("anexoUrl")
            file_name = message.get("fileName") or message.get("anexoNome")
            chat_text.insert(tk.END, f"{author} · {when}\n{content}\n\n")
            if file_url:
                chat_text.insert(tk.END, f"Anexo: {file_name or file_url}\n\n")
        chat_text.configure(state="disabled")
        chat_text.see(tk.END)

    def on_select_ticket(_event=None):
        selection = tickets_list.curselection()
        if not selection or not tickets_cache:
            return
        idx = selection[0]
        if idx >= len(tickets_cache):
            return
        ticket = tickets_cache[idx]
        selected_ticket["id"] = ticket.get("id")
        if ticket.get("status"):
            status_var.set(str(ticket.get("status")))
        render_messages(selected_ticket["id"])

    def send_message_action():
        if not selected_ticket["id"]:
            messagebox.showwarning("Synapse", "Selecione um chamado antes de enviar uma mensagem.")
            return
        content = msg_entry.get().strip()
        if not content:
            return
        result = send_ticket_message(config, int(selected_ticket["id"]), content)
        if result is None:
            messagebox.showerror("Synapse", "Não foi possível enviar a mensagem agora.")
            return
        msg_entry.delete(0, tk.END)
        render_messages(int(selected_ticket["id"]))

    def attach_file_action():
        if not selected_ticket["id"]:
            messagebox.showwarning("Synapse", "Selecione um chamado antes de anexar arquivo.")
            return
        path = filedialog.askopenfilename(
            title="Selecionar arquivo",
            filetypes=[
                ("Arquivos suportados", "*.png;*.jpg;*.jpeg;*.webp;*.bmp;*.pdf;*.doc;*.docx;*.txt;*.zip"),
                ("Todos os arquivos", "*.*"),
            ],
        )
        if not path:
            return
        try:
            with open(path, "rb") as f:
                raw = f.read()
            ext = Path(path).suffix.lower()
            mime = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
                ".bmp": "image/bmp",
                ".pdf": "application/pdf",
                ".doc": "application/msword",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".txt": "text/plain",
                ".zip": "application/zip",
            }.get(ext, "application/octet-stream")
            data_url = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"
            result = send_ticket_attachment(config, int(selected_ticket["id"]), Path(path).name, mime, data_url, f"Arquivo enviado: {Path(path).name}")
            if not result:
                messagebox.showerror("Synapse", "Não foi possível anexar arquivo.")
                return
            render_messages(int(selected_ticket["id"]))
        except Exception as e:
            messagebox.showerror("Synapse", f"Erro ao anexar arquivo: {e}")

    def open_ticket_action():
        modal = tk.Toplevel(root)
        modal.title("Abrir chamado")
        modal.configure(bg="#0b1020")
        modal.transient(root)
        modal.grab_set()
        modal.geometry("680x520")
        modal.minsize(620, 460)

        tk.Label(
            modal,
            text="Novo chamado para TI",
            bg="#0b1020",
            fg="white",
            font=("Segoe UI", 14, "bold"),
        ).pack(anchor="w", padx=18, pady=(16, 6))
        tk.Label(
            modal,
            text="Descreva o problema com o máximo de contexto (erro, tela, setor, impacto).",
            bg="#0b1020",
            fg="#94a3b8",
            font=("Segoe UI", 9),
        ).pack(anchor="w", padx=18, pady=(0, 10))

        tk.Label(modal, text="Título *", bg="#0b1020", fg="white", font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=18)
        title_var = tk.StringVar()
        title_entry = tk.Entry(modal, textvariable=title_var, bg="#1f2937", fg="white", insertbackground="white", relief="flat", font=("Segoe UI", 10))
        title_entry.pack(fill="x", padx=18, pady=(6, 12), ipady=8)

        tk.Label(modal, text="Descrição *", bg="#0b1020", fg="white", font=("Segoe UI", 10, "bold")).pack(anchor="w", padx=18)
        desc_box = scrolledtext.ScrolledText(modal, bg="#1f2937", fg="white", insertbackground="white", wrap="word", font=("Segoe UI", 10), height=13)
        desc_box.pack(fill="both", expand=True, padx=18, pady=(6, 12))

        attach_state = {"name": "", "mime": "", "data_url": ""}
        attach_info = tk.StringVar(value="Sem anexo")

        attach_row = tk.Frame(modal, bg="#0b1020")
        attach_row.pack(fill="x", padx=18, pady=(0, 8))
        tk.Label(attach_row, textvariable=attach_info, bg="#0b1020", fg="#94a3b8", font=("Segoe UI", 9)).pack(side="left")

        btns = tk.Frame(modal, bg="#0b1020")
        btns.pack(fill="x", padx=18, pady=(0, 16))

        def attach_file_modal():
            path = filedialog.askopenfilename(
                title="Selecionar anexo do chamado",
                filetypes=[
                    ("Arquivos suportados", "*.png;*.jpg;*.jpeg;*.webp;*.bmp;*.pdf;*.doc;*.docx;*.txt;*.zip"),
                    ("Todos os arquivos", "*.*"),
                ],
            )
            if not path:
                return
            try:
                with open(path, "rb") as f:
                    raw = f.read()
                ext = Path(path).suffix.lower()
                mime = {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".webp": "image/webp",
                    ".bmp": "image/bmp",
                    ".pdf": "application/pdf",
                    ".doc": "application/msword",
                    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    ".txt": "text/plain",
                    ".zip": "application/zip",
                }.get(ext, "application/octet-stream")
                data_url = f"data:{mime};base64,{base64.b64encode(raw).decode('ascii')}"
                attach_state["name"] = Path(path).name
                attach_state["mime"] = mime
                attach_state["data_url"] = data_url
                attach_info.set(f"Anexo pronto: {attach_state['name']}")
            except Exception as e:
                messagebox.showerror("Synapse", f"Erro ao anexar arquivo: {e}")

        def paste_print_modal():
            try:
                try:
                    from PIL import ImageGrab  # type: ignore
                except Exception:
                    try:
                        subprocess.run(
                            [sys.executable, "-m", "pip", "install", "--user", "Pillow"],
                            capture_output=True,
                            text=True,
                            timeout=35,
                        )
                    except Exception:
                        pass
                    from PIL import ImageGrab  # type: ignore
                img = ImageGrab.grabclipboard()
                if img is None:
                    messagebox.showwarning("Synapse", "Nenhuma imagem encontrada na área de transferência.")
                    return
                import io
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                raw = buf.getvalue()
                attach_state["name"] = f"print_{int(time.time())}.png"
                attach_state["mime"] = "image/png"
                attach_state["data_url"] = f"data:image/png;base64,{base64.b64encode(raw).decode('ascii')}"
                attach_info.set(f"Print colado: {attach_state['name']}")
            except Exception:
                messagebox.showwarning("Synapse", "Não foi possível colar o print agora. Use 'Anexar arquivo' como alternativa.")

        def submit_ticket():
            title = title_var.get().strip()
            description = desc_box.get("1.0", tk.END).strip()
            if not title or not description:
                messagebox.showwarning("Synapse", "Preencha título e descrição do chamado.")
                return
            result = open_support_ticket(config, title, description)
            if result:
                ticket_id = result.get("id")
                if ticket_id and attach_state.get("data_url"):
                    send_ticket_attachment(
                        config,
                        int(ticket_id),
                        attach_state["name"] or "anexo",
                        attach_state["mime"] or "application/octet-stream",
                        attach_state["data_url"],
                        f"Anexo no chamado: {attach_state['name'] or 'arquivo'}",
                    )
                messagebox.showinfo("Synapse", f"Chamado aberto com sucesso: {result.get('protocolo') or result.get('id')}")
                modal.destroy()
                refresh_tickets()
            else:
                messagebox.showerror("Synapse", "Não foi possível abrir o chamado.")

        ttk.Button(btns, text="Anexar arquivo", command=attach_file_modal).pack(side="left")
        ttk.Button(btns, text="Colar print", command=paste_print_modal).pack(side="left", padx=(8, 0))
        ttk.Button(btns, text="Cancelar", command=modal.destroy).pack(side="right")
        ttk.Button(btns, text="Abrir chamado", command=submit_ticket).pack(side="right", padx=(0, 10))
        title_entry.focus_set()

    STATUS_OPTIONS = [
        "aberto",
        "aguardando_usuario",
        "aguardando_ti",
        "em_andamento",
        "acesso_remoto_solicitado",
        "em_acesso_remoto",
        "resolvido",
        "encerrado",
    ]
    status_var = tk.StringVar(value="em_andamento")

    def change_status_action():
        if not is_ti_authorized():
            messagebox.showwarning("Synapse", "Faça login com um usuário TI/Admin para alterar status.")
            return
        if not selected_ticket["id"]:
            messagebox.showwarning("Synapse", "Selecione um chamado antes de alterar o status.")
            return
        status = status_var.get().strip()
        result = update_ticket_status(config, int(selected_ticket["id"]), status)
        if not result:
            messagebox.showerror("Synapse", "Não foi possível alterar o status.")
            return
        refresh_tickets()
        render_messages(int(selected_ticket["id"]))

    def copy_anydesk_action():
        data = get_last_buffered_metrics() or {}
        anydesk = data.get("anydesk_id") or ""
        if not anydesk:
            profile = fetch_agent_profile(config) or {}
            latest = profile.get("ultima_metrica") or {}
            anydesk = profile.get("anydeskId") or latest.get("anydeskId") or ""
        if not anydesk:
            messagebox.showinfo("Synapse", "AnyDesk ID ainda não identificado neste computador.")
            return
        root.clipboard_clear()
        root.clipboard_append(str(anydesk))
        messagebox.showinfo("Synapse", f"AnyDesk ID copiado: {anydesk}")

    def open_shell_action():
        if not is_ti_authorized():
            messagebox.showwarning("Synapse", "Shell local exige modo TI/Admin autenticado.")
            return
        if not _coerce_bool(config.get("allow_local_shell")):
            messagebox.showwarning(
                "Synapse",
                "Shell local bloqueado por política. Libere explicitamente com --config allow_local_shell true.",
            )
            return
        if platform.system() != "Windows":
            messagebox.showwarning("Synapse", "Abertura de shell local está disponível apenas no Windows.")
            return
        subprocess.Popen(["powershell.exe"], creationflags=getattr(subprocess, "CREATE_NEW_CONSOLE", 0))

    def setup_tray_icon():
        if platform.system() != "Windows":
            return
        try:
            from PIL import Image, ImageDraw  # type: ignore
            import pystray  # type: ignore
        except Exception:
            return

        image = Image.new("RGB", (64, 64), "#0f172a")
        draw = ImageDraw.Draw(image)
        draw.ellipse((10, 10, 54, 54), fill="#2563eb")
        draw.text((25, 19), "S", fill="white")

        def show_window(_icon=None, _item=None):
            root.after(0, lambda: [root.deiconify(), root.lift(), root.focus_force()])

        def quit_window(icon=None, _item=None):
            try:
                if icon:
                    icon.stop()
            except Exception:
                pass
            root.after(0, root.destroy)

        icon = pystray.Icon(
            "SynapseAgent",
            image,
            f"Synapse Agent v{VERSION}",
            menu=pystray.Menu(
                pystray.MenuItem("Abrir Synapse Suporte", show_window),
                pystray.MenuItem("Sair da janela", quit_window),
            ),
        )
        threading.Thread(target=icon.run, daemon=True).start()

        def minimize_to_tray():
            root.withdraw()

        root.protocol("WM_DELETE_WINDOW", minimize_to_tray)

    ttk.Button(actions_card, text="Atualizar agora", command=lambda: [refresh_profile(), refresh_tickets()]).pack(side="left", padx=(0, 8))
    ttk.Button(actions_card, text="Parear novamente", command=repair_pairing_action).pack(side="left", padx=(0, 8))
    ttk.Button(actions_card, text="Entrar com Synapse", command=login_action).pack(side="left", padx=(0, 8))
    ttk.Button(actions_card, text="Abrir chamado", command=open_ticket_action).pack(side="left", padx=(0, 8))
    if is_ti_mode:
        ttk.Button(actions_card, text="Ver desempenho", command=render_metrics).pack(side="left")
        ttk.Button(actions_card, text="Copiar AnyDesk", command=copy_anydesk_action).pack(side="left", padx=(8, 0))
        ttk.Combobox(actions_card, textvariable=status_var, values=STATUS_OPTIONS, state="readonly", width=22).pack(side="left", padx=(8, 0))
        ttk.Button(actions_card, text="Alterar status", command=change_status_action).pack(side="left", padx=(8, 0))
        ttk.Button(actions_card, text="PowerShell", command=open_shell_action).pack(side="left", padx=(8, 0))
    ttk.Button(composer, text="Enviar", command=send_message_action).pack(side="right")

    tickets_list.bind("<<ListboxSelect>>", on_select_ticket)
    msg_entry.bind("<Return>", lambda _event: send_message_action())

    refresh_profile()
    refresh_tickets()
    if is_ti_mode:
        render_metrics()

    def auto_sync_loop():
        try:
            refresh_profile()
            refresh_tickets()
            if is_ti_mode:
                render_metrics()
        except Exception:
            pass
        root.after(15000, auto_sync_loop)

    root.after(15000, auto_sync_loop)
    setup_tray_icon()
    root.mainloop()

def get_mac_address() -> str:
    try:
        import uuid as _uuid
        mac = _uuid.getnode()
        return ':'.join(('%012X' % mac)[i:i+2] for i in range(0, 12, 2))
    except Exception:
        return ""

# --- Loop principal -----------------------------------------------------------
_running = True
_single_instance_handle = None

def signal_handler(sig, frame):
    global _running
    log.info("[Agent] Recebido sinal de parada. Encerrando...")
    _running = False

def acquire_single_instance_lock() -> bool:
    """Impede dois loops de monitoramento do agente legado no mesmo Windows."""
    global _single_instance_handle
    if platform.system() != "Windows":
        return True
    try:
        import ctypes

        safe_host = "".join(ch if ch.isalnum() else "_" for ch in socket.gethostname()) or "default"
        mutex_name = f"Local\\SynapseAgentLegacy_{safe_host}"
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        handle = kernel32.CreateMutexW(None, False, mutex_name)
        if not handle:
            return True
        already_exists = ctypes.get_last_error() == 183
        if already_exists:
            kernel32.CloseHandle(handle)
            log.warning("[Agent] Já existe uma instância de monitoramento ativa. Encerrando duplicata.")
            return False
        _single_instance_handle = handle
        return True
    except Exception as exc:
        log.warning(f"[Agent] Não foi possível validar instância única: {exc}")
        return True

def main():
    global _running

    if not acquire_single_instance_lock():
        return

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    log.info("==========================================")
    log.info(f" Synapse Monitoring Agent v{VERSION}")
    log.info(f" Hostname: {socket.gethostname()}")
    log.info("==========================================")

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

# --- Instalador Windows -------------------------------------------------------
def install_windows():
    """Instala o agente como serviço Windows usando NSSM."""
    print("\n=== Instalador Synapse Agent (Windows) ===\n")

    server_url = input("URL do servidor Synapse (ex: https://synapse-backend-ds2026.azurewebsites.net): ").strip()
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
        print("\n[OK] Servico SynapseAgent instalado e iniciado!")

    print(f"\nConfiguração salva em: {CONFIG_FILE}")
    print(f"Logs em: {LOG_FILE}")

def install_linux():
    """Instala o agente como serviço systemd no Linux."""
    print("\n=== Instalador Synapse Agent (Linux) ===\n")

    server_url = input("URL do servidor Synapse (ex: https://synapse-backend-ds2026.azurewebsites.net): ").strip()
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
        print("\n[OK] Servico synapse-agent instalado e iniciado!")
        print("  Status: systemctl status synapse-agent")
        print("  Logs:   journalctl -u synapse-agent -f")
    except PermissionError:
        print("\n[ERRO] Execute como root: sudo python3 synapse_agent.py --install")
        print(f"\nArquivo de serviço gerado:")
        print(service_content)

    print(f"\nConfiguração salva em: {CONFIG_FILE}")
    print(f"Logs em: {LOG_FILE}")

# --- Ponto de entrada ---------------------------------------------------------
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
                    # Garante que a URL tenha o protocolo correto
                    if config.get("server_url") and not config["server_url"].startswith("http"):
                        config["server_url"] = "https://" + config["server_url"]
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

            # Aplica --server antes de qualquer validação para evitar prompt indevido
            if "--server" in sys.argv:
                server_idx = sys.argv.index("--server")
                if len(sys.argv) > server_idx + 1:
                    config["server_url"] = sys.argv[server_idx + 1].strip()
                    save_config(config)

            if not config.get("server_url"):
                # Se já temos a URL no ambiente ou config, não pergunta
                env_url = os.environ.get("SYNAPSE_SERVER_URL")
                if env_url:
                    config["server_url"] = env_url
                else:
                    server_url = input("URL do servidor Synapse (ex: https://api.seudominio.com): ").strip()
                    if not server_url.startswith("http"):
                        server_url = "https://" + server_url
                    config["server_url"] = server_url
                save_config(config)

            print(f"\nVinculando PC ao Synapse com código: {codigo}")
            print(f"Servidor: {config['server_url']}")
            pair_result = pair_agent(config, codigo)
            if pair_result and pair_result.get("token"):
                config["token"] = pair_result["token"]
                if pair_result.get("device_id"):
                    config["device_id"] = pair_result["device_id"]
                if pair_result.get("empresa_id"):
                    config["empresa_id"] = pair_result["empresa_id"]
                save_config(config)
                print(f"\n[OK] PC vinculado com sucesso!")
                if "--pair-only" in sys.argv:
                    sys.exit(0)
                print(f"\nIniciando monitoramento...")
                main()
            else:
                print("\n[ERRO] Falha no pareamento. Verifique o codigo e a URL do servidor.")
                sys.exit(1)
        elif cmd == "--install":
            if platform.system() == "Windows":
                install_windows()
            else:
                install_linux()
        elif cmd == "--support":
            launch_support_center()
        elif cmd == "--list-tickets":
            config = load_config()
            print(json.dumps(fetch_agent_tickets(config), indent=2, ensure_ascii=False))
        elif cmd == "--ticket-messages" and len(sys.argv) > 2:
            config = load_config()
            print(json.dumps(fetch_ticket_messages(config, int(sys.argv[2])), indent=2, ensure_ascii=False))
        elif cmd == "--open-ticket" and len(sys.argv) > 3:
            config = load_config()
            title = sys.argv[2]
            description = sys.argv[3]
            result = open_support_ticket(config, title, description)
            print(json.dumps(result, indent=2, ensure_ascii=False))
        elif cmd == "--send-message" and len(sys.argv) > 3:
            config = load_config()
            result = send_ticket_message(config, int(sys.argv[2]), sys.argv[3])
            print(json.dumps(result, indent=2, ensure_ascii=False))
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
                print(f"[OK] {key} = {value}")
            else:
                print(json.dumps(config, indent=2))
        elif cmd == "--mode" and len(sys.argv) > 2:
            config = load_config()
            mode = sys.argv[2].strip().lower()
            if mode not in ["simple", "ti"]:
                print("Use: --mode simple  ou  --mode ti")
                sys.exit(1)
            config["agent_mode"] = mode
            save_config(config)
            print(f"[OK] Modo do agente definido para: {mode}")
        elif cmd == "--test":
            print("Testando coleta de métricas...")
            config = load_config()
            metrics = collect_metrics(config)
            print(json.dumps(metrics, indent=2, default=str))
        elif cmd == "--version":
            print(f"Synapse Agent v{VERSION}")
        else:
            print(f"Uso: synapse_agent.py [--install|--status|--support|--list-tickets|--ticket-messages ID|--open-ticket TITULO DESCRICAO|--send-message ID MSG|--config|--test|--version]")
    else:
        main()
