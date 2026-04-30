import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const runtime = 'nodejs';

// GET — detalhes (admin) — inclui snapshot completo pra renderizar PDF
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string;
  const { id } = await params;

  const fechamento = await prisma.fechamento.findFirst({
    where: { id, empresaId },
    include: {
      funcionario: { select: { id: true, nome: true, tituloCargo: true, cpf: true, pis: true } },
      adminCriador: { select: { id: true, nome: true } },
    },
  });
  if (!fechamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });

  return NextResponse.json(fechamento);
}

// DELETE — cancela fechamento (só PENDENTE)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string;
  const { id } = await params;

  const fechamento = await prisma.fechamento.findFirst({
    where: { id, empresaId },
    select: { id: true, status: true },
  });
  if (!fechamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
  if (fechamento.status !== 'PENDENTE') {
    return NextResponse.json({ erro: 'Só é possível cancelar fechamentos pendentes' }, { status: 400 });
  }

  await prisma.fechamento.update({
    where: { id },
    data: { status: 'CANCELADO' },
  });

  return NextResponse.json({ ok: true });
}
