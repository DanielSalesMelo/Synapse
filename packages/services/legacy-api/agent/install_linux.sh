#!/bin/bash
set -e

DEFAULT_SERVER="https://synapse-backend-ds2026.azurewebsites.net"
INSTALL_DIR="/opt/synapse-agent"

echo ""
echo "====================================================="
echo " SYNAPSE - Instalador do Agente"
echo "====================================================="
echo ""

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERRO] Python3 nao encontrado. Instale python3 e pip antes de continuar."
  exit 1
fi

python3 -m pip install --quiet psutil requests || pip3 install --quiet psutil requests

read -r -p "Digite o codigo de pareamento (SYNC-XXXX-XXXX): " PAIR_CODE
if [ -z "$PAIR_CODE" ]; then
  echo "[ERRO] Codigo invalido."
  exit 1
fi

read -r -p "URL do servidor Synapse [$DEFAULT_SERVER]: " SERVER_URL
if [ -z "$SERVER_URL" ]; then
  SERVER_URL="$DEFAULT_SERVER"
fi

sudo mkdir -p "$INSTALL_DIR"
sudo curl -fsSL "$SERVER_URL/api/agent/download/agent" -o "$INSTALL_DIR/synapse_agent.py"
sudo chmod +x "$INSTALL_DIR/synapse_agent.py"

python3 "$INSTALL_DIR/synapse_agent.py" --pair "$PAIR_CODE" --server "$SERVER_URL"

if command -v systemctl >/dev/null 2>&1; then
  sudo tee /etc/systemd/system/synapse-agent.service >/dev/null <<EOF
[Unit]
Description=Synapse Monitoring Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $INSTALL_DIR/synapse_agent.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable synapse-agent
  sudo systemctl restart synapse-agent
  echo "[OK] Servico systemd configurado."
else
  (crontab -l 2>/dev/null; echo "@reboot /usr/bin/python3 $INSTALL_DIR/synapse_agent.py >> /tmp/synapse-agent.log 2>&1") | crontab -
  nohup python3 "$INSTALL_DIR/synapse_agent.py" >/tmp/synapse-agent.log 2>&1 &
  echo "[OK] Agente iniciado via cron/nohup."
fi

echo ""
echo "====================================================="
echo " Instalacao concluida"
echo " Pasta: $INSTALL_DIR"
echo " Servidor: $SERVER_URL"
echo "====================================================="
