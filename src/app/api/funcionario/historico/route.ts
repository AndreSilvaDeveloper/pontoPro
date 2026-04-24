import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { calcularEstatisticas } from '@/lib/admin/calcularEstatisticas';
import { format } from 'date-fns';

const PARCIAL_MARK = '__PARCIAL__:';
function isValidTimeHHMM(v: any) {
  return typeof v === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}
function parseParcialFromNome(nome: string): { horaInicio?: string; horaFim?: string } {
  if (!nome) return {};
  const idx = nome.indexOf(PARCIAL_MARK);
  if (idx === -1) return {};
  const rest = nome.slice(idx + PARCIAL_MARK.length).trim();
  const [h1, h2] = rest.split('-').map(s => (s || '').trim());
  if (isValidTimeHHMM(h1) && isValidTimeHHMM(h2)) return { horaInicio: h1, horaFim: h2 };
  return {};
}

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

    // Buscar ajustes de banco de horas do funcionário
    const ajustesBanco = await prisma.ajusteBancoHoras.findMany({
      where: {
        usuarioId: session.user.id,
        OR: [
          { data: { gte: inicio, lte: fim } },
          { dataFolga: { gte: inicio, lte: fim } },
        ],
      },
      select: { id: true, data: true, dataFolga: true, minutos: true, tipo: true, motivo: true, adminNome: true, criadoEm: true },
      orderBy: { criadoEm: 'desc' },
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

    // Separa feriados integrais dos parciais (nome com __PARCIAL__:HH:MM-HH:MM)
    const feriadosIntegrais: string[] = [];
    const feriadosParciais: Record<string, { inicio: string; fim: string }> = {};
    (usuario?.empresa?.feriados || []).forEach(f => {
      const dia = format(new Date(f.data), 'yyyy-MM-dd');
      const parsed = parseParcialFromNome(f.nome || '');
      if (parsed.horaInicio && parsed.horaFim) {
        feriadosParciais[dia] = { inicio: parsed.horaInicio, fim: parsed.horaFim };
      } else {
        feriadosIntegrais.push(dia);
      }
    });

    // Tolerância configurada pela empresa (default 10 min)
    const empresaConfig = usuario?.empresaId
      ? await prisma.empresa.findUnique({
          where: { id: usuario.empresaId },
          select: { configuracoes: true },
        })
      : null;
    const tolCfg = (empresaConfig?.configuracoes as any)?.toleranciaMinutos;
    const toleranciaMinutos = typeof tolCfg === 'number' ? tolCfg : 10;

    // Calcula saldo/total pela função canônica — mesma usada pelo dashboard
    // do admin, garante que todas as telas mostrem o mesmo valor.
    const registrosParaCalc = [
      ...pontos.map(p => ({
        id: p.id,
        dataHora: p.dataHora,
        tipo: 'PONTO',
        subTipo: p.tipo,
        descricao: null,
        usuario: { id: session.user.id, nome: usuario?.nome || '' },
        extra: {},
      })),
      ...ausencias.map(a => ({
        id: a.id,
        dataHora: a.dataInicio,
        tipo: 'AUSENCIA',
        subTipo: a.tipo,
        descricao: null,
        usuario: { id: session.user.id, nome: usuario?.nome || '' },
        extra: { dataFim: a.dataFim },
      })),
    ];

    const stats = calcularEstatisticas({
      filtroUsuario: session.user.id,
      registros: registrosParaCalc,
      usuarios: usuario ? [{ id: session.user.id, jornada: usuario.jornada, criadoEm: usuario.criadoEm }] : [],
      feriados: feriadosIntegrais,
      feriadosParciais,
      dataInicio: inicio,
      dataFim: fim,
      horasExtrasAprovadas: horasExtrasAprovadas.map(h => ({ usuarioId: session.user.id, data: h.data, minutosExtra: h.minutosExtra })),
      ajustesBanco: ajustesBanco.map(a => ({
        usuarioId: session.user.id,
        data: a.data,
        dataFolga: a.dataFolga ?? undefined,
        minutos: a.minutos,
        tipo: a.tipo,
      })),
      toleranciaMinutos,
    });

    return NextResponse.json({
        pontos: listaUnificada,
        empresaNome: usuario?.empresa?.nome || 'Minha Empresa',
        funcionarioNome: usuario?.nome || '',
        jornada: usuario?.jornada,
        feriados: usuario?.empresa?.feriados?.map(f => f.data.toISOString().split('T')[0]) || [],
        horasExtrasAprovadas: horasExtrasAprovadas.map(h => ({ data: h.data, minutosExtra: h.minutosExtra })),
        ajustesBanco: ajustesBanco.map(a => ({ data: a.data, dataFolga: a.dataFolga, minutos: a.minutos, tipo: a.tipo, motivo: a.motivo, adminNome: a.adminNome })),
        estatisticas: stats
          ? {
              saldo: stats.saldo,
              saldoMinutos: stats.saldoMinutos,
              saldoPositivo: stats.saldoPositivo,
              total: stats.total,
              totalMinutos: stats.totalMinutos,
            }
          : null,
    });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar histórico' }, { status: 500 });
  }
}