import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Layout isolado pras telas de impressão financeira (fora de /admin pra não
 * herdar a sidebar). Gate: só admin de empresa com o addon financeiro ativo.
 */
export default async function FinanceiroPrintLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const cargo = session?.user?.cargo as string | undefined;
  // @ts-ignore
  const empresaId = session?.user?.empresaId as string | undefined;
  if (!empresaId || !['ADMIN', 'SUPER_ADMIN', 'DONO'].includes(String(cargo))) {
    redirect('/login');
  }

  const emp = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { addonFinanceiro: true, matrizId: true },
  });

  let ativo = emp?.addonFinanceiro === true;
  if (!ativo && emp?.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: emp.matrizId },
      select: { addonFinanceiro: true },
    });
    ativo = matriz?.addonFinanceiro === true;
  }
  if (!ativo) redirect('/admin');

  return <>{children}</>;
}
