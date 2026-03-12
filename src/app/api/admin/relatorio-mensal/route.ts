import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

interface JornadaDia {
  ativo: boolean;
  e1?: string;
  s1?: string;
  e2?: string;
  s2?: string;
}

interface Jornada {
  seg?: JornadaDia;
  ter?: JornadaDia;
  qua?: JornadaDia;
  qui?: JornadaDia;
  sex?: JornadaDia;
  sab?: JornadaDia;
  dom?: JornadaDia;
  [key: string]: JornadaDia | undefined;
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function calcMetaMinutos(jornadaDia: JornadaDia | undefined): number {
  if (!jornadaDia || !jornadaDia.ativo) return 0;
  let total = 0;
  if (jornadaDia.e1 && jornadaDia.s1) {
    total += timeToMinutes(jornadaDia.s1) - timeToMinutes(jornadaDia.e1);
  }
  if (jornadaDia.e2 && jornadaDia.s2) {
    total += timeToMinutes(jornadaDia.s2) - timeToMinutes(jornadaDia.e2);
  }
  return Math.max(0, total);
}

function formatMinutos(minutos: number): string {
  const abs = Math.abs(minutos);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function formatSaldo(minutos: number): string {
  const sign = minutos >= 0 ? '+' : '-';
  return `${sign}${formatMinutos(minutos)}`;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function calcMinutosTrabalhados(pontos: { dataHora: Date; tipo: string; subTipo: string | null }[]): number {
  let total = 0;
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    const tipo = p.subTipo || p.tipo;
    if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipo)) {
      const entrada = new Date(p.dataHora);
      const pSaida = pontos[i + 1];
      if (pSaida) {
        const tipoSaida = pSaida.subTipo || pSaida.tipo;
        if (['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
          const saida = new Date(pSaida.dataHora);
          const diff = Math.floor((saida.getTime() - entrada.getTime()) / 60000);
          if (diff > 0 && diff < 1440) total += diff;
          i++;
        }
      }
    }
  }
  return total;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  if (session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const dataInicioParam = searchParams.get('dataInicio');
  const dataFimParam = searchParams.get('dataFim');

  if (!dataInicioParam || !dataFimParam) {
    return NextResponse.json({ erro: 'Informe dataInicio e dataFim (YYYY-MM-DD)' }, { status: 400 });
  }

  const dataInicio = new Date(dataInicioParam + 'T00:00:00');
  const dataFim = new Date(dataFimParam + 'T23:59:59.999');

  if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
    return NextResponse.json({ erro: 'Datas invalidas' }, { status: 400 });
  }

  if (dataFim < dataInicio) {
    return NextResponse.json({ erro: 'Data fim deve ser posterior a data inicio' }, { status: 400 });
  }

  // Limit to 62 days max
  const diffDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias > 62) {
    return NextResponse.json({ erro: 'Periodo maximo de 62 dias' }, { status: 400 });
  }

