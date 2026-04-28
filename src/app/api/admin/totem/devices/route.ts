import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export const runtime = 'nodejs';

const CODIGO_TTL_MIN = 30;

function gerarCodigoNumerico(tamanho = 6): string {
  let codigo = '';
  for (let i = 0; i < tamanho; i++) codigo += Math.floor(Math.random() * 10);
  return codigo;
}

/**
 * GET: lista totens cadastrados pela empresa do admin
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string | null;
  if (!empresaId) return NextResponse.json([]);

  const totens = await prisma.totemDevice.findMany({
    where: { empresaId },
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      nome: true,
      codigo: true,
      codigoExpiraEm: true,
      pareadoEm: true,
      ultimoUso: true,
      ativo: true,
      criadoEm: true,
    },
  });

  return NextResponse.json(totens);
}

/**
 * DELETE: remove um totem (e invalida o token)
 * Body: { id: "..." }
 */
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string | null;
  if (!empresaId) {
    return NextResponse.json({ erro: 'Sem empresa' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

  const totem = await prisma.totemDevice.findUnique({ where: { id } });
  if (!totem || totem.empresaId !== empresaId) {
    return NextResponse.json({ erro: 'Totem não encontrado' }, { status: 404 });
  }

  await prisma.totemDevice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/**
 * PATCH: invalida o token atual do tablet e gera novo código de pareamento.
 * Usar quando o tablet for roubado/perdido ou se quiser parear em outro device.
 * Body: { id: "..." }
 */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string | null;
  if (!empresaId) return NextResponse.json({ erro: 'Sem empresa' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || '').trim();
  if (!id) return NextResponse.json({ erro: 'id obrigatório' }, { status: 400 });

  const totem = await prisma.totemDevice.findUnique({ where: { id } });
  if (!totem || totem.empresaId !== empresaId) {
    return NextResponse.json({ erro: 'Totem não encontrado' }, { status: 404 });
  }

  let codigo: string | null = null;
  for (let i = 0; i < 5; i++) {
    const tentativa = gerarCodigoNumerico(6);
    const existe = await prisma.totemDevice.findUnique({ where: { codigo: tentativa } });
    if (!existe) { codigo = tentativa; break; }
  }
  if (!codigo) return NextResponse.json({ erro: 'Tente novamente.' }, { status: 503 });

  const expiraEm = new Date(Date.now() + CODIGO_TTL_MIN * 60 * 1000);

  await prisma.totemDevice.update({
    where: { id },
    data: {
      codigo,
      codigoExpiraEm: expiraEm,
      token: null,
      pareadoEm: null,
    },
  });

  return NextResponse.json({
    ok: true,
    id: totem.id,
    nome: totem.nome,
    codigo,
    expiraEm: expiraEm.toISOString(),
  });
}
