import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { enviarPushSeguro } from '@/lib/push';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// Rota de teste: envia push para o próprio usuário logado
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Verifica se tem subscriptions salvas
  const subs = await prisma.pushSubscription.findMany({
    where: { usuarioId: userId },
    select: { id: true, endpoint: true, criadoEm: true },
  });

  if (subs.length === 0) {
    return NextResponse.json({
      error: 'Nenhuma subscription encontrada para este usuário',
      dica: 'O usuário precisa ativar as notificações primeiro',
    }, { status: 404 });
  }

  // Envia push de teste
  await enviarPushSeguro(userId, {
    title: 'Teste de Notificação',
    body: 'Se você recebeu esta mensagem, as notificações estão funcionando!',
    url: '/',
    tag: 'teste',
  });

  return NextResponse.json({
    ok: true,
    subscriptions: subs.length,
    message: 'Push de teste enviado!',
  });
}
