#!/bin/bash
# Instalador do Agente de Monitoramento Synapse - Linux

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}====================================================="
echo "  SYNAPSE - Agente de Monitoramento - Linux"
echo -e "=====================================================${NC}"
echo ""

# Verifica root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}[AVISO] Execute como root para instalação completa (sudo bash install_linux.sh)${NC}"
fi

# Verifica Python
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python3 não encontrado. Instalando...${NC}"
    if command -v apt-get &> /dev/null; then
        apt-get update -qq && apt-get install -y python3 python3-pip
    elif command -v yum &> /dev/null; then
        yum install -y python3 python3-pip
    elif command -v dnf &> /dev/null; then
        dnf install -y python3 python3-pip
    else
        echo -e "${RED}[ERRO] Gerenciador de pacotes não reconhecido. Instale Python3 manualmente.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}[OK] Python3 encontrado: $(python3 --version)${NC}"

# Instala dependências
echo "Instalando dependências (psutil, requests)..."
pip3 install psutil requests --quiet 2>/dev/null || python3 -m pip install psutil requests --quiet
echo -e "${GREEN}[OK] Dependências instaladas.${NC}"
echo ""

# Pergunta o código de pareamento
read -p "Digite o código de pareamento gerado no Synapse (ex: SYNC-XXXX-XXXX): " PAIR_CODE
if [ -z "$PAIR_CODE" ]; then
    echo -e "${RED}[ERRO] Código de pareamento não pode ser vazio.${NC}"
    exit 1
fi

# Pergunta a URL do servidor (com valor padrão)
DEFAULT_URL="https://synapse-backend.railway.app"
read -p "URL do servidor Synapse [$DEFAULT_URL]: " SERVER_URL
if [ -z "$SERVER_URL" ]; then
    SERVER_URL=$DEFAULT_URL
fi

# Cria pasta de instalação
INSTALL_DIR="/opt/synapse-agent"
mkdir -p "$INSTALL_DIR"

# Copia o agente
echo "Copiando arquivos..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/synapse_agent.py" "$INSTALL_DIR/synapse_agent.py"
chmod +x "$INSTALL_DIR/synapse_agent.py"

# Cria arquivo de configuração
cat > "$INSTALL_DIR/synapse_agent.conf" << EOF
SERVER_URL=$SERVER_URL
PAIR_CODE=$PAIR_CODE
EOF

echo -e "${GREEN}[OK] Arquivos copiados para $INSTALL_DIR${NC}"

# Cria serviço systemd (se disponível)
if command -v systemctl &> /dev/null && [ "$EUID" -eq 0 ]; then
    echo "Criando serviço systemd..."
    cat > /etc/systemd/system/synapse-agent.service << EOF
[Unit]
Description=Synapse Monitoring Agent
After=network.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 $INSTALL_DIR/synapse_agent.py --config $INSTALL_DIR/synapse_agent.conf
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable synapse-agent
    echo -e "${GREEN}[OK] Serviço systemd criado e habilitado.${NC}"
else
    # Cria script de inicialização via cron
    echo "Registrando inicialização via cron..."
    CRON_CMD="@reboot cd $INSTALL_DIR && python3 $INSTALL_DIR/synapse_agent.py --config $INSTALL_DIR/synapse_agent.conf >> /var/log/synapse-agent.log 2>&1"
    (crontab -l 2>/dev/null | grep -v synapse_agent; echo "$CRON_CMD") | crontab -
    echo -e "${GREEN}[OK] Agente registrado no cron para iniciar no boot.${NC}"
fi

# Realiza o pareamento inicial
echo ""
echo "Realizando pareamento com o servidor Synapse..."
echo "Servidor: $SERVER_URL"
echo "Código: $PAIR_CODE"
echo ""
python3 "$INSTALL_DIR/synapse_agent.py" --config "$INSTALL_DIR/synapse_agent.conf" --pair-only && \
    echo -e "${GREEN}[OK] Pareamento realizado com sucesso!${NC}" || \
    echo -e "${YELLOW}[AVISO] Pareamento não concluído. O agente tentará novamente ao iniciar.${NC}"

# Inicia o agente
if command -v systemctl &> /dev/null && [ "$EUID" -eq 0 ]; then
    echo "Iniciando o agente..."
    systemctl start synapse-agent
    sleep 2
    if systemctl is-active --quiet synapse-agent; then
        echo -e "${GREEN}[OK] Agente iniciado com sucesso!${NC}"
    else
        echo -e "${YELLOW}[AVISO] Agente não iniciou. Verifique: journalctl -u synapse-agent${NC}"
    fi
fi

echo ""
echo -e "${CYAN}====================================================="
echo "  Instalação concluída!"
echo ""
echo "  Para verificar o status: systemctl status synapse-agent"
echo "  Para ver os logs: journalctl -u synapse-agent -f"
echo "  Para iniciar manualmente:"
echo "    python3 $INSTALL_DIR/synapse_agent.py --config $INSTALL_DIR/synapse_agent.conf"
echo -e "=====================================================${NC}"
echo ""
