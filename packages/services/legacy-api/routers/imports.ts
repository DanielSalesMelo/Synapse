import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAuditLog } from "../_core/audit";
import { resolveAccessibleEmpresaId } from "../_core/access";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

const importRowSchema = z.record(z.string(), z.any());

const previewInput = z.object({
  empresaId: z.number(),
  modulo: z.enum(["veiculos", "funcionarios", "contas_pagar", "contas_receber"]),
  fileName: z.string().min(1),
  rows: z.array(importRowSchema).min(1).max(500),
});

type PreviewRow = {
  valid: boolean;
  normalized: Record<string, any>;
  errors: string[];
};

const templates = [
  {
    id: "veiculos",
    nome: "Veículos",
    descricao: "Importa frota com placa, tipo, marca, modelo e consumo.",
    camposObrigatorios: ["placa", "tipo"],
    colunas: ["placa", "tipo", "marca", "modelo", "ano", "cor", "renavam", "chassi", "mediaConsumo", "ativo"],
  },
  {
    id: "funcionarios",
    nome: "Funcionários / RH",
    descricao: "Importa colaboradores, cargos e vínculos operacionais.",
    camposObrigatorios: ["nome", "funcao", "tipoContrato"],
    colunas: ["nome", "cpf", "rg", "telefone", "email", "funcao", "tipoContrato", "salario", "dataAdmissao", "cnh", "vencimentoCnh", "ativo"],
  },
  {
    id: "contas_pagar",
    nome: "Contas a Pagar",
    descricao: "Importa contas em aberto do financeiro.",
    camposObrigatorios: ["descricao", "categoria", "valor", "dataVencimento"],
    colunas: ["descricao", "categoria", "valor", "dataVencimento", "status", "fornecedor", "notaFiscal", "observacoes"],
  },
  {
    id: "contas_receber",
    nome: "Contas a Receber",
    descricao: "Importa receitas previstas e cobranças.",
    camposObrigatorios: ["descricao", "categoria", "valor", "dataVencimento"],
    colunas: ["descricao", "categoria", "valor", "dataVencimento", "status", "cliente", "notaFiscal", "cteNumero", "observacoes"],
  },
];

