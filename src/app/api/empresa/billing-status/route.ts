// src/app/api/empresa/billing-status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { empresaId: true, cargo: true },
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
    },
  });

  if (!empUser) return NextResponse.json({ ok: false }, { status: 404 });

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

  const st = getBillingStatus(billingEmpresa as any);

  return NextResponse.json({
    ok: true,
    empresa: {
      id: billingEmpresa.id,
      nome: billingEmpresa.nome,
      diaVencimento: billingEmpresa.diaVencimento ?? 15,
      chavePix: billingEmpresa.chavePix ?? null,
      cobrancaAtiva: billingEmpresa.cobrancaAtiva ?? true,
      isFilial: Boolean(empUser.matrizId),
    },
    billing: st,
  });
}
