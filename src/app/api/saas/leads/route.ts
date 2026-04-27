import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === 'SUPER_ADMIN';
}

const STATUS_VALIDOS = ['NOVO', 'EM_CONTATO', 'QUALIFICADO', 'CONVERTIDO', 'DESCARTADO'] as const;

export async function GET(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const origem = searchParams.get('origem'); // AGENDAR_DEMO | SIGNUP | CONTATO
  const status = searchParams.get('status'); // NOVO | EM_CONTATO | ...
  const inicio = searchParams.get('inicio'); // YYYY-MM-DD
  const fim = searchParams.get('fim');
  const busca = searchParams.get('q');       // busca por nome/email/whatsapp/empresa

  const where: Prisma.LeadWhereInput = {};
  if (origem) where.origem = origem;
  if (status) where.status = status;
  if (inicio || fim) {
    where.criadoEm = {};
    if (inicio) where.criadoEm.gte = new Date(`${inicio}T00:00:00`);
    if (fim) where.criadoEm.lte = new Date(`${fim}T23:59:59.999`);
  }
  if (busca) {
    where.OR = [
      { nome: { contains: busca, mode: 'insensitive' } },
      { email: { contains: busca, mode: 'insensitive' } },
      { whatsapp: { contains: busca } },
      { empresa: { contains: busca, mode: 'insensitive' } },
    ];
  }

  const [leads, totaisPorStatus] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: 500, // limite razoável; depois pagina se crescer
    }),
    prisma.lead.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  // Resumo separado: contagem por origem nos últimos 30 dias
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentesPorOrigem = await prisma.lead.groupBy({
    by: ['origem'],
    where: { criadoEm: { gte: trintaDiasAtras } },
    _count: { _all: true },
  });

  return NextResponse.json({
    leads,
    resumo: {
      totalNovos: totaisPorStatus.find(t => t.status === 'NOVO')?._count._all ?? 0,
      totalEmContato: totaisPorStatus.find(t => t.status === 'EM_CONTATO')?._count._all ?? 0,
      totalQualificados: totaisPorStatus.find(t => t.status === 'QUALIFICADO')?._count._all ?? 0,
      totalConvertidos: totaisPorStatus.find(t => t.status === 'CONVERTIDO')?._count._all ?? 0,
      totalDescartados: totaisPorStatus.find(t => t.status === 'DESCARTADO')?._count._all ?? 0,
      ultimosTrintaPorOrigem: Object.fromEntries(
        recentesPorOrigem.map(r => [r.origem, r._count._all])
      ),
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

    const data: Prisma.LeadUpdateInput = {};
    if (typeof body?.status === 'string') {
      if (!STATUS_VALIDOS.includes(body.status)) {
        return NextResponse.json({ erro: 'status inválido' }, { status: 400 });
      }
      data.status = body.status;
    }
    if (typeof body?.obs === 'string') data.obs = body.obs;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ erro: 'nada pra atualizar' }, { status: 400 });
    }

    const lead = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json({ ok: true, lead });
  } catch (e) {
    console.error('[saas/leads PATCH] erro:', e);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
