import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  return session?.user?.cargo === "SUPER_ADMIN";
}

/**
 * Lista usuários de uma empresa (inclui FUNCIONARIO).
 * Body: { empresaId: string, take?: number, q?: string, cargo?: string }
 * cargo: "TODOS" | "ADMIN" | "FUNCIONARIO" | "SUPER_ADMIN" | ...
 */
export async function POST(request: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ erro: "403" }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const empresaId = String(body?.empresaId || "").trim();
    const takeRaw = body?.take;
    const q = String(body?.q || "").trim();
    const cargo = String(body?.cargo || "").trim(); // "TODOS" ou um cargo específico

    if (!empresaId) return NextResponse.json({ erro: "missing_empresaId" }, { status: 400 });

    const take = Math.min(Math.max(Number(takeRaw || 200), 1), 500);

    const usuarios = await prisma.usuario.findMany({
      where: {
        empresaId,
        ...(cargo && cargo !== "TODOS" ? { cargo } : {}),
        ...(q
          ? {
              OR: [
                { nome: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ cargo: "asc" }, { nome: "asc" }],
      take,
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        criadoEm: true,
      },
    });

    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error("Erro ao listar usuários (saas/usuarios):", error);
    return NextResponse.json({ erro: "Erro ao listar" }, { status: 500 });
  }
}