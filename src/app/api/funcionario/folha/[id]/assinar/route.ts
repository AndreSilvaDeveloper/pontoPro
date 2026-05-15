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
        erro: 'Você precisa cadastrar sua assinatura digital antes de assinar a folha.',
        codigo: 'SEM_ASSINATURA',
      }, { status: 400 });
    }

    const folha = await prisma.folhaPagamento.findFirst({
      where: { id, funcionarioId: usuarioId },
      select: { id: true, status: true, empresaId: true, mes: true, ano: true },
    });
    if (!folha) return NextResponse.json({ erro: 'Folha não encontrada' }, { status: 404 });
    if (folha.status !== 'FECHADA') {
      return NextResponse.json({ erro: 'Essa folha não está aguardando assinatura.' }, { status: 400 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const ua = req.headers.get('user-agent') || null;

    await prisma.folhaPagamento.update({
      where: { id },
      data: {
        status: 'ASSINADA',
        assinadoEm: new Date(),
        assinaturaUrl: usuario.assinaturaUrl,
        ipAssinatura: ip,
        userAgentAssinatura: ua,
      },
    });

    enviarPushAdmins(folha.empresaId, {
      title: 'Folha assinada',
      body: `${usuario.nome} confirmou a folha de ${String(folha.mes).padStart(2, '0')}/${folha.ano}.`,
      url: '/admin/financeiro',
      tag: `folha-assinada-${id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[folha assinar]', err);
    return NextResponse.json({ erro: 'Erro ao assinar' }, { status: 500 });
  }
}
