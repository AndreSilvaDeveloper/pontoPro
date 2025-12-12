import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  if (!inicio || !fim) return NextResponse.json({ erro: 'Datas inválidas' }, { status: 400 });

  try {
    // 1. Busca dados do usuário (Jornada) e da empresa (Nome)
    const usuario = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        include: { 
            empresa: { 
                include: { feriados: true } // Traz feriados da empresa
            } 
        }
    });

    // 2. Busca registros (Pontos + Ausências Aprovadas)
    const pontos = await prisma.ponto.findMany({
      where: {
        usuarioId: session.user.id,
        dataHora: { gte: new Date(`${inicio}T00:00:00`), lte: new Date(`${fim}T23:59:59`) },
      },
      orderBy: { dataHora: 'asc' }
    });

    const ausencias = await prisma.ausencia.findMany({
        where: {
            usuarioId: session.user.id,
            status: 'APROVADO', // Só conta se o Admin aprovou
            dataInicio: { gte: new Date(`${inicio}T00:00:00`) },
            dataFim: { lte: new Date(`${fim}T23:59:59`) }
        }
    });

    // Mescla Pontos e Ausências numa lista só para o Front
    const listaUnificada = [
        ...pontos.map(p => ({ ...p, tipo: 'PONTO', subTipo: p.tipo })),
        ...ausencias.map(a => ({ ...a, dataHora: a.dataInicio, tipo: 'AUSENCIA', subTipo: a.tipo, extra: { dataFim: a.dataFim } }))
    ].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    return NextResponse.json({ 
        pontos: listaUnificada, 
        empresaNome: usuario?.empresa?.nome || 'Minha Empresa',
        jornada: usuario?.jornada,
        feriados: usuario?.empresa?.feriados?.map(f => f.data.toISOString().split('T')[0]) || []
    });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar histórico' }, { status: 500 });
  }
}