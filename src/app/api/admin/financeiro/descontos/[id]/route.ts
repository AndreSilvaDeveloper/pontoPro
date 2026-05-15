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

/** DELETE ?lote=1 → se passado, deleta todas as parcelas do mesmo lote */
function calcularValorFinal(valorOriginal: number, percentual?: number | null): number {
  const pct = Number.isFinite(percentual as number) ? Math.max(0, Math.min(100, percentual as number)) : 0;
  return Math.round(valorOriginal * (1 - pct / 100) * 100) / 100;
}

/**
 * PATCH — edita um desconto. Body: { valorOriginal?, percentualDesconto?, descricao?, observacao? }
 * valorFinal é recalculado a partir de valorOriginal + percentualDesconto.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const desc = await prisma.desconto.findFirst({
    where: { id, empresaId: ctx.empresaId },
    include: { funcionario: { select: { nome: true } } },
  });
  if (!desc) return NextResponse.json({ erro: 'Desconto não encontrado' }, { status: 404 });

  const dados: any = {};

  // valorOriginal e percentualDesconto: se qualquer um vier, recalcula valorFinal
  let novoValorOriginal = Number(desc.valorOriginal);
  let novoPerc = desc.percentualDesconto != null ? Number(desc.percentualDesconto) : null;
  let mexeuValor = false;

  if (body.valorOriginal !== undefined) {
    const v = Number(body.valorOriginal);
    if (!Number.isFinite(v) || v <= 0) return NextResponse.json({ erro: 'valorOriginal inválido' }, { status: 400 });
    novoValorOriginal = Math.round(v * 100) / 100;
    mexeuValor = true;
  }
  if (body.percentualDesconto !== undefined) {
    if (body.percentualDesconto === null || body.percentualDesconto === '') {
      novoPerc = null;
    } else {
      const p = Number(body.percentualDesconto);
      if (!Number.isFinite(p) || p < 0 || p > 100) return NextResponse.json({ erro: 'percentualDesconto inválido' }, { status: 400 });
      novoPerc = p;
    }
    mexeuValor = true;
  }
  if (mexeuValor) {
    dados.valorOriginal = novoValorOriginal;
    dados.percentualDesconto = novoPerc;
    dados.valorFinal = calcularValorFinal(novoValorOriginal, novoPerc);
  }
  if (typeof body.descricao === 'string' && body.descricao.trim()) {
    dados.descricao = body.descricao.trim().slice(0, 120);
  }
  if (body.observacao !== undefined) {
    dados.observacao = body.observacao ? String(body.observacao).slice(0, 500) : null;
  }
  if (Object.keys(dados).length === 0) {
    return NextResponse.json({ erro: 'Nenhum campo pra atualizar' }, { status: 400 });
  }

  const atualizado = await prisma.desconto.update({ where: { id }, data: dados });

  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'DESCONTO_EDITADO',
    detalhes: `Editou desconto de ${desc.funcionario?.nome || 'funcionário'} ("${desc.descricao}")`
      + (mexeuValor ? `: valor final R$ ${Number(desc.valorFinal).toFixed(2)} → R$ ${Number(atualizado.valorFinal).toFixed(2)}` : ''),
  });

  return NextResponse.json({
    ok: true,
    valorOriginal: Number(atualizado.valorOriginal),
    percentualDesconto: atualizado.percentualDesconto != null ? Number(atualizado.percentualDesconto) : null,
    valorFinal: Number(atualizado.valorFinal),
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { id } = await params;
  const url = new URL(req.url);
  const excluirLote = url.searchParams.get('lote') === '1';

  const desc = await prisma.desconto.findFirst({
    where: { id, empresaId: ctx.empresaId },
    include: { funcionario: { select: { nome: true } } },
  });
  if (!desc) return NextResponse.json({ erro: 'Desconto não encontrado' }, { status: 404 });

  if (excluirLote && desc.loteId) {
    const result = await prisma.desconto.deleteMany({
      where: { loteId: desc.loteId, empresaId: ctx.empresaId },
    });
    await registrarLog({
      empresaId: ctx.empresaId,
      usuarioId: ctx.userId,
      autor: ctx.userNome,
      acao: 'DESCONTO_EXCLUIDO_LOTE',
      detalhes: `Excluiu ${result.count} parcelas (lote ${desc.loteId.slice(0,8)}) de ${desc.funcionario?.nome || 'funcionário'}: "${desc.descricao}"`,
    });
    return NextResponse.json({ ok: true, excluidos: result.count });
  }

  await prisma.desconto.delete({ where: { id } });
  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'DESCONTO_EXCLUIDO',
    detalhes: `Excluiu desconto de R$ ${Number(desc.valorFinal).toFixed(2)} de ${desc.funcionario?.nome || 'funcionário'}: "${desc.descricao}"`,
  });
  return NextResponse.json({ ok: true });
}