const vehicleTypes = new Set(["van", "toco", "truck", "cavalo", "carreta", "empilhadeira", "paletera", "outro"]);
const roleTypes = new Set(["motorista", "ajudante", "despachante", "gerente", "admin", "outro"]);
const contractTypes = new Set(["clt", "freelancer", "terceirizado", "estagiario"]);
const payableCategories = new Set(["combustivel", "manutencao", "salario", "freelancer", "pedagio", "seguro", "ipva", "licenciamento", "pneu", "outro"]);
const receivableCategories = new Set(["frete", "cte", "devolucao", "outro"]);
const payableStatus = new Set(["pendente", "pago", "vencido", "cancelado"]);
const receivableStatus = new Set(["pendente", "recebido", "vencido", "cancelado"]);

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeUpper(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function normalizeDecimal(value: unknown) {
  const raw = normalizeText(value).replace(/\./g, "").replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeInteger(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeBoolean(value: unknown, fallback = true) {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return fallback;
  return ["1", "sim", "true", "ativo", "yes"].includes(raw);
}

function normalizeDate(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function previewVeiculo(row: Record<string, any>): PreviewRow {
  const normalized = {
    placa: normalizeUpper(row.placa),
    tipo: normalizeText(row.tipo).toLowerCase(),
    marca: normalizeText(row.marca) || null,
    modelo: normalizeText(row.modelo) || null,
    ano: normalizeInteger(row.ano),
    cor: normalizeText(row.cor) || null,
    renavam: normalizeText(row.renavam) || null,
    chassi: normalizeText(row.chassi) || null,
    mediaConsumo: normalizeDecimal(row.mediaConsumo ?? row.consumo),
    ativo: normalizeBoolean(row.ativo, true),
  };
  const errors: string[] = [];
  if (!normalized.placa) errors.push("Placa é obrigatória.");
  if (!normalized.tipo) errors.push("Tipo do veículo é obrigatório.");
  if (normalized.tipo && !vehicleTypes.has(normalized.tipo)) errors.push("Tipo do veículo inválido.");
  return { valid: errors.length === 0, normalized, errors };
}

function previewFuncionario(row: Record<string, any>): PreviewRow {
  const normalized = {
    nome: normalizeText(row.nome),
    cpf: normalizeText(row.cpf) || null,
    rg: normalizeText(row.rg) || null,
    telefone: normalizeText(row.telefone) || null,
    email: normalizeText(row.email) || null,
    funcao: normalizeText(row.funcao).toLowerCase(),
    tipoContrato: normalizeText(row.tipoContrato).toLowerCase(),
    salario: normalizeDecimal(row.salario),
    dataAdmissao: normalizeDate(row.dataAdmissao),
    cnh: normalizeText(row.cnh) || null,
    vencimentoCnh: normalizeDate(row.vencimentoCnh),
    ativo: normalizeBoolean(row.ativo, true),
  };
  const errors: string[] = [];
  if (!normalized.nome) errors.push("Nome é obrigatório.");
  if (!normalized.funcao) errors.push("Função é obrigatória.");
  if (!normalized.tipoContrato) errors.push("Tipo de contrato é obrigatório.");
  if (normalized.funcao && !roleTypes.has(normalized.funcao)) errors.push("Função inválida.");
  if (normalized.tipoContrato && !contractTypes.has(normalized.tipoContrato)) errors.push("Tipo de contrato inválido.");
  return { valid: errors.length === 0, normalized, errors };
}

function previewContaPagar(row: Record<string, any>): PreviewRow {
  const normalized = {
    descricao: normalizeText(row.descricao),
    categoria: normalizeText(row.categoria).toLowerCase(),
    valor: normalizeDecimal(row.valor),
    dataVencimento: normalizeDate(row.dataVencimento),
    status: normalizeText(row.status).toLowerCase() || "pendente",
    fornecedor: normalizeText(row.fornecedor) || null,
    notaFiscal: normalizeText(row.notaFiscal) || null,
    observacoes: normalizeText(row.observacoes) || null,
  };
  const errors: string[] = [];
  if (!normalized.descricao) errors.push("Descrição é obrigatória.");
  if (!normalized.categoria) errors.push("Categoria é obrigatória.");
  if (normalized.valor === null) errors.push("Valor inválido.");
  if (!normalized.dataVencimento) errors.push("Data de vencimento inválida.");
  if (normalized.categoria && !payableCategories.has(normalized.categoria)) errors.push("Categoria inválida.");
  if (normalized.status && !payableStatus.has(normalized.status)) errors.push("Status inválido.");
  return { valid: errors.length === 0, normalized, errors };
}

function previewContaReceber(row: Record<string, any>): PreviewRow {
  const normalized = {
    descricao: normalizeText(row.descricao),
    categoria: normalizeText(row.categoria).toLowerCase(),
    valor: normalizeDecimal(row.valor),
    dataVencimento: normalizeDate(row.dataVencimento),
    status: normalizeText(row.status).toLowerCase() || "pendente",
    cliente: normalizeText(row.cliente) || null,
    notaFiscal: normalizeText(row.notaFiscal) || null,
    cteNumero: normalizeText(row.cteNumero) || null,
    observacoes: normalizeText(row.observacoes) || null,
  };
  const errors: string[] = [];
  if (!normalized.descricao) errors.push("Descrição é obrigatória.");
  if (!normalized.categoria) errors.push("Categoria é obrigatória.");
  if (normalized.valor === null) errors.push("Valor inválido.");
  if (!normalized.dataVencimento) errors.push("Data de vencimento inválida.");
  if (normalized.categoria && !receivableCategories.has(normalized.categoria)) errors.push("Categoria inválida.");
  if (normalized.status && !receivableStatus.has(normalized.status)) errors.push("Status inválido.");
  return { valid: errors.length === 0, normalized, errors };
}

function previewRows(modulo: string, rows: Record<string, any>[]) {
  const mapper =
    modulo === "veiculos" ? previewVeiculo :
    modulo === "funcionarios" ? previewFuncionario :
    modulo === "contas_pagar" ? previewContaPagar :
    previewContaReceber;

  return rows.map(mapper);
}

export const importsRouter = router({
  templates: protectedProcedure.query(async () => templates),

  listBatches: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
      const result = await db.execute(sql`
        SELECT id, modulo, "fileName", status, "totalRows", "validRows", "errorRows", "createdAt"
        FROM import_batches
        WHERE "empresaId" = ${empresaId}
        ORDER BY "createdAt" DESC
        LIMIT 20
      `);
      return (result as any).rows ?? result;
    }),

  createPreview: protectedProcedure
    .input(previewInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      if (!["admin", "master_admin"].includes(ctx.user!.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem importar." });
      }

      const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
      const analyzed = previewRows(input.modulo, input.rows);
      const validRows = analyzed.filter((row) => row.valid);
      const invalidRows = analyzed
        .map((row, index) => ({ index: index + 2, errors: row.errors }))
        .filter((row) => row.errors.length > 0);

      const payload = {
        rows: analyzed.map((row, index) => ({
          linha: index + 2,
          ...row.normalized,
          valid: row.valid,
          errors: row.errors,
        })),
      };

      const inserted = await db.execute(sql`
        INSERT INTO import_batches (
          "empresaId", modulo, "fileName", status, "totalRows", "validRows", "errorRows",
          preview, errors, "createdBy", "createdAt", "updatedAt"
        ) VALUES (
          ${empresaId}, ${input.modulo}, ${input.fileName}, 'preview', ${input.rows.length},
          ${validRows.length}, ${invalidRows.length},
          ${JSON.stringify(payload)}::jsonb, ${JSON.stringify(invalidRows)}::jsonb, ${ctx.user!.id}, NOW(), NOW()
        )
        RETURNING *
      `);

      const batch = ((inserted as any).rows ?? inserted)[0];

      await createAuditLog(ctx, {
        acao: "IMPORT_PREVIEW",
        tabela: "import_batches",
        registroId: batch?.id,
        dadosDepois: {
          modulo: input.modulo,
          totalRows: input.rows.length,
          validRows: validRows.length,
          errorRows: invalidRows.length,
        },
      });

      return {
        batchId: batch?.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        errorRows: invalidRows.length,
        preview: payload.rows.slice(0, 20),
        errors: invalidRows.slice(0, 30),
      };
    }),

  confirmBatch: protectedProcedure
    .input(z.object({ empresaId: z.number(), batchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      if (!["admin", "master_admin"].includes(ctx.user!.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem importar." });
      }

      const empresaId = await resolveAccessibleEmpresaId(ctx, input.empresaId);
      const result = await db.execute(sql`
        SELECT *
        FROM import_batches
        WHERE id = ${input.batchId}
          AND "empresaId" = ${empresaId}
        LIMIT 1
      `);
      const batch = (((result as any).rows ?? result)[0] ?? null) as any;
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Lote de importação não encontrado." });

      const previewRowsData = batch.preview?.rows ?? batch.preview?.rows ?? [];
      const rows = Array.isArray(previewRowsData)
        ? previewRowsData.filter((row: any) => row.valid)
        : [];

      let imported = 0;

      for (const row of rows) {
        if (batch.modulo === "veiculos") {
          await db.execute(sql`
            INSERT INTO veiculos (
              "empresaId", placa, tipo, marca, modelo, ano, cor, renavam, chassi, "mediaConsumo", ativo, "createdAt", "updatedAt"
            ) VALUES (
              ${empresaId}, ${row.placa}, ${row.tipo}, ${row.marca}, ${row.modelo}, ${row.ano}, ${row.cor},
              ${row.renavam}, ${row.chassi}, ${row.mediaConsumo}, ${row.ativo}, NOW(), NOW()
            )
          `);
        } else if (batch.modulo === "funcionarios") {
          await db.execute(sql`
            INSERT INTO funcionarios (
              "empresaId", nome, cpf, rg, telefone, email, funcao, "tipoContrato", salario, "dataAdmissao", cnh, "vencimentoCnh", ativo, "createdAt", "updatedAt"
            ) VALUES (
              ${empresaId}, ${row.nome}, ${row.cpf}, ${row.rg}, ${row.telefone}, ${row.email}, ${row.funcao},
              ${row.tipoContrato}, ${row.salario}, ${row.dataAdmissao}, ${row.cnh}, ${row.vencimentoCnh}, ${row.ativo}, NOW(), NOW()
            )
          `);
        } else if (batch.modulo === "contas_pagar") {
          await db.execute(sql`
            INSERT INTO contas_pagar (
              "empresaId", descricao, categoria, valor, "dataVencimento", status, fornecedor, "notaFiscal", observacoes, "createdAt", "updatedAt"
            ) VALUES (
              ${empresaId}, ${row.descricao}, ${row.categoria}, ${String(row.valor)}, ${row.dataVencimento},
              ${row.status}, ${row.fornecedor}, ${row.notaFiscal}, ${row.observacoes}, NOW(), NOW()
            )
          `);
        } else if (batch.modulo === "contas_receber") {
          await db.execute(sql`
            INSERT INTO contas_receber (
              "empresaId", descricao, categoria, valor, "dataVencimento", status, cliente, "notaFiscal", "cteNumero", observacoes, "createdAt", "updatedAt"
            ) VALUES (
              ${empresaId}, ${row.descricao}, ${row.categoria}, ${String(row.valor)}, ${row.dataVencimento},
              ${row.status}, ${row.cliente}, ${row.notaFiscal}, ${row.cteNumero}, ${row.observacoes}, NOW(), NOW()
            )
          `);
        }
        imported += 1;
      }

      await db.execute(sql`
        UPDATE import_batches
        SET status = 'importado',
            "updatedAt" = NOW()
        WHERE id = ${input.batchId}
      `);

      await createAuditLog(ctx, {
        acao: "IMPORT_CONFIRM",
        tabela: "import_batches",
        registroId: input.batchId,
        dadosDepois: {
          modulo: batch.modulo,
          imported,
        },
      });

      return { success: true, imported };
    }),
});
