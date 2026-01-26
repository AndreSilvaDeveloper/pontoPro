import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const cargo = (session?.user as any)?.cargo;

  if (!session || cargo !== "SUPER_ADMIN") {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 403 });
  }

  try {
    const { empresaId, bloquear } = await req.json();

    if (!empresaId) {
      return NextResponse.json({ ok: false, erro: "empresaId obrigatório" }, { status: 400 });
    }

    const status = bloquear ? "BLOQUEADO" : "ATIVO";

    const empresa = await prisma.empresa.update({
      where: { id: String(empresaId) },
      data: { status },
      select: { id: true, nome: true, status: true },
    });

    return NextResponse.json({ ok: true, empresa });
  } catch (e) {
    console.error("toggle-bloqueio error:", e);
    return NextResponse.json({ ok: false, erro: "Erro interno" }, { status: 500 });
  }
}
