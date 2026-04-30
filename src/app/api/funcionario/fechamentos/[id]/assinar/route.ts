import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { compare } from 'bcryptjs';
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
    const senha = (body?.senha || '').toString();
    if (!senha) return NextResponse.json({ erro: 'Senha obrigatória' }, { status: 400 });

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, senha: true, assinaturaUrl: true, empresaId: true, nome: true },
    });
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

    const senhaOk = await compare(senha, usuario.senha);
    if (!senhaOk) return NextResponse.json({ erro: 'Senha incorreta' }, { status: 401 });

    if (!usuario.assinaturaUrl) {
      return NextResponse.json({
        erro: 'Você precisa cadastrar sua assinatura digital antes de confirmar fechamentos.',
        codigo: 'SEM_ASSINATURA',
      }, { status: 400 });
    }

    const fechamento = await prisma.fechamento.findFirst({
      where: { id, funcionarioId: usuarioId },
      select: { id: true, status: true, empresaId: true, periodoInicio: true, periodoFim: true },
    });
    if (!fechamento) return NextResponse.json({ erro: 'Fechamento não encontrado' }, { status: 404 });
    if (fechamento.status !== 'PENDENTE') {
      return NextResponse.json({ erro: 'Esse fechamento não está mais pendente' }, { status: 400 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const ua = req.headers.get('user-agent') || null;

    await prisma.fechamento.update({
      where: { id },
      data: {
        status: 'ASSINADO',
        assinadoEm: new Date(),
        assinaturaUrl: usuario.assinaturaUrl,
        ipAssinatura: ip,
        userAgentAssinatura: ua,
      },
    });

    // notifica admins da empresa
    enviarPushAdmins(fechamento.empresaId, {
      title: 'Fechamento assinado',
      body: `${usuario.nome} confirmou o fechamento de ponto.`,
      url: '/admin/fechamentos',
      tag: `fechamento-assinado-${id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[fechamento assinar]', err);
    return NextResponse.json({ erro: 'Erro ao assinar' }, { status: 500 });
  }
}
