import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

function getProvedor(endpoint: string): string {
  if (endpoint.includes('push.apple.com')) return 'apple';
  if (endpoint.includes('fcm.googleapis.com')) return 'google';
  if (endpoint.includes('mozilla.com')) return 'mozilla';
  return 'outro';
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const { endpoint, keys } = await req.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
    }

    const provedor = getProvedor(endpoint);

    // Remove subscriptions antigas do mesmo provedor para este usuário
    // iOS gera um endpoint novo cada vez que o PWA reabre — as antigas ficam mortas
    const subsAntigas = await prisma.pushSubscription.findMany({
      where: { usuarioId: session.user.id },
      select: { id: true, endpoint: true },
    });

    const idsParaRemover = subsAntigas
      .filter(s => s.endpoint !== endpoint && getProvedor(s.endpoint) === provedor)
      .map(s => s.id);

    if (idsParaRemover.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: idsParaRemover } },
      });
      console.log(`🗑️ Removidas ${idsParaRemover.length} subscriptions antigas (${provedor}) do usuário ${session.user.id}`);
    }

    // Cria ou atualiza a subscription atual
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        usuarioId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        usuarioId: session.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao salvar push subscription:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }

  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ erro: 'Endpoint obrigatorio' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, usuarioId: session.user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao remover push subscription:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
