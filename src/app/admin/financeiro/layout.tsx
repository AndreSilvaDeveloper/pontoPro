import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Guarda server-side: só permite acesso se a empresa do usuário tem o addon
 * financeiro ativo (próprio ou herdado da matriz). Se não, redireciona pra /admin.
 */
export default async function FinanceiroLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const empresaId = session?.user?.empresaId as string | undefined;
  if (!empresaId) redirect('/login');

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
