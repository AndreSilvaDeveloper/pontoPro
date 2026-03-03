import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  PLANOS,
  getPlanoConfig,
  calcularValorAssinatura,
  type PlanoId,
} from "@/config/planos";

export const runtime = "nodejs";

const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"] as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as any)?.empresaId as string | undefined;
    if (!empresaId) return NextResponse.json({ ok: false }, { status: 401 });

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        plano: true,
        matrizId: true,
      },
    });

    if (!empresa) return NextResponse.json({ ok: false }, { status: 404 });

    // usa billing da matriz se for filial
    const billingEmpresaId = empresa.matrizId ?? empresa.id;

    const billingEmpresa = await prisma.empresa.findUnique({
      where: { id: billingEmpresaId },
      include: { filiais: true },
    });

    if (!billingEmpresa)
      return NextResponse.json({ ok: false }, { status: 404 });

    const ids = [
      billingEmpresa.id,
      ...(billingEmpresa.filiais?.map((f) => f.id) ?? []),
    ];

    const totalFuncionarios = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { notIn: ADMIN_CARGOS as any } },
    });

    const totalAdmins = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { in: ADMIN_CARGOS as any } },
    });

    const totalFiliais = billingEmpresa.filiais?.length ?? 0;

    const planoAtual = getPlanoConfig(billingEmpresa.plano);
    const calculo = calcularValorAssinatura(
      planoAtual,
      totalFuncionarios,
      totalAdmins,
      totalFiliais
    );

    return NextResponse.json({
      ok: true,
      planoAtual: planoAtual.id,
      planoConfig: planoAtual,
      uso: {
        funcionarios: totalFuncionarios,
        admins: totalAdmins,
        filiais: totalFiliais,
      },
      calculo,
      planos: Object.values(PLANOS),
      isFilial: Boolean(empresa.matrizId),
    });
  } catch (err: any) {
    console.error("[PLANO_GET]", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const cargo = (session?.user as any)?.cargo;
    const empresaId = (session?.user as any)?.empresaId as string | undefined;

    if (!empresaId || !["ADMIN", "DONO", "SUPER_ADMIN"].includes(cargo)) {
      return NextResponse.json({ ok: false, erro: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    const novoPlano = String(body?.plano ?? "").toUpperCase();

    if (!(novoPlano in PLANOS)) {
      return NextResponse.json(
        { ok: false, erro: "Plano inválido" },
        { status: 400 }
      );
    }

    // Se for filial, muda o plano da matriz
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { matrizId: true },
    });

    const targetId = empresa?.matrizId ?? empresaId;

    await prisma.empresa.update({
      where: { id: targetId },
      data: { plano: novoPlano },
    });

    return NextResponse.json({ ok: true, plano: novoPlano });
  } catch (err: any) {
    console.error("[PLANO_PUT]", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
