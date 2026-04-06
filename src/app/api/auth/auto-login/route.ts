import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import crypto from 'crypto';

function getSessionCookieName() {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
}

// POST: Gerar refresh token após login
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ erro: 'userId obrigatório' }, { status: 400 });

    // Gerar token aleatório
    const refreshToken = crypto.randomBytes(48).toString('hex');

    // Salvar no usuário (reutiliza campo resetToken)
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        resetToken: `refresh:${refreshToken}`,
        resetTokenExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias
      },
    });

    return NextResponse.json({ refreshToken });
  } catch {
    return NextResponse.json({ erro: 'Erro' }, { status: 500 });
  }
}

// PUT: Usar refresh token para restaurar sessão
export async function PUT(request: Request) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken) return NextResponse.json({ erro: 'Token obrigatório' }, { status: 400 });

    const usuario = await prisma.usuario.findFirst({
      where: {
        resetToken: `refresh:${refreshToken}`,
        resetTokenExpiry: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        nome: true,
        cargo: true,
        empresaId: true,
        deveTrocarSenha: true,
        deveCadastrarFoto: true,
        deveDarCienciaCelular: true,
        assinaturaUrl: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Token inválido ou expirado' }, { status: 401 });
    }

    // Criar JWT session
    const tokenPayload = {
      sub: usuario.id,
      id: usuario.id,
      email: usuario.email,
      name: usuario.nome,
      cargo: usuario.cargo,
      empresaId: usuario.empresaId,
      deveTrocarSenha: usuario.deveTrocarSenha,
      deveCadastrarFoto: usuario.deveCadastrarFoto,
      deveDarCienciaCelular: usuario.deveDarCienciaCelular,
      temAssinatura: !!usuario.assinaturaUrl,
    };

    const sessionToken = await encode({
      token: tokenPayload as any,
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 90 * 24 * 60 * 60,
    });

    // Setar cookie da session
    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 90 * 24 * 60 * 60,
    });

    return NextResponse.json({
      ok: true,
      cargo: usuario.cargo,
    });
  } catch {
    return NextResponse.json({ erro: 'Erro' }, { status: 500 });
  }
}
