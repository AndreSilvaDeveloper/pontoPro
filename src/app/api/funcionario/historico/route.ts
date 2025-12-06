import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  // 1. Pegar as datas da URL
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  // Configura o filtro
  const whereClause: any = {
    usuarioId: session.user.id
  };

  // Se o funcionário mandou datas, aplicamos o filtro
  if (inicio && fim) {
    // Adiciona o horário para pegar o dia inteiro (00:00 até 23:59)
    // Usamos string direta 'T00:00:00' para evitar confusão de fuso horário
    whereClause.dataHora = {
      gte: new Date(`${inicio}T00:00:00`),
      lte: new Date(`${fim}T23:59:59`)
    };
  }

  try {
    const pontos = await prisma.ponto.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: { nome: true, email: true }
        }
      },
      orderBy: { dataHora: 'desc' }
    });

    return NextResponse.json(pontos);

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar pontos' }, { status: 500 });
  }
}