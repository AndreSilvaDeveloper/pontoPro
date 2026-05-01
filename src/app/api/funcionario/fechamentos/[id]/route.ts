import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { carregarAssinaturaBase64 } from '@/lib/assinatura';

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

  // Pré-carrega a assinatura como base64 pra evitar CORS no client durante geração do PDF
  const assinaturaBase64 = fechamento.status === 'ASSINADO'
    ? await carregarAssinaturaBase64(fechamento.assinaturaUrl)
    : null;

  return NextResponse.json({ ...fechamento, assinaturaBase64 });
}
