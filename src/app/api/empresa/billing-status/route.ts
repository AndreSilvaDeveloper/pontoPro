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

  // SUPER_ADMIN: não precisa disso, mas pode retornar ok
  if ((usuario as any).cargo === "SUPER_ADMIN") {
    return NextResponse.json({ ok: true, billing: { blocked: false, code: "OK", message: "SUPER_ADMIN", dueAt: null, days: 0 } });
  }

  // pega empresa e se for filial, usa matriz
  const empresaBase = await prisma.empresa.findUnique({
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

  if (!empresaBase) return NextResponse.json({ ok: false }, { status: 404 });

  let empresa = empresaBase;

  if (empresaBase.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empresaBase.matrizId },
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
    if (matriz) empresa = matriz;
  }

  const st = getBillingStatus(empresa as any);

  return NextResponse.json({
    ok: true,
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      diaVencimento: (empresa as any).diaVencimento ?? 15,
      chavePix: (empresa as any).chavePix ?? null,
      cobrancaAtiva: (empresa as any).cobrancaAtiva ?? true,
      cobrancaWhatsapp: (empresa as any).cobrancaWhatsapp ?? null,
    },
    billing: st,
  });
}
