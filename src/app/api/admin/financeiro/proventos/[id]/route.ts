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

/** PATCH — edita um provento (valor, descrição, observação). Body: { valor?, descricao?, observacao? } */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const prov = await prisma.provento.findFirst({
    where: { id, empresaId: ctx.empresaId },
    include: { funcionario: { select: { nome: true } } },
  });
  if (!prov) return NextResponse.json({ erro: 'Provento não encontrado' }, { status: 404 });

  const dados: { valor?: number; descricao?: string; observacao?: string | null } = {};

  if (body.valor !== undefined) {
    const v = Number(body.valor);
    if (!Number.isFinite(v) || v <= 0) return NextResponse.json({ erro: 'valor inválido' }, { status: 400 });
    dados.valor = Math.round(v * 100) / 100;
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

  const atualizado = await prisma.provento.update({ where: { id }, data: dados });

  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'PROVENTO_EDITADO',
    detalhes: `Editou provento de ${prov.funcionario?.nome || 'funcionário'} ("${prov.descricao}")`
      + (dados.valor !== undefined ? `: valor R$ ${Number(prov.valor).toFixed(2)} → R$ ${dados.valor.toFixed(2)}` : ''),
  });

  return NextResponse.json({ ok: true, valor: Number(atualizado.valor) });
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
