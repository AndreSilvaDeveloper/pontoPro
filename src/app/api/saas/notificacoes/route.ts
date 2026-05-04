import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const runtime = 'nodejs';

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === 'SUPER_ADMIN';
}

/**
 * GET /api/saas/notificacoes
 * Query: ?status=todas|lidas|naolidas (default: todas)
 *        ?tipo=LEAD_NOVO|... (opcional)
 *        ?limit=50 (default 50, max 200)
 *        ?cursor=<id> (paginação)
 */
export async function GET(req: Request) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') || 'todas').toLowerCase();
  const tipo = searchParams.get('tipo') || undefined;
  const limitParam = parseInt(searchParams.get('limit') || '50', 10);
  const limit = Math.min(Math.max(limitParam, 1), 200);
  const cursor = searchParams.get('cursor') || undefined;

  const where: any = { destinatarioId: null };
  if (status === 'lidas') where.lida = true;
  else if (status === 'naolidas') where.lida = false;
  if (tipo) where.tipo = tipo;

  const itens = await prisma.notificacao.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const proximoCursor = itens.length > limit ? itens.pop()!.id : null;

  const totalNaoLidas = await prisma.notificacao.count({
    where: { destinatarioId: null, lida: false },
  });

  const porTipo = await prisma.notificacao.groupBy({
    by: ['tipo'],
    where: { destinatarioId: null, lida: false },
    _count: true,
  });

  return NextResponse.json({
    itens,
    proximoCursor,
    totalNaoLidas,
    porTipo: Object.fromEntries(porTipo.map(t => [t.tipo, t._count])),
  });
}
