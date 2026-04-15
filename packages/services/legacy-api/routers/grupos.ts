import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { empresas } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

export const gruposRouter = router({
  // Listar todas as matrizes (empresas que são matriz ou independente)
  listMatrizes: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "master_admin") {
        throw new Error("Apenas master_admin pode listar matrizes");
      }
      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      const matrizes = await db
        .select()
        .from(empresas)
        .where(
          and(
            isNull(empresas.deletedAt),
            // Matrizes são empresas que são "matriz" ou "independente" (sem matrizId)
          )
        );

      return matrizes.map((e) => ({
        ...e,
        tipoEmpresa: e.tipoEmpresa as string,
      }));
    }),

  // Listar filiais de uma matriz
  listFiliais: protectedProcedure
    .input(z.object({ matrizId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      // Verificar se o usuário tem acesso à matriz
      const matriz = await db
        .select()
        .from(empresas)
        .where(eq(empresas.id, input.matrizId))
        .limit(1);

      if (!matriz.length) throw new Error("Matriz não encontrada");

      // Se não for master_admin, só pode ver suas próprias filiais
      if (ctx.user.role !== "master_admin" && ctx.user.empresaId !== input.matrizId) {
        throw new Error("Acesso negado");
      }

      const filiais = await db
        .select()
        .from(empresas)
        .where(
          and(
            eq(empresas.matrizId, input.matrizId),
            isNull(empresas.deletedAt)
          )
        );

      return filiais.map((e) => ({
        ...e,
        tipoEmpresa: e.tipoEmpresa as string,
      }));
    }),

  // Obter hierarquia completa (matriz + filiais)
  getHierarquia: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      const empresa = await db
        .select()
        .from(empresas)
        .where(eq(empresas.id, input.empresaId))
        .limit(1);

      if (!empresa.length) throw new Error("Empresa não encontrada");

      const emp = empresa[0];

      // Se for filial, retorna a matriz e suas irmãs
      if (emp.matrizId) {
        const matriz = await db
          .select()
          .from(empresas)
          .where(eq(empresas.id, emp.matrizId))
          .limit(1);

        const filiais = await db
          .select()
          .from(empresas)
          .where(
            and(
              eq(empresas.matrizId, emp.matrizId),
              isNull(empresas.deletedAt)
            )
          );

        return {
          matriz: matriz[0],
          filiais: filiais.map((f) => ({
            ...f,
            tipoEmpresa: f.tipoEmpresa as string,
          })),
          atual: emp,
        };
      }

      // Se for matriz, retorna ela e suas filiais
      const filiais = await db
        .select()
        .from(empresas)
        .where(
          and(
            eq(empresas.matrizId, emp.id),
            isNull(empresas.deletedAt)
          )
        );

      return {
        matriz: emp,
        filiais: filiais.map((f) => ({
          ...f,
          tipoEmpresa: f.tipoEmpresa as string,
        })),
        atual: emp,
      };
    }),

  // Vincular uma empresa como filial de uma matriz
  vincularFilial: protectedProcedure
    .input(
      z.object({
        empresaId: z.number(),
        matrizId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "master_admin") {
        throw new Error("Apenas master_admin pode vincular filiais");
      }

      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      // Verificar se ambas as empresas existem
      const [empresa, matriz] = await Promise.all([
        db
          .select()
          .from(empresas)
          .where(eq(empresas.id, input.empresaId))
          .limit(1),
        db
          .select()
          .from(empresas)
          .where(eq(empresas.id, input.matrizId))
          .limit(1),
      ]);

      if (!empresa.length) throw new Error("Empresa não encontrada");
      if (!matriz.length) throw new Error("Matriz não encontrada");

      // Atualizar a empresa para ser filial
      await db
        .update(empresas)
        .set({
          tipoEmpresa: "filial",
          matrizId: input.matrizId,
          updatedAt: new Date(),
        })
        .where(eq(empresas.id, input.empresaId));

      // Se a matriz era independente, mudar para matriz
      if (matriz[0].tipoEmpresa === "independente") {
        await db
          .update(empresas)
          .set({
            tipoEmpresa: "matriz",
            updatedAt: new Date(),
          })
          .where(eq(empresas.id, input.matrizId));
      }

      return { success: true };
    }),

  // Desvincular uma filial (volta a ser independente)
  desvinculaFilial: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "master_admin") {
        throw new Error("Apenas master_admin pode desvincular filiais");
      }

      const db = await getDb();
      if (!db) throw new Error("Database não disponível");

      const empresa = await db
        .select()
        .from(empresas)
        .where(eq(empresas.id, input.empresaId))
        .limit(1);

      if (!empresa.length) throw new Error("Empresa não encontrada");

      const emp = empresa[0];

      // Atualizar a empresa para ser independente
      await db
        .update(empresas)
        .set({
          tipoEmpresa: "independente",
          matrizId: null,
          updatedAt: new Date(),
        })
        .where(eq(empresas.id, input.empresaId));

      // Se a matriz não tem mais filiais, voltar a ser independente
      if (emp.matrizId) {
        const outrasFiliais = await db
          .select()
          .from(empresas)
          .where(
            and(
              eq(empresas.matrizId, emp.matrizId),
              isNull(empresas.deletedAt)
            )
          );

        if (outrasFiliais.length === 0) {
          await db
            .update(empresas)
            .set({
              tipoEmpresa: "independente",
              updatedAt: new Date(),
            })
            .where(eq(empresas.id, emp.matrizId));
        }
      }

      return { success: true };
    }),

  // Mudar a empresa selecionada do usuário (para alternar entre filiais)
  // Nota: isso é armazenado no contexto/sessão, não no banco
  // O frontend deve chamar isso para atualizar a empresa ativa
  setEmpresaAtiva: protectedProcedure
    .input(z.object({ empresaId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verificar se o usuário tem acesso a essa empresa
      // (master_admin tem acesso a todas, outros só à sua)
      if (
        ctx.user.role !== "master_admin" &&
        ctx.user.empresaId !== input.empresaId
      ) {
        throw new Error("Acesso negado a essa empresa");
      }

      // Retornar a empresa para o frontend atualizar o contexto
      return { empresaId: input.empresaId };
    }),
});
