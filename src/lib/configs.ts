import { prisma } from '@/lib/db';

const cache = new Map<string, { valor: string; expiraEm: number }>();
const TTL_MS = 60_000;

/**
 * Lê uma config do DB com cache (1 min). Retorna o default se não existir ou se der erro.
 */
export async function getConfig(chave: string, defaultValue: string): Promise<string> {
  const c = cache.get(chave);
  if (c && c.expiraEm > Date.now()) return c.valor;

  try {
    const row = await (prisma as any).configSistema.findUnique({ where: { chave } });
    const valor = row?.valor ?? defaultValue;
    cache.set(chave, { valor, expiraEm: Date.now() + TTL_MS });
    return valor;
  } catch {
    return defaultValue;
  }
}

export async function getConfigNumber(chave: string, defaultValue: number): Promise<number> {
  const v = await getConfig(chave, String(defaultValue));
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultValue;
}

export async function getConfigBoolean(chave: string, defaultValue: boolean): Promise<boolean> {
  const v = await getConfig(chave, defaultValue ? 'true' : 'false');
  return v === 'true' || v === '1';
}

/** Limpa o cache de uma chave específica (chamar quando atualizar via PUT). */
export function invalidateConfig(chave: string) {
  cache.delete(chave);
}

export const CONFIGS = {
  TRIAL_DIAS_PADRAO: 'trial.dias_padrao',
  COBRANCA_DIA_VENCIMENTO: 'cobranca.dia_vencimento_padrao',
  COBRANCA_TOLERANCIA: 'cobranca.tolerancia_dias',
  REVENDEDOR_COMISSAO: 'revendedor.comissao_padrao',
  MSG_COBRANCA_ATRASO: 'mensagem.cobranca_atraso',
  MSG_TRIAL_EXPIRANDO: 'mensagem.trial_expirando',
  MSG_BOAS_VINDAS: 'mensagem.boas_vindas_admin',
  SIGNUP_VERIFICAR_WHATSAPP: 'signup.verificar_whatsapp',
  SIGNUP_CANAL_WHATSAPP_DISPONIVEL: 'signup.canal_whatsapp_disponivel',
  AGENDAMENTO_CONFIRMAR_AUTOMATICO: 'agendamento.confirmar_automatico',
  AGENDAMENTO_LEMBRETE_1H: 'agendamento.lembrete_1h',
  AGENDAMENTO_CANAL_DEFAULT: 'agendamento.canal_default',
  AGENDAMENTO_ANTECEDENCIA_MIN_MIN: 'agendamento.antecedencia_min_min',
  AGENDAMENTO_ANTECEDENCIA_MAX_DIAS: 'agendamento.antecedencia_max_dias',
} as const;
