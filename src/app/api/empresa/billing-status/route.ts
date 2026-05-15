// src/app/api/empresa/billing-status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";
import { getToleranceDays } from "@/lib/billing-server";

export const runtime = "nodejs";

const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true, empresaId: true, cargo: true, email: true, nome: true },
  });
  if (!usuario?.empresaId) return NextResponse.json({ ok: false }, { status: 404 });

  const empUser = await prisma.empresa.findUnique({
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
      chavePix: true,
      cobrancaWhatsapp: true,

      // ASAAS (ciclo atual)
      asaasCustomerId: true,
      asaasCurrentPaymentId: true,
      asaasCurrentDueDate: true,
    },
  });

  if (!empUser) return NextResponse.json({ ok: false }, { status: 404 });

  let billingEmpresa = empUser;

  // Se for filial, usa matriz para billing
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

        asaasCustomerId: true,
        asaasCurrentPaymentId: true,
        asaasCurrentDueDate: true,
      },
    });
    if (matriz) billingEmpresa = matriz;
  }

  const toleranceDays = await getToleranceDays();
  const st = getBillingStatus(billingEmpresa as any, { toleranceDays });

  const cargo = (usuario.cargo || "FUNCIONARIO").toString().toUpperCase();
  const isAdmin = (ADMIN_CARGOS as readonly string[]).includes(cargo);

  // 🔐 Para funcionário: NÃO vazar motivo, nem dados financeiros, nem detalhes do billing
  const billingSafeForEmployee = {
    blocked: Boolean(st?.blocked),
    // sem "message", sem "days", sem "reason" etc.
  };

  return NextResponse.json({
    ok: true,

    // ✅ info mínima do usuário para o front decidir a tela
    user: {
      id: usuario.id,
      nome: usuario.nome ?? null,
      email: usuario.email ?? session.user.email ?? null,
      cargo,
    },
    isAdmin,

    empresa: {
      id: billingEmpresa.id,
      nome: billingEmpresa.nome,
      diaVencimento: billingEmpresa.diaVencimento ?? 15,
      cobrancaAtiva: billingEmpresa.cobrancaAtiva ?? true,
      isFilial: Boolean(empUser.matrizId),

      // 🔐 Só admin recebe dados financeiros/asaas
      chavePix: isAdmin ? billingEmpresa.chavePix ?? null : null,
      cobrancaWhatsapp: isAdmin ? billingEmpresa.cobrancaWhatsapp ?? null : null,

      asaasCustomerId: isAdmin ? billingEmpresa.asaasCustomerId ?? null : null,
      asaasCurrentPaymentId: isAdmin ? billingEmpresa.asaasCurrentPaymentId ?? null : null,
      asaasCurrentDueDate:
        isAdmin && billingEmpresa.asaasCurrentDueDate
          ? billingEmpresa.asaasCurrentDueDate.toISOString()
          : null,
    },

    // 🔐 Só admin recebe billing completo (com motivo/mensagem)
    billing: isAdmin ? st : billingSafeForEmployee,
  });
}
