import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || '';

const SMS_FROM = process.env.TWILIO_PHONE_NUMBER || '';
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER || '';

let cached: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (cached) return cached;
  if (!accountSid || !authToken) {
    throw new Error('Twilio não configurado: TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN ausentes.');
  }
  cached = twilio(accountSid, authToken);
  return cached;
}

export type CanalMensagem = 'sms' | 'whatsapp';

export function formatarE164(telefone: string): string {
  let numero = String(telefone).replace(/\D/g, '');
  if (!numero.startsWith('55')) numero = '55' + numero;
  return '+' + numero;
}

// ============================================================
// Verify (códigos de verificação / OTP)
// ============================================================

export type EnviarOtpResult =
  | { ok: true; canal: CanalMensagem; sid: string }
  | { ok: false; canal: CanalMensagem; erro: string; codigo?: string };

export async function enviarOtp(
  telefone: string,
  canal: CanalMensagem = 'sms'
): Promise<EnviarOtpResult> {
  if (!verifyServiceSid) {
    return { ok: false, canal, erro: 'Verify Service não configurado.' };
  }
  const to = formatarE164(telefone);
  try {
    const verification = await getClient()
      .verify.v2.services(verifyServiceSid)
      .verifications.create({ to, channel: canal, locale: 'pt-br' });
    return { ok: true, canal, sid: verification.sid };
  } catch (err: any) {
    console.error(`[messaging] enviarOtp ${canal} → ${to}:`, err?.code, err?.message);
    return {
      ok: false,
      canal,
      erro: err?.message || 'Falha ao enviar código.',
      codigo: err?.code != null ? String(err.code) : undefined,
    };
  }
}

export type ValidarOtpResult =
  | { ok: true; status: string }
  | { ok: false; erro: string };

export async function validarOtp(telefone: string, codigo: string): Promise<ValidarOtpResult> {
  if (!verifyServiceSid) return { ok: false, erro: 'Verify Service não configurado.' };
  const to = formatarE164(telefone);
  try {
    const check = await getClient()
      .verify.v2.services(verifyServiceSid)
      .verificationChecks.create({ to, code: String(codigo).trim() });
    if (check.status === 'approved' && check.valid) {
      return { ok: true, status: check.status };
    }
    return { ok: false, erro: 'Código incorreto.' };
  } catch (err: any) {
    // Twilio devolve 404 quando não tem verificação pendente pra esse número (expirou ou nunca foi enviada).
    if (err?.code === 20404 || err?.status === 404) {
      return { ok: false, erro: 'Código expirado. Solicite um novo.' };
    }
    console.error('[messaging] validarOtp:', err?.code, err?.message);
    return { ok: false, erro: 'Não foi possível validar agora.' };
  }
}

// ============================================================
// Programmable Messaging (mensagens transacionais arbitrárias)
// ============================================================

export type EnviarMensagemResult =
  | { ok: true; sid: string; canal: CanalMensagem }
  | { ok: false; erro: string; codigo?: string; canal: CanalMensagem };

export async function enviarMensagem(
  telefone: string,
  body: string,
  canal: CanalMensagem = 'sms'
): Promise<EnviarMensagemResult> {
  const to = formatarE164(telefone);
  try {
    const params: Parameters<ReturnType<typeof getClient>['messages']['create']>[0] = { body, to: '', from: '' };
    if (canal === 'whatsapp') {
      if (!WHATSAPP_FROM) {
        return { ok: false, canal, erro: 'TWILIO_WHATSAPP_NUMBER não configurado.' };
      }
      params.from = `whatsapp:${WHATSAPP_FROM}`;
      params.to = `whatsapp:${to}`;
    } else {
      if (!SMS_FROM) {
        return { ok: false, canal, erro: 'TWILIO_PHONE_NUMBER não configurado.' };
      }
      params.from = SMS_FROM;
      params.to = to;
    }
    const msg = await getClient().messages.create(params);
    return { ok: true, sid: msg.sid, canal };
  } catch (err: any) {
    console.error(`[messaging] enviarMensagem ${canal} → ${to}:`, err?.code, err?.message);
    return {
      ok: false,
      canal,
      erro: err?.message || 'Falha ao enviar mensagem.',
      codigo: err?.code != null ? String(err.code) : undefined,
    };
  }
}

// Tenta WhatsApp primeiro, cai pra SMS se falhar. Útil pra confirmações/lembretes
// onde o canal preferido pode ser WhatsApp mas SMS é o fallback garantido.
export async function enviarMensagemPreferindo(
  telefone: string,
  body: string,
  preferido: CanalMensagem = 'whatsapp'
): Promise<EnviarMensagemResult> {
  const primeira = await enviarMensagem(telefone, body, preferido);
  if (primeira.ok) return primeira;
  const fallback: CanalMensagem = preferido === 'whatsapp' ? 'sms' : 'whatsapp';
  if (preferido === fallback) return primeira;
  return enviarMensagem(telefone, body, fallback);
}
