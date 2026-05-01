import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { asaas } from "@/lib/asaas";
import { getPlanoConfig, calcularValorEmpresa, type BillingCycle } from "@/config/planos";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";

const VALID_CYCLES: BillingCycle[] = ["MONTHLY", "YEARLY"];
const VALID_METHODS = ["UNDEFINED", "CREDIT_CARD"] as const;
const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"] as const;

async function getBillingEmpresa(empresaId: string) {
  const empUser = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: { filiais: true },
  });
  if (!empUser) return null;

  if (empUser.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empUser.matrizId },
      include: { filiais: true },
    });
    if (matriz) return { billingEmpresa: matriz, isFilial: true };
  }

  return { billingEmpresa: empUser, isFilial: false };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as any)?.empresaId as string | undefined;
    if (!empresaId) return NextResponse.json({ ok: false }, { status: 401 });

    const result = await getBillingEmpresa(empresaId);
    if (!result) return NextResponse.json({ ok: false }, { status: 404 });

    const { billingEmpresa, isFilial } = result;
    const billing = getBillingStatus(billingEmpresa as any);

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

    const planoConfig = getPlanoConfig(billingEmpresa.plano);
    const calculo = calcularValorEmpresa(
      billingEmpresa,
      totalFuncionarios,
      totalAdmins,
      totalFiliais,
    );

    return NextResponse.json({
      ok: true,
      billingCycle: billingEmpresa.billingCycle ?? "MONTHLY",
      billingMethod: billingEmpresa.billingMethod ?? "UNDEFINED",
      nextDueDate: billing.dueAtISO,
      pagoAte: billingEmpresa.pagoAte
        ? new Date(billingEmpresa.pagoAte).toISOString()
        : null,
      plano: planoConfig,
      calculo,
      isFilial,
    });
  } catch (err: any) {
    console.error("[PAGAMENTO_GET]", err);
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
    const { billingCycle, billingMethod } = body;

    if (billingCycle && !VALID_CYCLES.includes(billingCycle)) {
      return NextResponse.json({ ok: false, erro: "Ciclo inválido" }, { status: 400 });
    }
    if (billingMethod && !VALID_METHODS.includes(billingMethod)) {
      return NextResponse.json({ ok: false, erro: "Método inválido" }, { status: 400 });
    }

    const result = await getBillingEmpresa(empresaId);
    if (!result) return NextResponse.json({ ok: false }, { status: 404 });

    const { billingEmpresa } = result;
    const currentCycle = billingEmpresa.billingCycle ?? "MONTHLY";
    const currentMethod = billingEmpresa.billingMethod ?? "UNDEFINED";

    const newCycle = billingCycle ?? currentCycle;
    const newMethod = billingMethod ?? currentMethod;

    const cycleChanged = newCycle !== currentCycle;
    const methodChanged = newMethod !== currentMethod;

    // Se mudou cycle ou method → cancela assinatura Asaas existente
    if ((cycleChanged || methodChanged) && billingEmpresa.asaasSubscriptionId) {
      try {
        await asaas.delete(`/subscriptions/${billingEmpresa.asaasSubscriptionId}`);
      } catch {
        // ignora erro ao cancelar
      }

      await prisma.empresa.update({
        where: { id: billingEmpresa.id },
        data: {
          asaasSubscriptionId: null,
          asaasCurrentPaymentId: null,
        },
      });
    }

    // Atualiza DB
    const updateData: any = {};
    if (billingCycle) updateData.billingCycle = newCycle;
    if (billingMethod) updateData.billingMethod = newMethod;

    if (Object.keys(updateData).length > 0) {
      await prisma.empresa.update({
        where: { id: billingEmpresa.id },
        data: updateData,
      });
    }

    return NextResponse.json({
      ok: true,
      billingCycle: newCycle,
      billingMethod: newMethod,
      subscriptionCancelled: (cycleChanged || methodChanged) && !!billingEmpresa.asaasSubscriptionId,
    });
  } catch (err: any) {
    console.error("[PAGAMENTO_PUT]", err);
    return NextResponse.json({ ok: false, error: "Erro interno" }, { status: 500 });
  }
}
