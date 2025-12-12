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

  // === PROTEÇÃO: SUPER ADMIN NÃO TROCA SENHA NO BANCO ===
  // @ts-ignore
  if (session.user.cargo === 'SUPER_ADMIN') {
      return NextResponse.json({ erro: 'Super Admin não troca senha por aqui.' }, { status: 403 });
  }
  // ======================================================

  try {
    const { novaSenha } = await request.json();

    if (!novaSenha || novaSenha.length < 4) {
      return NextResponse.json({ erro: 'Senha muito curta.' }, { status: 400 });
    }

    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    // Atualiza a senha e remove a obrigação de trocar
    await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        senha: senhaCriptografada,
        deveTrocarSenha: false 
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao trocar senha:", error);
    return NextResponse.json({ erro: 'Erro interno ao salvar.' }, { status: 500 });
  }
}