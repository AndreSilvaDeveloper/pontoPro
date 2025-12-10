import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Busca apenas as aprovadas para o relatório/tela
    const ausencias = await prisma.ausencia.findMany({
      where: {
        status: 'APROVADO',
        usuario: { empresaId: session.user.empresaId }
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true }
        }
      }
    });

    return NextResponse.json(ausencias);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar ausências' }, { status: 500 });
  }
}