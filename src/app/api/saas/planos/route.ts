import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { getPlanosFromDB } from '@/lib/planos-db';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

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

  const planos = await getPlanosFromDB();
  return NextResponse.json({ planos });
}

export async function PUT(req: Request) {
  const auth = await isSuperAdmin();
  if (!auth.ok) return NextResponse.json({ erro: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return NextResponse.json({ erro: 'id_obrigatorio' }, { status: 400 });
  }

  const existente = await (prisma as any).plano.findUnique({ where: { id: body.id } });
  if (!existente) {
    return NextResponse.json({ erro: 'plano_nao_encontrado' }, { status: 404 });
  }

  const camposPermitidos = [
    'nome', 'descricao', 'preco', 'maxFuncionarios', 'maxAdmins', 'maxFiliais',
    'extraFuncionario', 'extraAdmin', 'extraFilial',
    'reconhecimentoFacial', 'relatoriosPdf', 'suporte',
    'totemIncluso', 'totemAddonMatriz', 'totemAddonFilial',
    'ordem', 'destaque', 'visivel',
  ];

  const data: Record<string, any> = {};
  for (const c of camposPermitidos) {
    if (c in body) data[c] = body[c];
  }

  const atualizado = await (prisma as any).plano.update({
    where: { id: body.id },
    data,
  });

  // Auditoria
  await prisma.logAuditoria.create({
    data: {
      acao: 'PLANO_ALTERADO',
      detalhes: `Plano "${existente.nome}" atualizado. Preço: R$${existente.preco} → R$${atualizado.preco}`,
      adminNome: auth.userName || 'Super Admin',
      adminId: auth.userId || 'desconhecido',
      empresaId: 'SEM_EMPRESA',
    },
  });

  // Revalida páginas públicas que dependem do preço
  try {
    revalidatePath('/landing');
    revalidatePath('/');
    revalidatePath('/signup');
  } catch {}

  return NextResponse.json({ ok: true, plano: atualizado });
}
