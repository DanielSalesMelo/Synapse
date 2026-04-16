#!/bin/bash
# ╔══════════════════════════════════════════════════════╗
# ║     SYNAPSE MONITORING AGENT - INSTALADOR LINUX      ║
# ╚══════════════════════════════════════════════════════╝

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     SYNAPSE MONITORING AGENT - INSTALADOR LINUX      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

AGENT_DIR="$HOME/.synapse-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verifica Python3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERRO] Python3 não encontrado.${NC}"
    echo "Instale com: sudo apt install python3 python3-pip"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Python3 encontrado: $(python3 --version)"

# Instala dependências
echo "Instalando dependências..."
pip3 install psutil requests --quiet
echo -e "${GREEN}[OK]${NC} Dependências instaladas."

# Cria diretório
mkdir -p "$AGENT_DIR"
cp "$SCRIPT_DIR/synapse_agent.py" "$AGENT_DIR/synapse_agent.py"
chmod +x "$AGENT_DIR/synapse_agent.py"
echo -e "${GREEN}[OK]${NC} Agente copiado para $AGENT_DIR"

# Configuração
echo ""
read -p "URL do servidor Synapse (ex: https://synapse-backend.railway.app): " SERVER_URL
read -p "Token do agente (deixe em branco para registrar automaticamente): " TOKEN

cat > "$AGENT_DIR/config.json" << EOF
{
  "server_url": "$SERVER_URL",
  "token": "$TOKEN",
  "collect_interval": 60,
  "send_interval": 300,
  "debug": false
}
EOF
echo -e "${GREEN}[OK]${NC} Configuração salva."

# Instala como serviço systemd (requer root)
if [ "$EUID" -eq 0 ]; then
    cat > /etc/systemd/system/synapse-agent.service << EOF
[Unit]
Description=Synapse Monitoring Agent
After=network.target

[Service]
Type=simple
User=$SUDO_USER
ExecStart=$(which python3) $AGENT_DIR/synapse_agent.py
Restart=always
RestartSec=10
WorkingDirectory=$AGENT_DIR

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable synapse-agent
    systemctl start synapse-agent
    echo -e "${GREEN}[OK]${NC} Serviço systemd instalado e iniciado."
    echo "  Status: systemctl status synapse-agent"
    echo "  Logs:   journalctl -u synapse-agent -f"
else
    echo -e "${YELLOW}[INFO]${NC} Execute como root para instalar como serviço systemd."
    echo "  sudo bash $0"
    echo ""
    echo "Iniciando agente em segundo plano..."
    nohup python3 "$AGENT_DIR/synapse_agent.py" > "$AGENT_DIR/agent.log" 2>&1 &
    echo -e "${GREEN}[OK]${NC} Agente iniciado (PID: $!)"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          INSTALAÇÃO CONCLUÍDA COM SUCESSO!           ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  Logs: $AGENT_DIR/agent.log${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
