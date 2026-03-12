export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
const DIAS_SEMANA_LABEL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;

const parseHM = (h: string) => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const agora = new Date();
    const inicio28Dias = new Date();
    inicio28Dias.setDate(inicio28Dias.getDate() - 28);
    inicio28Dias.setHours(0, 0, 0, 0);

    const fimHoje = new Date();
    fimHoje.setHours(23, 59, 59, 999);

    const [funcionarios, pontos, ausencias, feriados] = await Promise.all([
      prisma.usuario.findMany({
        where: {
          empresaId: session.user.empresaId,
          cargo: { not: 'ADMIN' },
        },
        select: {
          id: true,
          jornada: true,
        },
      }),
      prisma.ponto.findMany({
        where: {
          usuario: {
            empresaId: session.user.empresaId,
            cargo: { not: 'ADMIN' },
          },
          dataHora: { gte: inicio28Dias, lte: fimHoje },
        },
        select: {
          usuarioId: true,
          dataHora: true,
          tipo: true,
          subTipo: true,
        },
        orderBy: { dataHora: 'asc' },
      }),
      prisma.ausencia.findMany({
        where: {
          status: 'APROVADO',
          dataInicio: { lte: fimHoje },
          dataFim: { gte: inicio28Dias },
          usuario: {
            empresaId: session.user.empresaId,
            cargo: { not: 'ADMIN' },
          },
        },
        select: {
          usuarioId: true,
          dataInicio: true,
          dataFim: true,
        },
      }),
      prisma.feriado.findMany({
        where: {
          empresaId: session.user.empresaId,
          data: { gte: inicio28Dias, lte: fimHoje },
        },
        select: { data: true },
      }),
    ]);

    // Index pontos by date and user
    const pontosPorDiaUsuario = new Map<string, Map<string, { dataHora: Date; tipo: string; subTipo: string | null }[]>>();
    for (const p of pontos) {
      const d = new Date(p.dataHora);
      const chaveData = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!pontosPorDiaUsuario.has(chaveData)) pontosPorDiaUsuario.set(chaveData, new Map());
      const diaMap = pontosPorDiaUsuario.get(chaveData)!;
      if (!diaMap.has(p.usuarioId)) diaMap.set(p.usuarioId, []);
      diaMap.get(p.usuarioId)!.push({ dataHora: new Date(p.dataHora), tipo: p.tipo, subTipo: p.subTipo });
    }

    // Index feriados by date string
    const feriadoSet = new Set(
      feriados.map((f) => {
        const d = new Date(f.data);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    );

    // Build daily data
    type DiaData = {
      data: string;
      diaSemana: string;
      presentes: number;
      ausentes: number;
      atrasados: number;
      mediaMinutosTrabalhados: number;
    };

    const dias: DiaData[] = [];

    for (let i = 27; i >= 0; i--) {
      const dia = new Date();
      dia.setDate(dia.getDate() - i);
      dia.setHours(0, 0, 0, 0);

      const dayOfWeek = dia.getDay();
      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const chaveData = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
      const diaSemana = DIAS_SEMANA[dayOfWeek];
      const diaSemanaLabel = DIAS_SEMANA_LABEL[dayOfWeek];

      // Skip feriados
      if (feriadoSet.has(chaveData)) continue;

      const diaMap = pontosPorDiaUsuario.get(chaveData) || new Map<string, { dataHora: Date; tipo: string; subTipo: string | null }[]>();

      let presentes = 0;
      let ausentes = 0;
      let atrasados = 0;
      let totalMinutosTrabalhados = 0;
      let funcionariosQueTrabalharam = 0;

      for (const func of funcionarios) {
        const jornada = func.jornada as Record<string, Record<string, string | boolean>> | null;
        if (!jornada) continue;

        const diaConfig = jornada[diaSemana];
        if (!diaConfig || !diaConfig.ativo) continue;

        const pontosFunc = diaMap.get(func.id) || [];

        // Check if has approved absence for this day
        const temAusencia = ausencias.some(
          (a) => a.usuarioId === func.id && new Date(a.dataInicio) <= dia && new Date(a.dataFim) >= dia
        );

        if (pontosFunc.length > 0) {
          presentes++;

          // Check lateness: first ENTRADA after e1 + 10min
          const e1 = diaConfig.e1 as string;
          if (e1) {
            const e1Min = parseHM(e1);
            const primeiraEntrada = pontosFunc.find((p: any) => {
              const t = p.subTipo || p.tipo;
              return ['ENTRADA', 'PONTO'].includes(t);
            });
            if (primeiraEntrada) {
              const entradaMin = primeiraEntrada.dataHora.getHours() * 60 + primeiraEntrada.dataHora.getMinutes();
              if (entradaMin > e1Min + 10) {
                atrasados++;
              }
            }
          }

          // Calculate minutes worked
          let minutosFunc = 0;
          for (let j = 0; j < pontosFunc.length; j++) {
            const p = pontosFunc[j];
            const tipo = p.subTipo || p.tipo;
            if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipo)) {
              const entrada = p.dataHora;
              const pSaida = pontosFunc[j + 1];
              if (pSaida) {
                const tipoSaida = pSaida.subTipo || pSaida.tipo;
                if (['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
                  const diff = Math.floor((pSaida.dataHora.getTime() - entrada.getTime()) / 60000);
                  if (diff > 0 && diff < 1440) minutosFunc += diff;
                  j++;
                }
              }
            }
          }

          if (minutosFunc > 0) {
            totalMinutosTrabalhados += minutosFunc;
            funcionariosQueTrabalharam++;
          }
        } else if (!temAusencia) {
          // Active weekday, no pontos, no approved absence
          ausentes++;
        }
      }

      dias.push({
        data: chaveData,
        diaSemana: diaSemanaLabel,
        presentes,
        ausentes,
        atrasados,
        mediaMinutosTrabalhados: funcionariosQueTrabalharam > 0 ? Math.round(totalMinutosTrabalhados / funcionariosQueTrabalharam) : 0,
      });
    }

    // Build weekly summaries
    type SemanaData = {
      semana: string;
      presentes: number;
      ausentes: number;
      atrasados: number;
      mediaHorasDia: string;
    };

    const semanas: SemanaData[] = [];

    // Group days into weeks (Mon-Fri blocks)
    let weekDays: DiaData[] = [];
    let weekStart: string | null = null;

    for (const dia of dias) {
      const d = new Date(dia.data);
      const dow = d.getDay();

      if (dow === 1 || weekStart === null) {
        // Start of a new week
        if (weekDays.length > 0 && weekStart) {
          const lastDay = weekDays[weekDays.length - 1];
          semanas.push(buildWeekSummary(weekStart, lastDay.data, weekDays));
        }
        weekDays = [dia];
        weekStart = dia.data;
      } else {
        weekDays.push(dia);
      }
    }

    // Push last week
    if (weekDays.length > 0 && weekStart) {
      const lastDay = weekDays[weekDays.length - 1];
      semanas.push(buildWeekSummary(weekStart, lastDay.data, weekDays));
    }

    return NextResponse.json({ dias, semanas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao buscar tendências' }, { status: 500 });
  }
}

function buildWeekSummary(startDate: string, endDate: string, days: { presentes: number; ausentes: number; atrasados: number; mediaMinutosTrabalhados: number }[]) {
  const formatLabel = (d: string) => {
    const [, m, dd] = d.split('-');
    return `${dd}/${m}`;
  };

  const totalPresentes = days.reduce((s, d) => s + d.presentes, 0);
  const totalAusentes = days.reduce((s, d) => s + d.ausentes, 0);
  const totalAtrasados = days.reduce((s, d) => s + d.atrasados, 0);
  const diasComMedia = days.filter((d) => d.mediaMinutosTrabalhados > 0);
  const avgMinutos = diasComMedia.length > 0
    ? Math.round(diasComMedia.reduce((s, d) => s + d.mediaMinutosTrabalhados, 0) / diasComMedia.length)
    : 0;
  const h = Math.floor(avgMinutos / 60);
  const m = avgMinutos % 60;

  return {
    semana: `${formatLabel(startDate)} - ${formatLabel(endDate)}`,
    presentes: totalPresentes,
    ausentes: totalAusentes,
    atrasados: totalAtrasados,
    mediaHorasDia: `${h}h${String(m).padStart(2, '0')}`,
  };
}
