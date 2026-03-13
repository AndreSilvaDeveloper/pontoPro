import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const depois = req.nextUrl.searchParams.get('depois');

    const where: any = { usuarioId: session.user.id };

    // Se "depois" for informado, retorna apenas decididas após esse timestamp
    if (depois) {
      const dt = new Date(depois);
      if (!isNaN(dt.getTime())) {
        where.status = { not: 'PENDENTE' };
        where.decididoEm = { gt: dt };
      }
    }

    const solicitacoes = await prisma.solicitacaoAjuste.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: 50,
    });

    return NextResponse.json(solicitacoes);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar solicitações' }, { status: 500 });
  }
}