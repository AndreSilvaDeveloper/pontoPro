import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session?.user?.id) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  // @ts-ignore
  const usuarioId = session.user.id as string;

  const fechamentos = await prisma.fechamento.findMany({
    where: { funcionarioId: usuarioId },
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      status: true,
      periodoInicio: true,
      periodoFim: true,
      criadoEm: true,
      assinadoEm: true,
      recusadoEm: true,
      recusadoMotivo: true,
      adminCriador: { select: { nome: true } },
    },
  });

  return NextResponse.json(fechamentos);
}
