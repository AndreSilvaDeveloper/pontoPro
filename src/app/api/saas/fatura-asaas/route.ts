// src/app/api/saas/fatura-asaas/route.ts
// Endpoint para SUPER_ADMIN consultar/gerar cobrança Asaas de qualquer empresa
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { asaas } from "@/lib/asaas";
import { getBillingStatus } from "@/lib/billing";
import { getPlanoConfig, calcularValorAssinatura, type BillingCycle } from "@/config/planos";

export const runtime = "nodejs";

const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"] as const;

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const cargo = (session?.user as any)?.cargo;
  if (!session || cargo !== "SUPER_ADMIN") return null;
  return session;
}

async function getPixSafe(paymentId: string) {
  try {
    const pix = (await asaas.get(`/payments/${paymentId}/pixQrCode`)).data;
    return pix ?? null;
  } catch {
    return null;
  }
}

/**
 * GET — Consulta a cobrança Asaas atual de uma empresa (somente leitura).
 * Query: ?empresaId=xxx
 */
export async function GET(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ ok: false, erro: "403" }, { status: 403 });

  const empresaId = request.nextUrl.searchParams.get("empresaId");
  if (!empresaId) return NextResponse.json({ ok: false, erro: "empresaId obrigatório" }, { status: 400 });

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        nome: true,
        matrizId: true,
        asaasCurrentPaymentId: true,
        asaasCurrentDueDate: true,
        asaasCustomerId: true,
        asaasSubscriptionId: true,
        plano: true,
        billingCycle: true,
        billingMethod: true,
        diaVencimento: true,
        chavePix: true,
        cobrancaWhatsapp: true,
        pagoAte: true,
        trialAte: true,
        billingAnchorAt: true,
        cobrancaAtiva: true,
        status: true,
        addonTotem: true,
        filiais: { select: { id: true } },
      },
    });

    if (!empresa) return NextResponse.json({ ok: false, erro: "Empresa não encontrada" }, { status: 404 });

    // Se for filial, redireciona para a matriz
    const billingEmpresaId = empresa.matrizId ?? empresa.id;
    const billingEmpresa = billingEmpresaId !== empresa.id
      ? await prisma.empresa.findUnique({
          where: { id: billingEmpresaId },
          select: {
            id: true,
            nome: true,
            asaasCurrentPaymentId: true,
            asaasSubscriptionId: true,
            asaasCustomerId: true,
            plano: true,
            billingCycle: true,
            billingMethod: true,
            diaVencimento: true,
            pagoAte: true,
            addonTotem: true,
            filiais: { select: { id: true } },
          },
        })
      : empresa;

    if (!billingEmpresa) return NextResponse.json({ ok: false, erro: "Empresa billing não encontrada" }, { status: 404 });

    // Calcular valor atual
    const ids = [billingEmpresa.id, ...(billingEmpresa.filiais?.map((f) => f.id) ?? [])];
    const totalFuncionarios = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { notIn: ADMIN_CARGOS as any } },
    });
    const totalAdmins = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { in: ADMIN_CARGOS as any } },
    });
    const planoConfig = getPlanoConfig(billingEmpresa.plano);
    const cycle = (billingEmpresa.billingCycle ?? "MONTHLY") as BillingCycle;
    const calculo = calcularValorAssinatura(
      planoConfig, totalFuncionarios, totalAdmins,
      billingEmpresa.filiais?.length ?? 0, cycle,
      billingEmpresa.addonTotem === true,
    );

    // Buscar pagamento atual no Asaas
    let paymentData: any = null;
    if (billingEmpresa.asaasCurrentPaymentId) {
      try {
        const { data: payment } = await asaas.get(`/payments/${billingEmpresa.asaasCurrentPaymentId}`);
        const inactiveStatuses = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "REFUNDED", "CANCELLED"];
        if (payment && !inactiveStatuses.includes(payment.status)) {
          const pix = await getPixSafe(payment.id);
          paymentData = {
            paymentId: payment.id,
            status: payment.status,
            value: payment.value,
            dueDate: String(payment.dueDate ?? "").slice(0, 10),
            invoiceUrl: payment.invoiceUrl ?? null,
            bankSlipUrl: payment.bankSlipUrl ?? null,
            identificationField: payment.identificationField ?? null,
            pix,
          };
        }
      } catch { /* pagamento não encontrado no Asaas */ }
    }

    return NextResponse.json({
      ok: true,
      empresaNome: empresa.nome,
      isFilial: Boolean(empresa.matrizId),
      billingEmpresaNome: billingEmpresa.nome,
      hasAsaas: Boolean(billingEmpresa.asaasCustomerId),
      hasSubscription: Boolean(billingEmpresa.asaasSubscriptionId),
      valorAtual: calculo.total,
      totalMensal: calculo.totalMensal,
      cycle,
      plano: planoConfig.nome,
      payment: paymentData,
    });
  } catch (err: any) {
    console.error("[FATURA_ASAAS_SAAS] error:", err?.response?.data ?? err);
    return NextResponse.json({ ok: false, erro: "Erro ao consultar" }, { status: 500 });
  }
}

/**
 * POST — Gera/atualiza cobrança Asaas para uma empresa (SUPER_ADMIN).
 * Body: { empresaId }
 */
