import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

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
