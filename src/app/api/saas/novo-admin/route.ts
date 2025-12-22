import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { empresaId, nome, email, senha } = await req.json();

    // 1. Verifica se já existe esse email no sistema todo
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json({ erro: 'Email já cadastrado no sistema.' }, { status: 400 });
    }

    // 2. Criptografa a senha
    const hashedPassword = await hash(senha, 10);

    // 3. Cria o usuário vinculado à empresa existente
    const novoAdmin = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        cargo: 'ADMIN', // Importante: Cargo de chefia
        empresaId: empresaId // O PULO DO GATO: Vincula à empresa que você clicou
      }
    });

    return NextResponse.json(novoAdmin);

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao criar admin.' }, { status: 500 });
  }
}