import { getDb } from "./db";
import { users } from "./drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  console.log("Iniciando seed do banco de dados...");

  const email = "danielmoraessales@outlook.com.br";
  const password = "Dan124578@#";
  const name = "Daniel Sales";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Verificar se o usuário já existe
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser) {
      console.log(`Usuário ${email} já existe. Atualizando para Master Admin...`);
      await db.update(users)
        .set({ 
          role: "master_admin", 
          status: "approved",
          password: hashedPassword,
          name: name
        })
        .where(eq(users.email, email));
    } else {
      console.log(`Criando usuário Master Admin: ${email}`);
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

    console.log("Seed concluído com sucesso!");
  } catch (error) {
    console.error("Erro durante o seed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
