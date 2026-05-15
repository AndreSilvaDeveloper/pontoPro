import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';

export const runtime = 'nodejs';

const ADMIN_CARGOS = ['ADMIN', 'SUPER_ADMIN', 'DONO'] as const;

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const cargo = session?.user?.cargo;
  // @ts-ignore
  const empresaId = session?.user?.empresaId as string | undefined;
  // @ts-ignore
  const userId = session?.user?.id as string | undefined;
  // @ts-ignore
  const userNome = session?.user?.name as string | undefined;
  if (!session || !empresaId || !userId || !(ADMIN_CARGOS as readonly string[]).includes(String(cargo))) {
    return null;
  }
  return { empresaId, userId, userNome: userNome || 'Admin' };
}

/**
 * DELETE — exclui o fechamento (FolhaPagamento). Os proventos/descontos
 * lançados NÃO são afetados — a folha volta a aparecer como "não fechada".
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { id } = await params;

  const folha = await prisma.folhaPagamento.findFirst({
    where: { id, empresaId: ctx.empresaId },
    include: { funcionario: { select: { nome: true } } },
  });
  if (!folha) return NextResponse.json({ erro: 'Folha não encontrada' }, { status: 404 });

  await prisma.folhaPagamento.delete({ where: { id } });

  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'FOLHA_EXCLUIDA',
    detalhes: `Excluiu o fechamento de ${String(folha.mes).padStart(2, '0')}/${folha.ano} de ${folha.funcionario?.nome || 'funcionário'} (status era ${folha.status})`,
  });

  return NextResponse.json({ ok: true });
}
