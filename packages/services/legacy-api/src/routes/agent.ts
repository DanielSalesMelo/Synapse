import { Router } from "express";
import { getRawClient } from "../../db";

const router = Router();

// POST /agent/register
router.post("/register", async (req, res) => {
  try {
    const { 
      hostname, osType, totalMemory, cpuModel, cpuCores, 
      totalDiskSpace, diskModel, motherboardModel, serialNumber, 
      ipAddress, macAddress 
    } = req.body;

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
      const assetId = existingAssets[0].id;
      // Atualizar dados de hardware mesmo que já exista
      await db`
        UPDATE assets SET
          "osType" = ${osType || null},
          "totalMemory" = ${totalMemory || null},
          cpu_model = ${cpuModel || null},
          cpu_cores = ${cpuCores || null},
          total_disk_space = ${totalDiskSpace || null},
          disk_model = ${diskModel || null},
          motherboard_model = ${motherboardModel || null},
          serial_number = ${serialNumber || null},
          ip_address = ${ipAddress || null},
          mac_address = ${macAddress || null},
          "updatedAt" = now()
        WHERE id = ${assetId}
      `.catch((err) => console.error("Erro ao atualizar hardware no registro:", err));

      return res.status(200).json({ 
        message: "Ativo atualizado", 
        id: assetId 
      });
    }

    // Criar novo registro
    const newAssets = await db`
      INSERT INTO assets (
        hostname, "osType", "totalMemory", cpu_model, cpu_cores,
        total_disk_space, disk_model, motherboard_model, serial_number,
        ip_address, mac_address
      )
      VALUES (
        ${hostname}, ${osType || null}, ${totalMemory || null}, ${cpuModel || null}, ${cpuCores || null},
        ${totalDiskSpace || null}, ${diskModel || null}, ${motherboardModel || null}, ${serialNumber || null},
        ${ipAddress || null}, ${macAddress || null}
      )
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

// POST /agent/heartbeat
router.post("/heartbeat", async (req, res) => {
  try {
    const { assetId, hostname, cpuUsage, freeMemory } = req.body;

    if (!assetId && !hostname) {
      return res.status(400).json({ error: "assetId ou hostname é obrigatório" });
    }

    const db = await getRawClient();
    if (!db) {
      return res.status(503).json({ error: "Banco de dados indisponível" });
    }

    // Atualizar lastSeen
    const result = await db`
      UPDATE assets 
      SET last_seen = now(), "updatedAt" = now()
      WHERE ${assetId ? db`id = ${assetId}` : db`hostname = ${hostname}`}
      RETURNING id
    `.catch((err) => {
      console.error("Erro ao atualizar heartbeat:", err);
      throw err;
    }) as any[];

    if (result && result.length > 0) {
      // Opcional: Log de performance pode ser adicionado aqui no futuro
      return res.status(200).json({ ok: true, message: "Heartbeat recebido" });
    }

    return res.status(404).json({ error: "Ativo não encontrado" });
  } catch (err: any) {
    console.error("[Agent Heartbeat Error]", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
});

// GET /agent/assets/:id
router.get("/assets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getRawClient();
    if (!db) {
      return res.status(503).json({ error: "Banco de dados indisponível" });
    }

    const asset = await db`
      SELECT * FROM assets WHERE id = ${id}
    `.catch((err) => {
      console.error("Erro ao buscar asset por ID:", err);
      throw err;
    }) as any[];

    if (asset && asset.length > 0) {
      return res.status(200).json(asset[0]);
    }

    return res.status(404).json({ error: "Ativo não encontrado" });
  } catch (err: any) {
    console.error("[Agent Get Asset Error]", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
});

// POST /api/tickets - Receber chamado do agente
router.post("/tickets", async (req: any, res: any) => {
  try {
    const { assetId, description, screenshots } = req.body;

    if (!assetId || !description) {
      return res.status(400).json({ error: "assetId e description são obrigatórios" });
    }

    const db = await getRawClient();
    if (!db) {
      return res.status(503).json({ error: "Banco de dados indisponível" });
    }

    // Buscar o ativo para obter a empresaId
    const assets = await db`
      SELECT "empresaId", hostname FROM assets WHERE id = ${assetId}
    `.catch(() => []) as any[];

    if (!assets || assets.length === 0) {
      return res.status(404).json({ error: "Ativo não encontrado" });
    }

    const { empresaId, hostname } = assets[0];
    const protocolo = `TI-${Date.now().toString(36).toUpperCase()}`;

    // Criar o ticket na tabela tickets_ti
    // Como não temos um usuário logado (é o agente), usaremos um solicitanteId padrão ou nulo se permitido.
    // Pelo schema, solicitanteId é NOT NULL. Vamos buscar um admin da empresa ou usar o ID 1 como fallback.
    const users = await db`
      SELECT id FROM users WHERE "empresaId" = ${empresaId} AND role = 'admin' LIMIT 1
    `.catch(() => []) as any[];
    
    const solicitanteId = users[0]?.id || 1;

    const newTickets = await db`
      INSERT INTO tickets_ti (
        "empresaId", protocolo, "solicitanteId", titulo, descricao,
        categoria, prioridade, status, "createdAt", "updatedAt"
      ) VALUES (
        ${empresaId}, ${protocolo}, ${solicitanteId}, 
        ${`Chamado automático: ${hostname}`}, ${description},
        'outro', 'media', 'aberto', NOW(), NOW()
      ) RETURNING id
    `.catch((err) => {
      console.error("Erro ao criar ticket_ti:", err);
      throw err;
    }) as any[];

    const ticketId = newTickets[0]?.id;

    // Salvar screenshots como mensagens/anexos se houver
    if (ticketId && screenshots && Array.isArray(screenshots)) {
      for (const base64 of screenshots) {
        // No mundo real, salvaríamos o arquivo em disco/S3. 
        // Aqui, para simplificar e seguir o requisito de Base64, vamos registrar na ticket_mensagens.
        await db`
          INSERT INTO ticket_mensagens (
            "ticketId", "empresaId", "autorId", conteudo, tipo, "fileUrl", "fileType", "createdAt"
          ) VALUES (
            ${ticketId}, ${empresaId}, ${solicitanteId}, '', 'anexo', ${base64}, 'image/png', NOW()
          )
        `.catch((err) => console.error("Erro ao salvar screenshot:", err));
      }
    }

    return res.status(201).json({ 
      message: "Chamado criado com sucesso", 
      id: ticketId,
      protocolo 
    });
  } catch (err: any) {
    console.error("[Agent Create Ticket Error]", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
});

export default router;
