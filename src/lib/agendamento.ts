import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export const TZ_AGENDA = 'America/Sao_Paulo';

// Janela de atendimento por dia da semana (0=dom .. 6=sab).
// Slots de 30 min de [inicio, fim). Domingo fechado.
export const JANELAS: Record<number, { inicio: number; fim: number } | null> = {
  0: null,
  1: { inicio: 9, fim: 21 },
  2: { inicio: 9, fim: 21 },
  3: { inicio: 9, fim: 21 },
  4: { inicio: 9, fim: 21 },
  5: { inicio: 9, fim: 21 },
  6: { inicio: 9, fim: 15 },
};

export function diaSemanaDe(dia: string): number {
  const [ano, mes, dd] = dia.split('-').map(Number);
  // meio-dia UTC evita ambiguidade na borda de meia-noite por timezone.
  return new Date(Date.UTC(ano, mes - 1, dd, 12, 0, 0)).getUTCDay();
}

export function gerarSlots(diaSemana: number): string[] {
  const j = JANELAS[diaSemana];
  if (!j) return [];
  const out: string[] = [];
  for (let h = j.inicio; h < j.fim; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
}

export function estaDentroDaJanela(dia: string, horario: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  if (!/^\d{2}:\d{2}$/.test(horario)) return false;
  const slots = gerarSlots(diaSemanaDe(dia));
  return slots.includes(horario);
}

export function dataHoraDoSlot(dia: string, horario: string): Date {
  return fromZonedTime(`${dia}T${horario}:00`, TZ_AGENDA);
}

export function horarioDoSlot(dt: Date): string {
  return formatInTimeZone(dt, TZ_AGENDA, 'HH:mm');
}
