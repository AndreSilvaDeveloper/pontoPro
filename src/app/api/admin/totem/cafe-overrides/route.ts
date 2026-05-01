import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export const runtime = 'nodejs';

type CafeOrdem = 'ANTES' | 'DEPOIS';

/**
 * GET: lista funcionários da empresa que têm override de ordem de café
 * (Usuario.jornada.cafeOrdem ∈ {ANTES, DEPOIS}). Quem não tem override não aparece.
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

  const funcionarios = await prisma.usuario.findMany({
    where: { empresaId, cargo: { not: 'ADMIN' } },
    select: { id: true, nome: true, jornada: true },
    orderBy: { nome: 'asc' },
  });

  const comOverride = funcionarios
    .map(f => {
      const ordem = (f.jornada as { cafeOrdem?: string } | null)?.cafeOrdem;
      if (ordem !== 'ANTES' && ordem !== 'DEPOIS') return null;
      return { id: f.id, nome: f.nome, cafeOrdem: ordem as CafeOrdem };
    })
    .filter((x): x is { id: string; nome: string; cafeOrdem: CafeOrdem } => x !== null);

  return NextResponse.json(comOverride);
}

/**
 * PUT: define ou limpa o override de café de um funcionário.
 * Body: { funcionarioId: string, cafeOrdem: 'ANTES' | 'DEPOIS' | null }
 *   - 'ANTES'/'DEPOIS' → grava em jornada.cafeOrdem
 *   - null            → remove a chave (volta a usar padrão da empresa)
 */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string | null;
  if (!empresaId) return NextResponse.json({ erro: 'Sem empresa' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const funcionarioId = String(body?.funcionarioId || '').trim();
  const cafeOrdem = body?.cafeOrdem;

  if (!funcionarioId) {
    return NextResponse.json({ erro: 'funcionarioId obrigatório' }, { status: 400 });
  }
  if (cafeOrdem !== null && cafeOrdem !== 'ANTES' && cafeOrdem !== 'DEPOIS') {
    return NextResponse.json({ erro: 'cafeOrdem deve ser ANTES, DEPOIS ou null' }, { status: 400 });
  }

  const funcionario = await prisma.usuario.findFirst({
    where: { id: funcionarioId, empresaId },
    select: { id: true, jornada: true },
  });
  if (!funcionario) {
    return NextResponse.json({ erro: 'Funcionário não encontrado' }, { status: 404 });
  }

  const jornadaAtual = (funcionario.jornada as Record<string, any> | null) || {};
  const novaJornada: Record<string, any> = { ...jornadaAtual };

  if (cafeOrdem === null) {
    delete novaJornada.cafeOrdem;
  } else {
    novaJornada.cafeOrdem = cafeOrdem;
  }

  await prisma.usuario.update({
    where: { id: funcionarioId },
    data: { jornada: novaJornada },
  });

  return NextResponse.json({ ok: true, cafeOrdem: cafeOrdem ?? null });
}
