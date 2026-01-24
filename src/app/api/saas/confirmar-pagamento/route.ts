// src/app/api/saas/atualizar-financeiro/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).cargo !== "SUPER_ADMIN") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const empresaId = String(body.empresaId || "").trim();
    const diaVencimento = Number(body.diaVencimento);
    const chavePix = String(body.chavePix || "").trim();

    if (!empresaId) return NextResponse.json({ erro: "empresaId obrigatório" }, { status: 400 });

    // limite seguro: 1..28
    if (!Number.isFinite(diaVencimento) || diaVencimento < 1 || diaVencimento > 28) {
      return NextResponse.json({ erro: "diaVencimento inválido (1..28)" }, { status: 400 });
    }

    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        diaVencimento,
        chavePix: chavePix.length ? chavePix : null,
      },
      select: {
        id: true,
        nome: true,
        diaVencimento: true,
        chavePix: true,
      },
    });

    return NextResponse.json({ ok: true, empresa });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: "Erro ao atualizar" }, { status: 500 });
  }
}
