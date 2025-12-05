// src/app/api/admin/funcionarios/resetar-senha/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Só Admin pode resetar
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { usuarioId } = await request.json();

    // Reseta para a senha padrão e obriga a trocar
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        senha: 'mudar123',
        deveTrocarSenha: true, 
      }
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Senha resetada para mudar123' });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao resetar' }, { status: 500 });
  }
}