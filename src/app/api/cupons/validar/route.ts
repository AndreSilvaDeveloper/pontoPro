import { NextResponse } from 'next/server';
import { validarCupom } from '@/lib/cupons';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `cupom-validar:${ip}`, max: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, erro: 'rate_limit', mensagem: 'Muitas tentativas. Aguarde um instante.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const codigo = String(body?.codigo || '').trim();
  if (!codigo) {
    return NextResponse.json({ ok: false, erro: 'codigo_obrigatorio', mensagem: 'Digite um código.' }, { status: 400 });
  }

  const contexto: any = {};
  if (body?.plano) contexto.plano = String(body.plano);
  if (body?.ciclo === 'MONTHLY' || body?.ciclo === 'YEARLY') contexto.ciclo = body.ciclo;
  if (Number.isFinite(Number(body?.valorMensal))) contexto.valorMensal = Number(body.valorMensal);

  const r = await validarCupom(codigo, contexto);
  return NextResponse.json(r);
}
