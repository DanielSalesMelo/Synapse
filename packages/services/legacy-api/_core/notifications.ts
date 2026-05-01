import { sql } from "drizzle-orm";
import { getDb } from "../db";

export async function createNotification(params: {
  empresaId?: number | null;
  userId?: number | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  payload?: Record<string, unknown> | null;
}) {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    INSERT INTO notifications ("empresaId", "userId", tipo, titulo, mensagem, payload)
    VALUES (
      ${params.empresaId ?? null},
      ${params.userId ?? null},
      ${params.tipo},
      ${params.titulo},
      ${params.mensagem},
      ${params.payload ? JSON.stringify(params.payload) : null}::jsonb
    )
  `);
}
