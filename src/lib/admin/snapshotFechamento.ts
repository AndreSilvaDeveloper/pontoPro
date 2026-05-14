import { prisma } from '@/lib/db';
import { getISOWeek, getYear, getDay } from 'date-fns';
import { calcularEstatisticas } from '@/lib/admin/calcularEstatisticas';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const PARCIAL_MARK = '__PARCIAL__:';

function isValidTimeHHMM(v: any): boolean {
  return typeof v === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function formatMinutos(m: number): string {
  const abs = Math.abs(m);
  return `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, '0')}`;
}
function formatSaldo(m: number): string {
  return `${m >= 0 ? '+' : '-'}${formatMinutos(m)}`;
}
function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function getNumeroDoSabadoNoMes(date: Date): number {
  if (getDay(date) !== 6) return 0;
  const y = date.getFullYear();
  const m = date.getMonth();
  let count = 0;
  for (let day = 1; day <= date.getDate(); day++) {
    if (new Date(y, m, day).getDay() === 6) count++;
  }
  return count;
}
function getNumeroDoDomingoNoMes(date: Date): number {
  if (getDay(date) !== 0) return 0;
  const y = date.getFullYear();
  const m = date.getMonth();
  let count = 0;
  for (let day = 1; day <= date.getDate(); day++) {
    if (new Date(y, m, day).getDay() === 0) count++;
  }
  return count;
}

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

  const idx = getDay(date);
  const config = jornada[DIAS_SEMANA[idx]];
  const calcDiff = (i: string, f: string) => {
    if (!isValidTimeHHMM(i) || !isValidTimeHHMM(f)) return 0;
    let d = timeToMinutes(f) - timeToMinutes(i);
    if (d < 0) d += 1440;
    return d;
  };
  const calcMin = (cfg: any): number => {
    if (!cfg || !cfg.ativo) return 0;
    const hS1 = isValidTimeHHMM(cfg.s1);
    const hE2 = isValidTimeHHMM(cfg.e2);
    if (!hS1 && !hE2 && isValidTimeHHMM(cfg.e1) && isValidTimeHHMM(cfg.s2)) return calcDiff(cfg.e1, cfg.s2);
    return calcDiff(cfg.e1, cfg.s1) + calcDiff(cfg.e2, cfg.s2);
  };

  const chaveSemana = `${getYear(date)}-${getISOWeek(date)}`;
  const trabalhouSabado = semanasComSabado.has(chaveSemana);
  let minutos = calcMin(config);

  const configSab = jornada['sab'];
  const sabRegra = configSab?.regra;
  const sabTemRegraEspecifica = (() => {
    if (!sabRegra?.tipo) return false;
    if (sabRegra.tipo === 'SABADOS_DO_MES') return Array.isArray(sabRegra.quais) && sabRegra.quais.length > 0;
    return true;
  })();
  const sabRegular = configSab?.ativo && !sabTemRegraEspecifica && !(configSab?.alternado === true);
  const metaSabRegular = sabRegular ? (calcMin(configSab) || 240) : 0;

  if (idx >= 1 && idx <= 5) {
    if (trabalhouSabado) {
      if (!minutos) minutos = 480;
      else if (minutos > 520) minutos = 480;
    } else if (sabRegular && metaSabRegular > 0) {
      const sab = new Date(date);
      sab.setDate(sab.getDate() + (6 - idx));
      const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
      if (sab <= hoje && !trabalhouSabado) minutos += Math.round(metaSabRegular / 5);
    }
  }

  if (idx === 0) {
    const configDom = jornada['dom'];
    const domRegra = configDom?.regra;
    const quaisDom = domRegra?.tipo === 'DOMINGOS_DO_MES' && Array.isArray(domRegra?.quais) ? domRegra.quais : [];
    if (configDom?.ativo && domRegra?.tipo === 'DOMINGOS_DO_MES' && quaisDom.length > 0) {
      const n = getNumeroDoDomingoNoMes(date);
      if (n === 0 || !quaisDom.includes(n)) return 0;
      return calcMin(configDom) || 480;
    }
  }

  if (idx === 6) {
    const temConfig = configSab?.ativo;
    const quaisSab = sabRegra?.tipo === 'SABADOS_DO_MES' && Array.isArray(sabRegra?.quais) ? sabRegra.quais : [];
    if (temConfig && sabRegra?.tipo === 'SABADOS_DO_MES' && quaisSab.length > 0) {
      const n = getNumeroDoSabadoNoMes(date);
      if (n === 0 || !quaisSab.includes(n)) return 0;
      return calcMin(configSab) || 240;
    }
    if (configSab?.alternado === true) {
      const semana = getISOWeek(date);
      const par = typeof configSab?.paridadeSemanaISO === 'number' ? configSab.paridadeSemanaISO : 0;
      if (semana % 2 !== par) return 0;
      return temConfig ? (calcMin(configSab) || 240) : 240;
    }
    if (temConfig && !trabalhouSabado && !sabTemRegraEspecifica && !(configSab?.alternado === true)) return 0;
    if (trabalhouSabado && !temConfig) return 240;
  }

  return minutos;
}

