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

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  users: usersRouter,
  chat: chatRouter,

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
});

export type AppRouter = typeof appRouter;
