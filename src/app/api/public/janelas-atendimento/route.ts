import { NextResponse } from 'next/server';
import { getJanelas, getFeriadosBloqueados } from '@/lib/agendamento';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint público — informa à landing quais dias da semana estão ativos
 * (e quais datas estão bloqueadas como feriado).
 */
export async function GET() {
  const janelas = await getJanelas();
  const feriados = await getFeriadosBloqueados();
  return NextResponse.json({
    janelas,
    feriadosBloqueados: Array.from(feriados),
  });
}
