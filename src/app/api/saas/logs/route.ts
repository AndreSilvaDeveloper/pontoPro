import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.cargo !== 'SUPER_ADMIN') {
    return NextResponse.json({ erro: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const acao = (searchParams.get('acao') || '').trim();
  const empresaId = (searchParams.get('empresaId') || '').trim();
  const adminId = (searchParams.get('adminId') || '').trim();
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10), 1), 365);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 500);
  const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10), 0);

  const desde = new Date();
  desde.setDate(desde.getDate() - days);

  const where: any = { dataHora: { gte: desde } };
  if (acao) where.acao = acao;
  if (empresaId) where.empresaId = empresaId;
  if (adminId) where.adminId = adminId;
  if (q) {
    where.OR = [
      { detalhes: { contains: q, mode: 'insensitive' } },
      { adminNome: { contains: q, mode: 'insensitive' } },
      { acao: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [itens, total, acoesUnicas] = await Promise.all([
    prisma.logAuditoria.findMany({
      where,
      orderBy: { dataHora: 'desc' },
      take: limit,
      skip,
    }),
    prisma.logAuditoria.count({ where }),
    prisma.logAuditoria.findMany({
      where: { dataHora: { gte: desde } },
      select: { acao: true },
      distinct: ['acao'],
      take: 50,
    }),
  ]);

  const empresaIds = Array.from(new Set(itens.map(i => i.empresaId).filter(id => id && id !== 'SEM_EMPRESA')));
  const empresas = empresaIds.length
    ? await prisma.empresa.findMany({
        where: { id: { in: empresaIds } },
        select: { id: true, nome: true },
      })
    : [];
  const empresaMap = Object.fromEntries(empresas.map(e => [e.id, e.nome]));

  return NextResponse.json({
    itens: itens.map(i => ({
      ...i,
      empresaNome: empresaMap[i.empresaId] || null,
    })),
    total,
    acoes: acoesUnicas.map(a => a.acao).sort(),
  });
}
