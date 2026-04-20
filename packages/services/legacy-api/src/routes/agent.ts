import { Router } from "express";
import { getRawClient } from "../../db";

const router = Router();

// POST /agent/register
router.post("/register", async (req, res) => {
  try {
    const { hostname, osType, totalMemory } = req.body;

    if (!hostname) {
      return res.status(400).json({ error: "Hostname é obrigatório" });
    }

    const db = await getRawClient();
    if (!db) {
      return res.status(503).json({ error: "Banco de dados indisponível" });
    }

    // Verificar se o ativo já existe
    const existingAssets = await db`
      SELECT id FROM assets WHERE hostname = ${hostname}
    `.catch(() => []) as any[];

    if (existingAssets && existingAssets.length > 0) {
      return res.status(200).json({ 
        message: "Ativo já registrado", 
        id: existingAssets[0].id 
      });
    }

    // Criar novo registro
    const newAssets = await db`
      INSERT INTO assets (hostname, "osType", "totalMemory")
      VALUES (${hostname}, ${osType || null}, ${totalMemory || null})
      RETURNING id
    `.catch((err) => {
      console.error("Erro ao inserir asset:", err);
      throw err;
    }) as any[];

    if (newAssets && newAssets.length > 0) {
      return res.status(201).json({ 
        message: "Agente registrado com sucesso", 
        id: newAssets[0].id 
      });
    }

    return res.status(500).json({ error: "Falha ao registrar agente" });
  } catch (err: any) {
    console.error("[Agent Register Error]", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
});

// GET /agent/assets
router.get("/assets", async (req, res) => {
  try {
    const db = await getRawClient();
    if (!db) {
      return res.status(503).json({ error: "Banco de dados indisponível" });
    }

    const allAssets = await db`
      SELECT * FROM assets ORDER BY "createdAt" DESC
    `.catch((err) => {
      console.error("Erro ao buscar assets:", err);
      throw err;
    }) as any[];

    return res.status(200).json(allAssets);
  } catch (err: any) {
    console.error("[Agent List Assets Error]", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
});

export default router;
