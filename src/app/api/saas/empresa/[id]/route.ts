// src/app/api/saas/empresa/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ ok: false, erro: "403" }, { status: 403 });
  }

  const { id } = await context.params;

  const empresa = await prisma.empresa.findUnique({
    where: { id },
    include: {
      filiais: {
        select: {
          id: true,
          nome: true,
          cnpj: true,
          status: true,
          _count: { select: { usuarios: true } },
        },
        orderBy: { criadoEm: "desc" },
      },
      usuarios: {
        where: { cargo: { in: ["ADMIN", "SUPER_ADMIN", "DONO"] } },
        select: { id: true, nome: true, email: true, cargo: true },
        orderBy: { nome: "asc" },
      },
      _count: { select: { usuarios: true } },
    },
  });

  if (!empresa) {
    return NextResponse.json(
      { ok: false, erro: "Empresa não encontrada" },
      { status: 404 }
    );
  }

  const configs = empresa.configuracoes
    ? JSON.parse(JSON.stringify(empresa.configuracoes))
    : {};

  return NextResponse.json({ ok: true, empresa: { ...empresa, configuracoes: configs } });
}

export async function PUT(request: NextRequest, context: Ctx) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ ok: false, erro: "403" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { novasConfigs, plano, billingCycle, intervaloPago, fluxoEstrito } = body;

    const data: any = {};

    // Configurações JSON (toggles + custom key-value)
    if (novasConfigs && typeof novasConfigs === "object") {
      data.configuracoes = novasConfigs;
    }

    // Campos diretos da empresa
    if (plano !== undefined) data.plano = String(plano);
    if (billingCycle !== undefined) data.billingCycle = String(billingCycle);
    if (intervaloPago !== undefined) data.intervaloPago = Boolean(intervaloPago);
    if (fluxoEstrito !== undefined) data.fluxoEstrito = Boolean(fluxoEstrito);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { ok: false, erro: "Nenhum dado para atualizar" },
        { status: 400 }
      );
    }

    await prisma.empresa.update({ where: { id }, data });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/saas/empresa/[id] error:", error);
    return NextResponse.json({ ok: false, erro: "Erro ao salvar" }, { status: 500 });
  }
}
