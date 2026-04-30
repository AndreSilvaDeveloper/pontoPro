import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { enviarPushAdmins } from '@/lib/push';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session?.user?.id) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  // @ts-ignore
  const usuarioId = session.user.id as string;
  const { id } = await params;

  try {
    const body = await req.json();
    const motivo = (body?.motivo || '').toString().trim();
    if (motivo.length < 5) return NextResponse.json({ erro: 'Descreva o motivo (mínimo 5 caracteres)' }, { status: 400 });
    if (motivo.length > 500) return NextResponse.json({ erro: 'Motivo muito longo (máximo 500 caracteres)' }, { status: 400 });

    const fechamento = await prisma.fechamento.findFirst({
      where: { id, funcionarioId: usuarioId },
      select: { id: true, status: true, empresaId: true },
    });
    if (!fechamento) return NextResponse.json({ erro: 'Fechamento não encontrado' }, { status: 404 });
    if (fechamento.status !== 'PENDENTE') {
      return NextResponse.json({ erro: 'Esse fechamento não está mais pendente' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { nome: true },
    });

    await prisma.fechamento.update({
      where: { id },
      data: {
        status: 'RECUSADO',
        recusadoEm: new Date(),
        recusadoMotivo: motivo,
      },
    });

    enviarPushAdmins(fechamento.empresaId, {
      title: 'Fechamento contestado',
      body: `${usuario?.nome ?? 'Funcionário'} discordou do fechamento. Verifique o motivo.`,
      url: '/admin/fechamentos',
      tag: `fechamento-recusado-${id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[fechamento recusar]', err);
    return NextResponse.json({ erro: 'Erro ao recusar' }, { status: 500 });
  }
}
