import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Retorna o status de todos os prompts do usuário
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: (session.user as any).id },
    select: {
      novidadesVisto: true,
      installPromptVisto: true,
      pushPromptVisto: true,
      _count: { select: { pushSubscriptions: true } },
    },
  });

  return NextResponse.json({
    novidadesVisto: usuario?.novidadesVisto ?? null,
    installPromptVisto: usuario?.installPromptVisto ?? false,
    pushPromptVisto: usuario?.pushPromptVisto ?? false,
    pushAtivado: (usuario?._count?.pushSubscriptions ?? 0) > 0,
  });
}

// Atualiza o status de um prompt
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json();
  const userId = (session.user as any).id;

  const data: any = {};

  if (body.novidadesVisto) {
    data.novidadesVisto = body.novidadesVisto;
  }
  if (body.installPromptVisto === true) {
    data.installPromptVisto = true;
  }
  if (body.pushPromptVisto === true) {
    data.pushPromptVisto = true;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: userId },
    data,
  });

  return NextResponse.json({ ok: true });
}
