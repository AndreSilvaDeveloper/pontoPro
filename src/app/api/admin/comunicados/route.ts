import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { enviarPushSeguro } from '@/lib/push';

// LISTAR comunicados da empresa (com contagem de leituras e detalhes)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const empresaId = session.user.empresaId as string;
  const { searchParams } = new URL(request.url);
  const comunicadoId = searchParams.get('id'); // para ver detalhes de quem leu

  try {
    // Se pediu detalhes de um comunicado específico
    if (comunicadoId) {
      const comunicado = await prisma.comunicado.findFirst({
        where: { id: comunicadoId, empresaId },
        include: {
          leituras: {
            include: { comunicado: false },
            orderBy: { lidoEm: 'desc' },
          },
        },
      });
      if (!comunicado) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });

      // Buscar nomes dos que leram
      const userIds = comunicado.leituras.map(l => l.usuarioId);
      const usuarios = await prisma.usuario.findMany({
        where: { id: { in: userIds } },
        select: { id: true, nome: true },
      });
      const nomeMap = Object.fromEntries(usuarios.map(u => [u.id, u.nome]));

      // Buscar destinatários (todos ou específicos)
      const destIds = comunicado.destinatarios as string[] | null;
      let totalDestinatarios: number;
      let destinatariosNomes: { id: string; nome: string; leu: boolean }[] = [];

      if (destIds && Array.isArray(destIds)) {
        const dests = await prisma.usuario.findMany({
          where: { id: { in: destIds } },
          select: { id: true, nome: true },
        });
        totalDestinatarios = dests.length;
        destinatariosNomes = dests.map(d => ({
          id: d.id,
          nome: d.nome,
          leu: userIds.includes(d.id),
        }));
      } else {
        const todos = await prisma.usuario.findMany({
          where: { empresaId, cargo: { not: 'ADMIN' } },
          select: { id: true, nome: true },
        });
        totalDestinatarios = todos.length;
        destinatariosNomes = todos.map(d => ({
          id: d.id,
          nome: d.nome,
          leu: userIds.includes(d.id),
        }));
      }

      return NextResponse.json({
        comunicado: {
          id: comunicado.id,
          titulo: comunicado.titulo,
          mensagem: comunicado.mensagem,
          tipo: comunicado.tipo,
          autorNome: comunicado.autorNome,
          criadoEm: comunicado.criadoEm,
          leituras: comunicado.leituras.length,
          totalDestinatarios,
          destinatarios: destinatariosNomes,
        },
      });
    }

    // Listagem geral
    const funcionarios = await prisma.usuario.findMany({
      where: { empresaId, cargo: { not: 'ADMIN' } },
      select: { id: true, nome: true },
    });

    const comunicados = await prisma.comunicado.findMany({
      where: { empresaId },
      include: { _count: { select: { leituras: true } } },
      orderBy: { criadoEm: 'desc' },
    });

    return NextResponse.json({
      comunicados: comunicados.map(c => {
        const destIds = c.destinatarios as string[] | null;
        const total = destIds && Array.isArray(destIds) ? destIds.length : funcionarios.length;
        return {
          id: c.id,
          titulo: c.titulo,
          mensagem: c.mensagem,
          tipo: c.tipo,
          autorNome: c.autorNome,
          criadoEm: c.criadoEm,
          leituras: c._count.leituras,
          totalDestinatarios: total,
          paraTodos: !destIds || !Array.isArray(destIds),
        };
      }),
      funcionarios: funcionarios.map(f => ({ id: f.id, nome: f.nome })),
    });
  } catch (error) {
    console.error('Erro ao listar comunicados:', error);
    return NextResponse.json({ erro: 'Erro ao listar comunicados' }, { status: 500 });
  }
}

// CRIAR comunicado + enviar push
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { titulo, mensagem, tipo, destinatarioIds } = body;

    if (!titulo || !mensagem) {
      return NextResponse.json({ erro: 'Título e mensagem são obrigatórios' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    // @ts-ignore
    const autorId = session.user.id as string;
    // @ts-ignore
    const autorNome = (session.user.nome || session.user.name || 'Admin') as string;

    // destinatarioIds: null/undefined = todos, array = específicos
    const destIds = Array.isArray(destinatarioIds) && destinatarioIds.length > 0 ? destinatarioIds : null;

    const comunicado = await prisma.comunicado.create({
      data: {
        empresaId,
        autorId,
        autorNome,
        titulo,
        mensagem,
        tipo: tipo || 'AVISO',
        destinatarios: destIds ?? Prisma.JsonNull,
      },
    });

    // Enviar push para destinatários
    let alvos: { id: string }[];
    if (destIds) {
      alvos = destIds.map((id: string) => ({ id }));
    } else {
      alvos = await prisma.usuario.findMany({
        where: { empresaId, cargo: { not: 'ADMIN' } },
        select: { id: true },
      });
    }

    const tipoLabel = tipo === 'URGENTE' ? 'URGENTE: ' : '';
    await Promise.allSettled(
      alvos.map(f =>
        enviarPushSeguro(f.id, {
          title: `${tipoLabel}${titulo}`,
          body: mensagem.substring(0, 120),
          url: '/funcionario/comunicados',
          tag: 'comunicado-novo',
        })
      )
    );

    return NextResponse.json({ success: true, comunicado });
  } catch (error) {
    console.error('Erro ao criar comunicado:', error);
    return NextResponse.json({ erro: 'Erro ao criar comunicado' }, { status: 500 });
  }
}
