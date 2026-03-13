import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { enviarPushSeguro } from '@/lib/push';

export const runtime = 'nodejs';

// Diagnóstico: lista subscriptions do usuário
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const subs = await prisma.pushSubscription.findMany({
    where: { usuarioId: userId },
    select: {
      id: true,
      endpoint: true,
      criadoEm: true,
    },
  });

  const subsInfo = subs.map(s => ({
    id: s.id,
    provedor: s.endpoint.includes('push.apple.com')
      ? 'Apple (iOS/Safari)'
      : s.endpoint.includes('fcm.googleapis')
        ? 'Google (Android/Chrome)'
        : s.endpoint.includes('mozilla')
          ? 'Mozilla (Firefox)'
          : 'Outro',
    endpoint: s.endpoint.substring(0, 80) + '...',
    criadoEm: s.criadoEm,
  }));

  return NextResponse.json({
    userId,
    totalSubscriptions: subs.length,
    subscriptions: subsInfo,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'configurada' : 'FALTANDO',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ? 'configurada' : 'FALTANDO',
  });
}

// POST: envia push de teste para o próprio usuário
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  await enviarPushSeguro(userId, {
    title: 'Teste WorkID',
    body: 'Se você recebeu, as notificações estão funcionando!',
    url: '/',
    tag: 'teste',
  });

  return NextResponse.json({ ok: true, message: 'Push de teste enviado' });
}

// DELETE: limpa TODAS as subscriptions do usuário (para recomeçar do zero)
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const result = await prisma.pushSubscription.deleteMany({
    where: { usuarioId: userId },
  });

  return NextResponse.json({
    ok: true,
    removidas: result.count,
    message: 'Todas subscriptions removidas. Reabra o PWA para criar uma nova.',
  });
}
