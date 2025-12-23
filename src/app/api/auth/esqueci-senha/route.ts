import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { enviarEmailSeguro } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.usuario.findUnique({ where: { email } });
    
    // Se não achar o usuário, retornamos sucesso igual (Segurança: para não revelar quem é cliente)
    if (!user) return NextResponse.json({ success: true });

    // 1. Gera Token (Válido por 24h)
    const token = uuidv4();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 2. Salva no banco
    await prisma.usuario.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expires }
    });

    // 3. Envia o Link
    const link = `${process.env.NEXTAUTH_URL}/redefinir-senha?token=${token}`;
    
    await enviarEmailSeguro(
      email, 
      'Recuperação de Senha 🔒', 
      `<p>Você solicitou a troca de senha.</p><p>Clique aqui para criar uma nova: <a href="${link}">Redefinir Senha</a></p>`
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}