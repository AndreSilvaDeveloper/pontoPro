import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs'; 

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Só Admin pode resetar
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { usuarioId } = await request.json();

    const senhaPadrao = '1234';
    const senhaPadraoHash = await bcrypt.hash(senhaPadrao, 10);

    // 2. Salva o HASH no banco, não o texto puro
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        senha: senhaPadraoHash, 
        deveTrocarSenha: true, 
      }
    });

    return NextResponse.json({ sucesso: true, mensagem: `Senha resetada para ${senhaPadrao}` });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao resetar' }, { status: 500 });
  }
}