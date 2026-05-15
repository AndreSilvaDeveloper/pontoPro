import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const runtime = 'nodejs';

const ADMIN_CARGOS = ['ADMIN', 'SUPER_ADMIN', 'DONO'] as const;

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const cargo = session?.user?.cargo;
  // @ts-ignore
  const empresaId = session?.user?.empresaId as string | undefined;
  if (!session || !empresaId || !(ADMIN_CARGOS as readonly string[]).includes(String(cargo))) {
    return null;
  }
  return { session, empresaId };
}

/** PUT: atualiza salarioBase de um funcionário. Body: { funcionarioId, salarioBase: number | null } */
export async function PUT(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.funcionarioId) {
    return NextResponse.json({ erro: 'funcionarioId obrigatório' }, { status: 400 });
  }

  const valor = body.salarioBase;
  const salarioBase = valor == null || valor === ''
    ? null
    : (() => {
        const n = Number(valor);
        if (!Number.isFinite(n) || n < 0) return undefined;
        return Math.round(n * 100) / 100;
      })();

  if (salarioBase === undefined) {
    return NextResponse.json({ erro: 'salarioBase inválido' }, { status: 400 });
  }

  // Confirma que o funcionário pertence à empresa do admin
  const func = await prisma.usuario.findFirst({
    where: { id: String(body.funcionarioId), empresaId: ctx.empresaId },
    select: { id: true },
  });
  if (!func) return NextResponse.json({ erro: 'Funcionário não encontrado nesta empresa' }, { status: 404 });

  const atualizado = await prisma.usuario.update({
    where: { id: func.id },
    data: { salarioBase },
    select: { id: true, salarioBase: true },
  });

  return NextResponse.json({
    ok: true,
    funcionarioId: atualizado.id,
    salarioBase: atualizado.salarioBase ? Number(atualizado.salarioBase) : null,
  });
}
