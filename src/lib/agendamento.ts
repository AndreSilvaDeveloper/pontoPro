import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { getConfigJson, getConfigNumber, getConfig, CONFIGS } from '@/lib/configs';

export const TZ_AGENDA = 'America/Sao_Paulo';

export type JanelaDia = { inicio: number; fim: number } | null;
export type Janelas = Record<string, JanelaDia>;

// Fallback usado quando a config ainda não existe / vem inválida.
// Slots gerados de [inicio, fim) — domingo fechado.
export const JANELAS_FALLBACK: Janelas = {
  '0': null,
  '1': { inicio: 9, fim: 21 },
  '2': { inicio: 9, fim: 21 },
  '3': { inicio: 9, fim: 21 },
  '4': { inicio: 9, fim: 21 },
  '5': { inicio: 9, fim: 21 },
  '6': { inicio: 9, fim: 15 },
};

export function diaSemanaDe(dia: string): number {
  const [ano, mes, dd] = dia.split('-').map(Number);
  // meio-dia UTC evita ambiguidade na borda de meia-noite por timezone.
  return new Date(Date.UTC(ano, mes - 1, dd, 12, 0, 0)).getUTCDay();
}

export async function getJanelas(): Promise<Janelas> {
  const janelas = await getConfigJson<Janelas>(CONFIGS.AGENDAMENTO_JANELAS, JANELAS_FALLBACK);
  return janelas && typeof janelas === 'object' ? janelas : JANELAS_FALLBACK;
}

export async function getSlotDuracao(): Promise<number> {
  const v = await getConfigNumber(CONFIGS.AGENDAMENTO_SLOT_DURACAO_MIN, 30);
  // 5 a 240 min: clamp defensivo pra evitar config quebrada gerar loop ou nenhum slot.
  if (!Number.isFinite(v) || v < 5) return 30;
  if (v > 240) return 240;
  return v;
}

export async function getFeriadosBloqueados(): Promise<Set<string>> {
  const raw = await getConfig(CONFIGS.AGENDAMENTO_FERIADOS_BLOQUEADOS, '');
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map(s => s.trim())
      .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s))
  );
}

export async function gerarSlots(diaSemana: number): Promise<string[]> {
  const janelas = await getJanelas();
  const j = janelas[String(diaSemana)];
  if (!j) return [];
  const duracao = await getSlotDuracao();
  const out: string[] = [];
  const inicioMin = j.inicio * 60;
  const fimMin = j.fim * 60;
  for (let m = inicioMin; m < fimMin; m += duracao) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return out;
}

export async function estaDentroDaJanela(dia: string, horario: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  if (!/^\d{2}:\d{2}$/.test(horario)) return false;
  const feriados = await getFeriadosBloqueados();
  if (feriados.has(dia)) return false;
  const slots = await gerarSlots(diaSemanaDe(dia));
  return slots.includes(horario);
}

export function dataHoraDoSlot(dia: string, horario: string): Date {
  return fromZonedTime(`${dia}T${horario}:00`, TZ_AGENDA);
}

export function horarioDoSlot(dt: Date): string {
  return formatInTimeZone(dt, TZ_AGENDA, 'HH:mm');
}
