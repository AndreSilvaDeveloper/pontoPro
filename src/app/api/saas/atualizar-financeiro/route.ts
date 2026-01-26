// src/app/api/saas/atualizar-financeiro/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  const cargo = session?.user?.cargo;
  if (!session || cargo !== "SUPER_ADMIN") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      empresaId,
      diaVencimento,
      chavePix,
      cobrancaAtiva,
      status,
      trialAteISO,
      pagoAteISO,
      billingAnchorAtISO,
      cobrancaWhatsapp,
    } = body;

    if (!empresaId) return NextResponse.json({ erro: "empresaId é obrigatório" }, { status: 400 });

    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        ...(diaVencimento !== undefined ? { diaVencimento: Number(diaVencimento) } : {}),
        ...(chavePix !== undefined ? { chavePix: String(chavePix) } : {}),
        ...(cobrancaWhatsapp !== undefined ? { cobrancaWhatsapp: String(cobrancaWhatsapp) } : {}),
        ...(cobrancaAtiva !== undefined ? { cobrancaAtiva: Boolean(cobrancaAtiva) } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(trialAteISO !== undefined ? { trialAte: trialAteISO ? new Date(trialAteISO) : null } : {}),
        ...(pagoAteISO !== undefined ? { pagoAte: pagoAteISO ? new Date(pagoAteISO) : null } : {}),
        ...(billingAnchorAtISO !== undefined ? { billingAnchorAt: billingAnchorAtISO ? new Date(billingAnchorAtISO) : null } : {}),
      },
    });

    return NextResponse.json({ ok: true, empresa });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: "Erro ao atualizar" }, { status: 500 });
  }
}
