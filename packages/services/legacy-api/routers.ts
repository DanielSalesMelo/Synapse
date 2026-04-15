import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { veiculosRouter } from "./routers/veiculos";
import { checklistsRouter } from "./routers/checklists";
import { funcionariosRouter } from "./routers/funcionarios";
import { frotaRouter } from "./routers/frota";
import { financeiroRouter } from "./routers/financeiro";
import { dashboardRouter } from "./routers/dashboard";
import { viagensRouter } from "./routers/viagens";
import { custosRouter } from "./routers/custos";
import { multasRouter } from "./routers/multas";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { chatRouter } from "./routers/chat";
import { notasFiscaisRouter } from "./routers/notasFiscais";
import { acertosCargaRouter } from "./routers/acertosCarga";
import { carregamentosRouter } from "./routers/carregamentos";
import { gruposRouter } from "./routers/grupos";
import { empresasRouter } from "./routers/empresas";
import { licenciamentoRouter } from "./routers/licenciamento";
import { documentosRouter } from "./routers/documentos";
import { iaRouter } from "./routers/ia";
import { recepcaoRouter } from "./routers/recepcao";
import { wmsRouter } from "./routers/wms";
// ─── NOVOS MÓDULOS ───────────────────────────────────────────────────────────
import { crmRouter } from "./routers/crm";
import { vendasRouter } from "./routers/vendas";
import { auditoriaRouter } from "./routers/auditoria";
import { tiRouter } from "./routers/ti";
import { biRouter } from "./routers/bi";
import { pontoRouter } from "./routers/ponto";
import { conferenciaRouter } from "./routers/conferencia";
import { integracoesRouter } from "./routers/integracoes";
import { permissoesRouter } from "./routers/permissoes";
import { recepcionistaRouter } from "./routers/recepcionista";
import { logisticaRouter } from "./routers/logistica";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  users: usersRouter,
  chat: chatRouter,

  // Módulos existentes
  veiculos: veiculosRouter,
  checklists: checklistsRouter,
  funcionarios: funcionariosRouter,
  frota: frotaRouter,
  financeiro: financeiroRouter,
  dashboard: dashboardRouter,
  viagens: viagensRouter,
  custos: custosRouter,
  multas: multasRouter,
  notasFiscais: notasFiscaisRouter,
  acertosCarga: acertosCargaRouter,
  carregamentos: carregamentosRouter,
  grupos: gruposRouter,
  empresas: empresasRouter,
  licenciamento: licenciamentoRouter,
  documentos: documentosRouter,
  ia: iaRouter,
  recepcao: recepcaoRouter,
  wms: wmsRouter,

  // Novos módulos
  crm: crmRouter,
  vendas: vendasRouter,
  auditoria: auditoriaRouter,
  ti: tiRouter,
  bi: biRouter,
  ponto: pontoRouter,
  conferencia: conferenciaRouter,
  integracoes: integracoesRouter,
  permissoes: permissoesRouter,
  recepcionista: recepcionistaRouter,
  logistica: logisticaRouter,
});

export type AppRouter = typeof appRouter;
