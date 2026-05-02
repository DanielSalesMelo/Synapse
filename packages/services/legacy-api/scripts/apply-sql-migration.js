const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const postgres = require("postgres");

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL.trim();
  }

  if (process.argv.includes("--azure-production")) {
    return execSync(
      "az webapp config appsettings list --name synapse-backend-ds2026 --resource-group rg-synapse --query \"[?name=='DATABASE_URL'].value | [0]\" -o tsv",
      { encoding: "utf8" }
    ).trim();
  }

  throw new Error("DATABASE_URL não informada. Use a variável de ambiente ou --azure-production.");
}

function resolveSqlPath() {
  const provided = process.argv.find(arg => arg.endsWith(".sql"));
  if (provided) {
    return path.resolve(process.cwd(), provided);
  }

  return path.resolve(__dirname, "..", "sql", "2026-04-30-core-saas-foundation.sql");
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  const sqlPath = resolveSqlPath();
  const sqlText = fs.readFileSync(sqlPath, "utf8");

  console.log(`[Migration] Aplicando ${path.basename(sqlPath)}...`);
  const client = postgres(databaseUrl, {
    connect_timeout: 20,
    idle_timeout: 30,
    max: 1,
    ssl: "require",
    onnotice: () => {},
  });

  try {
    await client.unsafe(sqlText);
    console.log("[Migration] Concluída com sucesso.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[Migration] Falhou:", error);
  process.exit(1);
});
