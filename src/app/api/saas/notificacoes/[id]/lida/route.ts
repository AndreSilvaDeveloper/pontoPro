import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';

export const runtime = 'nodejs';

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === 'SUPER_ADMIN';
}

/**
 * PATCH: marca notificação como lida (ou desmarca).
 * Body: { lida: boolean }  (default true)
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const lida = body?.lida !== false;

  try {
    const notif = await prisma.notificacao.update({
      where: { id },
      data: {
        lida,
        lidaEm: lida ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, notif });
  } catch {
    return NextResponse.json({ erro: 'Notificação não encontrada' }, { status: 404 });
  }
}
