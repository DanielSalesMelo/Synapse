import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb, getRawClient } from "../db";
import { ticketsTi, ativosTi, certificadosTi } from "../drizzle/schema";
import { eq, and, desc, ilike, isNull, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function gerarOS(): string {
  const ano = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `OS-${ano}-${seq}`;
}
function gerarProtocolo(): string {
  return `TI-${Date.now().toString(36).toUpperCase()}`;
}

export const tiRouter = router({

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const empresaId = ctx.user.empresaId!;
    const [ticketStats] = await db.select({
      total: sql<number>`count(*)`,
      abertos: sql<number>`count(*) filter (where status = 'aberto')`,
      emAndamento: sql<number>`count(*) filter (where status = 'em_andamento')`,
      resolvidosHoje: sql<number>`count(*) filter (where status = 'resolvido' AND "resolvidoEm" >= current_date)`,
      ativos: sql<number>`count(*) filter (where status IN ('aberto','em_andamento','aguardando'))`,
    }).from(ticketsTi).where(and(eq(ticketsTi.empresaId, empresaId), isNull(ticketsTi.deletedAt)));
    const [ativoStats] = await db.select({
      total: sql<number>`count(*)`,
      online: sql<number>`count(*) filter (where status = 'online')`,
      atencao: sql<number>`count(*) filter (where status = 'atencao')`,
      critico: sql<number>`count(*) filter (where status = 'critico')`,
    }).from(ativosTi).where(and(eq(ativosTi.empresaId, empresaId), isNull(ativosTi.deletedAt)));
    const [certStats] = await db.select({
      total: sql<number>`count(*)`,
      expirando: sql<number>`count(*) filter (where vencimento <= (current_date + interval '30 days') AND vencimento >= current_date)`,
      vencidos: sql<number>`count(*) filter (where vencimento < current_date)`,
    }).from(certificadosTi).where(and(eq(certificadosTi.empresaId, empresaId), isNull(certificadosTi.deletedAt)));
    return { tickets: ticketStats, ativos: ativoStats, certificados: certStats, licencas: { total: 0 } };
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { tickets: 0, alertas: 0 };
    const empresaId = ctx.user.empresaId!;
    const [r] = await db.select({
      tickets: sql<number>`count(*) filter (where status = 'aberto')`,
    }).from(ticketsTi).where(and(eq(ticketsTi.empresaId, empresaId), isNull(ticketsTi.deletedAt)));
    return { tickets: Number(r?.tickets || 0), alertas: 0 };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // TICKETS / CHAMADOS
  // ══════════════════════════════════════════════════════════════════════════
  listTickets: protectedProcedure
    .input(z.object({ status: z.string().optional(), search: z.string().optional(), prioridade: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conds: any[] = [eq(ticketsTi.empresaId, ctx.user.empresaId!), isNull(ticketsTi.deletedAt)];
      if (input.status && input.status !== "todos") conds.push(eq(ticketsTi.status, input.status as any));
      if (input.search) conds.push(or(ilike(ticketsTi.titulo, `%${input.search}%`), ilike(ticketsTi.protocolo, `%${input.search}%`))!);
      return db.select().from(ticketsTi).where(and(...conds)).orderBy(desc(ticketsTi.createdAt));
    }),

  getTicket: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        SELECT t.*, 
          u.name as solicitante_nome, u.email as solicitante_email,
          u.departamento as solicitante_departamento, u.cargo as solicitante_cargo,
          u.id as solicitante_id,
          tec.name as tecnico_nome
        FROM tickets_ti t
        LEFT JOIN users u ON u.id = t."solicitanteId"
        LEFT JOIN users tec ON tec.id = t."tecnicoId"
        WHERE t.id = ${input.id} AND t."empresaId" = ${ctx.user.empresaId!}
      `;
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return rows[0];
    }),

  createTicket: protectedProcedure
    .input(z.object({
      titulo: z.string().min(2),
      descricao: z.string().min(5),
      categoria: z.enum(["hardware", "software", "rede", "acesso", "email", "impressora", "outro"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      ativoId: z.number().optional(),
      prazo: z.string().optional(),
      anexos: z.array(z.object({ nome: z.string(), url: z.string(), tipo: z.string(), tamanho: z.number().optional() })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const protocolo = gerarProtocolo();
      const numeroOs = gerarOS();
      const rows = await client`
        INSERT INTO tickets_ti (
          "empresaId", "solicitanteId", protocolo, titulo, descricao,
          categoria, prioridade, status, "createdAt", "updatedAt"
        ) VALUES (
          ${ctx.user.empresaId!}, ${ctx.user.id}, ${protocolo},
          ${input.titulo}, ${input.descricao},
          ${input.categoria || 'outro'}, ${input.prioridade || 'media'}, 'aberto',
          NOW(), NOW()
        ) RETURNING *
      `;
      const ticket = rows[0];
      if (!ticket) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Mensagem automática
      await client`
        INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
        VALUES (${ticket.id},${ctx.user.empresaId!},${ctx.user.id},${'Chamado aberto: ' + input.descricao},'sistema',NOW())
      `.catch(() => {});

      // Anexos
      if (input.anexos) {
        for (const a of input.anexos) {
          await client`
            INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"fileUrl","fileName","fileType","createdAt")
            VALUES (${ticket.id},${ctx.user.empresaId!},${ctx.user.id},'','anexo',${a.url},${a.nome},${a.tipo},NOW())
          `.catch(() => {});
        }
      }
      return ticket;
    }),

  updateTicket: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aberto", "em_andamento", "aguardando", "resolvido", "fechado"]).optional(),
      prioridade: z.enum(["baixa", "media", "alta", "critica"]).optional(),
      tecnicoId: z.number().optional(),
      prazo: z.string().optional(),
      resolucao: z.string().optional(),
      slaHoras: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      // Monta SET dinamicamente com raw SQL para suportar colunas extras (tecnicoId, slaHoras)
      const sets: string[] = ['"updatedAt"=NOW()'];
      const vals: any[] = [];
      let i = 1;
      if (data.status) { sets.push(`status=$${i++}`); vals.push(data.status); }
      if (data.prioridade) { sets.push(`prioridade=$${i++}`); vals.push(data.prioridade); }
      if (data.tecnicoId) { sets.push(`"tecnicoId"=$${i++}`); vals.push(data.tecnicoId); }
      if (data.resolucao) { sets.push(`resolucao=$${i++}`); vals.push(data.resolucao); }
      if (data.slaHoras) { sets.push(`"slaHoras"=$${i++}`); vals.push(data.slaHoras); }
      if (data.status === 'resolvido' || data.status === 'fechado') sets.push('"resolvidoEm"=NOW()');
      vals.push(id); vals.push(ctx.user.empresaId!);
      await client.unsafe(
        `UPDATE tickets_ti SET ${sets.join(',')} WHERE id=$${i++} AND "empresaId"=$${i}`,
        vals
      ).catch(() => {});
      // Log de status
      if (data.status) {
        await client`
          INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"createdAt")
          VALUES (${id},${ctx.user.empresaId!},${ctx.user.id},${'Status alterado para: ' + data.status + (data.resolucao ? ' — ' + data.resolucao : '')},'sistema',NOW())
        `.catch(() => {});
      }
      return { success: true };
    }),

  updateTicketStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["aberto", "em_andamento", "aguardando", "resolvido", "fechado"]), resolucao: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const data: any = { status: input.status, updatedAt: new Date() };
      if (input.resolucao) data.resolucao = input.resolucao;
      if (input.status === "resolvido" || input.status === "fechado") data.resolvidoEm = new Date();
      await db.update(ticketsTi).set(data).where(and(eq(ticketsTi.id, input.id), eq(ticketsTi.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  deleteTicket: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(ticketsTi).set({ deletedAt: new Date() }).where(and(eq(ticketsTi.id, input.id), eq(ticketsTi.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  // ── Mensagens do ticket ────────────────────────────────────────────────────
  listMensagens: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) return [];
      return client`
        SELECT m.*, u.name as autor_nome, u.email as autor_email
        FROM ticket_mensagens m
        LEFT JOIN users u ON u.id = m."autorId"
        WHERE m."ticketId" = ${input.ticketId} AND m."empresaId" = ${ctx.user.empresaId!}
        ORDER BY m."createdAt" ASC
      `.catch(() => []);
    }),

  sendMensagem: protectedProcedure
    .input(z.object({
      ticketId: z.number(),
      conteudo: z.string(),
      tipo: z.enum(["mensagem", "nota_interna", "anexo", "sistema"]).optional(),
      anexoUrl: z.string().optional(),
      anexoNome: z.string().optional(),
      anexoTipo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        INSERT INTO ticket_mensagens ("ticketId","empresaId","autorId",conteudo,tipo,"fileUrl","fileName","fileType","createdAt")
        VALUES (${input.ticketId},${ctx.user.empresaId!},${ctx.user.id},${input.conteudo},${input.tipo||'mensagem'},${input.anexoUrl||null},${input.anexoNome||null},${input.anexoTipo||null},NOW())
        RETURNING *
      `;
      await client`UPDATE tickets_ti SET "updatedAt"=NOW() WHERE id=${input.ticketId}`.catch(()=>{});
      return rows[0];
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // ATIVOS / INVENTÁRIO
  // ══════════════════════════════════════════════════════════════════════════
  listAtivos: protectedProcedure
    .input(z.object({ search: z.string().optional(), tipo: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conds: any[] = [eq(ativosTi.empresaId, ctx.user.empresaId!), isNull(ativosTi.deletedAt)];
      if (input.search) conds.push(or(ilike(ativosTi.tipo, `%${input.search}%`), ilike(ativosTi.patrimonio, `%${input.search}%`), ilike(ativosTi.marca, `%${input.search}%`))!);
      return db.select().from(ativosTi).where(and(...conds)).orderBy(desc(ativosTi.createdAt));
    }),

  createAtivo: protectedProcedure
    .input(z.object({
      tipo: z.string().min(2), marca: z.string().optional(), modelo: z.string().optional(),
      patrimonio: z.string().optional(), serial: z.string().optional(),
      setor: z.string().optional(), hostname: z.string().optional(),
      ip: z.string().optional(), so: z.string().optional(),
      anydesk: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [a] = await db.insert(ativosTi).values({ ...input, empresaId: ctx.user.empresaId! }).returning();
      return a;
    }),

  updateAtivo: protectedProcedure
    .input(z.object({
      id: z.number(), tipo: z.string().optional(), marca: z.string().optional(),
      modelo: z.string().optional(), patrimonio: z.string().optional(),
      serial: z.string().optional(), setor: z.string().optional(),
      hostname: z.string().optional(), ip: z.string().optional(),
      so: z.string().optional(), anydesk: z.string().optional(),
      status: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(ativosTi).set({ ...data, updatedAt: new Date() }).where(and(eq(ativosTi.id, id), eq(ativosTi.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  deleteAtivo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(ativosTi).set({ deletedAt: new Date() }).where(and(eq(ativosTi.id, input.id), eq(ativosTi.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // LICENÇAS
  // ══════════════════════════════════════════════════════════════════════════
  listLicencas: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const client = await getRawClient();
      if (!client) return [];
      return client`
        SELECT * FROM licencas_ti
        WHERE "empresaId" = ${ctx.user.empresaId!} AND "deletedAt" IS NULL
        ${input.search ? client`AND (software ILIKE ${'%'+input.search+'%'} OR fornecedor ILIKE ${'%'+input.search+'%'})` : client``}
        ORDER BY "createdAt" DESC
      `.catch(() => []);
    }),

  createLicenca: protectedProcedure
    .input(z.object({
      software: z.string().min(2), fornecedor: z.string().optional(),
      tipo: z.enum(["perpetua","assinatura","oem","freeware","opensource"]).optional(),
      quantidadeTotal: z.number().optional(), quantidadeUsada: z.number().optional(),
      chave: z.string().optional(), vencimento: z.string().optional(),
      valor: z.number().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        INSERT INTO licencas_ti ("empresaId",software,fornecedor,tipo,"quantidadeTotal","quantidadeUsada",chave,vencimento,valor,observacoes,"createdAt","updatedAt")
        VALUES (${ctx.user.empresaId!},${input.software},${input.fornecedor||null},${input.tipo||'perpetua'},${input.quantidadeTotal||1},${input.quantidadeUsada||0},${input.chave||null},${input.vencimento?new Date(input.vencimento):null},${input.valor||null},${input.observacoes||null},NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  updateLicenca: protectedProcedure
    .input(z.object({
      id: z.number(), software: z.string().optional(), fornecedor: z.string().optional(),
      quantidadeTotal: z.number().optional(), quantidadeUsada: z.number().optional(),
      chave: z.string().optional(), vencimento: z.string().optional(),
      valor: z.number().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, vencimento, ...rest } = input;
      const sets: string[] = ['"updatedAt"=NOW()'];
      const vals: any[] = [];
      let i = 1;
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) { sets.push(`"${k}"=$${i++}`); vals.push(v); }
      }
      if (vencimento) { sets.push(`vencimento=$${i++}`); vals.push(new Date(vencimento)); }
      vals.push(id, ctx.user.empresaId!);
      await client.unsafe(`UPDATE licencas_ti SET ${sets.join(',')} WHERE id=$${i++} AND "empresaId"=$${i++}`, vals);
      return { success: true };
    }),

  deleteLicenca: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await client`UPDATE licencas_ti SET "deletedAt"=NOW() WHERE id=${input.id} AND "empresaId"=${ctx.user.empresaId!}`;
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // SERVIDORES
  // ══════════════════════════════════════════════════════════════════════════
  listServidores: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`SELECT * FROM servidores_ti WHERE "empresaId"=${ctx.user.empresaId!} AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`.catch(()=>[]);
  }),

  createServidor: protectedProcedure
    .input(z.object({
      nome: z.string().min(2), tipo: z.enum(["fisico","virtual","cloud","container"]).optional(),
      ip: z.string().optional(), so: z.string().optional(), cpu: z.string().optional(),
      ram: z.string().optional(), disco: z.string().optional(),
      localizacao: z.string().optional(), funcao: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        INSERT INTO servidores_ti ("empresaId",nome,tipo,ip,so,cpu,ram,disco,localizacao,funcao,observacoes,status,"createdAt","updatedAt")
        VALUES (${ctx.user.empresaId!},${input.nome},${input.tipo||'fisico'},${input.ip||null},${input.so||null},${input.cpu||null},${input.ram||null},${input.disco||null},${input.localizacao||null},${input.funcao||null},${input.observacoes||null},'online',NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  updateServidor: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["online","offline","manutencao"]).optional(), observacoes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.status) await client`UPDATE servidores_ti SET status=${input.status},"updatedAt"=NOW() WHERE id=${input.id} AND "empresaId"=${ctx.user.empresaId!}`;
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // ACESSOS REMOTOS
  // ══════════════════════════════════════════════════════════════════════════
  listAcessos: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`
      SELECT a.*, u.name as usuario_nome FROM acessos_ti a
      LEFT JOIN users u ON u.id = a."usuarioId"
      WHERE a."empresaId"=${ctx.user.empresaId!} AND a."deletedAt" IS NULL
      ORDER BY a."createdAt" DESC
    `.catch(()=>[]);
  }),

  createAcesso: protectedProcedure
    .input(z.object({
      nome: z.string().min(2), tipo: z.enum(["anydesk","rdp","ssh","vpn","outro"]).optional(),
      host: z.string().optional(), porta: z.number().optional(),
      usuario: z.string().optional(), anydesk_id: z.string().optional(),
      setor: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        INSERT INTO acessos_ti ("empresaId","usuarioId",nome,tipo,host,porta,usuario,anydesk_id,setor,observacoes,"createdAt","updatedAt")
        VALUES (${ctx.user.empresaId!},${ctx.user.id},${input.nome},${input.tipo||'outro'},${input.host||null},${input.porta||null},${input.usuario||null},${input.anydesk_id||null},${input.setor||null},${input.observacoes||null},NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // COMPRAS DE TI
  // ══════════════════════════════════════════════════════════════════════════
  listCompras: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`SELECT * FROM compras_ti WHERE "empresaId"=${ctx.user.empresaId!} AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`.catch(()=>[]);
  }),

  createCompra: protectedProcedure
    .input(z.object({
      item: z.string().min(2), fornecedor: z.string().optional(),
      quantidade: z.number().optional(), valorUnitario: z.number().optional(),
      status: z.enum(["solicitado","aprovado","comprado","entregue","cancelado"]).optional(),
      justificativa: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        INSERT INTO compras_ti ("empresaId","solicitanteId",item,fornecedor,quantidade,"valorUnitario",status,justificativa,observacoes,"createdAt","updatedAt")
        VALUES (${ctx.user.empresaId!},${ctx.user.id},${input.item},${input.fornecedor||null},${input.quantidade||1},${input.valorUnitario||null},${input.status||'solicitado'},${input.justificativa||null},${input.observacoes||null},NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  updateCompra: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["solicitado","aprovado","comprado","entregue","cancelado"]) }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await client`UPDATE compras_ti SET status=${input.status},"updatedAt"=NOW() WHERE id=${input.id} AND "empresaId"=${ctx.user.empresaId!}`;
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CMDB
  // ══════════════════════════════════════════════════════════════════════════
  listCmdb: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`SELECT * FROM cmdb_ti WHERE "empresaId"=${ctx.user.empresaId!} AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`.catch(()=>[]);
  }),

  createCmdb: protectedProcedure
    .input(z.object({
      nome: z.string().min(2), tipo: z.string().optional(), versao: z.string().optional(),
      ambiente: z.enum(["producao","homologacao","desenvolvimento","teste"]).optional(),
      responsavel: z.string().optional(), dependencias: z.string().optional(), observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        INSERT INTO cmdb_ti ("empresaId",nome,tipo,versao,ambiente,responsavel,dependencias,observacoes,"createdAt","updatedAt")
        VALUES (${ctx.user.empresaId!},${input.nome},${input.tipo||null},${input.versao||null},${input.ambiente||'producao'},${input.responsavel||null},${input.dependencias||null},${input.observacoes||null},NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // MANUTENÇÕES
  // ══════════════════════════════════════════════════════════════════════════
  listManutencoes: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`
      SELECT m.*, u.name as tecnico_nome FROM manutencoes_ti m
      LEFT JOIN users u ON u.id = m."tecnicoId"
      WHERE m."empresaId"=${ctx.user.empresaId!} AND m."deletedAt" IS NULL
      ORDER BY m."createdAt" DESC
    `.catch(()=>[]);
  }),

  createManutencao: protectedProcedure
    .input(z.object({
      ativoId: z.number().optional(),
      tipo: z.enum(["preventiva","corretiva","preditiva"]).optional(),
      descricao: z.string().min(5),
      tecnicoId: z.number().optional(),
      agendadoPara: z.string().optional(),
      pecasUtilizadas: z.string().optional(),
      custo: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await client`
        INSERT INTO manutencoes_ti ("empresaId","ativoId",tipo,descricao,"tecnicoId","agendadoPara","pecasUtilizadas",custo,observacoes,status,"createdAt","updatedAt")
        VALUES (${ctx.user.empresaId!},${input.ativoId||null},${input.tipo||'corretiva'},${input.descricao},${input.tecnicoId||ctx.user.id},${input.agendadoPara?new Date(input.agendadoPara):null},${input.pecasUtilizadas||null},${input.custo||null},${input.observacoes||null},'agendada',NOW(),NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // MONITORAMENTO — Agentes
  // ══════════════════════════════════════════════════════════════════════════
  listAgentes: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`
      SELECT a.*,
        (SELECT "coletadoEm" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ultima_coleta,
        (SELECT "cpuUso" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as cpu_atual,
        (SELECT "ramUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as ram_atual,
        (SELECT "discoUsoPct" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as disco_atual,
        (SELECT "anydeskId" FROM monitor_metricas WHERE "agenteId"=a.id ORDER BY "coletadoEm" DESC LIMIT 1) as anydesk_id_atual
      FROM monitor_agentes a
      WHERE a."empresaId"=${ctx.user.empresaId!} AND a."deletedAt" IS NULL
      ORDER BY a.hostname ASC
    `.catch(()=>[]);
  }),

  getAgenteMetricas: protectedProcedure
    .input(z.object({ agenteId: z.number(), periodo: z.enum(["1h","24h","7d","30d","90d"]).optional() }))
    .query(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) return { metricas: [], ultima: null, picos: {} };
      const periodoMap: Record<string,string> = { "1h":"1 hour","24h":"24 hours","7d":"7 days","30d":"30 days","90d":"90 days" };
      const intervalo = periodoMap[input.periodo||"24h"]||"24 hours";
      const metricas = await client`
        SELECT date_trunc('hour',"coletadoEm") as hora,
          round(avg("cpuUso")::numeric,1) as cpu_medio, round(max("cpuUso")::numeric,1) as cpu_pico,
          round(avg("ramUsoPct")::numeric,1) as ram_medio, round(max("ramUsoPct")::numeric,1) as ram_pico,
          round(avg("discoUsoPct")::numeric,1) as disco_medio,
          round(avg("latenciaMs")::numeric,0) as latencia_media, count(*) as amostras
        FROM monitor_metricas
        WHERE "agenteId"=${input.agenteId} AND "empresaId"=${ctx.user.empresaId!}
          AND "coletadoEm" >= NOW() - ${intervalo}::interval
        GROUP BY date_trunc('hour',"coletadoEm") ORDER BY hora ASC
      `.catch(()=>[]);
      const ultima = await client`SELECT * FROM monitor_metricas WHERE "agenteId"=${input.agenteId} AND "empresaId"=${ctx.user.empresaId!} ORDER BY "coletadoEm" DESC LIMIT 1`.catch(()=>[null]).then(r=>r[0]||null);
      const picos = await client`SELECT max("cpuUso") as cpu_max,max("ramUsoPct") as ram_max,max("discoUsoPct") as disco_max FROM monitor_metricas WHERE "agenteId"=${input.agenteId} AND "empresaId"=${ctx.user.empresaId!} AND "coletadoEm">=NOW()-${intervalo}::interval`.catch(()=>[{}]).then(r=>r[0]||{});
      return { metricas, ultima, picos };
    }),

  // ── Registro de agente (público — chamado pelo agente instalado no PC) ────
  registerAgent: publicProcedure
    .input(z.object({
      hostname: z.string(), ip: z.string().optional(), so: z.string().optional(),
      mac: z.string().optional(), versao_agente: z.string().optional(),
      anydesk_id: z.string().optional(), empresa_token: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const token = `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      let empresaId = 1;
      if (input.empresa_token) {
        const rows = await client`SELECT id FROM empresas WHERE codigo=${input.empresa_token} LIMIT 1`.catch(()=>[]);
        if (rows[0]) empresaId = rows[0].id;
      }
      const rows = await client`
        INSERT INTO monitor_agentes ("empresaId",hostname,ip,so,mac,"versaoAgente","anydeskId",token,status,"createdAt","updatedAt")
        VALUES (${empresaId},${input.hostname},${input.ip||null},${input.so||null},${input.mac||null},${input.versao_agente||'1.0.0'},${input.anydesk_id||null},${token},'online',NOW(),NOW())
        RETURNING *
      `.catch(async () => {
        return client`SELECT * FROM monitor_agentes WHERE hostname=${input.hostname} AND "empresaId"=${empresaId} LIMIT 1`.catch(()=>[]);
      });
      const agente = rows[0];
      return { token: agente?.token || token, agenteId: agente?.id };
    }),

  // ── Ingestão de métricas (público — chamado pelo agente) ──────────────────
  ingestMetrics: publicProcedure
    .input(z.object({
      token: z.string(),
      metricas: z.array(z.object({
        hostname: z.string(), coletado_em: z.string(),
        cpu_uso: z.number().optional(), cpu_temp: z.number().optional(),
        ram_uso_pct: z.number().optional(), ram_total_mb: z.number().optional(), ram_usada_mb: z.number().optional(),
        disco_uso_pct: z.number().optional(), disco_total_gb: z.number().optional(), disco_usado_gb: z.number().optional(),
        rede_enviado_kb: z.number().optional(), rede_recebido_kb: z.number().optional(),
        latencia_ms: z.number().optional(), processos: z.number().optional(),
        anydesk_id: z.string().optional(), usuario_logado: z.string().optional(),
        uptime: z.number().optional(), top_processos: z.any().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const client = await getRawClient();
      if (!client) return { received: 0 };
      const agentes = await client`SELECT * FROM monitor_agentes WHERE token=${input.token} LIMIT 1`.catch(()=>[]);
      const agente = agentes[0];
      if (!agente) return { received: 0, error: "Token inválido" };
      await client`UPDATE monitor_agentes SET status='online',"updatedAt"=NOW() WHERE id=${agente.id}`.catch(()=>{});
      let inserted = 0;
      for (const m of input.metricas) {
        await client`
          INSERT INTO monitor_metricas ("agenteId","empresaId","coletadoEm","cpuUso","cpuTemp","ramUsoPct","ramTotalMb","ramUsadaMb","discoUsoPct","discoTotalGb","discoUsadoGb","redeEnviadoKb","redeRecebidoKb","latenciaMs",processos,"anydeskId","usuarioLogado",uptime,"topProcessos")
          VALUES (${agente.id},${agente.empresaId},${new Date(m.coletado_em)},${m.cpu_uso||null},${m.cpu_temp||null},${m.ram_uso_pct||null},${m.ram_total_mb||null},${m.ram_usada_mb||null},${m.disco_uso_pct||null},${m.disco_total_gb||null},${m.disco_usado_gb||null},${m.rede_enviado_kb||null},${m.rede_recebido_kb||null},${m.latencia_ms||null},${m.processos||null},${m.anydesk_id||null},${m.usuario_logado||null},${m.uptime||null},${m.top_processos?JSON.stringify(m.top_processos):null})
        `.catch(()=>{});
        inserted++;
      }
      return { received: inserted };
    }),

  listAlertas: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const client = await getRawClient();
      if (!client) return [];
      return client`
        SELECT e.*, a.hostname FROM monitor_eventos e
        LEFT JOIN monitor_agentes a ON a.id=e."agenteId"
        WHERE e."empresaId"=${ctx.user.empresaId!}
        ORDER BY e."ocorridoEm" DESC LIMIT ${input.limit||50}
      `.catch(()=>[]);
    }),

  // ── Códigos de Pareamento PC↔Synapse ──────────────────────────────────────────────────────────────────────────────
  gerarCodigoPareamento: protectedProcedure
    .input(z.object({ descricao: z.string().optional(), ativoId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Gera código único no formato SYNC-XXXX-XXXX
      const parte1 = Math.random().toString(36).slice(2,6).toUpperCase();
      const parte2 = Math.random().toString(36).slice(2,6).toUpperCase();
      const codigo = `SYNC-${parte1}-${parte2}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
      const rows = await client`
        INSERT INTO agent_pairing_codes ("empresaId",codigo,descricao,"ativoId","criadoPor","expiresAt","createdAt")
        VALUES (${ctx.user.empresaId!},${codigo},${input.descricao||null},${input.ativoId||null},${ctx.user.id},${expiresAt},NOW())
        RETURNING *
      `;
      return rows[0];
    }),

  listCodigosPareamento: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`
      SELECT p.*, a.hostname as agente_hostname, a.ip as agente_ip
      FROM agent_pairing_codes p
      LEFT JOIN monitor_agentes a ON a.id = p."agenteId"
      WHERE p."empresaId" = ${ctx.user.empresaId!}
      ORDER BY p."createdAt" DESC LIMIT 50
    `.catch(()=>[]);
  }),

  // ── Certificados Digitais ──────────────────────────────────────────────────
  listCertificados: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conds: any[] = [eq(certificadosTi.empresaId, ctx.user.empresaId!), isNull(certificadosTi.deletedAt)];
      if (input.search) conds.push(ilike(certificadosTi.nome, `%${input.search}%`));
      return db.select().from(certificadosTi).where(and(...conds)).orderBy(certificadosTi.vencimento);
    }),

  createCertificado: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      tipo: z.string(),
      vencimento: z.string(),
      senha: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [novo] = await db.insert(certificadosTi).values({
        empresaId: ctx.user.empresaId!,
        nome: input.nome,
        tipo: input.tipo,
        vencimento: new Date(`${input.vencimento}T12:00:00`),
        senha: input.senha,
        observacoes: input.observacoes,
      }).returning();
      return novo;
    }),

  deleteCertificado: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(certificadosTi).set({ deletedAt: new Date() }).where(and(eq(certificadosTi.id, input.id), eq(certificadosTi.empresaId, ctx.user.empresaId!)));
      return { success: true };
    }),

  revogarCodigoPareamento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await client`DELETE FROM agent_pairing_codes WHERE id=${input.id} AND "empresaId"=${ctx.user.empresaId!}`;
      return { success: true };
    }),

  // Chamado pelo agente na primeira execução para se vincular
  pairAgent: publicProcedure
    .input(z.object({
      codigo: z.string(),
      hostname: z.string(),
      ip: z.string().optional(),
      so: z.string().optional(),
      mac: z.string().optional(),
      fingerprint: z.string().optional(),
      anydesk_id: z.string().optional(),
      versao_agente: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const client = await getRawClient();
      if (!client) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Valida o código de pareamento
      const codes = await client`
        SELECT * FROM agent_pairing_codes
        WHERE codigo=${input.codigo} AND usado=false AND "expiresAt" > NOW()
        LIMIT 1
      `;
      if (!codes[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Código inválido ou expirado" });
      const pairing = codes[0];
      // Gera token permanente único
      const token = `agent_${pairing.empresaId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
      // Registra o agente
      const agentes = await client`
        INSERT INTO monitor_agentes ("empresaId",hostname,ip,so,mac,"versaoAgente","anydeskId",fingerprint,"pairingCode",token,status,"ultimoContato",online,ativo,"createdAt","updatedAt")
        VALUES (${pairing.empresaId},${input.hostname},${input.ip||null},${input.so||null},${input.mac||null},${input.versao_agente||'1.0.0'},${input.anydesk_id||null},${input.fingerprint||null},${input.codigo},${token},'online',NOW(),true,true,NOW(),NOW())
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      let agente = agentes[0];
      if (!agente) {
        // Já existia, retorna o existente
        const existentes = await client`SELECT * FROM monitor_agentes WHERE fingerprint=${input.fingerprint||''} AND "empresaId"=${pairing.empresaId} LIMIT 1`;
        agente = existentes[0];
      }
      // Marca código como usado
      await client`UPDATE agent_pairing_codes SET usado=true,"agenteId"=${agente?.id||null},"usadoEm"=NOW() WHERE id=${pairing.id}`;
      return { token, agenteId: agente?.id, empresaId: pairing.empresaId };
    }),

  // Obter token da empresa para o agente (após pareamento)
  getEmpresaAgentToken: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return { token: null };
    // Gera ou retorna o agentToken da empresa
    const empresas = await client`SELECT "agentToken" FROM empresas WHERE id=${ctx.user.empresaId!} LIMIT 1`;
    let token = empresas[0]?.agentToken;
    if (!token) {
      token = `et_${ctx.user.empresaId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
      await client`UPDATE empresas SET "agentToken"=${token} WHERE id=${ctx.user.empresaId!}`.catch(()=>{});
    }
    return { token, empresaId: ctx.user.empresaId };
  }),

  // ── Listar usuários da empresa (para atribuição de técnico) ────────────────────────
  listTecnicos: protectedProcedure.query(async ({ ctx }) => {
    const client = await getRawClient();
    if (!client) return [];
    return client`SELECT id, name, email FROM users WHERE "empresaId"=${ctx.user.empresaId!} AND "deletedAt" IS NULL ORDER BY name ASC`.catch(()=>[]);
  }),
});
