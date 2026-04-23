import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const inicioParam = searchParams.get('inicio');
    const fimParam = searchParams.get('fim');

    // Default: últimos 60 dias. Evita scan da tabela inteira em empresas grandes.
    const agora = new Date();
    const defaultInicio = new Date(agora);
    defaultInicio.setDate(defaultInicio.getDate() - 60);

    const inicio = inicioParam ? new Date(`${inicioParam}T00:00:00`) : defaultInicio;
    const fim = fimParam ? new Date(`${fimParam}T23:59:59.999`) : agora;

    const pontos = await prisma.ponto.findMany({
      where: {
        usuario: { empresaId: session.user.empresaId },
        dataHora: { gte: inicio, lte: fim },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            jornada: true,
            fotoPerfilUrl: true,
          },
        },
      },
      orderBy: { dataHora: 'desc' },
    });

    return NextResponse.json(pontos);
  } catch (error) {
    console.error('Erro ao buscar pontos:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