  const empresaId = session.user.empresaId;

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nome: true },
    });

    const funcionarios = await prisma.usuario.findMany({
      where: { empresaId, cargo: { not: 'ADMIN' } },
      select: { id: true, nome: true, tituloCargo: true, jornada: true },
      orderBy: { nome: 'asc' },
    });

    const funcionarioIds = funcionarios.map((f) => f.id);

    const todosPontos = await prisma.ponto.findMany({
      where: {
        usuarioId: { in: funcionarioIds },
        dataHora: { gte: dataInicio, lte: dataFim },
      },
      select: { id: true, dataHora: true, tipo: true, subTipo: true, usuarioId: true },
      orderBy: { dataHora: 'asc' },
    });

    const ausencias = await prisma.ausencia.findMany({
      where: {
        usuarioId: { in: funcionarioIds },
        status: 'APROVADA',
        dataInicio: { lte: dataFim },
        dataFim: { gte: dataInicio },
      },
      select: { id: true, dataInicio: true, dataFim: true, tipo: true, usuarioId: true },
    });

    const feriados = await prisma.feriado.findMany({
      where: {
        OR: [{ empresaId }, { empresaId: null }],
        data: { gte: dataInicio, lte: dataFim },
      },
      select: { data: true, nome: true },
    });

    const feriadoMap = new Map<string, string>();
    for (const f of feriados) {
      const d = new Date(f.data);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      feriadoMap.set(key, f.nome);
    }

    const pontosMap = new Map<string, typeof todosPontos>();
    for (const p of todosPontos) {
      const d = new Date(p.dataHora);
      const key = `${p.usuarioId}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!pontosMap.has(key)) pontosMap.set(key, []);
      pontosMap.get(key)!.push(p);
    }

    const ausenciaMap = new Map<string, typeof ausencias>();
    for (const a of ausencias) {
      if (!ausenciaMap.has(a.usuarioId)) ausenciaMap.set(a.usuarioId, []);
      ausenciaMap.get(a.usuarioId)!.push(a);
    }

    // Iterate day by day through the range
    const allDates: Date[] = [];
    const cursor = new Date(dataInicio);
    while (cursor <= dataFim) {
      allDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const funcionariosResult = funcionarios.map((func) => {
      const jornada = (func.jornada as Jornada) || {};

      let totalMinutosTrabalhados = 0;
      let totalMetaMinutos = 0;
      let diasTrabalhados = 0;
      let diasFalta = 0;
      let diasAtraso = 0;
      let diasAusenciaJustificada = 0;
      let diasFeriado = 0;

      const dias = [];

      for (const date of allDates) {
        const diaSemana = DIAS_SEMANA[date.getDay()];
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        const jornadaDia = jornada[diaSemana];
        const isWorkingDay = jornadaDia?.ativo === true;
        const isFeriado = feriadoMap.has(dateStr);

        const userAusencias = ausenciaMap.get(func.id) || [];
        const ausenciaDoDia = userAusencias.find((a) => {
          const inicio = new Date(a.dataInicio);
          inicio.setHours(0, 0, 0, 0);
          const fim = new Date(a.dataFim);
          fim.setHours(23, 59, 59, 999);
          return date >= inicio && date <= fim;
        });

        const pontosKey = `${func.id}-${dateStr}`;
        const pontosDia = pontosMap.get(pontosKey) || [];

        const metaMinutos = isWorkingDay && !isFeriado && !ausenciaDoDia ? calcMetaMinutos(jornadaDia) : 0;
        const minutosTrabalhados = calcMinutosTrabalhados(pontosDia);

        let entrada: string | null = null;
        let saida: string | null = null;
        if (pontosDia.length > 0) {
          const primeiro = pontosDia[0];
          const primeiroTipo = primeiro.subTipo || primeiro.tipo;
          if (['ENTRADA', 'PONTO'].includes(primeiroTipo)) {
            entrada = formatTime(new Date(primeiro.dataHora));
          }
          const ultimo = pontosDia[pontosDia.length - 1];
          const ultimoTipo = ultimo.subTipo || ultimo.tipo;
          if (['SAIDA'].includes(ultimoTipo)) {
            saida = formatTime(new Date(ultimo.dataHora));
          }
        }

        let status: string;
        if (isFeriado) {
          status = 'FERIADO';
          diasFeriado++;
        } else if (ausenciaDoDia) {
          status = 'AUSENCIA';
          diasAusenciaJustificada++;
        } else if (!isWorkingDay) {
          status = 'FOLGA';
        } else if (pontosDia.length === 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (date <= today) {
            status = 'FALTA';
            diasFalta++;
          } else {
            status = 'FOLGA';
          }
        } else {
          let isAtraso = false;
          if (jornadaDia?.e1 && entrada) {
            const metaEntrada = timeToMinutes(jornadaDia.e1);
            const realEntrada = timeToMinutes(entrada);
            if (realEntrada > metaEntrada + 10) {
              isAtraso = true;
            }
          }
          if (isAtraso) {
            status = 'ATRASO';
            diasAtraso++;
          } else {
            status = 'NORMAL';
          }
          diasTrabalhados++;
        }

        totalMinutosTrabalhados += minutosTrabalhados;
        totalMetaMinutos += metaMinutos;

        dias.push({
          data: dateStr,
          diaSemana,
          status,
          entrada,
          saida,
          minutosTrabalhados,
          metaMinutos,
          saldo: minutosTrabalhados - metaMinutos,
        });
      }

      const saldoMinutos = totalMinutosTrabalhados - totalMetaMinutos;

      return {
        id: func.id,
        nome: func.nome,
        cargo: func.tituloCargo || 'Colaborador',
        resumo: {
          totalMinutosTrabalhados,
          totalHorasTrabalhadas: formatMinutos(totalMinutosTrabalhados),
          totalMetaMinutos,
          totalMetaHoras: formatMinutos(totalMetaMinutos),
          saldoMinutos,
          saldoFormatado: formatSaldo(saldoMinutos),
          saldoPositivo: saldoMinutos >= 0,
          diasTrabalhados,
          diasFalta,
          diasAtraso,
          diasAusenciaJustificada,
          diasFeriado,
        },
        dias,
      };
    });

    const totalFuncionarios = funcionariosResult.length;
    const totalMinutosGeral = funcionariosResult.reduce((sum, f) => sum + f.resumo.totalMinutosTrabalhados, 0);
    const mediaMinutos = totalFuncionarios > 0 ? Math.round(totalMinutosGeral / totalFuncionarios) : 0;
    const totalFaltas = funcionariosResult.reduce((sum, f) => sum + f.resumo.diasFalta, 0);
    const totalAtrasos = funcionariosResult.reduce((sum, f) => sum + f.resumo.diasAtraso, 0);

    return NextResponse.json({
      dataInicio: dataInicioParam,
      dataFim: dataFimParam,
      empresa: empresa?.nome || '',
      geradoEm: new Date().toISOString(),
      funcionarios: funcionariosResult,
      resumoGeral: {
        totalFuncionarios,
        mediaHorasTrabalhadas: formatMinutos(mediaMinutos),
        totalFaltas,
        totalAtrasos,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar relatorio mensal:', error);
    return NextResponse.json({ erro: 'Erro ao gerar relatorio mensal' }, { status: 500 });
  }
}
