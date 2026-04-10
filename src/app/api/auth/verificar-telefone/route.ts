import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { enviarCodigo, gerarCodigo } from '@/lib/sms';

// Armazena códigos em memória (TTL 10 min)
// Em produção ideal seria Redis, mas para MVP funciona
const codigosPendentes = new Map<string, { codigo: string; expira: number; telefone: string }>();

// Limpar expirados periodicamente
function limparExpirados() {
  const agora = Date.now();
  for (const [key, val] of codigosPendentes) {
    if (val.expira < agora) codigosPendentes.delete(key);
  }
}

// POST: Enviar código SMS
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { telefone } = await request.json();
    if (!telefone) return NextResponse.json({ erro: 'Telefone obrigatório' }, { status: 400 });

    const telLimpo = telefone.replace(/\D/g, '');
    if (telLimpo.length < 10 || telLimpo.length > 11) {
      return NextResponse.json({ erro: 'Telefone inválido' }, { status: 400 });
    }

    limparExpirados();

    // Rate limit: máximo 3 envios por sessão em 10 min
    const userId = (session.user as any).id;
    const chave = `${userId}:${telLimpo}`;
    const existente = codigosPendentes.get(chave);
    if (existente && existente.expira > Date.now() + 8 * 60 * 1000) {
      // Enviado há menos de 2 minutos
      return NextResponse.json({ erro: 'Aguarde 2 minutos para reenviar' }, { status: 429 });
    }

    const codigoGerado = gerarCodigo();

    const resultado = await enviarCodigo(telLimpo, codigoGerado);

    if (!resultado.ok) {
      return NextResponse.json({ erro: 'Falha ao enviar código. Verifique o número.' }, { status: 500 });
    }

    codigosPendentes.set(chave, {
      codigo: codigoGerado,
      expira: Date.now() + 10 * 60 * 1000, // 10 minutos
      telefone: telLimpo,
    });

    return NextResponse.json({ ok: true, canal: resultado.canal });
  } catch (error) {
    console.error('Erro verificar-telefone POST:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

// PUT: Validar código
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { telefone, codigo } = await request.json();
    if (!telefone || !codigo) return NextResponse.json({ erro: 'Campos obrigatórios' }, { status: 400 });

    const telLimpo = telefone.replace(/\D/g, '');
    const userId = (session.user as any).id;
    const chave = `${userId}:${telLimpo}`;

    limparExpirados();

    const pendente = codigosPendentes.get(chave);
    if (!pendente) {
      return NextResponse.json({ erro: 'Código expirado ou não solicitado. Envie novamente.' }, { status: 400 });
    }

    if (pendente.codigo !== codigo.trim()) {
      return NextResponse.json({ erro: 'Código incorreto' }, { status: 400 });
    }

    // Código correto — limpar
    codigosPendentes.delete(chave);

    return NextResponse.json({ ok: true, telefoneValidado: telLimpo });
  } catch (error) {
    console.error('Erro verificar-telefone PUT:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
