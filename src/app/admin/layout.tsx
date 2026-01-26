// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session?.user?.id) redirect("/login");

  // @ts-ignore
  const cargo = session.user.cargo;
  if (cargo !== "SUPER_ADMIN") {
    // @ts-ignore
    const email = session.user.email;

    if (!email) redirect("/login");

    const user = await prisma.usuario.findUnique({
      where: { email },
      select: { empresaId: true },
    });

    if (user?.empresaId) {
      const empUser = await prisma.empresa.findUnique({
        where: { id: user.empresaId },
        select: {
          id: true,
          nome: true,
          status: true,
          matrizId: true,
          cobrancaAtiva: true,
          trialAte: true,
          pagoAte: true,
          diaVencimento: true,
          billingAnchorAt: true,
        },
      });

      if (empUser) {
        let billingEmpresa = empUser;

        if (empUser.matrizId) {
          const matriz = await prisma.empresa.findUnique({
            where: { id: empUser.matrizId },
            select: {
              id: true,
              nome: true,
              status: true,
              matrizId: true,
              cobrancaAtiva: true,
              trialAte: true,
              pagoAte: true,
              diaVencimento: true,
              billingAnchorAt: true,
            },
          });
          if (matriz) billingEmpresa = matriz;
        }

        const st = getBillingStatus(billingEmpresa as any);
        if (st.blocked) redirect("/acesso_bloqueado");
      }
    }
  }

  return <>{children}</>;
}
