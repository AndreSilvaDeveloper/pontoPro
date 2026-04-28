import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { indexarFuncionariosDaEmpresa } from '@/lib/totem';

export const runtime = 'nodejs';

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === 'SUPER_ADMIN';
}

/**
 * PATCH: super admin liga/desliga o addon Totem da empresa.
 * Body: { ativo: true | false }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const ativo = body?.ativo === true;

  const empresa = await prisma.empresa.findUnique({
    where: { id },
    select: { id: true, addonTotem: true },
  });
  if (!empresa) {
    return NextResponse.json({ erro: 'empresa_nao_encontrada' }, { status: 404 });
  }

  await prisma.empresa.update({
    where: { id },
    data: { addonTotem: ativo },
  });

  // Ao ATIVAR, indexa retroativamente todos os funcionários com foto que já
  // existiam antes do addon — fire-and-forget pra não atrasar a resposta.
  if (ativo && !empresa.addonTotem) {
    indexarFuncionariosDaEmpresa(id).catch(err =>
      console.error('[addon-totem] indexação retroativa falhou:', err)
    );
  }

  return NextResponse.json({ ok: true, addonTotem: ativo });
}
