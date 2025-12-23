import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { token, novaSenha } = await req.json();

    // Busca usuário com token válido e data futura
    const user = await prisma.usuario.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() } 
      }
    });

    if (!user) {
      return NextResponse.json({ erro: 'Token inválido ou expirado.' }, { status: 400 });
    }

    const hashedPassword = await hash(novaSenha, 10);

    // Atualiza a senha e limpa o token
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        senha: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao redefinir.' }, { status: 500 });
  }
}