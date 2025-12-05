import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json([], { status: 403 });

  // Busca todos os pontos da empresa
  const pontos = await prisma.ponto.findMany({
    where: { usuario: { empresaId: session.user.empresaId } },
    include: { usuario: { select: { id: true, nome: true, email: true, horasDiarias: true } } },
    orderBy: { dataHora: 'desc' }
  });

  return NextResponse.json(pontos);
}