// src/lib/logger.ts
import { prisma } from '@/lib/db';

export async function registrarLog({
  empresaId,
  usuarioId, // Admin que executou a ação (mantemos o nome pra compatibilidade)
  acao,      // Ex: 'EDICAO_PONTO', 'APROVACAO_SOLICITACAO'
  detalhes,  // Ex: 'Alterou ponto de 08:00 para 08:30'
  autor      // Nome de quem fez
}: {
  empresaId: string;
  usuarioId: string;
  acao: string;
  detalhes: string;
  autor?: string;
}) {
  if (!empresaId || !usuarioId || !acao) return;

  try {
    await prisma.logAuditoria.create({
      data: {
        empresaId,
        adminId: usuarioId,
        adminNome: autor || 'Sistema',
        acao,
        detalhes: detalhes || '',
        dataHora: new Date(),
      },
    });
  } catch (error) {
    console.error("Erro ao salvar log:", error);
  }
}
