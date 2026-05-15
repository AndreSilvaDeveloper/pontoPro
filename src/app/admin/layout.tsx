// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getBillingStatus } from "@/lib/billing";
import AdminPrompts from "@/components/admin/AdminPrompts";
import BotaoSuporteWhatsApp from "@/components/BotaoSuporteWhatsApp";

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

  // Buscar nome da empresa e addon Totem efetivo (próprio ou herdado da matriz)
  let empresaNome: string | undefined;
  let addonTotemEfetivo = false;
  // @ts-ignore
  const emailSess = session.user.email;
  if (emailSess) {
    const u = await prisma.usuario.findUnique({
      where: { email: emailSess },
      select: {
        empresa: {
          select: { nome: true, addonTotem: true, matrizId: true },
        },
      },
    });
    empresaNome = u?.empresa?.nome;
    addonTotemEfetivo = u?.empresa?.addonTotem === true;
    if (!addonTotemEfetivo && u?.empresa?.matrizId) {
      const matriz = await prisma.empresa.findUnique({
        where: { id: u.empresa.matrizId },
        select: { addonTotem: true },
      });
      addonTotemEfetivo = matriz?.addonTotem === true;
    }
  }

  return (
    <>
      <AdminPrompts empresaNome={empresaNome} addonTotemEfetivo={addonTotemEfetivo} />
      <div className="lg:pl-64">{children}</div>
      <BotaoSuporteWhatsApp />
    </>
  );
}
