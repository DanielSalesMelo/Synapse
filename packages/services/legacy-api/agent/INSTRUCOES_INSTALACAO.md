# Instruções de Instalação do Agente Synapse (Novo Método)

Este novo instalador foi desenvolvido em Node.js para garantir 100% de compatibilidade com o servidor atual e resolver o erro 404.

### Pré-requisitos
- Ter o **Node.js** instalado no computador onde o agente será executado.

### Como Instalar
1. Baixe o arquivo `install_synapse.js`.
2. Abra o terminal (ou Prompt de Comando) na pasta onde salvou o arquivo.
3. Execute o comando:
   ```bash
   node install_synapse.js
   ```
4. Digite o código de pareamento (ex: `SYNC-X9DA-DFNW`) quando solicitado.

### Após a Instalação
O instalador criará um arquivo de configuração em sua pasta de usuário (`~/.synapse_agent/config.json`). O agente agora está pronto para se comunicar com o servidor oficial.

---
**Nota:** Este método utiliza a mesma tecnologia do seu frontend, garantindo que as rotas sejam encontradas corretamente.
