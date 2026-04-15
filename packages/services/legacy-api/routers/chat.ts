import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { requireDb } from "../helpers/errorHandler";
import { z } from "zod";
import { getDb } from "../db";
import { chatConversations, chatMembers, chatMessages, users } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const chatRouter = router({
  // Listar conversas do usuário logado
  listConversations: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // Buscar conversas onde o usuário é membro
    const userConversations = await db
      .select({
        id: chatConversations.id,
        name: chatConversations.name,
        isGroup: chatConversations.isGroup,
        lastMessageAt: chatConversations.lastMessageAt,
      })
      .from(chatConversations)
      .innerJoin(chatMembers, eq(chatConversations.id, chatMembers.conversationId))
      .where(eq(chatMembers.userId, ctx.user.id))
      .orderBy(desc(chatConversations.lastMessageAt));

    // Para cada conversa, buscar o outro participante (se não for grupo)
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        if (!conv.isGroup) {
          const otherMembers = await db
            .select({
              name: users.name,
              lastName: users.lastName,
              email: users.email,
            })
            .from(chatMembers)
            .innerJoin(users, eq(chatMembers.userId, users.id))
            .where(
              and(
                eq(chatMembers.conversationId, conv.id),
                sql`${chatMembers.userId} != ${ctx.user!.id}`
              )
            )
            .limit(1);
          
          const otherMember = otherMembers[0];
          return {
            ...conv,
            displayName: otherMember ? `${otherMember.name} ${otherMember.lastName || ""}` : "Usuário",
          };
        }
        return { ...conv, displayName: conv.name || "Grupo" };
      })
    );

    return conversationsWithDetails;
  }),

  // Listar mensagens de uma conversa
  listMessages: publicProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se o usuário é membro da conversa
      const isMemberResult = await db
        .select()
        .from(chatMembers)
        .where(
          and(
            eq(chatMembers.conversationId, input.conversationId),
            eq(chatMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (isMemberResult.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Você não faz parte desta conversa" });

      const messages = await db
        .select({
          id: chatMessages.id,
          content: chatMessages.content,
          senderId: chatMessages.senderId,
          createdAt: chatMessages.createdAt,
          senderName: users.name,
        })
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.senderId, users.id))
        .where(eq(chatMessages.conversationId, input.conversationId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(50);

      return messages.reverse();
    }),

  // Enviar mensagem
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb(), "chat.sendMessage");

      // Verificar se o usuário é membro da conversa
      const isMember = await db
        .select()
        .from(chatMembers)
        .where(
          and(
            eq(chatMembers.conversationId, input.conversationId),
            eq(chatMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (isMember.length === 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não faz parte desta conversa" });
      }

      // Inserir mensagem
      await db.insert(chatMessages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
      });

      // Atualizar timestamp da conversa
      await db
        .update(chatConversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(chatConversations.id, input.conversationId));

      return { success: true };
    }),

  // Iniciar ou buscar conversa privada com outro usuário
  getOrCreatePrivateConversation: protectedProcedure
    .input(z.object({ targetUserId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = requireDb(await getDb(), "chat.getOrCreatePrivateConversation");

      // Buscar se já existe uma conversa privada entre os dois
      const existingConv = await db.execute(sql`
        SELECT c.id 
        FROM chat_conversations c
        JOIN chat_members m1 ON c.id = m1."conversationId"
        JOIN chat_members m2 ON c.id = m2."conversationId"
        WHERE c."isGroup" = false
        AND m1."userId" = ${ctx.user.id}
        AND m2."userId" = ${input.targetUserId}
        LIMIT 1
      `);

      const rows = existingConv as unknown as any[];
      if (rows.length > 0) {
        return { conversationId: Number(rows[0].id) };
      }

      // Criar nova conversa
      const newConvResult = await db.insert(chatConversations).values({
        empresaId: ctx.user.empresaId || 1,
        isGroup: false,
      }).returning();
      
      const newConv = newConvResult[0];

      // Adicionar membros
      await db.insert(chatMembers).values([
        { conversationId: newConv.id, userId: ctx.user.id },
        { conversationId: newConv.id, userId: input.targetUserId },
      ]);

      return { conversationId: newConv.id };
    }),

  // Listar todos os usuários para iniciar novo chat
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const db = requireDb(await getDb(), "chat.listUsers");

    return await db
      .select({
        id: users.id,
        name: users.name,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          sql`${users.id} != ${ctx.user.id}`,
          ctx.user.role !== "master_admin" ? eq(users.empresaId, ctx.user.empresaId!) : undefined
        )
      )
      .limit(100);
  }),
});
