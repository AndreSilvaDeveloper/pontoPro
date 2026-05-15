import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { fromZonedTime } from 'date-fns-tz';
import {
  TZ_AGENDA,
  diaSemanaDe,
  gerarSlots,
  horarioDoSlot,
  getFeriadosBloqueados,
} from '@/lib/agendamento';
import { getConfigNumber, CONFIGS } from '@/lib/configs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `horarios:${ip}`, max: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { erro: 'Muitas requisições.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    );
  }

  const { searchParams } = new URL(req.url);
  const dia = searchParams.get('dia') || '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
    return NextResponse.json(
      { erro: 'Parâmetro "dia" inválido. Use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  const diaSemana = diaSemanaDe(dia);
  const slots = await gerarSlots(diaSemana);
  if (slots.length === 0) {
    return NextResponse.json({ dia, diaSemana, slots: [], fechado: true });
  }

  // Feriados bloqueados pela super admin (ex.: 2026-12-25).
  const feriados = await getFeriadosBloqueados();
  if (feriados.has(dia)) {
    return NextResponse.json({ dia, diaSemana, slots: [], fechado: true });
  }

  const inicioDia = fromZonedTime(`${dia}T00:00:00`, TZ_AGENDA);
  const fimDia = fromZonedTime(`${dia}T23:59:59.999`, TZ_AGENDA);

  const agendados = await prisma.agendamento.findMany({
    where: {
      dataHora: { gte: inicioDia, lte: fimDia },
      status: { not: 'CANCELADO' },
    },
    select: { dataHora: true },
  });

  const ocupados = new Set(agendados.map(a => horarioDoSlot(a.dataHora)));

  const minMinutos = await getConfigNumber(CONFIGS.AGENDAMENTO_ANTECEDENCIA_MIN_MIN, 60);
  const maxDias = await getConfigNumber(CONFIGS.AGENDAMENTO_ANTECEDENCIA_MAX_DIAS, 30);
  const agora = Date.now();
  const minTs = agora + minMinutos * 60_000;
  const maxTs = agora + maxDias * 24 * 60 * 60_000;

  const livres = slots.filter(s => {
    if (ocupados.has(s)) return false;
    const dt = fromZonedTime(`${dia}T${s}:00`, TZ_AGENDA).getTime();
    return dt >= minTs && dt <= maxTs;
  });

  return NextResponse.json({ dia, diaSemana, slots: livres, fechado: false });
}
