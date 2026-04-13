import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { calcularEstatisticas } from '@/lib/admin/calcularEstatisticas';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const PARCIAL_MARK = '__PARCIAL__:';

function isValidTimeHHMM(v: any) {
  if (typeof v !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
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
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const empresaId = session.user.empresaId as string;

  try {
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes'); // "2026-03"
    const inicioParam = searchParams.get('inicio'); // "2026-03-10" (data início do acumulado)

    const agora = new Date();
    // Usar ontem como data fim para evitar saldo parcial do dia corrente
    const ontem = new Date(agora);
    ontem.setDate(ontem.getDate() - 1);
    const ontemStr = format(ontem, 'yyyy-MM-dd');

    let dataInicio: string;
    let dataFim: string;

    if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
      // Filtro por mês específico
      const [ano, mes] = mesParam.split('-').map(Number);
      dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fimMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      dataFim = fimMes < ontemStr ? fimMes : ontemStr;
    } else if (inicioParam && /^\d{4}-\d{2}-\d{2}$/.test(inicioParam)) {
      // Acumulado com data início personalizada
      dataInicio = inicioParam;
      dataFim = ontemStr;
    } else {
      // Acumulado: dataInicio será calculado por funcionário (criadoEm)
      dataInicio = '2020-01-01';
      dataFim = ontemStr;
    }

    const [funcionarios, pontos, ausencias, feriados, horasExtras, ajustes] = await Promise.all([
      prisma.usuario.findMany({
        where: { empresaId, cargo: { not: 'ADMIN' } },
        select: { id: true, nome: true, jornada: true, fotoPerfilUrl: true, criadoEm: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.ponto.findMany({
        where: {
          usuario: { empresaId },
          dataHora: { gte: new Date(`${dataInicio}T00:00:00`), lte: new Date(`${dataFim}T23:59:59`) },
        },
        include: { usuario: { select: { id: true, nome: true } } },
        orderBy: { dataHora: 'asc' },
      }),
      prisma.ausencia.findMany({
        where: {
          usuario: { empresaId },
          status: { in: ['APROVADO', 'APROVADA'] },
          dataInicio: { lte: new Date(`${dataFim}T23:59:59`) },
          dataFim: { gte: new Date(`${dataInicio}T00:00:00`) },
        },
        include: { usuario: { select: { id: true, nome: true } } },
      }),
      prisma.feriado.findMany({
        where: {
          OR: [{ empresaId }, { empresaId: null }],
          data: { gte: new Date(`${dataInicio}T00:00:00`), lte: new Date(`${dataFim}T23:59:59`) },
        },
      }),
      prisma.horaExtra.findMany({
        where: {
          usuario: { empresaId },
          status: 'APROVADO',
          data: { gte: dataInicio, lte: dataFim },
        },
        select: { usuarioId: true, data: true, minutosExtra: true },
      }),
      prisma.ajusteBancoHoras.findMany({
        where: {
          usuario: { empresaId },
          OR: [
            { data: { gte: dataInicio, lte: dataFim } },
            { dataFolga: { gte: dataInicio, lte: dataFim } },
          ],
        },
        select: { usuarioId: true, data: true, dataFolga: true, minutos: true, tipo: true },
      }),
    ]);

    // Montar registros unificados
    const registros: any[] = [];
    pontos.forEach(p => {
      registros.push({
        id: p.id,
        dataHora: p.dataHora,
        tipo: 'PONTO',
        subTipo: p.tipo,
        descricao: null,
        usuario: p.usuario,
        extra: {},
      });
    });
    ausencias.forEach(a => {
      registros.push({
        id: a.id,
        dataHora: a.dataInicio,
        tipo: 'AUSENCIA',
        subTipo: a.tipo,
        descricao: a.motivo,
        usuario: a.usuario,
        extra: { dataFim: a.dataFim },
      });
    });

    // Feriados
    const feriadosIntegrais: string[] = [];
    const feriadosParciais: Record<string, { inicio: string; fim: string }> = {};
    feriados.forEach(f => {
      const dia = format(new Date(f.data), 'yyyy-MM-dd');
      const parsed = parseParcialFromNome(f.nome || '');
      if (parsed.horaInicio && parsed.horaFim) {
        feriadosParciais[dia] = { inicio: parsed.horaInicio, fim: parsed.horaFim };
      } else {
        feriadosIntegrais.push(dia);
      }
    });

    // Calcular saldo de cada funcionário
    const isAcumulado = !mesParam;

    const empresaConfig = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { configuracoes: true },
    });
    const tolCfg = (empresaConfig?.configuracoes as any)?.toleranciaMinutos;
    const toleranciaMinutos = typeof tolCfg === 'number' ? tolCfg : 10;

    const resultado = funcionarios.map(func => {
      // Usar data de criação do funcionário se for depois do início do período
      const criadoEmStr = format(new Date(func.criadoEm), 'yyyy-MM-dd');
      const inicioFunc = criadoEmStr > dataInicio ? criadoEmStr : dataInicio;

      const stats = calcularEstatisticas({
        filtroUsuario: func.id,
        registros,
        usuarios: funcionarios,
        feriados: feriadosIntegrais,
        feriadosParciais,
        dataInicio: inicioFunc,
        dataFim,
        horasExtrasAprovadas: horasExtras,
        ajustesBanco: ajustes.map(a => ({ ...a, dataFolga: a.dataFolga ?? undefined })),
        toleranciaMinutos,
      });

      // Extrair minutos do saldo formatado
      const saldoStr = stats?.saldo || '0h 0m';
      const match = saldoStr.match(/(-?)(\d+)h\s+(\d+)m/);
      const saldoMinutos = match
        ? (match[1] === '-' ? -1 : 1) * (parseInt(match[2]) * 60 + parseInt(match[3]))
        : 0;

      return {
        id: func.id,
        nome: func.nome,
        fotoPerfilUrl: func.fotoPerfilUrl,
        saldo: saldoStr,
        saldoMinutos,
        saldoPositivo: saldoMinutos >= 0,
      };
    });

    // Ordenar: positivos maiores primeiro, depois negativos maiores
    resultado.sort((a, b) => b.saldoMinutos - a.saldoMinutos);

    // Buscar ajustes do período para exibir na listagem
    const ajustesDetalhados = await prisma.ajusteBancoHoras.findMany({
      where: {
        usuario: { empresaId },
        data: { gte: dataInicio, lte: dataFim },
      },
      include: { usuario: { select: { nome: true } } },
      orderBy: { criadoEm: 'desc' },
    });

    return NextResponse.json({
      periodo: { inicio: dataInicio, fim: dataFim },
      funcionarios: resultado,
      ajustes: ajustesDetalhados.map(a => ({
        id: a.id,
        usuarioNome: a.usuario.nome,
        data: a.data,
        minutos: a.minutos,
        tipo: a.tipo,
        motivo: a.motivo,
        adminNome: a.adminNome,
        criadoEm: a.criadoEm,
      })),
    });
  } catch (error) {
    console.error('Erro banco-horas-equipe:', error);
    return NextResponse.json({ erro: 'Erro ao calcular' }, { status: 500 });
  }
}
