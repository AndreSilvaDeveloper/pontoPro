import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MSG_LINK_RUIM = 'Este link expirou ou já foi usado. Peça um novo para o responsável pela sua empresa.';

// GET /api/auth/ativar?token=...  → valida o link e devolve nome/empresa pra montar a tela.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')?.trim();
  if (!token) return NextResponse.json({ erro: 'Link inválido.' }, { status: 400 });

  const user = await prisma.usuario.findUnique({
    where: { ativacaoToken: token },
    select: { nome: true, email: true, ativacaoTokenExpiry: true, empresa: { select: { nome: true } } },
  });

  if (!user || !user.ativacaoTokenExpiry || user.ativacaoTokenExpiry < new Date()) {
    return NextResponse.json({ erro: MSG_LINK_RUIM }, { status: 410 });
  }

  return NextResponse.json({
    nome: user.nome,
    email: user.email,
    empresaNome: user.empresa?.nome ?? null,
  });
}

// POST /api/auth/ativar  { token, novaSenha }  → grava a senha, libera a conta, devolve o e-mail
// (o front faz signIn() em seguida) e pra onde redirecionar no onboarding.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const token = String(body?.token ?? '').trim();
  const novaSenha = String(body?.novaSenha ?? '').trim();

  if (!token) return NextResponse.json({ erro: 'Link inválido.' }, { status: 400 });
  if (novaSenha.length < 4) {
    return NextResponse.json({ erro: 'A senha precisa ter pelo menos 4 caracteres.' }, { status: 400 });
  }

  const user = await prisma.usuario.findUnique({
    where: { ativacaoToken: token },
    select: {
      id: true,
      email: true,
      cargo: true,
      assinaturaUrl: true,
      deveCadastrarFoto: true,
      deveDarCienciaCelular: true,
      ativacaoTokenExpiry: true,
    },
  });

  if (!user || !user.ativacaoTokenExpiry || user.ativacaoTokenExpiry < new Date()) {
    return NextResponse.json({ erro: MSG_LINK_RUIM }, { status: 410 });
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      senha: await hash(novaSenha, 10),
      deveTrocarSenha: false,
      ativacaoToken: null,
      ativacaoTokenExpiry: null,
    },
  });

  return NextResponse.json({
    ok: true,
    email: user.email,
    cargo: user.cargo,
    temAssinatura: !!user.assinaturaUrl,
    deveCadastrarFoto: user.deveCadastrarFoto,
    deveDarCienciaCelular: user.deveDarCienciaCelular,
  });
}
