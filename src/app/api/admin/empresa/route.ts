import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    // Busca a empresa vinculada ao usuário logado
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { nome: true, cnpj: true }
    });

    return NextResponse.json(empresa || { nome: 'Minha Empresa', cnpj: '' });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar empresa' }, { status: 500 });
  }
}