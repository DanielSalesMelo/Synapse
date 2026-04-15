import {
  bigint,
  boolean,
  date,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── ENUMS ────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "master_admin", "monitor", "dispatcher"]);
export const funcaoEnum = pgEnum("funcao", ["motorista", "ajudante", "despachante", "gerente", "admin", "outro"]);
export const tipoContratoEnum = pgEnum("tipo_contrato", ["clt", "freelancer", "terceirizado", "estagiario"]);
export const tipoCobrancaEnum = pgEnum("tipo_cobranca", ["diaria", "mensal", "por_viagem"]);
export const tipoContaEnum = pgEnum("tipo_conta", ["corrente", "poupanca", "pix"]);
export const tipoVeiculoEnum = pgEnum("tipo_veiculo", ["van", "toco", "truck", "cavalo", "carreta", "empilhadeira", "paletera", "outro"]);
export const tipoCombustivelEnum = pgEnum("tipo_combustivel", ["diesel", "arla", "gasolina", "etanol", "gas", "outro"]);
export const tipoAbastecimentoEnum = pgEnum("tipo_abastecimento", ["interno", "externo"]);
export const tipoManutencaoEnum = pgEnum("tipo_manutencao", ["preventiva", "corretiva", "revisao", "pneu", "eletrica", "funilaria", "outro"]);
export const tipoViagemEnum = pgEnum("tipo_viagem", ["entrega", "viagem"]);
export const statusViagemEnum = pgEnum("status_viagem", ["planejada", "em_andamento", "concluida", "cancelada"]);
export const tipoDespesaEnum = pgEnum("tipo_despesa", ["combustivel", "pedagio", "borracharia", "estacionamento", "oficina", "telefone", "descarga", "diaria", "alimentacao", "outro"]);
export const turnoEnum = pgEnum("turno", ["manha", "tarde", "noite"]);
export const tipoChecklistEnum = pgEnum("tipo_checklist", ["saida", "retorno"]);
export const itemChecklistEnum = pgEnum("item_checklist", ["conforme", "nao_conforme", "na"]);
export const categoriaContaPagarEnum = pgEnum("categoria_conta_pagar", ["combustivel", "manutencao", "salario", "freelancer", "pedagio", "seguro", "ipva", "licenciamento", "pneu", "outro"]);
export const statusContaPagarEnum = pgEnum("status_conta_pagar", ["pendente", "pago", "vencido", "cancelado"]);
export const categoriaContaReceberEnum = pgEnum("categoria_conta_receber", ["frete", "cte", "devolucao", "outro"]);
export const statusContaReceberEnum = pgEnum("status_conta_receber", ["pendente", "recebido", "vencido", "cancelado"]);
export const formaPagamentoEnum = pgEnum("forma_pagamento", ["dinheiro", "pix", "transferencia", "cartao"]);
export const statusAdiantamentoEnum = pgEnum("status_adiantamento", ["pendente", "acertado", "cancelado"]);
export const tipoTanqueEnum = pgEnum("tipo_tanque", ["diesel", "arla"]);
export const operacaoTanqueEnum = pgEnum("operacao_tanque", ["entrada", "saida"]);
export const statusAcidenteEnum = pgEnum("status_acidente", ["aberto", "em_reparo", "resolvido"]);
export const chatRoleEnum = pgEnum("chat_role", ["admin", "member"]);
export const chatMessageTypeEnum = pgEnum("chat_message_type", ["text", "image", "file"]);
export const tipoEmpresaEnum = pgEnum("tipo_empresa", ["independente", "matriz", "filial"]);

