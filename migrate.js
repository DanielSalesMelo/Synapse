import postgres from './server/node_modules/postgres/src/index.js';

const sql = postgres('postgresql://postgres:JXaYfLedIWpwfXXOFuRkhSityLMAfole@crossover.proxy.rlwy.net:40549/railway');

async function migrate() {
  try {
    console.log('Conectando ao banco de dados...');
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" text;`;
    console.log("Coluna 'lastName' adicionada ou já existente.");
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "phone" varchar(20);`;
    console.log("Coluna 'phone' adicionada ou já existente.");
    
    console.log('Migração concluída com sucesso.');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    await sql.end();
  }
}

migrate();
