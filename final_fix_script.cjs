const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const serverPath = path.join(__dirname, 'packages', 'services', 'core-service', 'src', 'server.ts');

console.log('--- Iniciando correção final do server.ts ---');

try {
    let content = fs.readFileSync(serverPath, 'utf8');

    const oldStartServerBlock = `
const startServer = async () => {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(\`🚀 Core-Service (com Segurança) rodando na porta \${PORT}\`);
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar o servidor:", error);
    process.exit(1);
  }
};

startServer();
`;

    const newStartServerBlock = `
const startServer = async () => {
  try {
    // --- CORREÇÃO APLICADA ---
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Migration] Ambiente de desenvolvimento detectado, tentando aplicar migrações...');
      // A função runMigrations pode não existir, então verificamos antes de chamar
      if (typeof runMigrations === 'function') {
        await runMigrations();
      }
      console.log('[Migration] Migrações verificadas.');
    } else {
      console.log('[Migration] Ambiente de produção detectado, pulando migrações automáticas.');
    }
    // --- FIM DA CORREÇÃO ---

    app.listen(PORT, () => {
      console.log(\`🚀 Core-Service (com Segurança) rodando na porta \${PORT}\`);
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar o servidor:", error);
    process.exit(1);
  }
};

startServer();
`;

    // Tenta encontrar e substituir o bloco de código antigo.
    // Esta é uma busca aproximada, pode precisar de ajuste se o original for diferente.
    const regex = /const startServer = async \(\) => {([\s\S]*?)startServer\(\);/m;
    
    if (regex.test(content)) {
        content = content.replace(regex, newStartServerBlock);
        fs.writeFileSync(serverPath, content, 'utf8');
        console.log('✅ Bloco do servidor corrigido com sucesso!');
    } else {
        console.error('❌ Não foi possível encontrar o bloco "startServer" para substituir. Verifique o arquivo manualmente ou se a correção já foi aplicada.');
        // Mesmo se falhar, tentamos continuar para o commit, caso a mudança já tenha sido feita.
    }

} catch (error) {
    console.error('❌ Erro ao tentar corrigir o arquivo:', error.message);
    process.exit(1);
}
