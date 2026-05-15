// src/app/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getBillingStatus } from "@/lib/billing";
import { getToleranceDays } from "@/lib/billing-server";
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

        const toleranceDays = await getToleranceDays();
        const st = getBillingStatus(billingEmpresa as any, { toleranceDays });
        if (st.blocked) redirect("/acesso_bloqueado");
      }
    }
  }

  // Buscar nome da empresa, addons efetivos e branding (filial herda da matriz)
  let empresaNome: string | undefined;
  let addonTotemEfetivo = false;
  let addonFinanceiroEfetivo = false;
  let logoUrl: string | null = null;
  let nomeExibicao: string | null = null;
  let corPrimaria: string = '#7c3aed';
  // @ts-ignore
  const emailSess = session.user.email;
  if (emailSess) {
    const u = await prisma.usuario.findUnique({
      where: { email: emailSess },
      select: {
        empresa: {
          select: {
            nome: true,
            addonTotem: true,
            addonFinanceiro: true,
            matrizId: true,
            logoUrl: true,
            nomeExibicao: true,
            corPrimaria: true,
          },
        },
      },
    });
    empresaNome = u?.empresa?.nome;
    addonTotemEfetivo = u?.empresa?.addonTotem === true;
    addonFinanceiroEfetivo = u?.empresa?.addonFinanceiro === true;
    logoUrl = u?.empresa?.logoUrl ?? null;
    nomeExibicao = u?.empresa?.nomeExibicao ?? null;
    corPrimaria = u?.empresa?.corPrimaria || '#7c3aed';
    if (u?.empresa?.matrizId) {
      const matriz = await prisma.empresa.findUnique({
        where: { id: u.empresa.matrizId },
        select: { addonTotem: true, addonFinanceiro: true, logoUrl: true, nomeExibicao: true, corPrimaria: true },
      });
      if (!addonTotemEfetivo) addonTotemEfetivo = matriz?.addonTotem === true;
      if (!addonFinanceiroEfetivo) addonFinanceiroEfetivo = matriz?.addonFinanceiro === true;
      // Filial herda branding da matriz quando próprio é vazio
      if (!logoUrl) logoUrl = matriz?.logoUrl ?? null;
      if (!nomeExibicao) nomeExibicao = matriz?.nomeExibicao ?? null;
      if (corPrimaria === '#7c3aed' && matriz?.corPrimaria) corPrimaria = matriz.corPrimaria;
    }
  }

  return (
    <>
      <AdminPrompts
        empresaNome={empresaNome}
        addonTotemEfetivo={addonTotemEfetivo}
        addonFinanceiroEfetivo={addonFinanceiroEfetivo}
        logoUrl={logoUrl}
        nomeExibicao={nomeExibicao}
        corPrimaria={corPrimaria}
      />
      <div className="lg:pl-64">{children}</div>
      <BotaoSuporteWhatsApp />
    </>
  );
}
