import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { getConfigBoolean, CONFIGS } from '@/lib/configs';
import { pedirCodigoWhatsapp, validarCodigoWhatsapp } from '@/lib/whatsappVerification';

export const runtime = 'nodejs';

// POST: enviar código de verificação
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `verif-wa:${ip}`, max: 5, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    );
  }

  const ativo = await getConfigBoolean(CONFIGS.SIGNUP_VERIFICAR_WHATSAPP, false);
  if (!ativo) {
    return NextResponse.json({ ok: true, skipVerification: true });
  }

  const body = await req.json().catch(() => null);
  const telefone = String(body?.telefone || '').trim();
  if (!telefone) {
    return NextResponse.json({ ok: false, erro: 'Informe o telefone.' }, { status: 400 });
  }
  const canal = body?.canal === 'whatsapp' ? 'whatsapp' : 'sms';

  const r = await pedirCodigoWhatsapp(telefone, canal);
  if (!r.ok) {
    return NextResponse.json({ ok: false, erro: r.erro }, { status: 400 });
  }

  return NextResponse.json({ ok: true, canal: r.canal });
}

// PUT: validar código
export async function PUT(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `verif-wa-put:${ip}`, max: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    );
  }

  const body = await req.json().catch(() => null);
  const telefone = String(body?.telefone || '').trim();
  const codigo = String(body?.codigo || '').trim();
  if (!telefone || !codigo) {
    return NextResponse.json({ ok: false, erro: 'Telefone e código são obrigatórios.' }, { status: 400 });
  }

  const r = await validarCodigoWhatsapp(telefone, codigo);
  if (!r.ok) {
    return NextResponse.json({ ok: false, erro: r.erro }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
