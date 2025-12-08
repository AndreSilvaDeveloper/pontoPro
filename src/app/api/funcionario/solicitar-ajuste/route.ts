import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { pontoId, novoHorario, motivo } = await request.json();

    await prisma.solicitacaoAjuste.create({
      data: {
        usuarioId: session.user.id,
        pontoId,
        novoHorario: new Date(novoHorario),
        motivo
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao solicitar' }, { status: 500 });
  }
}