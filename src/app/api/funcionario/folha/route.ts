import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const runtime = 'nodejs';

/**
 * GET — lista folhas do funcionário logado.
 * Filtra apenas folhas que não são RASCUNHO (visíveis pro funcionário).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const userId = session?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  const folhas = await prisma.folhaPagamento.findMany({
    where: {
      funcionarioId: userId,
      status: { in: ['FECHADA', 'ASSINADA', 'RECUSADA', 'PAGA'] },
    },
    orderBy: [{ ano: 'desc' }, { mes: 'desc' }],
  });

  return NextResponse.json({
    folhas: folhas.map(f => ({
      id: f.id,
      mes: f.mes,
      ano: f.ano,
      salarioBruto: Number(f.salarioBruto),
      totalProventos: Number(f.totalProventos),
      totalDescontos: Number(f.totalDescontos),
      valorLiquido: Number(f.valorLiquido),
      status: f.status,
      fechadaEm: f.fechadaEm?.toISOString() || null,
      assinadoEm: f.assinadoEm?.toISOString() || null,
      recusadoEm: f.recusadoEm?.toISOString() || null,
      recusadoMotivo: f.recusadoMotivo,
      pagaEm: f.pagaEm?.toISOString() || null,
      comprovanteUrl: f.comprovanteUrl,
      detalhamento: f.detalhamento,
    })),
  });
}
