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

  // Calcula valor base + cupom ativo pra exibição
  const { calcularValorEmpresa } = await import('@/config/planos');
  const ids = [empresa.id, ...empresa.filiais.map(f => f.id)];
  const ADMIN_CARGOS = ['ADMIN', 'DONO', 'SUPER_ADMIN'];
  const totalFuncs = await prisma.usuario.count({
    where: { empresaId: { in: ids }, cargo: { notIn: ADMIN_CARGOS as any } },
  });
  const totalAdmins = empresa.usuarios.length;
  const calc = calcularValorEmpresa(empresa as any, totalFuncs, totalAdmins, empresa.filiais.length);

  const { aplicarDescontoCupomEmpresa } = await import('@/lib/cupons');
  const cupom = await aplicarDescontoCupomEmpresa(empresa.id, calc.totalMensal);

  return NextResponse.json({
    ok: true,
    empresa: { ...empresa, configuracoes: configs },
    valor: { totalMensal: calc.totalMensal, total: calc.total, cycle: calc.cycle },
    cupom,
  });
}

export async function PUT(request: NextRequest, context: Ctx) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ ok: false, erro: "403" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const {
      novasConfigs,
      plano,
      billingCycle,
      intervaloPago,
      fluxoEstrito,
      precoNegociado,
      precoNegociadoMotivo,
      precoNegociadoMeses,
      precoNegociadoSemPrazo,
      removerPrecoNegociado,
    } = body;

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

    // Preço negociado: 3 cenários
    //   1) removerPrecoNegociado: true        → zera tudo, volta ao preço de tabela
    //   2) precoNegociado + semPrazo          → seta valor com expiraEm = null
    //   3) precoNegociado + meses (>0)        → seta valor com expiraEm = now + N meses
    if (removerPrecoNegociado === true) {
      data.precoNegociado = null;
      data.precoNegociadoMotivo = null;
      data.precoNegociadoExpiraEm = null;
    } else if (precoNegociado !== undefined) {
      const valor = Number(precoNegociado);
      if (!Number.isFinite(valor) || valor < 0) {
        return NextResponse.json(
          { ok: false, erro: "Preço negociado inválido" },
          { status: 400 }
        );
      }
      data.precoNegociado = valor;
      data.precoNegociadoMotivo =
        precoNegociadoMotivo === undefined ? null : String(precoNegociadoMotivo || "") || null;

      if (precoNegociadoSemPrazo === true) {
        data.precoNegociadoExpiraEm = null;
      } else {
        const meses = Number(precoNegociadoMeses);
        if (!Number.isFinite(meses) || meses <= 0 || meses > 240) {
          return NextResponse.json(
            { ok: false, erro: "Validade em meses inválida (1 a 240)" },
            { status: 400 }
          );
        }
        const expira = new Date();
        expira.setMonth(expira.getMonth() + Math.round(meses));
        data.precoNegociadoExpiraEm = expira;
      }
    }

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
