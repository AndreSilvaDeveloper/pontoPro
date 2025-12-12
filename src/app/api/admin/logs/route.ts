import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: '403' }, { status: 403 });

  const logs = await prisma.logAuditoria.findMany({
    where: { empresaId: session.user.empresaId },
    orderBy: { dataHora: 'desc' },
    take: 100 // Limita aos últimos 100 para não pesar
  });

  return NextResponse.json(logs);
}