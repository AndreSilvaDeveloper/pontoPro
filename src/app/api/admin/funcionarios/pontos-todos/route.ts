// CÓDIGO CERTO (COPIE E COLE O ARQUIVO INTEIRO ABAIXO)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const pontos = await prisma.ponto.findMany({
      where: {
        usuario: { empresaId: session.user.empresaId }
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            jornada: true, // <--- CORREÇÃO: AGORA LÊ A JORNADA NOVA
            fotoPerfilUrl: true
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