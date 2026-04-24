// src/lib/admin/calcularEstatisticas.ts
import {
  differenceInMinutes,
  eachDayOfInterval,
  format,
  getDay,
  getISOWeek,
  getYear,
  isSameDay,
} from 'date-fns';

const criarDataLocal = (dataString: string) => {
  if (!dataString) return new Date();
  const [ano, mes, dia] = dataString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

function isValidTimeHHMM(v: any) {
  if (typeof v !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

function parseHHMMToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

function getWorkWindowsFromConfig(configDia: any): Array<{ start: number; end: number }> {
  const windows: Array<{ start: number; end: number }> = [];

  if (!configDia || !configDia.ativo) return windows;

  const hasE1 = isValidTimeHHMM(configDia.e1);
  const hasS1 = isValidTimeHHMM(configDia.s1);
  const hasE2 = isValidTimeHHMM(configDia.e2);
  const hasS2 = isValidTimeHHMM(configDia.s2);

  // Jornada contínua (sem almoço): e1 direto até s2
  if (hasE1 && hasS2 && !hasS1 && !hasE2) {
    const s = parseHHMMToMinutes(configDia.e1);
    const e = parseHHMMToMinutes(configDia.s2);
    if (e > s) windows.push({ start: s, end: e });
    return windows;
  }

  // Jornada com dois blocos (padrão)
  const pushIfValid = (i?: string, f?: string) => {
    if (!i || !f) return;
    if (!isValidTimeHHMM(i) || !isValidTimeHHMM(f)) return;
    const s = parseHHMMToMinutes(i);
    const e = parseHHMMToMinutes(f);
    if (e > s) windows.push({ start: s, end: e });
  };

  pushIfValid(configDia.e1, configDia.s1);
  pushIfValid(configDia.e2, configDia.s2);

  return windows;
}

function isFolgaParcial(aus: any) {
  // Reconhece qualquer ausência parcial: FOLGA, ATESTADO, FERIAS, etc.
  if (!aus?.subTipo) return false;

  const ini = new Date(aus.dataHora);
  const fim = aus.extra?.dataFim ? new Date(aus.extra.dataFim) : ini;

  const sameDay = format(ini, 'yyyy-MM-dd') === format(fim, 'yyyy-MM-dd');
  if (!sameDay) return false;

  const iniMin = ini.getHours() * 60 + ini.getMinutes();
  const fimMin = fim.getHours() * 60 + fim.getMinutes();

  if (iniMin === fimMin) return false;
  if (fimMin <= iniMin) return false;

  return true;
}

// ✅ NOVO: descobre qual "número" do sábado no mês (1..5)
function getNumeroDoSabadoNoMes(date: Date) {
  // só faz sentido se for sábado
  if (getDay(date) !== 6) return 0;

  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  const d = date.getDate();

  let count = 0;
  for (let day = 1; day <= d; day++) {
    const cur = new Date(y, m, day);
    if (getDay(cur) === 6) count++;
  }
  return count; // 1..5
}

export function calcularEstatisticas(args: {
  filtroUsuario: string;
  registros: any[];
  usuarios: any[];
  feriados: string[]; // somente integrais
  feriadosParciais?: Record<string, { inicio: string; fim: string }>;
  dataInicio: string;
  dataFim: string;
  horasExtrasAprovadas?: Array<{ usuarioId: string; data: string; minutosExtra: number }>;
  ajustesBanco?: Array<{ usuarioId: string; data: string; dataFolga?: string; minutos: number; tipo?: string }>;
  toleranciaMinutos?: number;
}) {
  const { filtroUsuario, registros, usuarios, feriados, feriadosParciais, dataInicio, dataFim, horasExtrasAprovadas, ajustesBanco } = args;
  const tolerancia = typeof args.toleranciaMinutos === 'number' ? args.toleranciaMinutos : 10;

  if (!filtroUsuario) return null;

  const agora = new Date();

  const pontosUsuario = registros.filter((r) => r.usuario.id === filtroUsuario && r.tipo === 'PONTO');
  const pontosOrdenados = [...pontosUsuario].sort(
    (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
  );

  const semanasComSabado = new Set<string>();
  pontosUsuario.forEach((p) => {
    const data = new Date(p.dataHora);
    if (getDay(data) === 6) {
      const chaveSemana = `${getYear(data)}-${getISOWeek(data)}`;
      semanasComSabado.add(chaveSemana);
    }
  });

  const usuarioInfo = usuarios.find((u) => u.id === filtroUsuario);
  const jornadaConfig = usuarioInfo?.jornada || {};

  const fixData = (d: any) => {
    if (!d) return new Date();
    const str = typeof d === 'string' ? d : d.toISOString();
    const [ano, mes, dia] = str.split('T')[0].split('-').map(Number);
    return new Date(ano, mes - 1, dia, 12, 0, 0);
  };

  const diasIsentos = new Set<string>();
  const folgaParcialMinutosPorDia: Record<string, number> = {};

  const ausencias = registros.filter((r) => r.usuario.id === filtroUsuario && r.tipo === 'AUSENCIA');

  ausencias.forEach((aus) => {
    if (isFolgaParcial(aus)) {
      const ini = new Date(aus.dataHora);
      const fim = aus.extra?.dataFim ? new Date(aus.extra.dataFim) : ini;

      const diaStr = format(ini, 'yyyy-MM-dd');

      const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][getDay(ini)];
      const configDia = jornadaConfig[diaSemana] || {};
      const windows = getWorkWindowsFromConfig(configDia);

      const iniMin = ini.getHours() * 60 + ini.getMinutes();
      const fimMin = fim.getHours() * 60 + fim.getMinutes();
      const duracao = fimMin - iniMin;

      let abonar = 0;

      if (windows.length > 0) {
        for (const w of windows) {
          abonar += overlapMinutes(iniMin, fimMin, w.start, w.end);
        }
      } else {
        abonar = Math.max(0, duracao);
      }

      folgaParcialMinutosPorDia[diaStr] = (folgaParcialMinutosPorDia[diaStr] || 0) + abonar;
      return;
    }

    const inicio = fixData(aus.dataHora);
    const fim = aus.extra?.dataFim ? fixData(aus.extra.dataFim) : inicio;
    try {
      eachDayOfInterval({ start: inicio, end: fim }).forEach((dia) => {
        diasIsentos.add(format(dia, 'yyyy-MM-dd'));
      });
    } catch (e) {}
  });

  const isSabadoAlternadoAtivo = Boolean(jornadaConfig?.sab?.ativo && jornadaConfig?.sab?.alternado === true);
  const sabadoParidadeSemanaISO =
    typeof jornadaConfig?.sab?.paridadeSemanaISO === 'number' ? jornadaConfig.sab.paridadeSemanaISO : 0;

  const getMetaDoDia = (data: Date) => {
    const dataString = format(data, 'yyyy-MM-dd');

    if (feriados.includes(dataString)) return 0;
    if (diasIsentos.has(dataString)) return 0;

    const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const diaSemanaIndex = getDay(data);
    const diaSemana = diasMap[diaSemanaIndex];

    const chaveSemanaAtual = `${getYear(data)}-${getISOWeek(data)}`;
    const trabalhouSabado = semanasComSabado.has(chaveSemanaAtual);

    const config = jornadaConfig[diaSemana];

    const calcDiff = (i: string, f: string) => {
      if (!i || !f) return 0;
      const [h1, m1] = i.split(':').map(Number);
      const [h2, m2] = f.split(':').map(Number);
      let diff = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diff < 0) diff += 1440;
      return diff;
    };

    const calcMinutosConfig = (cfg: any) => {
      if (!cfg || !cfg.ativo) return 0;
      const hS1 = isValidTimeHHMM(cfg.s1);
      const hE2 = isValidTimeHHMM(cfg.e2);
      if (!hS1 && !hE2 && isValidTimeHHMM(cfg.e1) && isValidTimeHHMM(cfg.s2)) {
        return calcDiff(cfg.e1, cfg.s2);
      }
      return calcDiff(cfg.e1, cfg.s1) + calcDiff(cfg.e2, cfg.s2);
    };

    let minutosConfigurados = calcMinutosConfig(config);

    // --- LÓGICA HÍBRIDA INTELIGENTE ---
    // Detecta se o sábado é "regular" (sem regra especial) e tem meta configurada
    // Sábado regular = ativo, sem regra de sábados específicos, sem alternado
    // SABADOS_DO_MES com array vazio = sem sábados marcados = comportamento regular
    const configSabHibrido = jornadaConfig['sab'];
    const sabTemRegraEspecifica = (() => {
      const regra = configSabHibrido?.regra;
      if (!regra?.tipo) return false;
      if (regra.tipo === 'SABADOS_DO_MES') {
        const quais = Array.isArray(regra.quais) ? regra.quais : [];
        return quais.length > 0; // array vazio = sem regra efetiva
      }
      return true;
    })();
    const sabRegular = configSabHibrido && configSabHibrido.ativo
      && !sabTemRegraEspecifica
      && !(configSabHibrido.alternado === true);
    const metaSabRegular = sabRegular ? (calcMinutosConfig(configSabHibrido) || 240) : 0;

    if (diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
      if (trabalhouSabado) {
        // Semana COM sábado: meta do dia útil é a configurada (horário cheio c/ almoço maior)
        if (!minutosConfigurados) minutosConfigurados = 480;
        else if (minutosConfigurados > 520) minutosConfigurados = 480;
      } else if (sabRegular && metaSabRegular > 0) {
        // Só redistribui sábado se a semana já terminou (sábado já passou)
        // e confirmamos que não trabalhou. Se o sábado ainda não chegou, não compensa.
        const sabadoDaSemana = new Date(data);
        sabadoDaSemana.setDate(sabadoDaSemana.getDate() + (6 - diaSemanaIndex));
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        const sabadoJaPassou = sabadoDaSemana <= hoje;

        if (sabadoJaPassou && !trabalhouSabado) {
          const compensacaoPorDia = Math.round(metaSabRegular / 5);
          minutosConfigurados = minutosConfigurados + compensacaoPorDia;
        }
      }
    }

    // ✅ SÁBADO: suportar regra de sábados do mês
    if (diaSemanaIndex === 6) {
      const configSab = jornadaConfig['sab'];
      const temConfiguracao = configSab && configSab.ativo;

      // ✅ regra "SABADOS_DO_MES" (ex: [1,3]) — só ativa se tem sábados marcados
      const regra = configSab?.regra;
      const quaisSab = regra?.tipo === 'SABADOS_DO_MES' && Array.isArray(regra?.quais) ? regra.quais : [];
      if (temConfiguracao && regra?.tipo === 'SABADOS_DO_MES' && quaisSab.length > 0) {
        const numero = getNumeroDoSabadoNoMes(data); // 1..5
        const trabalhaNesteSabado = numero > 0 && quaisSab.includes(numero);
        if (!trabalhaNesteSabado) return 0;

        // se trabalha, calcula meta sab (com abatimentos)
        const minsSab = calcMinutosConfig(configSab);
        const metaBaseSab = minsSab || 240;

        let meta = metaBaseSab;

        const abonoParcialFeriado = feriadosParciais?.[dataString];
        if (
          abonoParcialFeriado &&
          isValidTimeHHMM(abonoParcialFeriado.inicio) &&
          isValidTimeHHMM(abonoParcialFeriado.fim)
        ) {
          const iniMin = parseHHMMToMinutes(abonoParcialFeriado.inicio);
          const fimMin = parseHHMMToMinutes(abonoParcialFeriado.fim);
          if (fimMin > iniMin) {
            const windows = getWorkWindowsFromConfig(configSab);
            let abonar = 0;
            if (windows.length > 0) {
              for (const w of windows) abonar += overlapMinutes(iniMin, fimMin, w.start, w.end);
            } else {
              abonar = fimMin - iniMin;
            }
            meta = clamp(meta - abonar, 0, meta);
          }
        }

        const abonoFolgaParcial = folgaParcialMinutosPorDia[dataString] || 0;
        if (abonoFolgaParcial > 0 && meta > 0) meta = clamp(meta - abonoFolgaParcial, 0, meta);

        return meta;
      }

      // ✅ mantém a lógica antiga de alternado (sem quebrar quem já usa)
      if (isSabadoAlternadoAtivo) {
        const semanaISO = getISOWeek(data);
        const trabalhaNesteSabado = semanaISO % 2 === sabadoParidadeSemanaISO;
        if (!trabalhaNesteSabado) return 0;

        if (temConfiguracao) {
          const minsSab = calcMinutosConfig(configSab);
          const metaBaseSab = minsSab || 240;

          let meta = metaBaseSab;

          const abonoParcialFeriado = feriadosParciais?.[dataString];
          if (
            abonoParcialFeriado &&
            isValidTimeHHMM(abonoParcialFeriado.inicio) &&
            isValidTimeHHMM(abonoParcialFeriado.fim)
          ) {
            const iniMin = parseHHMMToMinutes(abonoParcialFeriado.inicio);
            const fimMin = parseHHMMToMinutes(abonoParcialFeriado.fim);
            if (fimMin > iniMin) {
              const windows = getWorkWindowsFromConfig(configSab);
              let abonar = 0;
              if (windows.length > 0) {
                for (const w of windows) abonar += overlapMinutes(iniMin, fimMin, w.start, w.end);
              } else {
                abonar = fimMin - iniMin;
              }
              meta = clamp(meta - abonar, 0, meta);
            }
          }

          const abonoFolgaParcial = folgaParcialMinutosPorDia[dataString] || 0;
          if (abonoFolgaParcial > 0 && meta > 0) meta = clamp(meta - abonoFolgaParcial, 0, meta);

          return meta;
        }

        let meta = 240;

        const abonoParcialFeriado = feriadosParciais?.[dataString];
        if (
          abonoParcialFeriado &&
          isValidTimeHHMM(abonoParcialFeriado.inicio) &&
          isValidTimeHHMM(abonoParcialFeriado.fim)
        ) {
          const iniMin = parseHHMMToMinutes(abonoParcialFeriado.inicio);
          const fimMin = parseHHMMToMinutes(abonoParcialFeriado.fim);
          if (fimMin > iniMin) {
            meta = clamp(meta - (fimMin - iniMin), 0, meta);
          }
        }

        const abonoFolgaParcial = folgaParcialMinutosPorDia[dataString] || 0;
        if (abonoFolgaParcial > 0 && meta > 0) meta = clamp(meta - abonoFolgaParcial, 0, meta);

        return meta;
      }

      if (trabalhouSabado && !temConfiguracao) return 240;

      // Sábado regular configurado mas não trabalhado: meta = 0 (compensado nos dias úteis)
      // Inclui SABADOS_DO_MES com array vazio (nenhum sábado marcado = comportamento regular)
      if (temConfiguracao && !trabalhouSabado) {
        const isAlternado = configSab?.alternado === true;
        const temRegraEfetiva = regra?.tipo === 'SABADOS_DO_MES' && quaisSab.length > 0;
        if (!temRegraEfetiva && !isAlternado) return 0;
      }
    }

    // meta base padrão
    let metaBase = minutosConfigurados;

    const feriadoParcial = feriadosParciais?.[dataString];
    if (
      feriadoParcial &&
      isValidTimeHHMM(feriadoParcial.inicio) &&
      isValidTimeHHMM(feriadoParcial.fim) &&
      metaBase > 0
    ) {
      const iniMin = parseHHMMToMinutes(feriadoParcial.inicio);
      const fimMin = parseHHMMToMinutes(feriadoParcial.fim);

      if (fimMin > iniMin) {
        const windows = getWorkWindowsFromConfig(config);
        let abonar = 0;

        if (windows.length > 0) {
          for (const w of windows) {
            abonar += overlapMinutes(iniMin, fimMin, w.start, w.end);
          }
        } else {
          abonar = fimMin - iniMin;
        }

        metaBase = clamp(metaBase - abonar, 0, metaBase);
      }
    }

    const abonoFolgaParcial = folgaParcialMinutosPorDia[dataString] || 0;
    if (abonoFolgaParcial > 0 && metaBase > 0) {
      metaBase = clamp(metaBase - abonoFolgaParcial, 0, metaBase);
    }

    return metaBase;
  };

  let minutosHoje = 0;
  let minutosTotalPeriodo = 0;
  let statusAtual = 'Ausente';
  let tempoDecorridoAgora = 0;

  const contagemDia: Record<string, number> = {};
  const minutosPorDia: Record<string, number> = {};

  for (let i = 0; i < pontosOrdenados.length; i++) {
    const pEntrada = pontosOrdenados[i];
    const tipoEntrada = pEntrada.subTipo || pEntrada.tipo;

    if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipoEntrada)) {
      const dataEntradaReal = new Date(pEntrada.dataHora);
      const diaStr = format(dataEntradaReal, 'yyyy-MM-dd');

      if (!contagemDia[diaStr]) contagemDia[diaStr] = 0;
      const parIndex = contagemDia[diaStr];
      contagemDia[diaStr]++;

      const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][getDay(dataEntradaReal)];
      const configDia = jornadaConfig[diaSemana] || {};

      // Jornada contínua (sem almoço): s1 vazio, usar s2 diretamente
      const jornadaContinua = !isValidTimeHHMM(configDia.s1) && !isValidTimeHHMM(configDia.e2);
      const metaSaidaStr = jornadaContinua ? configDia.s2 : (parIndex === 0 ? configDia.s1 : configDia.s2);

      const pSaida = pontosOrdenados[i + 1];
      const tipoSaida = pSaida ? pSaida.subTipo || pSaida.tipo : null;

      if (pSaida && ['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
        const dataSaidaReal = new Date(pSaida.dataHora);

        let diff = differenceInMinutes(dataSaidaReal, dataEntradaReal);

        if (metaSaidaStr && metaSaidaStr === configDia.s2) {
          const [hMeta, mMeta] = metaSaidaStr.split(':').map(Number);
          const dataMetaSaida = new Date(dataSaidaReal);
          dataMetaSaida.setHours(hMeta, mMeta, 0, 0);

          const atrasoSaida = differenceInMinutes(dataSaidaReal, dataMetaSaida);

          if (atrasoSaida > 0 && atrasoSaida <= 10) {
            diff -= atrasoSaida;
          }
        }

        if (diff > 0 && diff < 1440) {
          minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + diff;

          if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += diff;
          if (isSameDay(dataEntradaReal, agora)) minutosHoje += diff;
        }

        if (tipoSaida === 'SAIDA_INTERVALO') {
          const pProximaEntrada = pontosOrdenados[i + 2];
          if (
            pProximaEntrada &&
            ['VOLTA_INTERVALO', 'PONTO'].includes(pProximaEntrada.subTipo || pProximaEntrada.tipo)
          ) {
            const dataVolta = new Date(pProximaEntrada.dataHora);
            const duracaoIntervalo = differenceInMinutes(dataVolta, dataSaidaReal);
            const creditoCafe = Math.min(duracaoIntervalo, 15);

            if (creditoCafe > 0) {
              minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + creditoCafe;
              if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += creditoCafe;
              if (isSameDay(dataEntradaReal, agora)) minutosHoje += creditoCafe;
            }
          }
        }

        i++;
      } else {
        if (isSameDay(dataEntradaReal, agora)) {
          const diff = differenceInMinutes(agora, dataEntradaReal);
          if (diff > 0 && diff < 1440) {
            minutosHoje += diff;
            statusAtual = 'Trabalhando';
            tempoDecorridoAgora = diff;

            minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + diff;
            if (diaStr >= dataInicio && diaStr <= dataFim) minutosTotalPeriodo += diff;
          }
        }
      }
    }
  }

  if (pontosOrdenados.length > 0) {
    const ultimoPonto = pontosOrdenados[pontosOrdenados.length - 1];
    if (ultimoPonto.subTipo === 'SAIDA_INTERVALO' && isSameDay(new Date(ultimoPonto.dataHora), agora)) {
      const dataSaida = new Date(ultimoPonto.dataHora);
      const tempoNoIntervalo = differenceInMinutes(agora, dataSaida);
      const creditoAtual = Math.min(tempoNoIntervalo, 15);

      statusAtual = tempoNoIntervalo <= 15 ? 'Pausa Café (Pago)' : 'Pausa Café (Excedido)';
      tempoDecorridoAgora = tempoNoIntervalo;

      minutosHoje += creditoAtual;
      const diaStr = format(agora, 'yyyy-MM-dd');
      minutosPorDia[diaStr] = (minutosPorDia[diaStr] || 0) + creditoAtual;

      const hojeStr = format(agora, 'yyyy-MM-dd');
      if (hojeStr >= dataInicio && hojeStr <= dataFim) minutosTotalPeriodo += creditoAtual;
    }
  }

  let saldoMinutosBanco = 0;
  let loopData = criarDataLocal(dataInicio);
  const fimData = criarDataLocal(dataFim);

  // Pré-calcular compensações de folga por dia (reduzem a meta)
  // Usa dataFolga se existir, senão data (compatibilidade com registros antigos)
  const compensacoesPorDia: Record<string, number> = {};
  if (ajustesBanco) {
    for (const ajuste of ajustesBanco) {
      if (ajuste.usuarioId === filtroUsuario && ajuste.tipo === 'COMPENSACAO_FOLGA') {
        const absMin = Math.abs(ajuste.minutos);
        const diaFolga = ajuste.dataFolga || ajuste.data;
        compensacoesPorDia[diaFolga] = (compensacoesPorDia[diaFolga] || 0) + absMin;
      }
    }
  }

  while (loopData <= fimData) {
    if (loopData <= agora) {
      const dataStr = format(loopData, 'yyyy-MM-dd');
      let meta = getMetaDoDia(loopData);
      const trabalhado = minutosPorDia[dataStr] || 0;

      // Reduzir meta se tem compensação de folga neste dia
      const compensacao = compensacoesPorDia[dataStr] || 0;
      if (compensacao > 0) {
        meta = Math.max(0, meta - compensacao);
      }

      // Cortar hora extra no saldo: se trabalhou além da meta + tolerância, corta no expediente
      // A menos que haja aprovação explícita
      // Também corta quando dia é folga (meta=0) mas trabalhou
      let trabalhadoEfetivo = trabalhado;

      const temHoraExtra = meta > 0
        ? trabalhado > meta + tolerancia
        : trabalhado > tolerancia; // folga: qualquer trabalho é extra

      if (temHoraExtra) {
        // Crédito automático em dias sem obrigação de trabalho: domingo,
        // feriado integral e feriado parcial (tudo acima da meta reduzida
        // vira banco sem precisar de aprovação manual).
        const ehFeriadoIntegral = feriados.includes(dataStr);
        const ehFeriadoParcial = !!feriadosParciais?.[dataStr];
        const ehDomingo = loopData.getDay() === 0;
        const creditoAutomatico = ehFeriadoIntegral || ehFeriadoParcial || ehDomingo;

        if (creditoAutomatico) {
          trabalhadoEfetivo = trabalhado;
        } else {
          trabalhadoEfetivo = meta; // corta no expediente (0 se folga)

          const aprovada = horasExtrasAprovadas?.find(
            h => h.usuarioId === filtroUsuario && h.data === dataStr
          );
          if (aprovada) {
            trabalhadoEfetivo = meta + aprovada.minutosExtra;
          }
        }
      }

      let saldoDia = trabalhadoEfetivo - meta;

      if (Math.abs(saldoDia) <= tolerancia) {
        saldoDia = 0;
      }

      saldoMinutosBanco += saldoDia;
    }
    loopData.setDate(loopData.getDate() + 1);
  }

  // Aplicar ajustes manuais do banco de horas
  // COMPENSACAO_FOLGA: debita do saldo via data (mês ref), reduz meta via dataFolga (já feito acima)
  // Outros tipos: debita/credita via data
  if (ajustesBanco) {
    for (const ajuste of ajustesBanco) {
      if (ajuste.usuarioId === filtroUsuario && ajuste.data >= dataInicio && ajuste.data <= dataFim) {
        saldoMinutosBanco += ajuste.minutos;
      }
    }
  }

  const formatarHoras = (min: number) => {
    const sinal = min < 0 ? '-' : '';
    const absMin = Math.abs(min);
    return `${sinal}${Math.floor(absMin / 60)}h ${absMin % 60}m`;
  };

  return {
    status: statusAtual,
    tempoAgora: formatarHoras(tempoDecorridoAgora).replace('-', ''),
    hoje: formatarHoras(minutosHoje),
    metaHoje: formatarHoras(getMetaDoDia(agora)),
    total: formatarHoras(minutosTotalPeriodo),
    saldo: formatarHoras(saldoMinutosBanco),
    saldoPositivo: saldoMinutosBanco >= 0,
  };
}
