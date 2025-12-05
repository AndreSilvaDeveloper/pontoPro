import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic'; // Garante que não faça cache

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  // Segurança: Só Admin pode ver
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    // Busca todos os pontos da empresa do admin logado
    const pontos = await prisma.ponto.findMany({
      where: {
        usuario: {
          empresaId: session.user.empresaId 
        }
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            horasDiarias: true
          }
        }
      },
      orderBy: { dataHora: 'desc' }
    });

    return NextResponse.json(pontos);

  } catch (error) {
    console.error("Erro ao buscar pontos:", error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}