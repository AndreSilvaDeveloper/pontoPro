import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export const runtime = 'nodejs';

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === 'SUPER_ADMIN';
}

/**
 * POST: marca todas notificações globais (destinatarioId = null) como lidas.
 */
export async function POST() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const result = await prisma.notificacao.updateMany({
    where: { destinatarioId: null, lida: false },
    data: { lida: true, lidaEm: new Date() },
  });

  return NextResponse.json({ ok: true, atualizadas: result.count });
}
