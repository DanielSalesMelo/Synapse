import path from "path";
import dotenv from "dotenv";
// Carrega o .env da raiz do projeto (um nível acima da pasta server)
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
// Tenta carregar da pasta atual também como fallback
dotenv.config();

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { InsertUser, users } from "./drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

// Sanitiza a DATABASE_URL removendo prefixos inválidos e quebras de linha
function sanitizeDatabaseUrl(url: string): string {
  // Remove quebras de linha e espaços
  let clean = url.trim();
  // Remove prefixo "DATABASE_URL=" se existir (Railway às vezes injeta assim)
  if (clean.startsWith('DATABASE_URL=')) {
    clean = clean.slice('DATABASE_URL='.length).trim();
  }
  // Remove aspas se existirem
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1);
  }
  return clean;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
      console.log('[Database] Connecting to:', dbUrl.replace(/:[^:@]+@/, ':***@'));
      _client = postgres(dbUrl, {
        connect_timeout: 15,   // 15s máximo para conectar
        idle_timeout: 30,      // fecha conexões ociosas após 30s
        max_lifetime: 1800,    // recicla conexões a cada 30min
        max: 10,               // máximo de 10 conexões simultâneas
        onnotice: () => {},    // silencia avisos do postgres
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _client = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "lastName", "email", "phone", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    // Set role only on INSERT (new user), never overwrite existing role on UPDATE
    // This preserves roles manually set via Painel Master
    if (user.openId === ENV.ownerOpenId) {
      values.role = 'master_admin'; // Owner always starts as master_admin
    } else if (user.role !== undefined) {
      values.role = user.role; // Only set on initial insert, not on update
    }
    // Note: updateSet intentionally does NOT include role — never overwrite on login

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}

export async function getRawClient() {
  if (!_client && process.env.DATABASE_URL) {
    await getDb(); // initialize if not yet done
  }
  return _client;
}

export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}
