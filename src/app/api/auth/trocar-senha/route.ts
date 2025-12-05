import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route'; 

export async function POST(request: Request) {
  // Passamos as opções corretas aqui
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { novaSenha } = await request.json();

    if (!novaSenha || novaSenha.length < 4) {
      return NextResponse.json({ erro: 'A senha deve ter no mínimo 4 caracteres' }, { status: 400 });
    }

    await prisma.usuario.update({
      where: { email: session.user.email },
      data: {
        senha: novaSenha,
        deveTrocarSenha: false,
      },
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Senha alterada com sucesso!' });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao atualizar senha' }, { status: 500 });
  }
}