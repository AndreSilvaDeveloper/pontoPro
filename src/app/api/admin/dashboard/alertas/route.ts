export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;

const parseHM = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

function calcularMetaMinutos(dia: Record<string, string | boolean>): number {
  const { e1, s1, e2, s2 } = dia as { e1: string; s1: string; e2: string; s2: string };
  if (e1 && s2 && !s1 && !e2) {
    return parseHM(s2) - parseHM(e1);
  }
  if (e1 && s1 && e2 && s2) {
    return (parseHM(s1) - parseHM(e1)) + (parseHM(s2) - parseHM(e2));
  }
  return 0;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  const agora = new Date();
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);

  const diaSemana = DIAS_SEMANA[agora.getDay()];
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  try {
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    seteDiasAtras.setHours(0, 0, 0, 0);

    const [funcionarios, ausencias, feriados, pontosUltimaSemana] = await Promise.all([
      prisma.usuario.findMany({
        where: {
          empresaId: session.user.empresaId,
          cargo: { not: 'ADMIN' },
        },
        select: {
          id: true,
          nome: true,
          jornada: true,
          pontos: {
            where: {
              dataHora: { gte: inicioDoDia, lte: fimDoDia },
            },
            orderBy: { dataHora: 'asc' },
          },
        },
      }),
      prisma.ausencia.findMany({
        where: {
          status: 'APROVADO',
          dataInicio: { lte: fimDoDia },
          dataFim: { gte: inicioDoDia },
          usuario: {
            empresaId: session.user.empresaId,
            cargo: { not: 'ADMIN' },
          },
        },
        select: { usuarioId: true },
      }),
      prisma.feriado.findMany({
        where: {
          empresaId: session.user.empresaId,
          data: { gte: inicioDoDia, lte: fimDoDia },
        },
      }),
      prisma.ponto.findMany({
        where: {
          usuario: {
            empresaId: session.user.empresaId,
            cargo: { not: 'ADMIN' },
          },
          dataHora: { gte: seteDiasAtras, lt: inicioDoDia },
        },
        select: { usuarioId: true, dataHora: true, tipo: true, subTipo: true },
        orderBy: { dataHora: 'asc' },
      }),
    ]);

    const ausenciaIds = new Set(ausencias.map((a) => a.usuarioId));
    const ehFeriado = feriados.length > 0;

    type Alerta =
      | { tipo: 'ATRASO'; funcionarioId: string; funcionarioNome: string; horarioConfigurado: string; minutosAtraso: number }
      | { tipo: 'AUSENCIA_SEM_JUSTIFICATIVA'; funcionarioId: string; funcionarioNome: string; horarioConfigurado: string }
      | { tipo: 'HORA_EXTRA'; funcionarioId: string; funcionarioNome: string; minutosTrabalhadosHoje: number; metaMinutosHoje: number; minutosExtra: number }
      | { tipo: 'SAIU_CEDO'; funcionarioId: string; funcionarioNome: string; minutosTrabalhadosHoje: number; metaMinutosHoje: number; minutosFaltantes: number }
      | { tipo: 'PADRAO_ATRASO'; funcionarioId: string; funcionarioNome: string; diasAtrasado: number; diasAnalisados: number; mensagem: string };

    const alertas: Alerta[] = [];

    for (const func of funcionarios) {
      const jornada = func.jornada as Record<string, Record<string, string | boolean>> | null;
      if (!jornada) continue;

      const diaConfig = jornada[diaSemana];
      if (!diaConfig || !diaConfig.ativo) continue;

      const e1 = diaConfig.e1 as string;
      if (!e1) continue;

      const e1Minutos = parseHM(e1);
      const metaMinutosHoje = calcularMetaMinutos(diaConfig);
      const pontos = func.pontos;
      const temAusencia = ausenciaIds.has(func.id);

      // Check for pontos of type ENTRADA or PONTO
      const temEntrada = pontos.some((p) => {
        const tipo = p.subTipo || p.tipo;
        return ['ENTRADA', 'PONTO'].includes(tipo);
      });

      // a) Atrasos
      if (minutosAgora > e1Minutos + 15 && !temEntrada && !temAusencia) {
        // If also qualifies for ausencia sem justificativa, skip atraso
        if (!(minutosAgora > e1Minutos + 60 && pontos.length === 0 && !temAusencia && !ehFeriado)) {
          alertas.push({
            tipo: 'ATRASO',
            funcionarioId: func.id,
            funcionarioNome: func.nome,
            horarioConfigurado: e1,
            minutosAtraso: minutosAgora - e1Minutos,
          });
        }
      }

      // b) Ausência sem justificativa
      if (minutosAgora > e1Minutos + 60 && pontos.length === 0 && !temAusencia && !ehFeriado) {
        alertas.push({
          tipo: 'AUSENCIA_SEM_JUSTIFICATIVA',
          funcionarioId: func.id,
          funcionarioNome: func.nome,
          horarioConfigurado: e1,
        });
      }

      // Calculate minutes worked today (same logic as agora/route.ts)
      let minutosTrabalhadosHoje = 0;
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
              if (diff > 0 && diff < 1440) minutosTrabalhadosHoje += diff;
              i++;
            } else {
              const diff = Math.floor((agora.getTime() - entrada.getTime()) / 60000);
              if (diff > 0) minutosTrabalhadosHoje += diff;
            }
          } else {
            const diff = Math.floor((agora.getTime() - entrada.getTime()) / 60000);
            if (diff > 0) minutosTrabalhadosHoje += diff;
          }
        }
      }

      if (pontos.length > 0) {
        const ultimoPonto = pontos[pontos.length - 1];
        const ultimoTipo = ultimoPonto.subTipo || ultimoPonto.tipo;

        // c) Hora extra excessiva
        if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(ultimoTipo)) {
          if (metaMinutosHoje > 0 && minutosTrabalhadosHoje > metaMinutosHoje + 120) {
            alertas.push({
              tipo: 'HORA_EXTRA',
              funcionarioId: func.id,
              funcionarioNome: func.nome,
              minutosTrabalhadosHoje,
              metaMinutosHoje,
              minutosExtra: minutosTrabalhadosHoje - metaMinutosHoje,
            });
          }
        }

        // d) Saiu mais cedo
        if (ultimoTipo === 'SAIDA') {
          if (metaMinutosHoje > 0 && minutosTrabalhadosHoje < metaMinutosHoje - 30) {
            alertas.push({
              tipo: 'SAIU_CEDO',
              funcionarioId: func.id,
              funcionarioNome: func.nome,
              minutosTrabalhadosHoje,
              metaMinutosHoje,
              minutosFaltantes: metaMinutosHoje - minutosTrabalhadosHoje,
            });
          }
        }
      }
    }

    // e) Padrão de atraso — análise dos últimos 7 dias corridos (até 5 dias úteis)
    const pontosPorFuncDia = new Map<string, Map<string, { dataHora: Date; tipo: string; subTipo: string | null }[]>>();
    for (const p of pontosUltimaSemana) {
      const d = new Date(p.dataHora);
      const chaveData = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!pontosPorFuncDia.has(p.usuarioId)) pontosPorFuncDia.set(p.usuarioId, new Map());
      const diasMap = pontosPorFuncDia.get(p.usuarioId)!;
      if (!diasMap.has(chaveData)) diasMap.set(chaveData, []);
      diasMap.get(chaveData)!.push({ dataHora: new Date(p.dataHora), tipo: p.tipo, subTipo: p.subTipo });
    }

    for (const func of funcionarios) {
      const jornada = func.jornada as Record<string, Record<string, string | boolean>> | null;
      if (!jornada) continue;

      const diasMap = pontosPorFuncDia.get(func.id);
      if (!diasMap) continue;

      let diasAnalisados = 0;
      let diasAtrasado = 0;

      for (const [chaveData, pontosDia] of diasMap.entries()) {
        const [ano, mes, dia] = chaveData.split('-').map(Number);
        const dataDia = new Date(ano, mes - 1, dia);
        const diaSem = DIAS_SEMANA[dataDia.getDay()];
        const diaConfig = jornada[diaSem];

        if (!diaConfig || !diaConfig.ativo) continue;

        const e1Str = diaConfig.e1 as string;
        if (!e1Str) continue;

        diasAnalisados++;

        const e1Min = parseHM(e1Str);
        const primeiraEntrada = pontosDia.find((p) => {
          const t = p.subTipo || p.tipo;
          return ['ENTRADA', 'PONTO'].includes(t);
        });

        if (primeiraEntrada) {
          const entradaMin = primeiraEntrada.dataHora.getHours() * 60 + primeiraEntrada.dataHora.getMinutes();
          if (entradaMin > e1Min + 10) {
            diasAtrasado++;
          }
        }
      }

      if (diasAnalisados >= 3 && diasAtrasado >= 3) {
        alertas.push({
          tipo: 'PADRAO_ATRASO',
          funcionarioId: func.id,
          funcionarioNome: func.nome,
          diasAtrasado,
          diasAnalisados,
          mensagem: `Chegou atrasado ${diasAtrasado} dos últimos ${diasAnalisados} dias`,
        });
      }
    }

    alertas.sort((a, b) => a.tipo.localeCompare(b.tipo));

    const resumo = {
      atrasos: alertas.filter((a) => a.tipo === 'ATRASO').length,
      ausenciasSemJustificativa: alertas.filter((a) => a.tipo === 'AUSENCIA_SEM_JUSTIFICATIVA').length,
      horaExtra: alertas.filter((a) => a.tipo === 'HORA_EXTRA').length,
      saiuCedo: alertas.filter((a) => a.tipo === 'SAIU_CEDO').length,
      padroesAtraso: alertas.filter((a) => a.tipo === 'PADRAO_ATRASO').length,
    };

    return NextResponse.json({ alertas, resumo });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao buscar alertas' }, { status: 500 });
  }
}
