import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function GET() {
  try {
    // Senha de login (NÃO É A MASTER KEY, é a senha pro /login)
    const passwordHash = await hash('123456', 10); 

    const user = await prisma.usuario.upsert({
      where: { email: 'super@workid.com' },
      update: {
        senha: passwordHash,
        cargo: 'SUPER_ADMIN',
        empresaId: null, // Super Admin não tem empresa fixa
        deveTrocarSenha: false
      },
      create: {
        nome: 'Super Admin',
        email: 'super@workid.com',
        senha: passwordHash,
        cargo: 'SUPER_ADMIN',
        empresaId: null,
        deveTrocarSenha: false
      }
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: "Super Admin restaurado com sucesso!", 
      login: "super@workid.com",
      senha_login: "123456" 
    });

  } catch (error) {
    return NextResponse.json({ erro: "Falha ao resetar", detalhe: String(error) }, { status: 500 });
  }
}