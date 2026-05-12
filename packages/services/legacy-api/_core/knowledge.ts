import fs from "node:fs";
import path from "node:path";

export type KnowledgeSource = {
  id: string;
  nome: string;
  tipo: "totvs" | "sefaz" | "microsoft" | "interno" | "homologado";
  status: "integrado" | "pendente_ingestao" | "nao_coletado";
  escopo: string;
  caminho?: string;
  observacao?: string;
};

const defaultSources: KnowledgeSource[] = [
  {
    id: "totvs-winthor",
    nome: "TOTVS / Winthor",
    tipo: "totvs",
    status: "pendente_ingestao",
    escopo: "Procedimentos homologados de ERP, fiscal e operação.",
    caminho: "knowledge/docs/totvs",
    observacao: "Usar somente documentos internos homologados antes de responder com passo a passo.",
  },
  {
    id: "sefaz",
    nome: "SEFAZ",
    tipo: "sefaz",
    status: "pendente_ingestao",
    escopo: "Notas fiscais, XML, eventos fiscais e contingência.",
    caminho: "knowledge/docs/sefaz",
    observacao: "Escalar para humano quando houver risco fiscal ou ausência de fonte homologada.",
  },
  {
    id: "microsoft-windows",
    nome: "Microsoft Windows",
    tipo: "microsoft",
    status: "pendente_ingestao",
    escopo: "Windows, Defender, atualizações, rede, firewall e políticas corporativas.",
    caminho: "knowledge/docs/microsoft",
  },
  {
    id: "procedimentos-internos",
    nome: "Procedimentos internos",
    tipo: "interno",
    status: "pendente_ingestao",
    escopo: "Runbooks, FAQ, artigos aprovados pela TI e respostas padrão.",
    caminho: "knowledge/docs/internal",
  },
];

const sourceFile = path.resolve(__dirname, "..", "knowledge", "sources.json");

export const getKnowledgeSources = (): KnowledgeSource[] => {
  try {
    if (!fs.existsSync(sourceFile)) return defaultSources;
    const parsed = JSON.parse(fs.readFileSync(sourceFile, "utf-8"));
    return Array.isArray(parsed?.sources) ? parsed.sources : defaultSources;
  } catch {
    return defaultSources;
  }
};

export const buildKnowledgePrompt = () => {
  const sources = getKnowledgeSources();
  const active = sources.filter((source) => source.status === "integrado");
  const pending = sources.filter((source) => source.status !== "integrado");
  return [
    "Fontes de conhecimento do Synapse:",
    active.length
      ? active.map((source) => `- ${source.nome}: ${source.escopo}`).join("\n")
      : "- Nenhuma fonte RAG homologada está marcada como integrada ainda.",
    pending.length
      ? `Fontes pendentes/sem coleta: ${pending.map((source) => source.nome).join(", ")}. Não invente procedimentos dessas fontes; indique validação humana.`
      : "",
  ].filter(Boolean).join("\n");
};
