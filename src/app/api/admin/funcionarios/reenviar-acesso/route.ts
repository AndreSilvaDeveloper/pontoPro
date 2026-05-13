import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { enviarEmailSeguro } from '@/lib/email';
import { htmlEmailAtivacao, assuntoEmailAtivacao } from '@/lib/emailFuncionario';
import { BASE_URL } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { usuarioId } → gera um NOVO link de ativação (o antigo deixa de valer),
// reenvia o e-mail e devolve o link pro admin copiar/mandar no WhatsApp.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { usuarioId } = await request.json().catch(() => ({} as any));
    if (!usuarioId) return NextResponse.json({ erro: 'usuarioId obrigatório' }, { status: 400 });

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, nome: true, email: true, empresaId: true, empresa: { select: { nome: true } } },
    });

    // @ts-ignore
    if (!usuario || usuario.empresaId !== session.user.empresaId) {
      return NextResponse.json({ erro: 'Funcionário não encontrado' }, { status: 404 });
    }

    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const ativacaoToken = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const ativacaoTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const linkAtivacao = `${BASE_URL}/ativar/${ativacaoToken}`;

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ativacaoToken, ativacaoTokenExpiry, deveTrocarSenha: true },
    });

    const nomeEmpresa = usuario.empresa?.nome || 'Sua Empresa';
    enviarEmailSeguro(
      usuario.email,
      assuntoEmailAtivacao(usuario.nome, nomeEmpresa),
      htmlEmailAtivacao({ nome: usuario.nome, nomeEmpresa, link: linkAtivacao, email: usuario.email }),
    ).catch(err => console.error('[reenviar-acesso] e-mail:', err));

    return NextResponse.json({ ok: true, linkAtivacao, nome: usuario.nome, email: usuario.email });
  } catch (error) {
    console.error('[reenviar-acesso]', error);
    return NextResponse.json({ erro: 'Erro ao gerar o link' }, { status: 500 });
  }
}
