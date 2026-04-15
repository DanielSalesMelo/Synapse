const fs = require('fs');
const path = require('path');

console.log('--- Iniciando correção forçada dos arquivos de configuração ---');

// --- Conteúdo Correto para package.json ---
const packageJsonContent = `{
  "name": "@nexcore/core-service",
  "version": "1.0.0",
  "description": "",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@prisma/client": "4.16.2",
    "@sentry/node": "^8.21.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-mongo-sanitize": "^2.2.0",
    "express-rate-limit": "^7.3.1",
    "helmet": "^7.1.0",
    "hpp": "^0.2.3",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "winston": "^3.13.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/hpp": "^0.2.6",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.14.10",
    "prisma": "4.16.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.5.3"
  }
}`;

// --- Conteúdo Correto para tsconfig.json ---
const tsconfigJsonContent = `{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`;

try {
    const packageJsonPath = path.join(__dirname, 'packages', 'services', 'core-service', 'package.json');
    const tsconfigJsonPath = path.join(__dirname, 'packages', 'services', 'core-service', 'tsconfig.json');

    fs.writeFileSync(packageJsonPath, packageJsonContent, 'utf8');
    console.log('✅ Arquivo package.json reescrito com sucesso.');

    fs.writeFileSync(tsconfigJsonPath, tsconfigJsonContent, 'utf8');
    console.log('✅ Arquivo tsconfig.json reescrito com sucesso.');

    console.log('\n--- Configuração corrigida. Tentando iniciar o servidor... ---');

} catch (error) {
    console.error('❌ Erro ao tentar reescrever os arquivos:', error.message);
    process.exit(1);
}
