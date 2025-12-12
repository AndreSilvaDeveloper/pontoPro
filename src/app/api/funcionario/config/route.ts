import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({});

  const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      include: { empresa: true } // Traz a empresa inteira
  });

  // Acessa configuracoes com segurança (se a empresa existir)
  const configs = usuario?.empresa?.configuracoes || {};

  return NextResponse.json(configs);
}