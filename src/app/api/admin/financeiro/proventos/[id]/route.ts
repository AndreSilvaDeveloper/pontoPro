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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { id } = await params;
  const url = new URL(req.url);
  const excluirLote = url.searchParams.get('lote') === '1';

  const prov = await prisma.provento.findFirst({
    where: { id, empresaId: ctx.empresaId },
    include: { funcionario: { select: { nome: true } } },
  });
  if (!prov) return NextResponse.json({ erro: 'Provento não encontrado' }, { status: 404 });

  if (excluirLote && prov.loteId) {
    const result = await prisma.provento.deleteMany({
      where: { loteId: prov.loteId, empresaId: ctx.empresaId },
    });
    await registrarLog({
      empresaId: ctx.empresaId,
      usuarioId: ctx.userId,
      autor: ctx.userNome,
      acao: 'PROVENTO_EXCLUIDO_LOTE',
      detalhes: `Excluiu ${result.count} parcelas (lote ${prov.loteId.slice(0,8)}) de ${prov.funcionario?.nome || 'funcionário'}: "${prov.descricao}"`,
    });
    return NextResponse.json({ ok: true, excluidos: result.count });
  }

  await prisma.provento.delete({ where: { id } });
  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'PROVENTO_EXCLUIDO',
    detalhes: `Excluiu provento de R$ ${Number(prov.valor).toFixed(2)} de ${prov.funcionario?.nome || 'funcionário'}: "${prov.descricao}"`,
  });
  return NextResponse.json({ ok: true });
}
