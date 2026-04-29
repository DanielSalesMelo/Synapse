
import { getDb } from "./db";
import { users } from "./drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";

// Carregar .env
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
dotenv.config();

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  const email = process.env.MASTER_EMAIL || "danielmoraessales@outlook.com.br";
  const password = process.env.MASTER_PASSWORD || "Dan124578@#";
  const name = "Daniel Sales";
  
  console.log(`Iniciando seed para o usuário: ${email}`);
  
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser) {
      console.log(`Usuário ${email} já existe. Garantindo permissões de Master Admin...`);
      await db.update(users)
        .set({ 
          role: "master_admin", 
          status: "approved",
          password: hashedPassword,
          name: name
        })
        .where(eq(users.email, email));
    } else {
      console.log(`Criando novo usuário Master Admin: ${email}`);
      await db.insert(users).values({
        email: email,
        password: hashedPassword,
        name: name,
        openId: `master_${Date.now()}`,
        role: "master_admin",
        status: "approved",
        loginMethod: "local",
      });
    }

    console.log("✅ Seed de produção concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