export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ ok: false, erro: "403" }, { status: 403 });

  try {
    const { empresaId } = await request.json();
    if (!empresaId) return NextResponse.json({ ok: false, erro: "empresaId obrigatório" }, { status: 400 });

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { filiais: true },
    });
    if (!empresa) return NextResponse.json({ ok: false, erro: "Empresa não encontrada" }, { status: 404 });

    const billingEmpresaId = empresa.matrizId ?? empresa.id;
    const billingEmpresa: any = billingEmpresaId !== empresa.id
      ? await prisma.empresa.findUnique({ where: { id: billingEmpresaId }, include: { filiais: true } })
      : empresa;

    if (!billingEmpresa) return NextResponse.json({ ok: false, erro: "Empresa billing não encontrada" }, { status: 404 });

    if (!process.env.ASAAS_BASE_URL || !process.env.ASAAS_API_KEY) {
      return NextResponse.json({ ok: false, erro: "ASAAS não configurado no servidor" }, { status: 500 });
    }

    // Calcula valor
    const ids = [billingEmpresa.id, ...(billingEmpresa.filiais?.map((f: any) => f.id) ?? [])];
    const totalFuncionarios = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { notIn: ADMIN_CARGOS as any } },
    });
    const totalAdmins = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { in: ADMIN_CARGOS as any } },
    });
    const planoConfig = getPlanoConfig(billingEmpresa.plano);
    const cycle = (billingEmpresa.billingCycle ?? "MONTHLY") as BillingCycle;
    const billingMethod = billingEmpresa.billingMethod ?? "UNDEFINED";
    const { total: valorFinal } = calcularValorAssinatura(
      planoConfig, totalFuncionarios, totalAdmins,
      billingEmpresa.filiais?.length ?? 0, cycle,
      billingEmpresa.addonTotem === true,
    );

    // Ensure customer
    let customerId = billingEmpresa.asaasCustomerId;
    if (!customerId) {
      const { data } = await asaas.post("/customers", {
        name: billingEmpresa.nome,
        ...(billingEmpresa.cnpj ? { cpfCnpj: billingEmpresa.cnpj.replace(/\D/g, "") } : {}),
        phone: billingEmpresa.cobrancaWhatsapp ?? undefined,
      });
      if (!data?.id) throw new Error("ASAAS não retornou customerId");
      customerId = data.id;
      await prisma.empresa.update({ where: { id: billingEmpresa.id }, data: { asaasCustomerId: customerId } });
    }

    // Verifica pagamento pendente existente
    if (billingEmpresa.asaasCurrentPaymentId) {
      try {
        const { data: existing } = await asaas.get(`/payments/${billingEmpresa.asaasCurrentPaymentId}`);
        if (existing && (existing.status === "PENDING" || existing.status === "OVERDUE")) {
          // Atualiza valor se mudou
          if (Number(existing.value) !== valorFinal) {
            await asaas.put(`/payments/${existing.id}`, { value: valorFinal });
          }
          const pix = await getPixSafe(existing.id);
          return NextResponse.json({
            ok: true,
            action: "existing",
            payment: {
              paymentId: existing.id,
              status: existing.status,
              value: valorFinal,
              dueDate: String(existing.dueDate ?? "").slice(0, 10),
              invoiceUrl: existing.invoiceUrl ?? null,
              bankSlipUrl: existing.bankSlipUrl ?? null,
              identificationField: existing.identificationField ?? null,
              pix,
            },
          });
        }
      } catch { /* não existe mais */ }
    }

    // Cria cobrança avulsa
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const dueDay = billingEmpresa.diaVencimento ?? 15;
    const now = new Date();
    const dueDateObj = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (dueDateObj <= now) dueDateObj.setMonth(dueDateObj.getMonth() + 1);
    const dueDate = dueDateObj.toISOString().split("T")[0];
    const safeDueDate = dueDate >= today ? dueDate : today;

    const description = `WorkID ${planoConfig.nome} - ${billingEmpresa.nome}`;
    const asaasBillingType = billingMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "UNDEFINED";

    const { data: newPayment } = await asaas.post("/payments", {
      customer: customerId,
      billingType: asaasBillingType,
      value: valorFinal,
      dueDate: safeDueDate,
      description,
      externalReference: billingEmpresa.id,
    });

    if (!newPayment?.id) throw new Error("ASAAS não retornou paymentId");

    await prisma.empresa.update({
      where: { id: billingEmpresa.id },
      data: {
        asaasCurrentPaymentId: newPayment.id,
        asaasCurrentDueDate: new Date(safeDueDate + "T03:00:00.000Z"),
      },
    });

    const pix = await getPixSafe(newPayment.id);

    return NextResponse.json({
      ok: true,
      action: "created",
      payment: {
        paymentId: newPayment.id,
        status: newPayment.status,
        value: valorFinal,
        dueDate: safeDueDate,
        invoiceUrl: newPayment.invoiceUrl ?? null,
        bankSlipUrl: newPayment.bankSlipUrl ?? null,
        identificationField: newPayment.identificationField ?? null,
        pix,
      },
    });
  } catch (err: any) {
    console.error("[FATURA_ASAAS_SAAS] POST error:", err?.response?.data ?? err);
    return NextResponse.json({ ok: false, erro: "Erro ao gerar cobrança" }, { status: 500 });
  }
}
