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
    // Expande o range de busca para incluir o sábado da semana do início e do fim
    // Isso garante que a lógica híbrida (trabalhouSabado) funcione mesmo filtrando seg-sex
    const dataInicio = new Date(`${inicio}T00:00:00`);
    const dataFim = new Date(`${fim}T23:59:59`);
    const diaSemanaInicio = dataInicio.getDay(); // 0=dom ... 6=sab
    const diaSemanaFim = dataFim.getDay();
    const buscaInicio = new Date(dataInicio);
    // Se início não é domingo, voltar até a segunda da semana (para pegar contexto)
    if (diaSemanaInicio === 0) buscaInicio.setDate(buscaInicio.getDate() - 1); // volta ao sábado
    const buscaFim = new Date(dataFim);
    // Se fim não é sábado, avançar até o sábado da semana
    if (diaSemanaFim < 6) buscaFim.setDate(buscaFim.getDate() + (6 - diaSemanaFim));
    buscaFim.setHours(23, 59, 59, 999);

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
    // Range expandido para detectar se trabalhou sábado na semana
    const pontos = await prisma.ponto.findMany({
      where: {
        usuarioId: session.user.id,
        dataHora: { gte: buscaInicio, lte: buscaFim },
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

    // Buscar horas extras aprovadas do funcionário
    const horasExtrasAprovadas = await prisma.horaExtra.findMany({
      where: {
        usuarioId: session.user.id,
        status: 'APROVADO',
        data: { gte: inicio, lte: fim },
      },
      select: { data: true, minutosExtra: true },
    });

    // Mescla Pontos e Ausências numa lista só para o Front
    const listaUnificada = [
        ...pontos.map(p => ({ ...p, tipo: 'PONTO', subTipo: p.tipo })),
        ...ausencias.map(a => ({ ...a, dataHora: a.dataInicio, tipo: 'AUSENCIA', subTipo: a.tipo, extra: { dataFim: a.dataFim } }))
    ].sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

    return NextResponse.json({
        pontos: listaUnificada,
        empresaNome: usuario?.empresa?.nome || 'Minha Empresa',
        funcionarioNome: usuario?.nome || '',
        jornada: usuario?.jornada,
        feriados: usuario?.empresa?.feriados?.map(f => f.data.toISOString().split('T')[0]) || [],
        horasExtrasAprovadas: horasExtrasAprovadas.map(h => ({ data: h.data, minutosExtra: h.minutosExtra })),
    });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar histórico' }, { status: 500 });
  }
}