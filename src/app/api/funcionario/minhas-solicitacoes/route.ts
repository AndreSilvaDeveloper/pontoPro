import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const solicitacoes = await prisma.solicitacaoAjuste.findMany({
      where: {
        usuarioId: session.user.id
      },
      orderBy: {
        criadoEm: 'desc'
      },
      take: 50 // Limita as últimas 50 para não pesar
    });

    return NextResponse.json(solicitacoes);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar solicitações' }, { status: 500 });
  }
}