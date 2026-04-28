import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
);

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || '';
const TWILIO_WHATSAPP = process.env.TWILIO_WHATSAPP_NUMBER || '';

function formatarE164(telefone: string): string {
  let numero = telefone.replace(/\D/g, '');
  if (!numero.startsWith('55')) numero = '55' + numero;
  return '+' + numero;
}

/**
 * Envia SMS via Twilio
 */
export async function enviarSMS(telefone: string, mensagem: string): Promise<boolean> {
  const destino = formatarE164(telefone);
  try {
    const msg = await client.messages.create({
      body: mensagem,
      from: TWILIO_PHONE,
      to: destino,
    });
    console.log(`📱 SMS enviado para ${destino} (sid: ${msg.sid}, status: ${msg.status})`);
    return true;
  } catch (error: any) {
    console.error(`❌ SMS falhou para ${destino}:`, error?.code, error?.message || error);
    return false;
  }
}

/**
 * Envia WhatsApp via Twilio
 */
export async function enviarWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
  const destino = `whatsapp:${formatarE164(telefone)}`;
  try {
    const from = TWILIO_WHATSAPP ? `whatsapp:${TWILIO_WHATSAPP}` : `whatsapp:${TWILIO_PHONE}`;
    const msg = await client.messages.create({
      body: mensagem,
      from,
      to: destino,
    });
    console.log(`💬 WhatsApp enviado para ${destino} (sid: ${msg.sid}, status: ${msg.status})`);
    return true;
  } catch (error: any) {
    console.error(`❌ WhatsApp falhou para ${destino}:`, error?.code, error?.message || error);
    return false;
  }
}

/**
 * Envia código de verificação — tenta WhatsApp primeiro, fallback para SMS
 */
export async function enviarCodigo(telefone: string, codigo: string): Promise<{ ok: boolean; canal: 'whatsapp' | 'sms' }> {
  const mensagem = `${codigo} e seu codigo WorkID. Nao compartilhe com ninguem.`;

  // Tenta WhatsApp primeiro (mais barato)
  if (TWILIO_WHATSAPP) {
    const whatsOk = await enviarWhatsApp(telefone, mensagem);
    if (whatsOk) return { ok: true, canal: 'whatsapp' };
  }

  // Fallback para SMS
  const smsOk = await enviarSMS(telefone, mensagem);
  return { ok: smsOk, canal: 'sms' };
}

/**
 * Gera código de verificação de 6 dígitos
 */
export function gerarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
