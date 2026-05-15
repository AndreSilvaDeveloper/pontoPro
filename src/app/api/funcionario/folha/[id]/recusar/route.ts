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
    const motivo = String(body?.motivo || '').trim();
    if (motivo.length < 5) {
      return NextResponse.json({ erro: 'Explique brevemente o motivo da recusa (mínimo 5 caracteres).' }, { status: 400 });
    }

    const folha = await prisma.folhaPagamento.findFirst({
      where: { id, funcionarioId: usuarioId },
      select: { id: true, status: true, empresaId: true, mes: true, ano: true },
    });
    if (!folha) return NextResponse.json({ erro: 'Folha não encontrada' }, { status: 404 });
    if (folha.status !== 'FECHADA') {
      return NextResponse.json({ erro: 'Essa folha não está aguardando análise.' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { nome: true },
    });

    await prisma.folhaPagamento.update({
      where: { id },
      data: {
        status: 'RECUSADA',
        recusadoEm: new Date(),
        recusadoMotivo: motivo.slice(0, 500),
      },
    });

    enviarPushAdmins(folha.empresaId, {
      title: 'Folha recusada',
      body: `${usuario?.nome || 'Funcionário'} recusou a folha de ${String(folha.mes).padStart(2, '0')}/${folha.ano}.`,
      url: '/admin/financeiro',
      tag: `folha-recusada-${id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[folha recusar]', err);
    return NextResponse.json({ erro: 'Erro ao recusar' }, { status: 500 });
  }
}
