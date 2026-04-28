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
 * POST: super admin força a re-indexação de todos os funcionários da empresa
 * (e suas filiais que herdam o addon) na coleção AWS Rekognition.
 *
 * Útil quando o auto-index na ativação falhou ou quando se quer reaplicar
 * depois de muitas trocas de foto.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;

  const empresa = await prisma.empresa.findUnique({
    where: { id },
    select: { id: true, addonTotem: true, matrizId: true, filiais: { select: { id: true } } },
  });
  if (!empresa) {
    return NextResponse.json({ erro: 'empresa_nao_encontrada' }, { status: 404 });
  }

  // Resolve qual empresa "carrega" o addon — se essa for filial, usa a matriz
  let addonAtivo = empresa.addonTotem === true;
  if (!addonAtivo && empresa.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empresa.matrizId },
      select: { addonTotem: true },
    });
    addonAtivo = matriz?.addonTotem === true;
  }
  if (!addonAtivo) {
    return NextResponse.json(
      { erro: 'addon_inativo', mensagem: 'Ative o Modo Totem antes de indexar.' },
      { status: 409 },
    );
  }

  // Indexa a empresa + todas as filiais (cada uma tem sua própria collection AWS)
  const empresasParaIndexar = [empresa.id, ...empresa.filiais.map(f => f.id)];
  let total = 0;
  let indexados = 0;
  let falhas = 0;
  for (const empId of empresasParaIndexar) {
    const r = await indexarFuncionariosDaEmpresa(empId);
    total += r.total;
    indexados += r.indexados;
    falhas += r.falhas;
  }

  return NextResponse.json({ ok: true, total, indexados, falhas });
}
