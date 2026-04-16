# Synapse Monitoring Agent

Agente leve de monitoramento para Windows e Linux. Coleta métricas do PC e envia para o servidor Synapse.

## Funcionalidades

- CPU, RAM, Disco, Rede em tempo real
- Temperatura da CPU (quando disponível)
- Top 5 processos por consumo
- Detecção automática do ID do AnyDesk
- Buffer SQLite local — nunca perde dados sem internet
- Envio automático quando a conexão voltar
- Alertas automáticos (CPU > 90%, RAM > 90%, Disco > 90%)
- Histórico completo (hora, dia, semana, mês, ano)

## Instalação

### Windows
1. Baixe o agente pelo módulo TI do Synapse
2. Execute `instalar_windows.bat` como **Administrador**
3. Informe a URL do servidor e o token

### Linux
```bash
chmod +x instalar_linux.sh
sudo ./instalar_linux.sh
```

## Uso manual

```bash
# Iniciar
python3 synapse_agent.py

# Instalar como serviço
python3 synapse_agent.py --install

# Ver status e buffer
python3 synapse_agent.py --status

# Testar coleta
python3 synapse_agent.py --test

# Configurar
python3 synapse_agent.py --config server_url https://meu-servidor.railway.app
```

## Dependências

```bash
pip install psutil requests
```
