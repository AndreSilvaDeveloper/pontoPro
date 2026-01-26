import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const cargo = (session?.user as any)?.cargo;
  if (!session || cargo !== "SUPER_ADMIN") return null;
  return session;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ ok: false, erro: "403" }, { status: 403 });
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: params.id },
    include: { _count: { select: { usuarios: true } } },
  });

  if (!empresa) {
    return NextResponse.json({ ok: false, erro: "Empresa não encontrada" }, { status: 404 });
  }

  // Json do Prisma já vem ok — mas mantemos compatível com seu padrão
  const configs = empresa.configuracoes
    ? JSON.parse(JSON.stringify(empresa.configuracoes))
    : {};

  return NextResponse.json({ ok: true, empresa: { ...empresa, configuracoes: configs } });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ ok: false, erro: "403" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Mantém compatível com seu payload antigo: { novasConfigs }
    const novasConfigs = body?.novasConfigs ?? body?.configuracoes;

    if (typeof novasConfigs !== "object" || novasConfigs === null) {
      return NextResponse.json(
        { ok: false, erro: "novasConfigs inválido" },
        { status: 400 }
      );
    }

    await prisma.empresa.update({
      where: { id: params.id },
      data: { configuracoes: novasConfigs },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/saas/empresa/[id] error:", error);
    return NextResponse.json({ ok: false, erro: "Erro ao salvar" }, { status: 500 });
  }
}
