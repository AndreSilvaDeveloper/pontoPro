// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getBillingStatus } from "@/lib/billing";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  // sem login -> login
  if (!session?.user?.email) redirect("/login");

  // SUPER_ADMIN não bloqueia por cobrança
  // @ts-ignore
  const cargo = session.user.cargo as string | undefined;
  if (cargo === "SUPER_ADMIN") return <>{children}</>;

  const email = session.user.email.trim().toLowerCase();

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: {
      id: true,
      cargo: true,
      empresaId: true,
    },
  });

  if (!usuario?.empresaId) {
    redirect("/login");
  }

  // Carrega empresa e resolve filial -> matriz
  const empresaUser = await prisma.empresa.findUnique({
    where: { id: usuario.empresaId },
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

  if (!empresaUser) {
    redirect("/login");
  }

  let empresa = empresaUser;

  if (empresaUser.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empresaUser.matrizId },
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
    if (matriz) empresa = matriz;
  }

  const st = getBillingStatus(empresa);

  // compat: st.bloqueado também existe, mas aqui usamos st.blocked
  if (st.blocked) {
    // mantenho seu path (log mostrou /acesso_bloqueado)
    redirect("/acesso_bloqueado");
  }

  return <>{children}</>;
}
