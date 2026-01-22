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

export function calcularEstatisticas(args: {
  filtroUsuario: string;
  registros: any[];
  usuarios: any[];
  feriados: string[];
  dataInicio: string;
  dataFim: string;
}) {
  const { filtroUsuario, registros, usuarios, feriados, dataInicio, dataFim } = args;

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
  const ausencias = registros.filter((r) => r.usuario.id === filtroUsuario && r.tipo === 'AUSENCIA');
  ausencias.forEach((aus) => {
    const inicio = fixData(aus.dataHora);
    const fim = aus.extra?.dataFim ? fixData(aus.extra.dataFim) : inicio;
    try {
      eachDayOfInterval({ start: inicio, end: fim }).forEach((dia) => {
        diasIsentos.add(format(dia, 'yyyy-MM-dd'));
      });
    } catch (e) {}
  });

  const getMetaDoDia = (data: Date) => {
    const dataString = format(data, 'yyyy-MM-dd');
    if (feriados.includes(dataString) || diasIsentos.has(dataString)) return 0;

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

    const minutosConfigurados =
      config && config.ativo ? calcDiff(config.e1, config.s1) + calcDiff(config.e2, config.s2) : 0;

    // --- LÓGICA HÍBRIDA INTELIGENTE ---

    // Segunda a Sexta
    if (diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
      if (trabalhouSabado) {
        if (!minutosConfigurados) return 480;

        if (minutosConfigurados > 520) return 480;

        return minutosConfigurados;
      }
    }

    // Sábado
    if (diaSemanaIndex === 6) {
      const configSab = jornadaConfig['sab'];
      const temConfiguracao = configSab && configSab.ativo;

      if (trabalhouSabado && !temConfiguracao) return 240;
    }

    return minutosConfigurados;
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

      const metaSaidaStr = parIndex === 0 ? configDia.s1 : configDia.s2;

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

  while (loopData <= fimData) {
    if (loopData <= agora) {
      const dataStr = format(loopData, 'yyyy-MM-dd');
      const meta = getMetaDoDia(loopData);
      const trabalhado = minutosPorDia[dataStr] || 0;

      let saldoDia = trabalhado - meta;

      if (Math.abs(saldoDia) <= 10) {
        saldoDia = 0;
      }

      saldoMinutosBanco += saldoDia;
    }
    loopData.setDate(loopData.getDate() + 1);
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
