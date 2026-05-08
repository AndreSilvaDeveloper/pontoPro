import { NextResponse } from 'next/server';
import { getConfigBoolean, CONFIGS } from '@/lib/configs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configurações públicas do fluxo de signup que o frontend precisa pra
// renderizar a UI (canais de verificação, etc). Sem dados sensíveis.
export async function GET() {
  const verificacaoAtiva = await getConfigBoolean(CONFIGS.SIGNUP_VERIFICAR_WHATSAPP, false);
  const whatsappDisponivel = await getConfigBoolean(CONFIGS.SIGNUP_CANAL_WHATSAPP_DISPONIVEL, false);
  const canais: ('sms' | 'whatsapp')[] = ['sms'];
  if (whatsappDisponivel) canais.push('whatsapp');
  return NextResponse.json({ verificacaoAtiva, canais });
}
