import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { carregarAssinaturaBase64 } from '@/lib/assinatura';

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

  // Pré-carrega a assinatura como base64 pra evitar CORS no client durante geração do PDF
  const assinaturaBase64 = fechamento.status === 'ASSINADO'
    ? await carregarAssinaturaBase64(fechamento.assinaturaUrl)
    : null;

  return NextResponse.json({ ...fechamento, assinaturaBase64 });
}

// DELETE — exclui fechamento permanentemente (qualquer status)
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
    select: { id: true },
  });
  if (!fechamento) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });

  await prisma.fechamento.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
