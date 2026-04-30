import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session?.user?.id) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  // @ts-ignore
  const usuarioId = session.user.id as string;
  const { id } = await params;

  const fechamento = await prisma.fechamento.findFirst({
    where: { id, funcionarioId: usuarioId },
    include: {
      adminCriador: { select: { nome: true } },
    },
  });
  if (!fechamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });

  return NextResponse.json(fechamento);
}
