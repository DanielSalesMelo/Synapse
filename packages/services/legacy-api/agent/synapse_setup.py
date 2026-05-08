# -*- coding: utf-8 -*-
"""Synapse Windows setup bootstrapper.

This installer is intentionally separate from the legacy monitoring agent. It is
the user-facing setup/maintenance app that downloads and configures the agent.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path
from tkinter import BooleanVar, StringVar, Text, Tk, ttk, messagebox


VERSION = "2.3.0"
DEFAULT_SERVER = "https://synapse-backend-ds2026.azurewebsites.net"
APP_NAME = "Synapse"
INSTALL_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "SynapseAgent"
CONFIG_DIR = Path.home() / ".synapse-agent"
CONFIG_FILE = CONFIG_DIR / "config.json"
AGENT_EXE = INSTALL_DIR / "synapse-agent.exe"
AGENT_PY = INSTALL_DIR / "synapse_agent.py"
TASK_NAME = "SynapseAgent"
CREATE_NO_WINDOW = 0x08000000


def hidden_run(args: list[str], check: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        args,
        check=check,
        capture_output=True,
        text=True,
        creationflags=CREATE_NO_WINDOW if os.name == "nt" else 0,
    )


def hidden_popen(args: list[str]) -> subprocess.Popen:
    return subprocess.Popen(
        args,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=CREATE_NO_WINDOW if os.name == "nt" else 0,
    )


def read_config() -> dict:
    if not CONFIG_FILE.exists():
        return {}
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def write_config(config: dict) -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")


def stop_agent() -> None:
    hidden_run(["taskkill", "/F", "/IM", "synapse-agent.exe"])


def delete_autostart() -> None:
    hidden_run(["schtasks", "/delete", "/tn", TASK_NAME, "/f"])
    hidden_run(["reg", "delete", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run", "/v", TASK_NAME, "/f"])
    startup = Path(os.environ.get("APPDATA", "")) / r"Microsoft\Windows\Start Menu\Programs\Startup\Synapse Agent.lnk"
    if startup.exists():
        startup.unlink(missing_ok=True)


def register_autostart() -> bool:
    delete_autostart()
    result = hidden_run(
        [
            "schtasks",
            "/create",
            "/tn",
            TASK_NAME,
            "/tr",
            f'"{AGENT_EXE}"',
            "/sc",
            "onlogon",
            "/rl",
            "LIMITED",
            "/f",
        ]
    )
    if result.returncode == 0:
        return True
    result = hidden_run(
        [
            "reg",
            "add",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
            "/v",
            TASK_NAME,
            "/t",
            "REG_SZ",
            "/d",
            f'"{AGENT_EXE}"',
            "/f",
        ]
    )
    return result.returncode == 0


def create_support_shortcut() -> None:
    desktop = Path(os.path.join(os.path.expanduser("~"), "Desktop"))
    onedrive_desktop = Path(os.environ.get("OneDrive", "")) / "Desktop"
    target_dir = desktop if desktop.exists() else onedrive_desktop
    if not target_dir.exists():
        return
    shortcut = target_dir / "Synapse Suporte.lnk"
    ps = (
        "$WshShell = New-Object -ComObject WScript.Shell; "
        f"$Shortcut = $WshShell.CreateShortcut('{shortcut}'); "
        f"$Shortcut.TargetPath = '{AGENT_EXE}'; "
        "$Shortcut.Arguments = '--support'; "
        f"$Shortcut.WorkingDirectory = '{INSTALL_DIR}'; "
        f"$Shortcut.IconLocation = '{AGENT_EXE},0'; "
        "$Shortcut.Save()"
    )
    hidden_run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps])


def remove_support_shortcut() -> None:
    for base in [Path.home() / "Desktop", Path(os.environ.get("OneDrive", "")) / "Desktop"]:
        shortcut = base / "Synapse Suporte.lnk"
        if shortcut.exists():
            shortcut.unlink(missing_ok=True)


def download_file(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Pragma": "no-cache"})
    with urllib.request.urlopen(request, timeout=120) as response:
        with target.open("wb") as fh:
            shutil.copyfileobj(response, fh)


def download_agent(server_url: str, log) -> None:
    ts = int(time.time())
    log("Baixando componentes oficiais do Synapse...")
    download_file(f"{server_url.rstrip('/')}/api/agent/download/windows?v={VERSION}&ts={ts}", AGENT_EXE)
    try:
        download_file(f"{server_url.rstrip('/')}/api/agent/download/agent?v={VERSION}&ts={ts}", AGENT_PY)
    except Exception:
        log("Compatibilidade interna não foi baixada. O agente principal foi instalado.")


def clean_pairing(log) -> None:
    stop_agent()
    config = read_config()
    preserved_server = config.get("server_url") or DEFAULT_SERVER
    for key in [
        "token",
        "device_id",
        "empresa_id",
        "pairing_code",
        "user_id",
        "user_name",
        "user_email",
        "user_role",
        "user_is_ti",
        "agent_mode",
    ]:
        config.pop(key, None)
    config["server_url"] = preserved_server
    write_config(config)
    log("Vínculo local limpo. Este PC pode ser pareado novamente.")


def pair_agent(server_url: str, pair_code: str, log) -> None:
    if not pair_code.strip():
        raise RuntimeError("Informe o código de pareamento para instalar ou limpar vínculo.")
    log("Pareando este PC com o Synapse...")
    result = hidden_run([str(AGENT_EXE), "--pair", pair_code.strip(), "--server", server_url.rstrip("/"), "--pair-only"])
    if result.returncode != 0:
        details = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(f"Falha no pareamento. Verifique o código SYNC. {details}")
    log("Pareamento concluído.")


def set_mode_auto(log) -> None:
    result = hidden_run([str(AGENT_EXE), "--mode", "auto"])
    if result.returncode == 0:
        log("Modo definido automaticamente conforme permissões do usuário.")
    else:
        log("Não foi possível definir modo automático. O agente usará a configuração padrão.")


def start_agent(open_support: bool, log) -> None:
    hidden_popen([str(AGENT_EXE)])
    log("Monitoramento iniciado em segundo plano.")
    if open_support:
        time.sleep(1)
        hidden_popen([str(AGENT_EXE), "--support"])
        log("Central de suporte aberta.")


def install_or_repair(server_url: str, pair_code: str, options: dict, repair: bool, log) -> None:
    stop_agent()
    if options.get("clean_pairing"):
        clean_pairing(log)
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    download_agent(server_url, log)
    config = read_config()
    has_token = bool(config.get("token"))
    if pair_code.strip() or not repair or not has_token:
        pair_agent(server_url, pair_code, log)
    if options.get("ti_auto", True):
        set_mode_auto(log)
    if options.get("autostart", True):
        if register_autostart():
            log("Inicialização automática registrada.")
        else:
            log("Não foi possível registrar inicialização automática.")
    if options.get("support", True):
        create_support_shortcut()
        log("Atalho Synapse Suporte criado.")
    start_agent(options.get("support", True), log)


def remove_installation(remove_config: bool, log) -> None:
    stop_agent()
    delete_autostart()
    remove_support_shortcut()
    if INSTALL_DIR.exists():
        shutil.rmtree(INSTALL_DIR, ignore_errors=True)
    if remove_config and CONFIG_DIR.exists():
        shutil.rmtree(CONFIG_DIR, ignore_errors=True)
    log("Instalação removida deste Windows.")


class SynapseSetupApp:
    def __init__(self) -> None:
        self.root = Tk()
        self.root.title(f"Synapse para Windows {VERSION}")
        self.root.geometry("820x620")
        self.root.minsize(760, 560)
        self.root.configure(bg="#07111f")

        self.server_url = StringVar(value=read_config().get("server_url") or DEFAULT_SERVER)
        self.pair_code = StringVar()
        self.install_support = BooleanVar(value=True)
        self.install_monitoring = BooleanVar(value=True)
        self.ti_auto = BooleanVar(value=True)
        self.autostart = BooleanVar(value=True)
        self.clean_old_pairing = BooleanVar(value=False)
        self.remove_config = BooleanVar(value=False)

        self._build_ui()

    def _build_ui(self) -> None:
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#07111f")
        style.configure("Card.TFrame", background="#0f172a", borderwidth=0)
        style.configure("TLabel", background="#07111f", foreground="#e5f0ff", font=("Segoe UI", 10))
        style.configure("Muted.TLabel", background="#07111f", foreground="#94a3b8", font=("Segoe UI", 9))
        style.configure("Title.TLabel", background="#07111f", foreground="#ffffff", font=("Segoe UI Semibold", 22))
        style.configure("TButton", font=("Segoe UI Semibold", 10), padding=10)
        style.configure("TCheckbutton", background="#07111f", foreground="#e5f0ff", font=("Segoe UI", 10))
        style.configure("Horizontal.TProgressbar", troughcolor="#1e293b", background="#22d3ee")

        root = ttk.Frame(self.root, padding=24)
        root.pack(fill="both", expand=True)

        header = ttk.Frame(root)
        header.pack(fill="x")
        ttk.Label(header, text="Synapse para Windows", style="Title.TLabel").pack(anchor="w")
        ttk.Label(
            header,
            text="Instale, repare, remova ou limpe o vínculo do agente em um único aplicativo.",
            style="Muted.TLabel",
        ).pack(anchor="w", pady=(4, 18))

        form = ttk.Frame(root)
        form.pack(fill="x", pady=(0, 14))
        ttk.Label(form, text="Servidor Synapse").grid(row=0, column=0, sticky="w")
        ttk.Entry(form, textvariable=self.server_url).grid(row=1, column=0, sticky="ew", padx=(0, 12), pady=(4, 12))
        ttk.Label(form, text="Código de pareamento").grid(row=0, column=1, sticky="w")
        ttk.Entry(form, textvariable=self.pair_code).grid(row=1, column=1, sticky="ew", pady=(4, 12))
        form.columnconfigure(0, weight=2)
        form.columnconfigure(1, weight=1)

        checks = ttk.Frame(root)
        checks.pack(fill="x", pady=(0, 14))
        ttk.Checkbutton(checks, text="Instalar suporte e chat", variable=self.install_support).grid(row=0, column=0, sticky="w", pady=4)
        ttk.Checkbutton(checks, text="Instalar monitoramento e heartbeat", variable=self.install_monitoring).grid(row=0, column=1, sticky="w", pady=4)
        ttk.Checkbutton(checks, text="Modo usuário/TI automático", variable=self.ti_auto).grid(row=1, column=0, sticky="w", pady=4)
        ttk.Checkbutton(checks, text="Iniciar com o Windows", variable=self.autostart).grid(row=1, column=1, sticky="w", pady=4)
        ttk.Checkbutton(checks, text="Limpar vínculo antigo antes de parear", variable=self.clean_old_pairing).grid(row=2, column=0, sticky="w", pady=4)
        ttk.Checkbutton(checks, text="Ao remover, apagar configuração local", variable=self.remove_config).grid(row=2, column=1, sticky="w", pady=4)
        checks.columnconfigure(0, weight=1)
        checks.columnconfigure(1, weight=1)

        actions = ttk.Frame(root)
        actions.pack(fill="x", pady=(0, 14))
        ttk.Button(actions, text="Instalar / Atualizar", command=lambda: self._run("install")).pack(side="left", padx=(0, 8))
        ttk.Button(actions, text="Reparar instalação", command=lambda: self._run("repair")).pack(side="left", padx=8)
        ttk.Button(actions, text="Limpar vínculo", command=lambda: self._run("clean")).pack(side="left", padx=8)
        ttk.Button(actions, text="Remover instalação", command=lambda: self._run("remove")).pack(side="left", padx=8)

        self.progress = ttk.Progressbar(root, orient="horizontal", mode="indeterminate")
        self.progress.pack(fill="x", pady=(0, 14))

        self.log_box = Text(root, height=14, bg="#020617", fg="#dbeafe", insertbackground="#dbeafe", relief="flat", padx=14, pady=12)
        self.log_box.pack(fill="both", expand=True)
        self.log("Pronto. Use um código SYNC para instalar ou reinstalar este PC.")

    def log(self, message: str) -> None:
        self.log_box.insert("end", f"{time.strftime('%H:%M:%S')}  {message}\n")
        self.log_box.see("end")
        self.root.update_idletasks()

    def _options(self) -> dict:
        return {
            "support": self.install_support.get(),
            "monitoring": self.install_monitoring.get(),
            "ti_auto": self.ti_auto.get(),
            "autostart": self.autostart.get(),
            "clean_pairing": self.clean_old_pairing.get(),
        }

    def _run(self, action: str) -> None:
        def worker() -> None:
            self.progress.start(10)
            try:
                server = self.server_url.get().strip() or DEFAULT_SERVER
                code = self.pair_code.get().strip()
                if action == "install":
                    install_or_repair(server, code, self._options(), repair=False, log=self.log)
                    messagebox.showinfo(APP_NAME, "Synapse instalado e sincronizado com sucesso.")
                elif action == "repair":
                    install_or_repair(server, code, self._options(), repair=True, log=self.log)
                    messagebox.showinfo(APP_NAME, "Instalação reparada com sucesso.")
                elif action == "clean":
                    clean_pairing(self.log)
                    messagebox.showinfo(APP_NAME, "Vínculo local limpo. Gere/insira um novo código para parear.")
                elif action == "remove":
                    if not messagebox.askyesno(APP_NAME, "Remover o Synapse deste Windows?"):
                        return
                    remove_installation(self.remove_config.get(), self.log)
                    messagebox.showinfo(APP_NAME, "Synapse removido deste Windows.")
            except Exception as exc:
                self.log(f"Erro: {exc}")
                messagebox.showerror(APP_NAME, str(exc))
            finally:
                self.progress.stop()

        threading.Thread(target=worker, daemon=True).start()

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    SynapseSetupApp().run()