function calcMinutosTrabalhados(pontos: { dataHora: Date; tipo: string; subTipo: string | null }[]): number {
  let total = 0;
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    const tipo = p.subTipo || p.tipo;
    if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipo)) {
      const ent = new Date(p.dataHora);
      const pSai = pontos[i + 1];
      if (pSai) {
        const tSai = pSai.subTipo || pSai.tipo;
        if (['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tSai)) {
          const sai = new Date(pSai.dataHora);
          const diff = Math.floor((sai.getTime() - ent.getTime()) / 60000);
          if (diff > 0 && diff < 1440) total += diff;
          if (tSai === 'SAIDA_INTERVALO') {
            const pVolta = pontos[i + 2];
            if (pVolta) {
              const tV = pVolta.subTipo || pVolta.tipo;
              if (['VOLTA_INTERVALO', 'PONTO'].includes(tV)) {
                const v = new Date(pVolta.dataHora);
                const interval = Math.floor((v.getTime() - sai.getTime()) / 60000);
                if (interval > 0) total += Math.min(interval, 15);
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

export type SnapshotFechamento = {
  geradoEm: string;
  empresaNome: string;
  funcionario: { id: string; nome: string; cargo: string };
  periodo: { inicio: string; fim: string };
  resumo: {
    totalMinutosTrabalhados: number;
    totalHorasTrabalhadas: string;
    totalMetaMinutos: number;
    totalMetaHoras: string;
    saldoMinutos: number;
    saldoFormatado: string;
    saldoPositivo: boolean;
    diasTrabalhados: number;
    diasFalta: number;
    diasAtraso: number;
    diasAusenciaJustificada: number;
    diasFeriado: number;
  };
  dias: Array<{
    data: string;
    diaSemana: string;
    status: string;
    entrada: string | null;
    saida: string | null;
    batidas: string[];
    minutosTrabalhados: number;
    metaMinutos: number;
    saldo: number;
  }>;
};

/**
 * Gera o snapshot de relatório de um funcionário no período pra fechamento.
 * Lê do banco no momento — congela esses dados em JSON pro funcionário conferir e assinar.
 */
export async function gerarSnapshotFechamento(
  empresaId: string,
  funcionarioId: string,
  dataInicioStr: string,
  dataFimStr: string,
): Promise<SnapshotFechamento> {
  const dataInicio = new Date(dataInicioStr + 'T00:00:00');
  const dataFim = new Date(dataFimStr + 'T23:59:59.999');

  const [empresa, func, empresaConfig] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { nome: true } }),
    prisma.usuario.findUnique({
      where: { id: funcionarioId },
      select: { id: true, nome: true, tituloCargo: true, jornada: true, criadoEm: true, empresaId: true },
    }),
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { configuracoes: true } }),
  ]);

  if (!func || func.empresaId !== empresaId) {
    throw new Error('Funcionário não pertence à empresa');
  }

  const tolCfg = (empresaConfig?.configuracoes as any)?.toleranciaMinutos;
  const toleranciaMinutos = typeof tolCfg === 'number' ? tolCfg : 10;

  const rangeExpandido = new Date(dataInicio);
  rangeExpandido.setDate(rangeExpandido.getDate() - 7);

  const [pontos, ausencias, feriados, horasExtras, ajustesBanco] = await Promise.all([
    prisma.ponto.findMany({
      where: { usuarioId: funcionarioId, dataHora: { gte: rangeExpandido, lte: dataFim } },
      select: { id: true, dataHora: true, tipo: true, subTipo: true, usuarioId: true },
      orderBy: { dataHora: 'asc' },
    }),
    prisma.ausencia.findMany({
      where: {
        usuarioId: funcionarioId,
        status: { in: ['APROVADO', 'APROVADA'] },
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
      where: { usuarioId: funcionarioId, status: 'APROVADO', data: { gte: dataInicioStr, lte: dataFimStr } },
      select: { usuarioId: true, data: true, minutosExtra: true },
    }),
    prisma.ajusteBancoHoras.findMany({
      where: {
        usuarioId: funcionarioId,
        OR: [
          { data: { gte: dataInicioStr, lte: dataFimStr } },
          { dataFolga: { gte: dataInicioStr, lte: dataFimStr } },
        ],
      },
      select: { usuarioId: true, data: true, dataFolga: true, minutos: true, tipo: true },
    }),
  ]);

  const feriadoSet = new Set<string>();
  const feriadosIntegrais: string[] = [];
  const feriadosParciais: Record<string, { inicio: string; fim: string }> = {};
  for (const f of feriados) {
    const d = new Date(f.data);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    feriadoSet.add(dStr);
    const nome = (f as any).nome || '';
    const idx = nome.indexOf(PARCIAL_MARK);
    if (idx !== -1) {
      const rest = nome.slice(idx + PARCIAL_MARK.length).trim();
      const [h1, h2] = rest.split('-').map((s: string) => (s || '').trim());
      if (isValidTimeHHMM(h1) && isValidTimeHHMM(h2)) {
        feriadosParciais[dStr] = { inicio: h1, fim: h2 };
        continue;
      }
    }
    feriadosIntegrais.push(dStr);
  }

  const registrosBase = [
    ...pontos.map(p => ({
      id: p.id, dataHora: p.dataHora, tipo: 'PONTO', subTipo: p.tipo,
      descricao: null, usuario: { id: p.usuarioId, nome: '' }, extra: {},
    })),
    ...ausencias.map(a => ({
      id: a.id, dataHora: a.dataInicio, tipo: 'AUSENCIA', subTipo: a.tipo,
      descricao: null, usuario: { id: a.usuarioId, nome: '' }, extra: { dataFim: a.dataFim },
    })),
  ];

  const stats = calcularEstatisticas({
    filtroUsuario: funcionarioId,
    registros: registrosBase,
    usuarios: [func],
    feriados: feriadosIntegrais,
    feriadosParciais,
    dataInicio: dataInicioStr,
    dataFim: dataFimStr,
    horasExtrasAprovadas: horasExtras,
    ajustesBanco: ajustesBanco.map(a => ({ ...a, dataFolga: a.dataFolga ?? undefined })),
    toleranciaMinutos,
  });

  const totalMinutosTrabalhados = stats?.totalMinutos ?? 0;
  const saldoMinutos = stats?.saldoMinutos ?? 0;

  const ausenciaSet = new Set<string>();
  for (const a of ausencias) {
    const c = new Date(a.dataInicio); c.setHours(0, 0, 0, 0);
    const fim = new Date(a.dataFim); fim.setHours(0, 0, 0, 0);
    while (c <= fim) {
      ausenciaSet.add(`${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`);
      c.setDate(c.getDate() + 1);
    }
  }

  const pontosMap = new Map<string, typeof pontos>();
  for (const p of pontos) {
    const d = new Date(p.dataHora);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!pontosMap.has(k)) pontosMap.set(k, []);
    pontosMap.get(k)!.push(p);
  }

  const semanasComSabado = new Set<string>();
  for (const [k] of pontosMap) {
    const [y, m, d] = k.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (getDay(date) === 6) semanasComSabado.add(`${getYear(date)}-${getISOWeek(date)}`);
  }

  const allDates: Date[] = [];
  const cursor = new Date(dataInicio);
  while (cursor <= dataFim) {
    allDates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
  const jornada = (func.jornada as any) || {};

  let totalMetaMinutos = 0;
  let diasTrabalhados = 0, diasFalta = 0, diasAtraso = 0;
  let diasAusenciaJustificada = 0, diasFeriado = 0;

  const dias = allDates.map(date => {
    const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const diaSem = DIAS_SEMANA[date.getDay()];
    const isFeriado = feriadoSet.has(dStr);
    const temAus = ausenciaSet.has(dStr);
    const meta = calcMetaDoDia(date, jornada, feriadoSet, ausenciaSet, semanasComSabado);
    const pontosDia = pontosMap.get(dStr) || [];
    const minTrab = calcMinutosTrabalhados(pontosDia);

    let entrada: string | null = null;
    let saida: string | null = null;
    const batidas: string[] = pontosDia.map(p => formatTime(new Date(p.dataHora)));
    if (pontosDia.length > 0) {
      const pri = pontosDia[0];
      if (['ENTRADA', 'PONTO'].includes(pri.subTipo || pri.tipo)) entrada = formatTime(new Date(pri.dataHora));
      const ult = pontosDia[pontosDia.length - 1];
      if ((ult.subTipo || ult.tipo) === 'SAIDA') saida = formatTime(new Date(ult.dataHora));
    }

    let status: string;
    if (isFeriado) { status = 'FERIADO'; diasFeriado++; }
    else if (temAus) { status = 'AUSENCIA'; diasAusenciaJustificada++; }
    else if (meta === 0 && pontosDia.length === 0) status = 'FOLGA';
    else if (pontosDia.length === 0 && meta > 0) {
      if (date <= hoje) { status = 'FALTA'; diasFalta++; } else status = 'FUTURO';
    } else {
      let atraso = false;
      const cfgDia = jornada[diaSem];
      if (cfgDia?.e1 && entrada && isValidTimeHHMM(cfgDia.e1)) {
        if (timeToMinutes(entrada) > timeToMinutes(cfgDia.e1) + 10) atraso = true;
      }
      if (atraso) { status = 'ATRASO'; diasAtraso++; } else status = 'NORMAL';
      if (minTrab > 0) diasTrabalhados++;
    }

    totalMetaMinutos += meta;

    return {
      data: dStr, diaSemana: diaSem, status, entrada, saida, batidas,
      minutosTrabalhados: minTrab, metaMinutos: meta, saldo: minTrab - meta,
    };
  });

  return {
    geradoEm: new Date().toISOString(),
    empresaNome: empresa?.nome || '',
    funcionario: { id: func.id, nome: func.nome, cargo: func.tituloCargo || 'Colaborador' },
    periodo: { inicio: dataInicioStr, fim: dataFimStr },
    resumo: {
      totalMinutosTrabalhados,
      totalHorasTrabalhadas: formatMinutos(totalMinutosTrabalhados),
      totalMetaMinutos,
      totalMetaHoras: formatMinutos(totalMetaMinutos),
      saldoMinutos,
      saldoFormatado: formatSaldo(saldoMinutos),
      saldoPositivo: saldoMinutos >= 0,
      diasTrabalhados, diasFalta, diasAtraso, diasAusenciaJustificada, diasFeriado,
    },
    dias,
  };
}
