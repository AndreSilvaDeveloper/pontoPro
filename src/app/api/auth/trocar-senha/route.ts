import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import bcrypt from 'bcryptjs'; 

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { novaSenha } = await request.json();

    if (!novaSenha || novaSenha.length < 4) {
      return NextResponse.json({ erro: 'A senha deve ter no mínimo 4 caracteres.' }, { status: 400 });
    }

    // === A CORREÇÃO ESTÁ AQUI ===
    // Antes de salvar, transformamos a senha em HASH
    const senhaCriptografada = await bcrypt.hash(novaSenha, 10); 

    await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        senha: senhaCriptografada, // Salva o código seguro ($2a$10$...)
        deveTrocarSenha: false // Libera o acesso
      }
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Senha alterada com segurança!' });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao trocar senha' }, { status: 500 });
  }
}