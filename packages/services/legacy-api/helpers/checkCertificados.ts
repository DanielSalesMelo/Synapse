import { getDb, getRawClient } from "../db";
import { certificadosTi, ticketsTi } from "../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

/**
 * Verifica certificados que vencem em 30, 15, 7 e 1 dia(s)
 * e cria um chamado automático para a equipe de TI.
 */
export async function checkCertificadosVencimento() {
  console.log("[Certificados] Iniciando verificação de vencimento...");
  const db = await getDb();
  const client = await getRawClient();
  if (!db || !client) return;

  try {
    // Busca certificados ativos que vencem nos próximos 30 dias e ainda não tiveram alerta enviado hoje
    // (Ou simplesmente busca todos e a lógica de negócio decide se cria o ticket)
    const certificados = await db.select().from(certificadosTi).where(
      and(
        isNull(certificadosTi.deletedAt),
        sql`vencimento <= (current_date + interval '30 days')`,
        sql`vencimento >= current_date`
      )
    );

    for (const cert of certificados) {
      const vencimento = new Date(cert.vencimento);
      const hoje = new Date();
      const diffTime = vencimento.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Só cria ticket se faltar 30, 15, 7 ou 1 dia
      if ([30, 15, 7, 1].includes(diffDays)) {
        // Verifica se já existe um chamado aberto para este certificado nos últimos 30 dias
        const [existente] = await client`
          SELECT id FROM tickets_ti 
          WHERE "empresaId" = ${cert.empresaId} 
          AND titulo LIKE ${'Renovação de Certificado: ' + cert.nome + '%'}
          AND status IN ('aberto', 'em_andamento', 'aguardando')
          LIMIT 1
        `;

        if (!existente) {
          const protocolo = `CERT-${Date.now().toString(36).toUpperCase()}`;
          const titulo = `Renovação de Certificado: ${cert.nome}`;
          const descricao = `O certificado digital "${cert.nome}" (Tipo: ${cert.tipo}) vence em ${diffDays} dias (${vencimento.toLocaleDateString('pt-BR')}). Por favor, providencie a renovação.`;

          await client`
            INSERT INTO tickets_ti (
              "empresaId", protocolo, titulo, descricao,
              categoria, prioridade, status, "createdAt", "updatedAt"
            ) VALUES (
              ${cert.empresaId}, ${protocolo}, ${titulo}, ${descricao},
              'acesso', 'alta', 'aberto', NOW(), NOW()
            )
          `;
          console.log(`[Certificados] Chamado criado para ${cert.nome} - Vence em ${diffDays} dias`);
        }
      }
    }
  } catch (error) {
    console.error("[Certificados] Erro ao verificar vencimentos:", error);
  }
}
