import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/saas/sidebar-badges
 *
 * Retorna contadores que aparecem como badges nos itens da sidebar.
 * Mapa { href -> número }. Se href não vier no objeto, é zero / sem badge.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.cargo !== 'SUPER_ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const agora = new Date();

  const [notificacoesNaoLidas, agendamentosPendentes] = await Promise.all([
    prisma.notificacao.count({ where: { destinatarioId: null, lida: false } }),
    prisma.agendamento.count({
      where: { status: 'PENDENTE', dataHora: { gte: agora } },
    }),
  ]);

  return NextResponse.json({
    '/saas/notificacoes': notificacoesNaoLidas,
    '/saas/agendamentos': agendamentosPendentes,
  });
}
