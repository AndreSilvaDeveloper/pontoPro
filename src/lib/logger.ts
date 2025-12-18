// src/lib/logger.ts
import { prisma } from '@/lib/db';

export async function registrarLog({
  empresaId,
  usuarioId, // Pode ser Admin ou Funcionário
  acao,      // Ex: 'EDICAO_PONTO', 'APROVACAO_SOLICITACAO'
  detalhes,  // Ex: 'Alterou ponto de 08:00 para 08:30'
  autor      // Nome de quem fez (para facilitar leitura)
}: {
  empresaId: string;
  usuarioId: string;
  acao: string;
  detalhes: string;
  autor: string;
}) {
  try {
    await prisma.logAuditoria.create({
      data: {
        empresaId,
        adminId: usuarioId, // Assumindo que seu model usa adminId ou usuarioId genérico
        adminNome: autor,
        acao,
        detalhes,
        dataHora: new Date(),
      },
    });
  } catch (error) {
    console.error("Erro ao salvar log:", error);
    // Não travamos a aplicação se o log falhar, apenas avisamos no console
  }
}