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
  jsonb,
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
export const tipoEmpresaEnum = pgEnum("tipo_empresa", ["independente", "matriz", "filial", "grupo"]);

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
  grupoId: integer("grupoId"),    // ID do grupo empresarial (empresas do mesmo dono, CNPJs diferentes)
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

// ─── MÓDULO DE RECEPÇÃO ───────────────────────────────────────────────────────

export const statusRecebimentoEnum = pgEnum("status_recebimento", [
  "aguardando", "em_conferencia", "conferido", "divergencia", "recusado", "finalizado"
]);

export const tipoRecebimentoEnum = pgEnum("tipo_recebimento", [
  "nf_entrada", "devolucao", "transferencia", "bonificacao", "outro"
]);

export const recebimentos = pgTable("recebimentos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),

  // Identificação
  numero: varchar("numero", { length: 50 }).notNull(), // Número interno do recebimento
  tipo: tipoRecebimentoEnum("tipo").notNull().default("nf_entrada"),
  status: statusRecebimentoEnum("status").notNull().default("aguardando"),

  // Fornecedor / Origem
  fornecedorNome: varchar("fornecedorNome", { length: 255 }),
  fornecedorCnpj: varchar("fornecedorCnpj", { length: 18 }),
  origemCidade: varchar("origemCidade", { length: 100 }),
  origemEstado: varchar("origemEstado", { length: 2 }),

  // Nota Fiscal
  nfNumero: varchar("nfNumero", { length: 50 }),
  nfSerie: varchar("nfSerie", { length: 10 }),
  nfChave: varchar("nfChave", { length: 50 }),
  nfValorTotal: decimal("nfValorTotal", { precision: 12, scale: 2 }),
  nfDataEmissao: date("nfDataEmissao"),

  // Transporte
  transportadoraNome: varchar("transportadoraNome", { length: 255 }),
  veiculoPlaca: varchar("veiculoPlaca", { length: 10 }),
  motoristaId: integer("motoristaId"),

  // Doca / Armazém
  docaId: integer("docaId"),
  armazemId: integer("armazemId"),

  // Datas
  dataAgendamento: timestamp("dataAgendamento"),
  dataChegada: timestamp("dataChegada"),
  dataInicio: timestamp("dataInicio"),
  dataFim: timestamp("dataFim"),

  // Conferência
  conferenteId: integer("conferenteId"),
  observacoes: text("observacoes"),
  observacoesDivergencia: text("observacoesDivergencia"),

  // Totais conferidos
  totalItensEsperados: integer("totalItensEsperados").default(0),
  totalItensRecebidos: integer("totalItensRecebidos").default(0),
  totalItensComDivergencia: integer("totalItensComDivergencia").default(0),

  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Recebimento = typeof recebimentos.$inferSelect;
export type InsertRecebimento = typeof recebimentos.$inferInsert;

export const statusItemRecebimentoEnum = pgEnum("status_item_recebimento", [
  "pendente", "conferido", "divergencia_quantidade", "divergencia_qualidade", "recusado"
]);

export const itensRecebimento = pgTable("itens_recebimento", {
  id: serial("id").primaryKey(),
  recebimentoId: integer("recebimentoId").notNull(),
  empresaId: integer("empresaId").notNull(),

  // Produto
  codigoProduto: varchar("codigoProduto", { length: 100 }),
  descricaoProduto: varchar("descricaoProduto", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 20 }),
  ean: varchar("ean", { length: 20 }),

  // Quantidades
  quantidadeEsperada: decimal("quantidadeEsperada", { precision: 10, scale: 3 }).notNull(),
  quantidadeRecebida: decimal("quantidadeRecebida", { precision: 10, scale: 3 }),
  quantidadeDivergente: decimal("quantidadeDivergente", { precision: 10, scale: 3 }),

  // Valores
  valorUnitario: decimal("valorUnitario", { precision: 10, scale: 4 }),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 2 }),

  // Localização no armazém
  localizacao: varchar("localizacao", { length: 50 }), // ex: A-01-01

  status: statusItemRecebimentoEnum("status").notNull().default("pendente"),
  observacoes: text("observacoes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ItemRecebimento = typeof itensRecebimento.$inferSelect;

// ─── MÓDULO WMS (Warehouse Management System) ────────────────────────────────

export const tipoMovimentacaoEnum = pgEnum("tipo_movimentacao_estoque", [
  "entrada", "saida", "transferencia", "ajuste", "inventario", "devolucao"
]);

export const armazens = pgTable("armazens", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  descricao: text("descricao"),
  endereco: text("endereco"),
  capacidadeTotal: decimal("capacidadeTotal", { precision: 10, scale: 2 }),
  unidadeCapacidade: varchar("unidadeCapacidade", { length: 20 }).default("m²"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Armazem = typeof armazens.$inferSelect;

export const docas = pgTable("docas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  armazemId: integer("armazemId").notNull(),
  nome: varchar("nome", { length: 50 }).notNull(),
  codigo: varchar("codigo", { length: 20 }),
  tipo: varchar("tipo", { length: 20 }).default("recebimento"), // recebimento | expedicao | misto
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Doca = typeof docas.$inferSelect;

export const localizacoes = pgTable("localizacoes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  armazemId: integer("armazemId").notNull(),
  codigo: varchar("codigo", { length: 30 }).notNull(), // ex: A-01-01-01 (corredor-bloco-prateleira-posição)
  corredor: varchar("corredor", { length: 10 }),
  bloco: varchar("bloco", { length: 10 }),
  prateleira: varchar("prateleira", { length: 10 }),
  posicao: varchar("posicao", { length: 10 }),
  tipo: varchar("tipo", { length: 20 }).default("padrao"), // padrao | picking | bulk | refrigerado
  capacidade: decimal("capacidade", { precision: 8, scale: 2 }),
  ocupado: boolean("ocupado").default(false).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Localizacao = typeof localizacoes.$inferSelect;

export const produtos = pgTable("produtos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  codigo: varchar("codigo", { length: 100 }).notNull(),
  ean: varchar("ean", { length: 20 }),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  unidade: varchar("unidade", { length: 20 }).notNull().default("UN"),
  categoria: varchar("categoria", { length: 100 }),
  marca: varchar("marca", { length: 100 }),
  pesoUnitario: decimal("pesoUnitario", { precision: 8, scale: 3 }),
  volumeUnitario: decimal("volumeUnitario", { precision: 8, scale: 3 }),
  estoqueMinimo: decimal("estoqueMinimo", { precision: 10, scale: 3 }).default("0"),
  estoqueMaximo: decimal("estoqueMaximo", { precision: 10, scale: 3 }),
  localizacaoPadrao: varchar("localizacaoPadrao", { length: 30 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

export const estoque = pgTable("estoque", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  produtoId: integer("produtoId").notNull(),
  localizacaoId: integer("localizacaoId"),
  armazemId: integer("armazemId").notNull(),
  quantidade: decimal("quantidade", { precision: 12, scale: 3 }).notNull().default("0"),
  quantidadeReservada: decimal("quantidadeReservada", { precision: 12, scale: 3 }).default("0"),
  lote: varchar("lote", { length: 50 }),
  dataValidade: date("dataValidade"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Estoque = typeof estoque.$inferSelect;

export const movimentacoesEstoque = pgTable("movimentacoes_estoque", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  produtoId: integer("produtoId").notNull(),
  armazemId: integer("armazemId").notNull(),
  localizacaoOrigemId: integer("localizacaoOrigemId"),
  localizacaoDestinoId: integer("localizacaoDestinoId"),
  tipo: tipoMovimentacaoEnum("tipo").notNull(),
  quantidade: decimal("quantidade", { precision: 12, scale: 3 }).notNull(),
  saldoAnterior: decimal("saldoAnterior", { precision: 12, scale: 3 }),
  saldoAtual: decimal("saldoAtual", { precision: 12, scale: 3 }),
  lote: varchar("lote", { length: 50 }),
  documento: varchar("documento", { length: 100 }), // NF, pedido, etc.
  recebimentoId: integer("recebimentoId"),
  observacoes: text("observacoes"),
  operadorId: integer("operadorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MovimentacaoEstoque = typeof movimentacoesEstoque.$inferSelect;

// ─── SISTEMA DE IA MODULAR ────────────────────────────────────────────────────

export const iaAgenteSetorEnum = pgEnum("ia_agente_setor", [
  "master", "financeiro", "frota", "motorista", "manutencao",
  "juridico", "operacional", "rh", "recepcao", "wms", "custom"
]);

export const iaAgentes = pgTable("ia_agentes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  setor: iaAgenteSetorEnum("setor").notNull().default("custom"),
  descricao: text("descricao"),
  avatar: varchar("avatar", { length: 10 }).default("🤖"),
  systemPrompt: text("systemPrompt").notNull(),
  instrucoes: text("instrucoes"),
  contextoEmpresa: text("contextoEmpresa"),
  temperatura: varchar("temperatura", { length: 5 }).default("0.7"),
  modelo: varchar("modelo", { length: 50 }).default("gpt-4o-mini"),
  ativo: boolean("ativo").default(true).notNull(),
  isMaster: boolean("isMaster").default(false).notNull(),
  usarIaExterna: boolean("usarIaExterna").default(false).notNull(), // false = modo gratuito
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type IaAgente = typeof iaAgentes.$inferSelect;
export type InsertIaAgente = typeof iaAgentes.$inferInsert;

export const iaSessoes = pgTable("ia_sessoes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  usuarioId: integer("usuarioId").notNull(),
  agenteId: integer("agenteId").notNull(),
  titulo: varchar("titulo", { length: 200 }).default("Nova conversa"),
  resumo: text("resumo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type IaSessao = typeof iaSessoes.$inferSelect;

export const iaMensagens = pgTable("ia_mensagens", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessaoId").notNull(),
  empresaId: integer("empresaId").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  conteudo: text("conteudo").notNull(),
  tokens: integer("tokens"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IaMensagem = typeof iaMensagens.$inferSelect;

export const iaConhecimento = pgTable("ia_conhecimento", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  agenteId: integer("agenteId"),
  titulo: varchar("titulo", { length: 200 }).notNull(),
  conteudo: text("conteudo").notNull(),
  categoria: varchar("categoria", { length: 100 }),
  tags: text("tags"),
  ativo: boolean("ativo").default(true).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type IaConhecimento = typeof iaConhecimento.$inferSelect;
export type InsertIaConhecimento = typeof iaConhecimento.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: RECEPCIONISTA (Controle de Visitantes e Acesso)
// ═══════════════════════════════════════════════════════════════════════════════

export const statusVisitanteEnum = pgEnum("status_visitante", [
  "agendado", "aguardando", "em_atendimento", "finalizado", "cancelado"
]);

export const visitantes = pgTable("visitantes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  documento: varchar("documento", { length: 20 }),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  empresa: varchar("empresa", { length: 255 }),
  foto: text("foto"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Visitante = typeof visitantes.$inferSelect;

export const visitas = pgTable("visitas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  visitanteId: integer("visitanteId").notNull(),
  status: statusVisitanteEnum("status").default("agendado").notNull(),
  motivo: varchar("motivo", { length: 255 }).notNull(),
  setor: varchar("setor", { length: 100 }),
  pessoaContato: varchar("pessoaContato", { length: 255 }),
  cracha: varchar("cracha", { length: 50 }),
  dataAgendamento: timestamp("dataAgendamento"),
  dataEntrada: timestamp("dataEntrada"),
  dataSaida: timestamp("dataSaida"),
  observacoes: text("observacoes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Visita = typeof visitas.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: LOGÍSTICA (SAC, ANVISA/VISA, Compliance, Rastreamento)
// ═══════════════════════════════════════════════════════════════════════════════

export const statusSacEnum = pgEnum("status_sac", [
  "aberto", "em_andamento", "aguardando_cliente", "resolvido", "fechado"
]);

export const prioridadeSacEnum = pgEnum("prioridade_sac", [
  "baixa", "media", "alta", "urgente"
]);

export const chamadosSac = pgTable("chamados_sac", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull(),
  clienteNome: varchar("clienteNome", { length: 255 }).notNull(),
  clienteEmail: varchar("clienteEmail", { length: 320 }),
  clienteTelefone: varchar("clienteTelefone", { length: 20 }),
  assunto: varchar("assunto", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  categoria: varchar("categoria", { length: 100 }),
  status: statusSacEnum("status").default("aberto").notNull(),
  prioridade: prioridadeSacEnum("prioridade").default("media").notNull(),
  responsavelId: integer("responsavelId"),
  viagemId: integer("viagemId"),
  resolucao: text("resolucao"),
  resolvidoEm: timestamp("resolvidoEm"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type ChamadoSac = typeof chamadosSac.$inferSelect;

export const interacoesSac = pgTable("interacoes_sac", {
  id: serial("id").primaryKey(),
  chamadoId: integer("chamadoId").notNull(),
  userId: integer("userId"),
  tipo: varchar("tipo", { length: 50 }).default("mensagem").notNull(),
  conteudo: text("conteudo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const statusLicencaLogEnum = pgEnum("status_licenca_log", [
  "pendente", "em_analise", "aprovada", "vencida", "rejeitada"
]);

export const licencasRegulatorias = pgTable("licencas_regulatorias", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  tipo: varchar("tipo", { length: 100 }).notNull(), // ANVISA, VISA, IBAMA, etc.
  numero: varchar("numero", { length: 100 }),
  orgaoEmissor: varchar("orgaoEmissor", { length: 200 }),
  descricao: text("descricao"),
  status: statusLicencaLogEnum("status_licenca_log").default("pendente").notNull(),
  dataEmissao: timestamp("dataEmissao"),
  dataVencimento: timestamp("dataVencimento"),
  arquivo: text("arquivo"),
  responsavelId: integer("responsavelId"),
  observacoes: text("observacoes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type LicencaRegulatoria = typeof licencasRegulatorias.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: CRM (Gestão de Relacionamento com Clientes)
// ═══════════════════════════════════════════════════════════════════════════════

export const statusLeadEnum = pgEnum("status_lead", [
  "novo", "qualificado", "em_negociacao", "proposta_enviada", "ganho", "perdido"
]);

export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpjCpf: varchar("cnpjCpf", { length: 20 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  segmento: varchar("segmento", { length: 100 }),
  responsavelId: integer("responsavelId"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Cliente = typeof clientes.$inferSelect;

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  clienteId: integer("clienteId"),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  empresa: varchar("empresa", { length: 255 }),
  origem: varchar("origem", { length: 100 }),
  status: statusLeadEnum("status").default("novo").notNull(),
  valorEstimado: varchar("valorEstimado", { length: 20 }),
  responsavelId: integer("responsavelId"),
  proximoContato: timestamp("proximoContato"),
  observacoes: text("observacoes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Lead = typeof leads.$inferSelect;

export const contatosCrm = pgTable("contatos_crm", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  clienteId: integer("clienteId"),
  leadId: integer("leadId"),
  tipo: varchar("tipo", { length: 50 }).notNull(), // ligação, email, reunião, visita
  descricao: text("descricao").notNull(),
  resultado: text("resultado"),
  userId: integer("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContatoCrm = typeof contatosCrm.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: VENDAS (Pedidos, Propostas, Comissões)
// ═══════════════════════════════════════════════════════════════════════════════

export const statusPedidoEnum = pgEnum("status_pedido", [
  "rascunho", "enviado", "aprovado", "em_separacao", "expedido", "entregue", "cancelado"
]);

export const pedidos = pgTable("pedidos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  clienteId: integer("clienteId"),
  numero: varchar("numero", { length: 30 }).notNull(),
  status: statusPedidoEnum("status").default("rascunho").notNull(),
  clienteNome: varchar("clienteNome", { length: 255 }).notNull(),
  valorTotal: varchar("valorTotal", { length: 20 }).default("0"),
  desconto: varchar("desconto", { length: 20 }).default("0"),
  frete: varchar("frete", { length: 20 }).default("0"),
  formaPagamento: varchar("formaPagamento", { length: 100 }),
  condicaoPagamento: varchar("condicaoPagamento", { length: 100 }),
  previsaoEntrega: timestamp("previsaoEntrega"),
  observacoes: text("observacoes"),
  vendedorId: integer("vendedorId"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Pedido = typeof pedidos.$inferSelect;

export const itensPedido = pgTable("itens_pedido", {
  id: serial("id").primaryKey(),
  pedidoId: integer("pedidoId").notNull(),
  produtoId: integer("produtoId"),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  quantidade: varchar("quantidade", { length: 20 }).notNull(),
  valorUnitario: varchar("valorUnitario", { length: 20 }).notNull(),
  valorTotal: varchar("valorTotal", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ItemPedido = typeof itensPedido.$inferSelect;

export const statusPropostaEnum = pgEnum("status_proposta", [
  "rascunho", "enviada", "em_analise", "aprovada", "rejeitada", "expirada"
]);

export const propostas = pgTable("propostas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  clienteId: integer("clienteId"),
  leadId: integer("leadId"),
  numero: varchar("numero", { length: 30 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  status: statusPropostaEnum("status").default("rascunho").notNull(),
  valorTotal: varchar("valorTotal", { length: 20 }).default("0"),
  validade: timestamp("validade"),
  descricao: text("descricao"),
  condicoes: text("condicoes"),
  vendedorId: integer("vendedorId"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Proposta = typeof propostas.$inferSelect;

export const comissoes = pgTable("comissoes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  vendedorId: integer("vendedorId").notNull(),
  pedidoId: integer("pedidoId"),
  percentual: varchar("percentual", { length: 10 }).notNull(),
  valorBase: varchar("valorBase", { length: 20 }).notNull(),
  valorComissao: varchar("valorComissao", { length: 20 }).notNull(),
  pago: boolean("pago").default(false).notNull(),
  dataPagamento: timestamp("dataPagamento"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Comissao = typeof comissoes.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: PERMISSÕES POR MÓDULO (Controle de acesso granular)
// ═══════════════════════════════════════════════════════════════════════════════

export const moduloPermissoes = pgTable("modulo_permissoes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  role: userRoleEnum("role").notNull(),
  modulo: varchar("modulo", { length: 100 }).notNull(),
  podeVer: boolean("podeVer").default(false).notNull(),
  podeCriar: boolean("podeCriar").default(false).notNull(),
  podeEditar: boolean("podeEditar").default(false).notNull(),
  podeDeletar: boolean("podeDeletar").default(false).notNull(),
  podeExportar: boolean("podeExportar").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ModuloPermissao = typeof moduloPermissoes.$inferSelect;

// Permissões individuais por usuário (sobrescreve role)
export const userPermissoes = pgTable("user_permissoes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  empresaId: integer("empresaId").notNull(),
  modulo: varchar("modulo", { length: 100 }).notNull(),
  podeVer: boolean("podeVer").default(false).notNull(),
  podeCriar: boolean("podeCriar").default(false).notNull(),
  podeEditar: boolean("podeEditar").default(false).notNull(),
  podeDeletar: boolean("podeDeletar").default(false).notNull(),
  podeExportar: boolean("podeExportar").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type UserPermissao = typeof userPermissoes.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: AUDITORIA AVANÇADA (Trilha completa de ações)
// ═══════════════════════════════════════════════════════════════════════════════

export const tipoEventoAuditoriaEnum = pgEnum("tipo_evento_auditoria", [
  "login", "logout", "create", "update", "delete", "restore",
  "export", "import", "permission_change", "config_change",
  "access_denied", "password_change", "role_change"
]);

export const auditoriaDetalhada = pgTable("auditoria_detalhada", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  empresaId: integer("empresaId"),
  userId: integer("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  userRole: varchar("userRole", { length: 50 }),
  tipoEvento: tipoEventoAuditoriaEnum("tipoEvento").notNull(),
  modulo: varchar("modulo", { length: 100 }),
  tabela: varchar("tabela", { length: 100 }),
  registroId: integer("registroId"),
  descricao: text("descricao").notNull(),
  dadosAntes: text("dadosAntes"),
  dadosDepois: text("dadosDepois"),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  sessionId: varchar("sessionId", { length: 100 }),
  risco: varchar("risco", { length: 20 }).default("baixo"), // baixo, medio, alto, critico
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditoriaDetalhada = typeof auditoriaDetalhada.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: TI (Gestão de Infraestrutura e Suporte)
// ═══════════════════════════════════════════════════════════════════════════════

export const statusTicketTiEnum = pgEnum("status_ticket_ti", [
  "aberto", "em_andamento", "aguardando", "resolvido", "fechado"
]);

export const prioridadeTicketTiEnum = pgEnum("prioridade_ticket_ti", [
  "baixa", "media", "alta", "critica"
]);

export const categoriaTicketTiEnum = pgEnum("categoria_ticket_ti", [
  "hardware", "software", "rede", "acesso", "email", "impressora", "outro"
]);

export const ticketsTi = pgTable("tickets_ti", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  protocolo: varchar("protocolo", { length: 20 }).notNull(),
  solicitanteId: integer("solicitanteId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  categoria: categoriaTicketTiEnum("categoria").default("outro").notNull(),
  prioridade: prioridadeTicketTiEnum("prioridade_ticket_ti").default("media").notNull(),
  status: statusTicketTiEnum("status_ticket_ti").default("aberto").notNull(),
  responsavelId: integer("responsavelId"),
  resolucao: text("resolucao"),
  resolvidoEm: timestamp("resolvidoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type TicketTi = typeof ticketsTi.$inferSelect;

export const ativosTi = pgTable("ativos_ti", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  hostname: varchar("hostname", { length: 255 }).notNull(),
  ip: varchar("ip", { length: 45 }),
  so: varchar("so", { length: 100 }),
  mac: varchar("mac", { length: 100 }),
  anydeskId: varchar("anydeskId", { length: 50 }),
  token: varchar("token", { length: 255 }).unique(),
  setor: varchar("setor", { length: 100 }),
  status: varchar("status", { length: 50 }).default("ativo").notNull(),
  dataAquisicao: timestamp("dataAquisicao"),
  garantiaAte: timestamp("garantiaAte"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type AtivoTi = typeof ativosTi.$inferSelect;

export const certificadosTi = pgTable("certificados_ti", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  vencimento: timestamp("vencimento").notNull(),
  senha: text("senha"),
  observacoes: text("observacoes"),
  alertaEnviado: boolean("alertaEnviado").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type CertificadoTi = typeof certificadosTi.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: BI (Business Intelligence - Dashboards de Decisão)
// ═══════════════════════════════════════════════════════════════════════════════

export const biDashboards = pgTable("bi_dashboards", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 50 }).default("custom").notNull(), // financeiro, operacional, vendas, rh, custom
  config: text("config"), // JSON com configuração dos widgets
  publico: boolean("publico").default(false).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type BiDashboard = typeof biDashboards.$inferSelect;

export const biWidgets = pgTable("bi_widgets", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboardId").notNull(),
  empresaId: integer("empresaId").notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // kpi, grafico_linha, grafico_barra, grafico_pizza, tabela, mapa
  fonte: varchar("fonte", { length: 100 }).notNull(), // viagens, financeiro, frota, vendas, rh, etc.
  metrica: varchar("metrica", { length: 100 }).notNull(), // total, media, contagem, soma, etc.
  filtros: text("filtros"), // JSON com filtros
  posicao: integer("posicao").default(0),
  largura: integer("largura").default(6), // grid 12 colunas
  altura: integer("altura").default(4),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type BiWidget = typeof biWidgets.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: GRUPOS EMPRESARIAIS (Hierarquia Matriz/Filial)
// ═══════════════════════════════════════════════════════════════════════════════

export const gruposEmpresariais = pgTable("grupos_empresariais", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  descricao: text("descricao"),
  adminUserId: integer("adminUserId"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type GrupoEmpresarial = typeof gruposEmpresariais.$inferSelect;

export const grupoEmpresas = pgTable("grupo_empresas", {
  id: serial("id").primaryKey(),
  grupoId: integer("grupoId").notNull(),
  empresaId: integer("empresaId").notNull(),
  papel: varchar("papel", { length: 20 }).default("filial").notNull(), // matriz, filial
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GrupoEmpresa = typeof grupoEmpresas.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: SESSÕES DE SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════════

export const sessoes = pgTable("sessoes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  token: varchar("token", { length: 500 }).notNull(),
  ip: varchar("ip", { length: 45 }),
  userAgent: text("userAgent"),
  ativo: boolean("ativo").default(true).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
});
export type Sessao = typeof sessoes.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: PONTO ELETRÔNICO (Registro de Entrada/Saída, Banco de Horas)
// ═══════════════════════════════════════════════════════════════════════════════

export const tipoPontoEnum = pgEnum("tipo_ponto", ["entrada", "saida", "inicio_intervalo", "fim_intervalo"]);

export const registrosPonto = pgTable("registros_ponto", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  funcionarioId: integer("funcionarioId").notNull(),
  tipo: tipoPontoEnum("tipo_ponto").notNull(),
  dataHora: timestamp("dataHora").defaultNow().notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  ip: varchar("ip", { length: 45 }),
  foto: text("foto"),
  observacao: text("observacao"),
  ajustadoPor: integer("ajustadoPor"),
  motivoAjuste: text("motivoAjuste"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RegistroPonto = typeof registrosPonto.$inferSelect;

export const bancoHoras = pgTable("banco_horas", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  funcionarioId: integer("funcionarioId").notNull(),
  data: date("data").notNull(),
  horasTrabalhadas: varchar("horasTrabalhadas", { length: 10 }),
  horasExtras: varchar("horasExtras", { length: 10 }),
  horasDevidas: varchar("horasDevidas", { length: 10 }),
  saldo: varchar("saldo", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BancoHoras = typeof bancoHoras.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: FUNIL DE VENDAS (Kanban estilo Piperun/Pipedrive)
// ═══════════════════════════════════════════════════════════════════════════════

export const funis = pgTable("funis", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Funil = typeof funis.$inferSelect;

export const etapasFunil = pgTable("etapas_funil", {
  id: serial("id").primaryKey(),
  funilId: integer("funilId").notNull(),
  empresaId: integer("empresaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#3b82f6"),
  posicao: integer("posicao").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EtapaFunil = typeof etapasFunil.$inferSelect;

export const negociacoes = pgTable("negociacoes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  funilId: integer("funilId").notNull(),
  etapaId: integer("etapaId").notNull(),
  clienteId: integer("clienteId"),
  leadId: integer("leadId"),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  valor: varchar("valor", { length: 20 }).default("0"),
  responsavelId: integer("responsavelId"),
  probabilidade: integer("probabilidade").default(50),
  previsaoFechamento: timestamp("previsaoFechamento"),
  motivoPerda: text("motivoPerda"),
  ganho: boolean("ganho"),
  observacoes: text("observacoes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});
export type Negociacao = typeof negociacoes.$inferSelect;

export const atividadesFunil = pgTable("atividades_funil", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  negociacaoId: integer("negociacaoId").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // ligacao, email, reuniao, tarefa, nota
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  dataAgendada: timestamp("dataAgendada"),
  concluida: boolean("concluida").default(false).notNull(),
  userId: integer("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AtividadeFunil = typeof atividadesFunil.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: INTEGRAÇÕES (WhatsApp, Winthor, Webhooks)
// ═══════════════════════════════════════════════════════════════════════════════

export const statusIntegracaoEnum = pgEnum("status_integracao", ["ativa", "inativa", "erro", "configurando"]);

export const integracoes = pgTable("integracoes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // whatsapp, winthor, webhook, api_externa
  nome: varchar("nome", { length: 255 }).notNull(),
  status: statusIntegracaoEnum("status_integracao").default("configurando").notNull(),
  config: text("config"), // JSON criptografado com credenciais
  webhookUrl: text("webhookUrl"),
  webhookSecret: varchar("webhookSecret", { length: 255 }),
  ultimaSincronizacao: timestamp("ultimaSincronizacao"),
  erroUltimo: text("erroUltimo"),
  ativo: boolean("ativo").default(true).notNull(),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type Integracao = typeof integracoes.$inferSelect;

export const logIntegracoes = pgTable("log_integracoes", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
  integracaoId: integer("integracaoId").notNull(),
  empresaId: integer("empresaId").notNull(),
  direcao: varchar("direcao", { length: 10 }).notNull(), // entrada, saida
  endpoint: varchar("endpoint", { length: 500 }),
  payload: text("payload"),
  resposta: text("resposta"),
  statusCode: integer("statusCode"),
  sucesso: boolean("sucesso").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LogIntegracao = typeof logIntegracoes.$inferSelect;

// Configurações específicas do Winthor
export const winthorSync = pgTable("winthor_sync", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  integracaoId: integer("integracaoId").notNull(),
  tabelaOrigem: varchar("tabelaOrigem", { length: 100 }).notNull(), // PCPRODUT, PCFORNEC, PCNFSAID, etc.
  tabelaDestino: varchar("tabelaDestino", { length: 100 }).notNull(),
  ultimoId: integer("ultimoId").default(0),
  ultimaSincronizacao: timestamp("ultimaSincronizacao"),
  registrosSincronizados: integer("registrosSincronizados").default(0),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type WinthorSync = typeof winthorSync.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: CONFERÊNCIA DE VEÍCULO (Saída → Retorno → Conferência → Confirmação)
// ═══════════════════════════════════════════════════════════════════════════════

export const statusConferenciaEnum = pgEnum("status_conferencia", [
  "saida_registrada", "em_viagem", "retorno_registrado",
  "em_conferencia", "aguardando_motorista", "confirmado_motorista", "finalizado"
]);

export const conferenciaVeiculos = pgTable("conferencia_veiculos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  veiculoId: integer("veiculoId").notNull(),
  motoristaId: integer("motoristaId"),
  viagemId: integer("viagemId"),
  status: statusConferenciaEnum("status_conferencia").default("saida_registrada").notNull(),
  // Saída
  despachanteSaidaId: integer("despachanteSaidaId"),
  dataSaida: timestamp("dataSaida"),
  kmSaida: varchar("kmSaida", { length: 20 }),
  observacoesSaida: text("observacoesSaida"),
  // Retorno
  despachanteRetornoId: integer("despachanteRetornoId"),
  dataRetorno: timestamp("dataRetorno"),
  kmRetorno: varchar("kmRetorno", { length: 20 }),
  observacoesRetorno: text("observacoesRetorno"),
  // Conferência (feita pelo conferente/despachante)
  conferenteId: integer("conferenteId"),
  dataConferencia: timestamp("dataConferencia"),
  cargaOk: boolean("cargaOk"),
  cargaObservacoes: text("cargaObservacoes"),
  avariasEncontradas: boolean("avariasEncontradas").default(false),
  avariasDescricao: text("avariasDescricao"),
  batidasEncontradas: boolean("batidasEncontradas").default(false),
  batidasDescricao: text("batidasDescricao"),
  pneusOk: boolean("pneusOk"),
  pneusObservacoes: text("pneusObservacoes"),
  limpezaOk: boolean("limpezaOk"),
  documentosOk: boolean("documentosOk"),
  nivelCombustivel: varchar("nivelCombustivel", { length: 20 }),
  observacoesConferencia: text("observacoesConferencia"),
  // Confirmação do motorista
  motoristaConfirmou: boolean("motoristaConfirmou").default(false),
  motoristaConfirmouEm: timestamp("motoristaConfirmouEm"),
  motoristaContestacao: text("motoristaContestacao"),
  assinaturaMotorista: text("assinaturaMotorista"), // base64 da assinatura digital
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ConferenciaVeiculo = typeof conferenciaVeiculos.$inferSelect;

// Fotos da conferência (antes/depois, avarias, batidas)
export const fotosConferencia = pgTable("fotos_conferencia", {
  id: serial("id").primaryKey(),
  conferenciaId: integer("conferenciaId").notNull(),
  empresaId: integer("empresaId").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // saida_frente, saida_traseira, saida_lateral_esq, saida_lateral_dir, retorno_frente, retorno_traseira, avaria, batida, carga, pneu, outro
  descricao: varchar("descricao", { length: 255 }),
  url: text("url").notNull(),
  momento: varchar("momento", { length: 20 }).notNull(), // saida, retorno, conferencia
  uploadedBy: integer("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FotoConferencia = typeof fotosConferencia.$inferSelect;

// Itens de checklist da conferência
export const itensConferencia = pgTable("itens_conferencia", {
  id: serial("id").primaryKey(),
  conferenciaId: integer("conferenciaId").notNull(),
  item: varchar("item", { length: 255 }).notNull(),
  conforme: boolean("conforme"),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ItemConferencia = typeof itensConferencia.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: MONITORAMENTO DE AGENTES (PCs)
// ═══════════════════════════════════════════════════════════════════════════════

export const monitorAgentes = pgTable("monitor_agentes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  ativoId: integer("ativoId"),
  hostname: varchar("hostname", { length: 200 }).notNull(),
  ip: varchar("ip", { length: 50 }),
  mac: varchar("mac", { length: 50 }),
  so: varchar("so", { length: 100 }),
  versaoAgente: varchar("versaoAgente", { length: 20 }),
  token: varchar("token", { length: 100 }).notNull(),
  ultimoContato: timestamp("ultimoContato"),
  online: boolean("online").default(false).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  // Novos campos para monitoramento avançado
  os: varchar("os", { length: 256 }),
  osVersion: varchar("os_version", { length: 256 }),
  motherboard: varchar("motherboard", { length: 256 }),
  cpu: varchar("cpu", { length: 256 }),
  totalRam: bigint("total_ram", { mode: "number" }),
  anydeskId: varchar("anydeskId", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  macAddress: varchar("mac_address", { length: 50 }),
  status: varchar("status", { length: 20 }).default("offline"),
  pairingCode: varchar("pairingCode", { length: 20 }),
  fingerprint: varchar("fingerprint", { length: 200 }),
  ultimaVersao: varchar("ultimaVersao", { length: 20 }),
  setor: varchar("setor", { length: 100 }),
  userId: varchar("user_id"),
  departmentId: varchar("department_id"),
  deletedAt: timestamp("deletedAt"),
});

export type MonitorAgente = typeof monitorAgentes.$inferSelect;

export const monitorMetricas = pgTable("monitor_metricas", {
  id: serial("id").primaryKey(),
  agenteId: integer("agenteId").notNull(),
  empresaId: integer("empresaId").notNull(),
  coletadoEm: timestamp("coletadoEm").defaultNow().notNull(),
  cpuUso: decimal("cpuUso", { precision: 5, scale: 2 }),
  cpuTemp: decimal("cpuTemp", { precision: 5, scale: 1 }),
  cpuFreqMhz: integer("cpuFreqMhz"),
  ramTotalMb: integer("ramTotalMb"),
  ramUsadaMb: integer("ramUsadaMb"),
  ramUsoPct: decimal("ramUsoPct", { precision: 5, scale: 2 }),
  discoTotalGb: decimal("discoTotalGb", { precision: 8, scale: 2 }),
  discoUsadoGb: decimal("discoUsadoGb", { precision: 8, scale: 2 }),
  discoUsoPct: decimal("discoUsoPct", { precision: 5, scale: 2 }),
  redeEnviadoKb: decimal("redeEnviadoKb", { precision: 12, scale: 2 }),
  redeRecebidoKb: decimal("redeRecebidoKb", { precision: 12, scale: 2 }),
  latenciaMs: integer("latenciaMs"),
  processos: integer("processos"),
  usuarioLogado: varchar("usuarioLogado", { length: 100 }),
  uptime: integer("uptime"),
  anydeskId: varchar("anydeskId", { length: 50 }),
  topProcessos: jsonb("topProcessos"),
});

export type MonitorMetrica = typeof monitorMetricas.$inferSelect;

export const agentPairingCodes = pgTable("agent_pairing_codes", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresaId").notNull(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  descricao: varchar("descricao", { length: 255 }),
  ativoId: integer("ativoId"),
  usado: boolean("usado").default(false).notNull(),
  agenteId: integer("agenteId"),
  criadoPor: integer("criadoPor").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usadoEm: timestamp("usadoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  userId: varchar("user_id").notNull(),
  departmentId: varchar("department_id").notNull(),
  isUsed: boolean("is_used").default(false),
});

export type AgentPairingCode = typeof agentPairingCodes.$inferSelect;