// ─── USERS (auth) ─────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  lastName: text("lastName"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  password: varchar("password", { length: 255 }), // Hash bcrypt
  role: userRoleEnum("role").default("user").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, rejected
  empresaId: integer("empresaId"), // null = master_admin sem empresa fixa
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdateFn(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── EMPRESAS (multi-tenant) ──────────────────────────────────────────────────
export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  codigoConvite: varchar("codigoConvite", { length: 50 }).unique(),
  // Hierarquia de grupo
  tipoEmpresa: tipoEmpresaEnum("tipoEmpresa").default("independente").notNull(),
  matrizId: integer("matrizId"),  // ID da empresa matriz (se for filial)
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── FUNCIONÁRIOS (RH) ────────────────────────────────────────────────────────
export const funcionarios = pgTable("funcionarios", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  rg: varchar("rg", { length: 20 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  funcao: funcaoEnum("funcao").notNull(),
  tipoContrato: tipoContratoEnum("tipoContrato").notNull(),
  // Dados CLT
  salario: decimal("salario", { precision: 10, scale: 2 }),
  dataAdmissao: date("dataAdmissao"),
  dataDemissao: date("dataDemissao"),
  // Dados Freelancer/Temporário
  valorDiaria: decimal("valorDiaria", { precision: 10, scale: 2 }),
  valorMensal: decimal("valorMensal", { precision: 10, scale: 2 }),
  tipoCobranca: tipoCobrancaEnum("tipoCobranca"),
  dataInicioContrato: date("dataInicioContrato"),
  dataFimContrato: date("dataFimContrato"),
  diaPagamento: integer("diaPagamento"), // dia do mes para pagar
  // Dados Motorista
  cnh: varchar("cnh", { length: 20 }),
  categoriaCnh: varchar("categoriaCnh", { length: 5 }),
  vencimentoCnh: date("vencimentoCnh"),
  mopp: boolean("mopp").default(false),
  vencimentoMopp: date("vencimentoMopp"),
  vencimentoAso: date("vencimentoAso"), // exame medico
  // Dados bancarios (freelancer)
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 10 }),
  conta: varchar("conta", { length: 20 }),
  tipoConta: tipoContaEnum("tipoConta"),
  chavePix: varchar("chavePix", { length: 255 }),
  // Observacoes
  observacoes: text("observacoes"),
  foto: text("foto"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── VEICULOS ─────────────────────────────────────────────────────────────────
export const veiculos = pgTable("veiculos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  placa: varchar("placa", { length: 10 }).notNull(),
  tipo: tipoVeiculoEnum("tipo").notNull(),
  // Cavalo/Carreta: relacionamento
  cavaloPrincipalId: integer("cavaloPrincipalId"), // para carreta: qual cavalo esta acoplado
  // Dados do veiculo
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  ano: integer("ano"),
  cor: varchar("cor", { length: 50 }),
  renavam: varchar("renavam", { length: 20 }),
  chassi: varchar("chassi", { length: 30 }),
  capacidadeCarga: decimal("capacidadeCarga", { precision: 8, scale: 2 }), // em toneladas
  // Motorista e ajudante padrao
  motoristaId: integer("motoristaId"),
  ajudanteId: integer("ajudanteId"),
  // KM e consumo
  kmAtual: integer("kmAtual"),
  mediaConsumo: decimal("mediaConsumo", { precision: 5, scale: 2 }), // km/l
  // Documentacao
  vencimentoCrlv: date("vencimentoCrlv"),
  vencimentoSeguro: date("vencimentoSeguro"),
  // Classificacao (estrelas do Excel)
  classificacao: integer("classificacao").default(0), // 0-5 estrelas
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── ABASTECIMENTOS ───────────────────────────────────────────────────────────
export const abastecimentos = pgTable("abastecimentos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  veiculoId: integer("veiculoId").notNull(),
  motoristaId: integer("motoristaId"),
  data: date("data").notNull(),
  tipoCombustivel: tipoCombustivelEnum("tipoCombustivel").notNull(),
  quantidade: decimal("quantidade", { precision: 8, scale: 3 }).notNull(),
  valorUnitario: decimal("valorUnitario", { precision: 8, scale: 3 }),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }),
  kmAtual: integer("kmAtual"),
  kmRodado: integer("kmRodado"),
  mediaConsumo: decimal("mediaConsumo", { precision: 5, scale: 2 }),
  local: varchar("local", { length: 255 }), // posto/cidade
  tipoAbastecimento: tipoAbastecimentoEnum("tipoAbastecimento").default("interno"),
  notaFiscal: varchar("notaFiscal", { length: 50 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── MANUTENCOES ──────────────────────────────────────────────────────────────
export const manutencoes = pgTable("manutencoes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  veiculoId: integer("veiculoId").notNull(),
  data: date("data").notNull(),
  tipo: tipoManutencaoEnum("tipo").notNull(),
  descricao: text("descricao").notNull(),
  empresa: varchar("empresa", { length: 255 }), // oficina/empresa
  valor: decimal("valor", { precision: 10, scale: 2 }),
  kmAtual: integer("kmAtual"),
  proximaManutencaoKm: integer("proximaManutencaoKm"),
  proximaManutencaoData: date("proximaManutencaoData"),
  notaFiscal: varchar("notaFiscal", { length: 50 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── VIAGENS ──────────────────────────────────────────────────────────────────
export const viagens = pgTable("viagens", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  tipo: tipoViagemEnum("tipo").default("viagem").notNull(),
  veiculoId: integer("veiculoId").notNull(),
  cavaloPrincipalId: integer("cavaloPrincipalId"), // se for carreta, o cavalo que puxou
  motoristaId: integer("motoristaId"),
  ajudante1Id: integer("ajudante1Id"),
  ajudante2Id: integer("ajudante2Id"),
  ajudante3Id: integer("ajudante3Id"),
  // Rota
  origem: varchar("origem", { length: 255 }),
  destino: varchar("destino", { length: 255 }),
  // Datas e KM
  dataSaida: timestamp("dataSaida"),
  dataChegada: timestamp("dataChegada"),
  kmSaida: integer("kmSaida"),
  kmChegada: integer("kmChegada"),
  kmRodado: integer("kmRodado"),
  // Carga
  descricaoCarga: text("descricaoCarga"),
  tipoCarga: text("tipoCarga"),
  pesoCarga: decimal("pesoCarga", { precision: 8, scale: 2 }),
  // Financeiro da viagem
  freteTotalIda: decimal("freteTotalIda", { precision: 10, scale: 2 }),
  freteTotalVolta: decimal("freteTotalVolta", { precision: 10, scale: 2 }),
  freteTotal: decimal("freteTotal", { precision: 10, scale: 2 }),
  adiantamento: decimal("adiantamento", { precision: 10, scale: 2 }),
  saldoViagem: decimal("saldoViagem", { precision: 10, scale: 2 }),
  // Despesas da viagem
  totalDespesas: decimal("totalDespesas", { precision: 10, scale: 2 }),
  mediaConsumo: decimal("mediaConsumo", { precision: 5, scale: 2 }),
  // Documentacao
  notaFiscal: varchar("notaFiscal", { length: 50 }),
  // Status
  status: statusViagemEnum("status").default("planejada").notNull(),
  observacoes: text("observacoes"),
  teveProblema: boolean("teveProblema").default(false),
  voltouComCarga: boolean("voltouComCarga").default(false),
  observacoesChegada: text("observacoesChegada"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── DESPESAS DE VIAGEM ───────────────────────────────────────────────────────
export const despesasViagem = pgTable("despesas_viagem", {
  id: serial("id").primaryKey(),
  viagemId: integer("viagemId").notNull(),
  empresaId: integer("empresaId").notNull(),
  tipo: tipoDespesaEnum("tipo").notNull(),
  descricao: text("descricao"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  data: date("data"),
  comprovante: text("comprovante"), // URL da foto
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── CHECKLIST ────────────────────────────────────────────────────────────────
export const checklists = pgTable("checklists", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  veiculoId: integer("veiculoId").notNull(),
  cavaloPrincipalId: integer("cavaloPrincipalId"), // checklist independente para carreta
  motoristaId: integer("motoristaId"),
  turno: turnoEnum("turno"),
  tipo: tipoChecklistEnum("tipo").default("retorno").notNull(),
  // Itens internos
  cracha: itemChecklistEnum("cracha"),
  cnh: itemChecklistEnum("cnh"),
  documentosVeiculo: itemChecklistEnum("documentosVeiculo"),
  epi: itemChecklistEnum("epi"),
  computadorBordo: itemChecklistEnum("computadorBordo"),
  cinto: itemChecklistEnum("cinto"),
  banco: itemChecklistEnum("banco"),
  direcao: itemChecklistEnum("direcao"),
  luzesPainel: itemChecklistEnum("luzesPainel"),
  tacografo: itemChecklistEnum("tacografo"),
  extintor: itemChecklistEnum("extintor"),
  portas: itemChecklistEnum("portas"),
  limpador: itemChecklistEnum("limpador"),
  buzina: itemChecklistEnum("buzina"),
  freioDeMao: itemChecklistEnum("freioDeMao"),
  alarmeCacamba: itemChecklistEnum("alarmeCacamba"),
  cabineLimpa: itemChecklistEnum("cabineLimpa"),
  objetosSoltos: itemChecklistEnum("objetosSoltos"),
  // Itens externos
  pneus: itemChecklistEnum("pneus"),
  vazamentos: itemChecklistEnum("vazamentos"),
  trianguloCones: itemChecklistEnum("trianguloCones"),
  espelhos: itemChecklistEnum("espelhos"),
  lonaCarga: itemChecklistEnum("lonaCarga"),
  faixasRefletivas: itemChecklistEnum("faixasRefletivas"),
  luzesLaterais: itemChecklistEnum("luzesLaterais"),
  luzesFreio: itemChecklistEnum("luzesFreio"),
  farol: itemChecklistEnum("farol"),
  piscaAlerta: itemChecklistEnum("piscaAlerta"),
  re: itemChecklistEnum("re"),
  setas: itemChecklistEnum("setas"),
  macacoEstepe: itemChecklistEnum("macacoEstepe"),
  lanternas: itemChecklistEnum("lanternas"),
  // Resumo
  itensNaoConformes: integer("itensNaoConformes").default(0),
  observacoes: text("observacoes"),
  assinaturaMotorista: text("assinaturaMotorista"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── FINANCEIRO: CONTAS A PAGAR ───────────────────────────────────────────────
export const contasPagar = pgTable("contas_pagar", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  descricao: text("descricao").notNull(),
  categoria: categoriaContaPagarEnum("categoria").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: date("dataVencimento").notNull(),
  dataPagamento: date("dataPagamento"),
  status: statusContaPagarEnum("status").default("pendente").notNull(),
  fornecedor: varchar("fornecedor", { length: 255 }),
  notaFiscal: varchar("notaFiscal", { length: 50 }),
  veiculoId: integer("veiculoId"),
  funcionarioId: integer("funcionarioId"),
  viagemId: integer("viagemId"),
  comprovante: text("comprovante"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── FINANCEIRO: CONTAS A RECEBER ─────────────────────────────────────────────
export const contasReceber = pgTable("contas_receber", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  descricao: text("descricao").notNull(),
  categoria: categoriaContaReceberEnum("categoria").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  dataVencimento: date("dataVencimento").notNull(),
  dataRecebimento: date("dataRecebimento"),
  status: statusContaReceberEnum("status").default("pendente").notNull(),
  cliente: varchar("cliente", { length: 255 }),
  notaFiscal: varchar("notaFiscal", { length: 50 }),
  cteNumero: varchar("cteNumero", { length: 50 }),
  viagemId: integer("viagemId"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
  ativo: boolean("ativo").default(true),
  // Novos campos de RH
  dataNascimento: date("dataNascimento"),
  estadoCivil: varchar("estadoCivil", { length: 20 }),
  escolaridade: varchar("escolaridade", { length: 50 }),
  tituloEleitor: varchar("tituloEleitor", { length: 20 }),
  pis: varchar("pis", { length: 20 }),
  ctps: varchar("ctps", { length: 20 }),
  serieCtps: varchar("serieCtps", { length: 10 }),
  ufCtps: varchar("ufCtps", { length: 2 }),
  dataExpedicaoRg: date("dataExpedicaoRg"),
  orgaoEmissorRg: varchar("orgaoEmissorRg", { length: 20 }),
  // Benefícios
  temPlanoSaude: boolean("temPlanoSaude").default(false),
  temValeRefeicao: boolean("temValeRefeicao").default(false),
  temValeTransporte: boolean("temValeTransporte").default(false),
  valorValeRefeicao: decimal("valorValeRefeicao", { precision: 10, scale: 2 }),
});

// ─── ADIANTAMENTOS (para o motorista viajar) ───────────────────────────
export const adiantamentos = pgTable("adiantamentos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  funcionarioId: integer("funcionarioId").notNull(),
  viagemId: integer("viagemId"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  formaPagamento: formaPagamentoEnum("formaPagamento").notNull(),
  data: date("data").notNull(),
  status: statusAdiantamentoEnum("status").default("pendente").notNull(),
  valorAcertado: decimal("valorAcertado", { precision: 10, scale: 2 }),
  dataAcerto: date("dataAcerto"),
  saldo: decimal("saldo", { precision: 10, scale: 2 }), // positivo = devolveu, negativo = empresa deve
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── CONTROLE DE TANQUE ───────────────────────────────────────────────────────
export const controleTanque = pgTable("controle_tanque", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  tipo: tipoTanqueEnum("tipo").notNull(),
  data: date("data").notNull(),
  operacao: operacaoTanqueEnum("operacao").notNull(),
  quantidade: decimal("quantidade", { precision: 8, scale: 3 }).notNull(),
  valorUnitario: decimal("valorUnitario", { precision: 8, scale: 3 }),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }),
  fornecedor: varchar("fornecedor", { length: 255 }),
  notaFiscal: varchar("notaFiscal", { length: 50 }),
  veiculoId: integer("veiculoId"), // para saidas: qual veiculo abasteceu
  motoristaId: integer("motoristaId"),
  saldoAnterior: decimal("saldoAnterior", { precision: 8, scale: 3 }),
  saldoAtual: decimal("saldoAtual", { precision: 8, scale: 3 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── LOG DE AUDITORIA ─────────────────────────────────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  empresaId: integer("empresaId"),
  userId: integer("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  acao: varchar("acao", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, RESTORE
  tabela: varchar("tabela", { length: 100 }).notNull(),
  registroId: integer("registroId").notNull(),
  dadosAntes: text("dadosAntes"), // JSON
  dadosDepois: text("dadosDepois"), // JSON
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── ACIDENTES ────────────────────────────────────────────────────────────────
export const acidentes = pgTable("acidentes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  veiculoId: integer("veiculoId").notNull(),
  motoristaId: integer("motoristaId"),
  data: date("data").notNull(),
  local: varchar("local", { length: 255 }),
  descricao: text("descricao").notNull(),
  boletimOcorrencia: varchar("boletimOcorrencia", { length: 50 }),
  valorDano: decimal("valorDano", { precision: 10, scale: 2 }),
  status: statusAcidenteEnum("status").default("aberto").notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type Empresa = typeof empresas.$inferSelect;
export type Funcionario = typeof funcionarios.$inferSelect;
export type Veiculo = typeof veiculos.$inferSelect;
export type Abastecimento = typeof abastecimentos.$inferSelect;
export type Manutencao = typeof manutencoes.$inferSelect;
export type Viagem = typeof viagens.$inferSelect;
export type DespesaViagem = typeof despesasViagem.$inferSelect;
export type Checklist = typeof checklists.$inferSelect;
export type ContaPagar = typeof contasPagar.$inferSelect;
export type ContaReceber = typeof contasReceber.$inferSelect;
export type Adiantamento = typeof adiantamentos.$inferSelect;
export type ControleTanque = typeof controleTanque.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type Acidente = typeof acidentes.$inferSelect;

// ─── CHAT INTERNO ────────────────────────────────────────────────────────────
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  name: varchar("name", { length: 255 }), // opcional para grupos
  isGroup: boolean("isGroup").default(false).notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export const chatMembers = pgTable("chat_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  userId: integer("userId").notNull(),
  role: chatRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversationId").notNull(),
  senderId: integer("senderId").notNull(),
  content: text("content").notNull(),
  type: chatMessageTypeEnum("type").default("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMember = typeof chatMembers.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ─── NOTAS FISCAIS POR VIAGEM ─────────────────────────────────────────────────
export const statusNfEnum = pgEnum("status_nf", [
  "pendente",
  "entregue",
  "devolvida",
  "parcial",
  "extraviada",
]);

export const notasFiscaisViagem = pgTable("notas_fiscais_viagem", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  viagemId: integer("viagemId").notNull(),
  numeroNf: varchar("numeroNf", { length: 20 }).notNull(),
  serie: varchar("serie", { length: 5 }),
  chaveAcesso: varchar("chaveAcesso", { length: 44 }),
  destinatario: varchar("destinatario", { length: 255 }),
  cnpjDestinatario: varchar("cnpjDestinatario", { length: 18 }),
  enderecoEntrega: varchar("enderecoEntrega", { length: 500 }),
  cidade: varchar("cidade", { length: 100 }),
  uf: varchar("uf", { length: 2 }),
  valorNf: decimal("valorNf", { precision: 12, scale: 2 }),
  pesoKg: decimal("pesoKg", { precision: 8, scale: 2 }),
  volumes: integer("volumes"),
  status: statusNfEnum("status").default("pendente").notNull(),
  dataCanhoto: timestamp("dataCanhoto"),
  dataEntrega: timestamp("dataEntrega"),
  recebidoPor: varchar("recebidoPor", { length: 255 }),
  motivoDevolucao: text("motivoDevolucao"),
  observacoes: text("observacoes"),
  ordemEntrega: integer("ordemEntrega"),
  fotoCanhoto: varchar("fotoCanhoto", { length: 500 }), // URL da foto do canhoto assinado
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type NotaFiscalViagem = typeof notasFiscaisViagem.$inferSelect;

// ─── ACERTO DE CARGA DO MOTORISTA ─────────────────────────────────────────────
export const statusAcertoCargaEnum = pgEnum("status_acerto_carga", [
  "aberto",      // viagem concluída mas acerto ainda não feito
  "em_analise",  // conferindo valores
  "fechado",     // acerto finalizado e aprovado
  "pago",        // motorista recebeu o saldo
]);

export const acertosCarga = pgTable("acertos_carga", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  viagemId: integer("viagemId").notNull(),
  motoristaId: integer("motoristaId"),
  // Identificação
  dataAcerto: date("dataAcerto"),
  status: statusAcertoCargaEnum("status").default("aberto").notNull(),
  // ─── O que o motorista levou ───────────────────────────────────────────────
  adiantamentoConcedido: decimal("adiantamentoConcedido", { precision: 10, scale: 2 }).default("0"),
  // ─── O que o motorista recebeu em campo ───────────────────────────────────
  freteRecebido: decimal("freteRecebido", { precision: 10, scale: 2 }).default("0"),       // dinheiro recebido de clientes
  // ─── Despesas do motorista em campo ───────────────────────────────────────
  despesasPedagio: decimal("despesasPedagio", { precision: 10, scale: 2 }).default("0"),
  despesasCombustivel: decimal("despesasCombustivel", { precision: 10, scale: 2 }).default("0"),
  despesasAlimentacao: decimal("despesasAlimentacao", { precision: 10, scale: 2 }).default("0"),
  despesasEstacionamento: decimal("despesasEstacionamento", { precision: 10, scale: 2 }).default("0"),
  despesasOutras: decimal("despesasOutras", { precision: 10, scale: 2 }).default("0"),
  descricaoOutras: text("descricaoOutras"),
  // ─── Devoluções ───────────────────────────────────────────────────────────
  valorDevolvido: decimal("valorDevolvido", { precision: 10, scale: 2 }).default("0"),     // dinheiro devolvido pelo motorista
  // ─── Comissão ─────────────────────────────────────────────────────────────
  percentualComissao: decimal("percentualComissao", { precision: 5, scale: 2 }).default("0"),
  valorComissao: decimal("valorComissao", { precision: 10, scale: 2 }).default("0"),
  // ─── Saldo calculado ──────────────────────────────────────────────────────
  // saldo = freteRecebido - adiantamentoConcedido - totalDespesas - valorDevolvido + valorComissao
  saldoFinal: decimal("saldoFinal", { precision: 10, scale: 2 }).default("0"),
  // ─── Observações e aprovação ──────────────────────────────────────────────
  observacoes: text("observacoes"),
  aprovadoPor: varchar("aprovadoPor", { length: 255 }),
  dataAprovacao: timestamp("dataAprovacao"),
  // ─── Auditoria ────────────────────────────────────────────────────────────
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type AcertoCarga = typeof acertosCarga.$inferSelect;

// ─── CARREGAMENTO / ROMANEIO ──────────────────────────────────────────────────
export const statusCarregamentoEnum = pgEnum("status_carregamento", [
  "montando",    // carga sendo montada
  "pronto",      // carga montada, aguardando saída
  "em_rota",     // veículo saiu com a carga
  "retornado",   // veículo retornou
  "encerrado",   // carregamento finalizado e conferido
]);

export const carregamentos = pgTable("carregamentos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  // Identificação
  numero: varchar("numero", { length: 20 }),          // número do carregamento (ex: CARG-001)
  data: date("data").notNull(),
  // Veículo e motorista
  veiculoId: integer("veiculoId"),
  veiculoPlaca: varchar("veiculoPlaca", { length: 10 }),
  motoristaId: integer("motoristaId"),
  motoristaNome: varchar("motoristaNome", { length: 255 }),
  ajudanteId: integer("ajudanteId"),
  ajudanteNome: varchar("ajudanteNome", { length: 255 }),
  // Rota
  rotaDescricao: varchar("rotaDescricao", { length: 255 }),
  cidadesRota: text("cidadesRota"),                    // JSON array de cidades
  // Status e datas
  status: statusCarregamentoEnum("status").default("montando").notNull(),
  dataSaida: timestamp("dataSaida"),
  dataRetorno: timestamp("dataRetorno"),
  kmSaida: integer("kmSaida"),
  kmRetorno: integer("kmRetorno"),
  // Totais (calculados)
  totalNfs: integer("totalNfs").default(0),
  totalVolumes: integer("totalVolumes").default(0),
  totalPesoKg: decimal("totalPesoKg", { precision: 10, scale: 2 }).default("0"),
  totalValorNfs: decimal("totalValorNfs", { precision: 12, scale: 2 }).default("0"),
  // Observações
  observacoes: text("observacoes"),
  // Auditoria
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export const itensCarregamento = pgTable("itens_carregamento", {
  id: serial("id").primaryKey(),
  carregamentoId: integer("carregamentoId").notNull(),
  empresaId: integer("empresaId").notNull(),
  // Dados da NF
  numeroNf: varchar("numeroNf", { length: 20 }).notNull(),
  serie: varchar("serie", { length: 5 }),
  chaveAcesso: varchar("chaveAcesso", { length: 44 }),
  // Destinatário
  destinatario: varchar("destinatario", { length: 255 }),
  cnpjDestinatario: varchar("cnpjDestinatario", { length: 18 }),
  enderecoEntrega: varchar("enderecoEntrega", { length: 500 }),
  cidade: varchar("cidade", { length: 100 }),
  uf: varchar("uf", { length: 2 }),
  // Carga
  valorNf: decimal("valorNf", { precision: 12, scale: 2 }),
  pesoKg: decimal("pesoKg", { precision: 8, scale: 2 }),
  volumes: integer("volumes"),
  descricaoCarga: varchar("descricaoCarga", { length: 255 }),
  // Ordem e status de entrega
  ordemEntrega: integer("ordemEntrega"),
  status: statusNfEnum("status").default("pendente").notNull(),
  dataCanhoto: timestamp("dataCanhoto"),
  recebidoPor: varchar("recebidoPor", { length: 255 }),
  motivoDevolucao: text("motivoDevolucao"),
  observacoes: text("observacoes"),
  // Auditoria
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type Carregamento = typeof carregamentos.$inferSelect;
export type ItemCarregamento = typeof itensCarregamento.$inferSelect;

// ─── LICENCIAMENTO SaaS ───────────────────────────────────────────────────────
export const planoCodEnum = pgEnum("plano_cod", ["trial", "basico", "pro", "enterprise"]);
export const statusLicencaEnum = pgEnum("status_licenca", ["trial", "ativa", "suspensa", "vencida", "cancelada"]);
export const cicloCobrancaEnum = pgEnum("ciclo_cobranca", ["mensal", "trimestral", "semestral", "anual"]);
export const statusCobrancaEnum = pgEnum("status_cobranca", ["pendente", "pago", "vencido", "cancelado", "estornado"]);
export const formaPagamentoSaasEnum = pgEnum("forma_pagamento_saas", ["pix", "boleto", "cartao_credito", "transferencia", "cortesia"]);

// Tabela de planos (configurável pelo master)
export const planos = pgTable("planos", {
  id: serial("id").primaryKey(),
  codigo: planoCodEnum("codigo").notNull().unique(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  // Preços
  precoMensal: decimal("precoMensal", { precision: 10, scale: 2 }).notNull().default("0"),
  precoTrimestral: decimal("precoTrimestral", { precision: 10, scale: 2 }),
  precoSemestral: decimal("precoSemestral", { precision: 10, scale: 2 }),
  precoAnual: decimal("precoAnual", { precision: 10, scale: 2 }),
  // Limites
  limiteUsuarios: integer("limiteUsuarios").default(5),
  limiteVeiculos: integer("limiteVeiculos").default(10),
  limiteMotoristas: integer("limiteMotoristas").default(10),
  // Funcionalidades
  modulosAtivos: text("modulosAtivos").default("basico"), // JSON array de módulos
  temIntegracaoWinthor: boolean("temIntegracaoWinthor").default(false),
  temIntegracaoArquivei: boolean("temIntegracaoArquivei").default(false),
  temRelatoriosAvancados: boolean("temRelatoriosAvancados").default(false),
  temMultiEmpresa: boolean("temMultiEmpresa").default(false),
  temSuportePrioritario: boolean("temSuportePrioritario").default(false),
  // Trial
  diasTrial: integer("diasTrial").default(14),
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Plano = typeof planos.$inferSelect;

// Tabela de licenças (uma por empresa)
export const licencas = pgTable("licencas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull().unique(), // 1 licença por empresa
  planoCod: planoCodEnum("planoCod").notNull().default("trial"),
  status: statusLicencaEnum("status").notNull().default("trial"),
  ciclo: cicloCobrancaEnum("ciclo").default("mensal"),
  // Datas
  dataInicio: timestamp("dataInicio").defaultNow().notNull(),
  dataFim: timestamp("dataFim"),                         // null = sem vencimento (enterprise)
  dataTrialFim: timestamp("dataTrialFim"),               // fim do período de teste
  dataUltimoPagamento: timestamp("dataUltimoPagamento"),
  dataProximoVencimento: timestamp("dataProximoVencimento"),
  // Valores
  valorContratado: decimal("valorContratado", { precision: 10, scale: 2 }),
  descontoPercent: decimal("descontoPercent", { precision: 5, scale: 2 }).default("0"),
  // Controle
  observacoes: text("observacoes"),
  motivoSuspensao: text("motivoSuspensao"),
  criadoPor: integer("criadoPor"),
  updatedBy: integer("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Licenca = typeof licencas.$inferSelect;

// Tabela de cobranças (histórico financeiro por empresa)
export const cobrancas = pgTable("cobrancas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  licencaId: integer("licencaId").notNull(),
  planoCod: planoCodEnum("planoCod").notNull(),
  ciclo: cicloCobrancaEnum("ciclo").notNull().default("mensal"),
  // Período de referência
  periodoInicio: timestamp("periodoInicio").notNull(),
  periodoFim: timestamp("periodoFim").notNull(),
  // Valores
  valorBruto: decimal("valorBruto", { precision: 10, scale: 2 }).notNull(),
  desconto: decimal("desconto", { precision: 10, scale: 2 }).default("0"),
  valorLiquido: decimal("valorLiquido", { precision: 10, scale: 2 }).notNull(),
  // Pagamento
  status: statusCobrancaEnum("status").notNull().default("pendente"),
  formaPagamento: formaPagamentoSaasEnum("formaPagamento"),
  dataPagamento: timestamp("dataPagamento"),
  dataVencimento: timestamp("dataVencimento").notNull(),
  comprovante: varchar("comprovante", { length: 500 }),
  observacoes: text("observacoes"),
  // Controle
  criadoPor: integer("criadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Cobranca = typeof cobrancas.$inferSelect;

// ─── PNEUS (Inteligência de Pneus) ───────────────────────────────────────────
export const statusPneuEnum = pgEnum("status_pneu", ["novo", "em_uso", "recapado", "sucata", "estoque"]);

export const pneus = pgTable("pneus", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  numeroSerie: varchar("numeroSerie", { length: 50 }).notNull(),
  marca: varchar("marca", { length: 100 }),
  modelo: varchar("modelo", { length: 100 }),
  medida: varchar("medida", { length: 50 }),
  kmInicial: integer("kmInicial").default(0),
  kmAtual: integer("kmAtual").default(0),
  status: statusPneuEnum("status").default("novo").notNull(),
  veiculoId: integer("veiculoId"), // null se estiver em estoque
  posicao: varchar("posicao", { length: 50 }), // Ex: "Eixo 1 - Lado Esquerdo"
  dataAquisicao: date("dataAquisicao"),
  valorAquisicao: decimal("valorAquisicao", { precision: 10, scale: 2 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
  deleteReason: text("deleteReason"),
});

export const historicoPneus = pgTable("historico_pneus", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  pneuId: integer("pneuId").notNull(),
  data: timestamp("data").defaultNow().notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // "TROCA", "RECAPAGEM", "MANUTENCAO", "INVENTARIO"
  veiculoId: integer("veiculoId"),
  posicao: varchar("posicao", { length: 50 }),
  kmVeiculo: integer("kmVeiculo"),
  kmPneu: integer("kmPneu"),
  custo: decimal("custo", { precision: 10, scale: 2 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Pneu = typeof pneus.$inferSelect;
export type HistoricoPneu = typeof historicoPneus.$inferSelect;

// ─── GESTÃO DE DOCUMENTOS (GED) ──────────────────────────────────────────────
export const tipoDocumentoEnum = pgEnum("tipo_documento", ["cnh", "crlv", "aso", "mopp", "nota_fiscais", "seguro", "licenciamento", "contrato", "outro"]);

export const documentos = pgTable("documentos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  tipo: tipoDocumentoEnum("tipo").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  url: text("url").notNull(), // URL do S3 ou local
  extensao: varchar("extensao", { length: 10 }),
  tamanho: integer("tamanho"), // em bytes
  
  // Relacionamentos (opcionais)
  veiculoId: integer("veiculoId"),
  funcionarioId: integer("funcionarioId"),
  viagemId: integer("viagemId"),
  manutencaoId: integer("manutencaoId"),
  
  // Metadados
  dataVencimento: date("dataVencimento"),
  observacoes: text("observacoes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedBy: integer("deletedBy"),
});

export type Documento = typeof documentos.$inferSelect;
export type InsertDocumento = typeof documentos.$inferInsert;
