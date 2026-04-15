export async function safeDb<T>(fn: () => Promise<T>, context: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[Database Error] in ${context}:`, error);
    throw error;
  }
}

export function requireDb<T>(db: T | null | undefined, context: string): T {
  if (!db) {
    throw new Error(`[Database Error] Database not available in ${context}`);
  }
  return db;
}
