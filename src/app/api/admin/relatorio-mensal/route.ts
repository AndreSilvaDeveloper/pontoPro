import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getISOWeek, getYear, getDay } from 'date-fns';

export const dynamic = 'force-dynamic';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function isValidTimeHHMM(v: any): boolean {
  return typeof v === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
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

function getNumeroDoSabadoNoMes(date: Date): number {
  if (getDay(date) !== 6) return 0;
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  let count = 0;
  for (let day = 1; day <= d; day++) {
    if (new Date(y, m, day).getDay() === 6) count++;
  }
  return count;
}

// Calcula meta do dia considerando TODAS as regras de jornada
function calcMetaDoDia(
  date: Date,
  jornada: any,
  feriadoSet: Set<string>,
  ausenciaSet: Set<string>,
  semanasComSabado: Set<string>,
): number {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  if (feriadoSet.has(dateStr)) return 0;
  if (ausenciaSet.has(dateStr)) return 0;

  const diaSemanaIndex = getDay(date);
  const diaSemana = DIAS_SEMANA[diaSemanaIndex];
  const config = jornada[diaSemana];

  const calcDiff = (i: string, f: string) => {
    if (!i || !f) return 0;
    if (!isValidTimeHHMM(i) || !isValidTimeHHMM(f)) return 0;
    let diff = timeToMinutes(f) - timeToMinutes(i);
    if (diff < 0) diff += 1440;
    return diff;
  };

  const calcMinutosConfig = (cfg: any): number => {
    if (!cfg || !cfg.ativo) return 0;
    const hS1 = isValidTimeHHMM(cfg.s1);
    const hE2 = isValidTimeHHMM(cfg.e2);
    // Jornada contínua (sem almoço)
    if (!hS1 && !hE2 && isValidTimeHHMM(cfg.e1) && isValidTimeHHMM(cfg.s2)) {
      return calcDiff(cfg.e1, cfg.s2);
    }
    return calcDiff(cfg.e1, cfg.s1) + calcDiff(cfg.e2, cfg.s2);
  };

  const chaveSemana = `${getYear(date)}-${getISOWeek(date)}`;
  const trabalhouSabado = semanasComSabado.has(chaveSemana);

  let minutosConfigurados = calcMinutosConfig(config);

  // --- LÓGICA HÍBRIDA: sábado regular redistribui nos dias úteis ---
  const configSab = jornada['sab'];
  const sabTemRegraEspecifica = (() => {
    const regra = configSab?.regra;
    if (!regra?.tipo) return false;
    if (regra.tipo === 'SABADOS_DO_MES') {
      return Array.isArray(regra.quais) && regra.quais.length > 0;
    }
    return true;
  })();
  const sabRegular = configSab?.ativo && !sabTemRegraEspecifica && !(configSab?.alternado === true);
  const metaSabRegular = sabRegular ? (calcMinutosConfig(configSab) || 240) : 0;

  if (diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
    if (trabalhouSabado) {
      if (!minutosConfigurados) minutosConfigurados = 480;
      else if (minutosConfigurados > 520) minutosConfigurados = 480;
    } else if (sabRegular && metaSabRegular > 0) {
      const sabadoDaSemana = new Date(date);
      sabadoDaSemana.setDate(sabadoDaSemana.getDate() + (6 - diaSemanaIndex));
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      if (sabadoDaSemana <= hoje && !trabalhouSabado) {
        minutosConfigurados += Math.round(metaSabRegular / 5);
      }
    }
  }

  // --- SÁBADO ---
  if (diaSemanaIndex === 6) {
    const temConfiguracao = configSab?.ativo;
    const regra = configSab?.regra;
    const quaisSab = regra?.tipo === 'SABADOS_DO_MES' && Array.isArray(regra?.quais) ? regra.quais : [];

    // Sábados do mês (ex: 1º e 3º)
    if (temConfiguracao && regra?.tipo === 'SABADOS_DO_MES' && quaisSab.length > 0) {
      const numero = getNumeroDoSabadoNoMes(date);
      if (numero === 0 || !quaisSab.includes(numero)) return 0;
      return calcMinutosConfig(configSab) || 240;
    }

    // Sábado alternado
    const isSabadoAlternado = configSab?.alternado === true;
    if (isSabadoAlternado) {
      const semanaISO = getISOWeek(date);
      const paridade = typeof configSab?.paridadeSemanaISO === 'number' ? configSab.paridadeSemanaISO : 0;
      if (semanaISO % 2 !== paridade) return 0;
      return temConfiguracao ? (calcMinutosConfig(configSab) || 240) : 240;
    }

    // Sábado regular sem trabalho: meta = 0 (compensado nos dias úteis)
    if (temConfiguracao && !trabalhouSabado && !sabTemRegraEspecifica && !isSabadoAlternado) return 0;

    // Trabalhou sábado sem configuração: meta padrão 4h
    if (trabalhouSabado && !temConfiguracao) return 240;
  }

  return minutosConfigurados;
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

          // Crédito café (até 15min)
          if (tipoSaida === 'SAIDA_INTERVALO') {
            const pVolta = pontos[i + 2];
            if (pVolta) {
              const tipoVolta = pVolta.subTipo || pVolta.tipo;
              if (['VOLTA_INTERVALO', 'PONTO'].includes(tipoVolta)) {
                const volta = new Date(pVolta.dataHora);
                const intervalo = Math.floor((volta.getTime() - saida.getTime()) / 60000);
                if (intervalo > 0) total += Math.min(intervalo, 15);
              }
            }
          }

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

    // Expandir range para incluir sábados das semanas limítrofes (detecção de sábado trabalhado)
    const rangeExpandido = new Date(dataInicio);
    rangeExpandido.setDate(rangeExpandido.getDate() - 7);

    const [todosPontos, ausencias, feriados, horasExtrasAprovadas] = await Promise.all([
      prisma.ponto.findMany({
        where: {
          usuarioId: { in: funcionarioIds },
          dataHora: { gte: rangeExpandido, lte: dataFim },
        },
        select: { id: true, dataHora: true, tipo: true, subTipo: true, usuarioId: true },
        orderBy: { dataHora: 'asc' },
      }),
      prisma.ausencia.findMany({
        where: {
          usuarioId: { in: funcionarioIds },
          status: 'APROVADA',
          dataInicio: { lte: dataFim },
          dataFim: { gte: dataInicio },
        },
        select: { id: true, dataInicio: true, dataFim: true, tipo: true, usuarioId: true },
      }),
      prisma.feriado.findMany({
        where: {
          OR: [{ empresaId }, { empresaId: null }],
          data: { gte: dataInicio, lte: dataFim },
        },
        select: { data: true, nome: true },
      }),
      prisma.horaExtra.findMany({
        where: {
          usuarioId: { in: funcionarioIds },
          status: 'APROVADO',
          data: { gte: dataInicioParam!, lte: dataFimParam! },
        },
        select: { usuarioId: true, data: true, minutosExtra: true },
      }),
    ]);

    const feriadoSet = new Set<string>();
    for (const f of feriados) {
      const d = new Date(f.data);
      feriadoSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    // Agrupar pontos por usuário e dia
    const pontosMap = new Map<string, typeof todosPontos>();
    for (const p of todosPontos) {
      const d = new Date(p.dataHora);
      const key = `${p.usuarioId}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!pontosMap.has(key)) pontosMap.set(key, []);
      pontosMap.get(key)!.push(p);
    }

    // Horas extras aprovadas por usuário+dia
    const heMap = new Map<string, number>();
    for (const he of horasExtrasAprovadas) {
      heMap.set(`${he.usuarioId}-${he.data}`, he.minutosExtra);
    }

    // Ausências por usuário expandidas em dias
    const ausenciasPorUsuario = new Map<string, Set<string>>();
    for (const a of ausencias) {
      if (!ausenciasPorUsuario.has(a.usuarioId)) ausenciasPorUsuario.set(a.usuarioId, new Set());
      const set = ausenciasPorUsuario.get(a.usuarioId)!;
      const cursor = new Date(a.dataInicio);
      cursor.setHours(0, 0, 0, 0);
      const fim = new Date(a.dataFim);
      fim.setHours(0, 0, 0, 0);
      while (cursor <= fim) {
        set.add(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Dias do período
    const allDates: Date[] = [];
    const cursor = new Date(dataInicio);
    while (cursor <= dataFim) {
      allDates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const funcionariosResult = funcionarios.map((func) => {
      const jornada = (func.jornada as any) || {};
      const ausenciaDias = ausenciasPorUsuario.get(func.id) || new Set();

      // Detectar semanas com sábado trabalhado (para lógica híbrida)
      const semanasComSabado = new Set<string>();
      for (const [key] of pontosMap) {
        if (!key.startsWith(func.id + '-')) continue;
        const dateStr = key.substring(func.id.length + 1);
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        if (getDay(date) === 6) {
          semanasComSabado.add(`${getYear(date)}-${getISOWeek(date)}`);
        }
      }

      let totalMinutosTrabalhados = 0;
      let totalMetaMinutos = 0;
      let diasTrabalhados = 0;
      let diasFalta = 0;
      let diasAtraso = 0;
      let diasAusenciaJustificada = 0;
      let diasFeriado = 0;
      let saldoMinutos = 0;

      const dias = allDates.map((date) => {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const diaSemana = DIAS_SEMANA[date.getDay()];
        const isFeriado = feriadoSet.has(dateStr);
        const temAusencia = ausenciaDias.has(dateStr);

        const metaMinutos = calcMetaDoDia(date, jornada, feriadoSet, ausenciaDias, semanasComSabado);

        const pontosKey = `${func.id}-${dateStr}`;
        const pontosDia = pontosMap.get(pontosKey) || [];
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
          if (ultimoTipo === 'SAIDA') {
            saida = formatTime(new Date(ultimo.dataHora));
          }
        }

        // Status do dia
        let status: string;
        if (isFeriado) {
          status = 'FERIADO';
          diasFeriado++;
        } else if (temAusencia) {
          status = 'AUSENCIA';
          diasAusenciaJustificada++;
        } else if (metaMinutos === 0 && pontosDia.length === 0) {
          // Meta 0 e sem ponto = folga (sábado alternado, domingo, etc.)
          status = 'FOLGA';
        } else if (pontosDia.length === 0 && metaMinutos > 0) {
          // Dia ativo sem ponto
          if (date <= hoje) {
            status = 'FALTA';
            diasFalta++;
          } else {
            status = 'FUTURO';
          }
        } else {
          // Tem pontos
          let isAtraso = false;
          const jornadaDia = jornada[diaSemana];
          if (jornadaDia?.e1 && entrada && isValidTimeHHMM(jornadaDia.e1)) {
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
          if (minutosTrabalhados > 0) diasTrabalhados++;
        }

        totalMinutosTrabalhados += minutosTrabalhados;
        totalMetaMinutos += metaMinutos;

        // Saldo do dia com tolerância CLT de 10min e corte de hora extra
        if (date <= hoje && status !== 'FOLGA' && status !== 'FUTURO') {
          const tolerancia = 10;
          let trabalhadoEfetivo = minutosTrabalhados;

          const temHoraExtra = metaMinutos > 0
            ? minutosTrabalhados > metaMinutos + tolerancia
            : minutosTrabalhados > tolerancia;

          if (temHoraExtra) {
            trabalhadoEfetivo = metaMinutos;
            const heKey = `${func.id}-${dateStr}`;
            const minutosAprovados = heMap.get(heKey);
            if (minutosAprovados !== undefined) {
              trabalhadoEfetivo = metaMinutos + minutosAprovados;
            }
          }

          let saldoDia = trabalhadoEfetivo - metaMinutos;
          if (Math.abs(saldoDia) <= tolerancia) saldoDia = 0;
          saldoMinutos += saldoDia;
        }

        return {
          data: dateStr,
          diaSemana,
          status,
          entrada,
          saida,
          minutosTrabalhados,
          metaMinutos,
          saldo: minutosTrabalhados - metaMinutos,
        };
      });

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
    const totalMinutosGeral = funcionariosResult.reduce((s, f) => s + f.resumo.totalMinutosTrabalhados, 0);
    const mediaMinutos = totalFuncionarios > 0 ? Math.round(totalMinutosGeral / totalFuncionarios) : 0;
    const totalFaltas = funcionariosResult.reduce((s, f) => s + f.resumo.diasFalta, 0);
    const totalAtrasos = funcionariosResult.reduce((s, f) => s + f.resumo.diasAtraso, 0);

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
