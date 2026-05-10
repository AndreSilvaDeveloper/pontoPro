import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

const STATUS_VALIDOS = ['PENDENTE', 'CONFIRMADO', 'REALIZADO', 'CANCELADO', 'NO_SHOW'] as const;

async function getAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.cargo !== 'SUPER_ADMIN') return null;
  return {
    // @ts-ignore
    id: session.user.id as string,
    // @ts-ignore
    nome: (session.user.nome || session.user.name || 'Super Admin') as string,
  };
}

export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');     // CONFIRMADO | PENDENTE | ...
  const inicio = searchParams.get('inicio');     // YYYY-MM-DD (filtra por dataHora)
  const fim = searchParams.get('fim');           // YYYY-MM-DD
  const busca = searchParams.get('q');           // nome/whatsapp/empresa do lead
  const escopo = searchParams.get('escopo');     // 'futuros' (default) | 'todos' | 'passados'

  const where: Prisma.AgendamentoWhereInput = {};
  if (status) where.status = status;

  const filtroData: { gte?: Date; lte?: Date } = {};
  if (inicio) filtroData.gte = new Date(`${inicio}T00:00:00`);
  if (fim) filtroData.lte = new Date(`${fim}T23:59:59.999`);
  if (!inicio && !fim && escopo !== 'todos' && escopo !== 'passados') {
    // Default: mostra do início do dia atual em diante.
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    filtroData.gte = hoje;
  }
  if (escopo === 'passados') {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    filtroData.lte = hoje;
  }
  if (Object.keys(filtroData).length > 0) where.dataHora = filtroData;

  if (busca) {
    where.lead = {
      OR: [
        { nome: { contains: busca, mode: 'insensitive' } },
        { whatsapp: { contains: busca } },
        { empresa: { contains: busca, mode: 'insensitive' } },
        { email: { contains: busca, mode: 'insensitive' } },
      ],
    };
  }

  const [agendamentos, totaisPorStatus] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      orderBy: { dataHora: 'asc' },
      take: 500,
      include: {
        lead: {
          select: {
            id: true,
            nome: true,
            email: true,
            whatsapp: true,
            empresa: true,
            origem: true,
            obs: true,
            criadoEm: true,
          },
        },
      },
    }),
    prisma.agendamento.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    agendamentos,
    resumo: {
      totalPendentes: totaisPorStatus.find(t => t.status === 'PENDENTE')?._count._all ?? 0,
      totalConfirmados: totaisPorStatus.find(t => t.status === 'CONFIRMADO')?._count._all ?? 0,
      totalRealizados: totaisPorStatus.find(t => t.status === 'REALIZADO')?._count._all ?? 0,
      totalCancelados: totaisPorStatus.find(t => t.status === 'CANCELADO')?._count._all ?? 0,
      totalNoShow: totaisPorStatus.find(t => t.status === 'NO_SHOW')?._count._all ?? 0,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

    const data: Prisma.AgendamentoUpdateInput = {};
    if (typeof body?.status === 'string') {
      if (!STATUS_VALIDOS.includes(body.status)) {
        return NextResponse.json({ erro: 'status inválido' }, { status: 400 });
      }
      data.status = body.status;
    }
    if (typeof body?.observacao === 'string') data.observacao = body.observacao;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ erro: 'nada pra atualizar' }, { status: 400 });
    }

    data.alteradoPor = admin.nome;
    data.alteradoEm = new Date();

    const agendamento = await prisma.agendamento.update({ where: { id }, data });
    return NextResponse.json({ ok: true, agendamento });
  } catch (e) {
    console.error('[saas/agendamentos PATCH] erro:', e);
    return NextResponse.json({ erro: 'erro interno' }, { status: 500 });
  }
}
