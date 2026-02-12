// src/lib/billing-server.ts
import { prisma } from "@/lib/db";
import { getBillingStatus, type EmpresaBillingShape, type BillingStatus } from "@/lib/billing";

export type BillingEmpresaResult = {
  empUser: Pick<EmpresaBillingShape, "id" | "nome" | "status" | "cobrancaAtiva" | "trialAte" | "pagoAte" | "diaVencimento" | "billingAnchorAt"> & {
    matrizId?: string | null;
  };
  billingEmpresa: Pick<EmpresaBillingShape, "id" | "nome" | "status" | "cobrancaAtiva" | "trialAte" | "pagoAte" | "diaVencimento" | "billingAnchorAt" | "chavePix" | "cobrancaWhatsapp">;
  isFilial: boolean;
  billing: BillingStatus;
};

/**
 * Resolve a empresa que deve ser usada para billing (matriz quando existir).
 */
export async function getBillingEmpresaByEmpresaId(empresaId: string): Promise<BillingEmpresaResult | null> {
  const empUser = await prisma.empresa.findUnique({
    where: { id: empresaId },
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
      chavePix: true,
      cobrancaWhatsapp: true,
    },
  });

  if (!empUser) return null;

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
        chavePix: true,
        cobrancaWhatsapp: true,
      },
    });
    if (matriz) billingEmpresa = matriz;
  }

  const billing = getBillingStatus(billingEmpresa as any);

  return {
    empUser: empUser as any,
    billingEmpresa: billingEmpresa as any,
    isFilial: Boolean(empUser.matrizId),
    billing,
  };
}

export async function getBillingEmpresaByUserEmail(email: string): Promise<BillingEmpresaResult | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { empresaId: true },
  });
  if (!usuario?.empresaId) return null;
  return getBillingEmpresaByEmpresaId(usuario.empresaId);
}
