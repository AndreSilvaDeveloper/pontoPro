import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { enviarOtp, validarOtp, type CanalMensagem } from '@/lib/messaging';

// POST: enviar código de verificação
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({} as any));
    const telefone = String(body?.telefone || '').trim();
    if (!telefone) return NextResponse.json({ erro: 'Telefone obrigatório' }, { status: 400 });

    const telLimpo = telefone.replace(/\D/g, '');
    if (telLimpo.length < 10 || telLimpo.length > 11) {
      return NextResponse.json({ erro: 'Telefone inválido' }, { status: 400 });
    }

    if (process.env.SMS_VERIFICACAO_ENABLED !== 'true') {
      return NextResponse.json({ ok: true, skipVerification: true });
    }

    const canal: CanalMensagem = body?.canal === 'whatsapp' ? 'whatsapp' : 'sms';
    const resultado = await enviarOtp(telLimpo, canal);

    if (!resultado.ok) {
      return NextResponse.json(
        { erro: 'Falha ao enviar código. Verifique o número.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, canal: resultado.canal });
  } catch (error) {
    console.error('Erro verificar-telefone POST:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

// PUT: validar código
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { telefone, codigo } = await request.json();
    if (!telefone || !codigo) return NextResponse.json({ erro: 'Campos obrigatórios' }, { status: 400 });

    const telLimpo = String(telefone).replace(/\D/g, '');
    const resultado = await validarOtp(telLimpo, String(codigo).trim());
    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.erro }, { status: 400 });
    }

    return NextResponse.json({ ok: true, telefoneValidado: telLimpo });
  } catch (error) {
    console.error('Erro verificar-telefone PUT:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
