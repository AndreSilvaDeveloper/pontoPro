import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { enviarPushSeguro } from '@/lib/push';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/lembretes/teste
 * Envia todos os tipos de lembrete para o usuário logado (para teste).
 * Pode passar ?tipo=ALMOCO_5MIN para enviar só um tipo específico.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const tipoParam = url.searchParams.get('tipo');

  const todos = {
    ALMOCO_5MIN: {
      title: 'Hora do almoço!',
      body: 'Faltam 5 minutos para o seu horário de almoço.',
      tag: 'lembrete-almoco',
      url: '/funcionario',
    },
    VOLTA_ALMOCO: {
      title: 'Hora de voltar!',
      body: 'Seu horário de almoço terminou. Hora de voltar ao trabalho.',
      tag: 'lembrete-volta-almoco',
      url: '/funcionario',
    },
    SAIDA_5MIN: {
      title: 'Quase lá!',
      body: 'Faltam 5 minutos para encerrar seu expediente.',
      tag: 'lembrete-saida',
      url: '/funcionario',
    },
    PAUSA_CAFE_EXCEDIDA: {
      title: 'Pausa excedida',
      body: 'Sua pausa para café já passou de 15 minutos.',
      tag: 'lembrete-pausa-cafe',
      url: '/funcionario',
    },
  };

  const tipos = tipoParam && todos[tipoParam as keyof typeof todos]
    ? { [tipoParam]: todos[tipoParam as keyof typeof todos] }
    : todos;

  const resultados: Record<string, string> = {};

  for (const [tipo, payload] of Object.entries(tipos)) {
    try {
      await enviarPushSeguro(userId, payload);
      resultados[tipo] = 'enviado';
    } catch {
      resultados[tipo] = 'erro';
    }
  }

  return NextResponse.json({ userId, resultados });
}
