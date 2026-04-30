import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import path from "node:path";
import postgres from "postgres";

function getDatabaseUrl() {
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

async function main() {
  const databaseUrl = getDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;

  const { getDb, closeDb } = await import("../db");
  const { users, empresas, userCompanyAccess } = await import("../drizzle/schema");
  const { listAccessibleCompanyIds, resolveAccessibleEmpresaId } = await import("../_core/access");
  const { and, eq, isNull } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) {
    throw new Error("Banco indisponível para o teste.");
  }

  const slug = `saas-${Date.now()}`;
  let empresaAId: number | null = null;
  let empresaBId: number | null = null;
  let userId: number | null = null;

  try {
    const [empresaA] = await db.insert(empresas).values({
      nome: `Empresa Teste A ${slug}`,
      codigoConvite: `A${Date.now().toString().slice(-7)}`,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: empresas.id });

    const [empresaB] = await db.insert(empresas).values({
      nome: `Empresa Teste B ${slug}`,
      codigoConvite: `B${Date.now().toString().slice(-7)}`,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: empresas.id });

    empresaAId = empresaA.id;
    empresaBId = empresaB.id;

    const [user] = await db.insert(users).values({
      openId: `verify_${slug}`,
      name: `Teste ${slug}`,
      email: `verify-${slug}@synapse.local`,
      role: "user",
      status: "approved",
      empresaId: empresaAId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }).returning();

    userId = user.id;

    await db.insert(userCompanyAccess).values({
      userId,
      empresaId: empresaAId,
      roleCode: "leitor",
      canViewGroup: false,
      isDefault: true,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [freshUser] = await db.select().from(users).where(and(eq(users.id, userId), isNull(users.deletedAt))).limit(1);
    if (!freshUser) {
      throw new Error("Usuário de teste não encontrado.");
    }

    const allowedIds = await listAccessibleCompanyIds(freshUser);
    assert(allowedIds.includes(empresaAId), "Usuário deveria acessar a empresa A.");
    assert(!allowedIds.includes(empresaBId), "Usuário não deveria acessar a empresa B.");

    const fakeCtx = {
      user: freshUser,
      req: {
        headers: {},
        socket: { remoteAddress: "127.0.0.1" },
      },
      res: {},
    } as any;

    const resolvedA = await resolveAccessibleEmpresaId(fakeCtx, empresaAId);
    assert.equal(resolvedA, empresaAId, "Resolver deveria permitir a empresa A.");

    let blocked = false;
    try {
      await resolveAccessibleEmpresaId(fakeCtx, empresaBId);
    } catch (error: any) {
      blocked = error?.code === "FORBIDDEN" || error?.shape?.code === -32003 || error?.message?.includes("não tem acesso");
    }

    assert(blocked, "Resolver deveria bloquear a empresa B.");
    console.log("[Verify] Isolamento multiempresa validado com sucesso.");
  } finally {
    const raw = postgres(databaseUrl, { ssl: "require", max: 1, onnotice: () => {} });
    try {
      if (userId) {
        await raw`delete from public.user_company_access where "userId" = ${userId}`;
        await raw`delete from public.users where id = ${userId}`;
      }
      if (empresaAId) {
        await raw`delete from public.empresas where id = ${empresaAId}`;
      }
      if (empresaBId) {
        await raw`delete from public.empresas where id = ${empresaBId}`;
      }
    } finally {
      await raw.end();
      await closeDb();
    }
  }
}

main().catch((error) => {
  console.error("[Verify] Falhou:", error);
  process.exit(1);
});
