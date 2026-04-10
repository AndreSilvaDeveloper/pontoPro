import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// LISTAR comunicados para o funcionário (com status de leitura)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // @ts-ignore
    const usuarioId = session.user.id as string;
    // @ts-ignore
    const empresaId = session.user.empresaId as string;

    const comunicados = await prisma.comunicado.findMany({
      where: { empresaId },
      include: {
        leituras: {
          where: { usuarioId },
          select: { lidoEm: true },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    // Filtrar: só mostrar comunicados destinados a este funcionário
    const meusComunicados = comunicados.filter(c => {
      const dest = c.destinatarios as string[] | null;
      if (!dest || !Array.isArray(dest)) return true; // null = para todos
      return dest.includes(usuarioId); // específico: só se está na lista
    });

    return NextResponse.json(
      meusComunicados.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        mensagem: c.mensagem,
        tipo: c.tipo,
        autorNome: c.autorNome,
        criadoEm: c.criadoEm,
        lido: c.leituras.length > 0,
        lidoEm: c.leituras[0]?.lidoEm || null,
      }))
    );
  } catch (error) {
    console.error('Erro ao listar comunicados:', error);
    return NextResponse.json({ erro: 'Erro ao listar comunicados' }, { status: 500 });
  }
}

// MARCAR comunicado como lido
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { comunicadoId } = body;

    if (!comunicadoId) {
      return NextResponse.json({ erro: 'comunicadoId é obrigatório' }, { status: 400 });
    }

    // @ts-ignore
    const usuarioId = session.user.id as string;

    await prisma.leituraComunicado.upsert({
      where: {
        comunicadoId_usuarioId: { comunicadoId, usuarioId },
      },
      create: { comunicadoId, usuarioId },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar como lido:', error);
    return NextResponse.json({ erro: 'Erro ao marcar como lido' }, { status: 500 });
  }
}
