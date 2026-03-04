import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET — retorna o tema do usuário logado
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ tema: 'dark' });
  }

  const user = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { temaPreferido: true },
  });

  return NextResponse.json({ tema: user?.temaPreferido ?? 'dark' });
}

// PUT — salva o tema
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  const { tema } = await req.json();
  if (!['dark', 'light', 'system'].includes(tema)) {
    return NextResponse.json({ erro: 'Tema inválido' }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { temaPreferido: tema },
  });

  return NextResponse.json({ ok: true });
}
