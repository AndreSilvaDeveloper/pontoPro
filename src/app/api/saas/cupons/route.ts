import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

const TIPOS_VALIDOS = ['PERCENTUAL', 'VALOR_FIXO', 'MESES_GRATIS', 'TRIAL_ESTENDIDO'];

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return {
    ok: (session?.user as any)?.cargo === 'SUPER_ADMIN',
    userId: (session?.user as any)?.id as string | undefined,
    userName: (session?.user as any)?.name as string | undefined,
  };
}

export async function GET() {
  const auth = await isSuperAdmin();
  if (!auth.ok) return NextResponse.json({ erro: 'forbidden' }, { status: 403 });

  const cupons = await (prisma as any).cupom.findMany({
    orderBy: { criadoEm: 'desc' },
  });

  return NextResponse.json({
    cupons: cupons.map((c: any) => ({ ...c, valor: Number(c.valor) })),
  });
}

export async function POST(req: Request) {
  const auth = await isSuperAdmin();
  if (!auth.ok) return NextResponse.json({ erro: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'body_invalido' }, { status: 400 });

  const codigo = String(body.codigo || '').trim().toUpperCase();
  const nome = String(body.nome || '').trim();
  const tipo = String(body.tipo || '');
  const valor = Number(body.valor);

  if (!codigo) return NextResponse.json({ erro: 'codigo_obrigatorio' }, { status: 400 });
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) {
    return NextResponse.json({ erro: 'codigo_invalido', mensagem: 'Código deve ter 3-30 caracteres (letras, números, _, -)' }, { status: 400 });
  }
  if (!nome) return NextResponse.json({ erro: 'nome_obrigatorio' }, { status: 400 });
  if (!TIPOS_VALIDOS.includes(tipo)) return NextResponse.json({ erro: 'tipo_invalido' }, { status: 400 });
  if (!Number.isFinite(valor) || valor < 0) return NextResponse.json({ erro: 'valor_invalido' }, { status: 400 });
  if (tipo === 'PERCENTUAL' && (valor <= 0 || valor > 100)) {
    return NextResponse.json({ erro: 'valor_invalido', mensagem: 'Percentual deve estar entre 1 e 100' }, { status: 400 });
  }

  const existente = await (prisma as any).cupom.findUnique({ where: { codigo } });
  if (existente) return NextResponse.json({ erro: 'codigo_duplicado' }, { status: 409 });

  const cupom = await (prisma as any).cupom.create({
    data: {
      codigo,
      nome,
      tipo,
      valor,
      duracaoMeses: Number.isFinite(Number(body.duracaoMeses)) ? Number(body.duracaoMeses) : 1,
      descricao: body.descricao ? String(body.descricao) : null,
      ativo: body.ativo !== false,
      visivelLanding: body.visivelLanding === true,
      destaque: body.destaque ? String(body.destaque) : null,
      validoDe: body.validoDe ? new Date(body.validoDe) : null,
      validoAte: body.validoAte ? new Date(body.validoAte) : null,
      maxUsos: Number.isFinite(Number(body.maxUsos)) && Number(body.maxUsos) > 0 ? Number(body.maxUsos) : null,
      apenasNovos: body.apenasNovos === true,
      apenasPlanos: Array.isArray(body.apenasPlanos) ? body.apenasPlanos : [],
      apenasCiclo: body.apenasCiclo === 'MONTHLY' || body.apenasCiclo === 'YEARLY' ? body.apenasCiclo : null,
      criadoPor: auth.userId || null,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      acao: 'CUPOM_CRIADO',
      detalhes: `Cupom ${codigo} (${tipo}, valor ${valor}) criado`,
      adminNome: auth.userName || 'Super Admin',
      adminId: auth.userId || 'desconhecido',
      empresaId: 'SEM_EMPRESA',
    },
  });

  try { revalidatePath('/landing'); revalidatePath('/'); } catch {}

  return NextResponse.json({ ok: true, cupom });
}
