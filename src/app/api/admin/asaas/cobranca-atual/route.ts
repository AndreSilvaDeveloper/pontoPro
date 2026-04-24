import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { asaas } from "@/lib/asaas";

export const runtime = "nodejs";

async function getPixSafe(paymentId: string) {
  try {
    const pix = (await asaas.get(`/payments/${paymentId}/pixQrCode`)).data;
    return pix ?? null;
  } catch {
    return null;
  }
}

/**
 * Busca o pagamento em aberto mais ANTIGO da assinatura. Se o Asaas já gerou
 * o boleto do próximo ciclo antes do atual ser pago, ambos ficam em aberto —
 * o admin deve ver o mais antigo primeiro.
 */
async function findOldestOpenPaymentFromSubscription(subscriptionId: string) {
  try {
    const { data } = await asaas.get(`/subscriptions/${subscriptionId}/payments`, {
      params: { limit: 50, offset: 0 },
    });
    const list: any[] = Array.isArray(data?.data) ? data.data : [];
    const pendentes = list
      .filter((p) => !p?.deleted && (p?.status === "PENDING" || p?.status === "OVERDUE"))
      .sort((a, b) => String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? "")));
    return pendentes[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * GET — Somente leitura.
 * Busca o pagamento atual (já existente no Asaas) e retorna PIX + Boleto.
 * NÃO cria nenhum pagamento.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const empresaIdSessao = (session?.user as any)?.empresaId as string | undefined;

    if (!empresaIdSessao) {
      return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
    }

    const emp = await prisma.empresa.findUnique({
      where: { id: empresaIdSessao },
      select: { id: true, matrizId: true },
    });

    if (!emp) return NextResponse.json({ ok: false, error: "Empresa não encontrada" }, { status: 404 });

    const billingEmpresaId = emp.matrizId ?? emp.id;

    const empresa = await prisma.empresa.findUnique({
      where: { id: billingEmpresaId },
      select: {
        asaasCurrentPaymentId: true,
        asaasCurrentDueDate: true,
        asaasSubscriptionId: true,
        nome: true,
      },
    });

    if (!empresa?.asaasCurrentPaymentId) {
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    // Se existe assinatura, sempre prioriza o pagamento em aberto MAIS ANTIGO.
    // Isso cobre o caso em que Asaas já gerou o boleto do próximo ciclo mas
    // o anterior ainda não foi pago — o admin deve ver/pagar o mais antigo.
    let payment: any = null;
    if (empresa.asaasSubscriptionId) {
      const oldestOpen = await findOldestOpenPaymentFromSubscription(empresa.asaasSubscriptionId);
      if (oldestOpen) {
        payment = oldestOpen;
        // Ressincroniza DB se o "current" salvo estiver desatualizado
        if (oldestOpen.id !== empresa.asaasCurrentPaymentId) {
          const oldestDue = String(oldestOpen.dueDate ?? "").slice(0, 10);
          await prisma.empresa.update({
            where: { id: billingEmpresaId },
            data: {
              asaasCurrentPaymentId: oldestOpen.id,
              asaasCurrentDueDate: oldestDue ? new Date(`${oldestDue}T03:00:00.000Z`) : null,
            },
          });
        }
      }
    }

    // Fallback: busca pelo ID salvo (sem assinatura ou assinatura sem pendências)
    if (!payment) {
      try {
        payment = (await asaas.get(`/payments/${empresa.asaasCurrentPaymentId}`)).data;
      } catch {
        await prisma.empresa.update({
          where: { id: billingEmpresaId },
          data: { asaasCurrentPaymentId: null, asaasCurrentDueDate: null },
        });
        return NextResponse.json({ ok: true, hasPayment: false });
      }
    }

    if (!payment?.id) {
      await prisma.empresa.update({
        where: { id: billingEmpresaId },
        data: { asaasCurrentPaymentId: null, asaasCurrentDueDate: null },
      });
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    // Se já foi pago/cancelado ou deletado, não há cobrança pendente
    const inactiveStatuses = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "REFUNDED", "CANCELLED"];
    if (payment.deleted || inactiveStatuses.includes(payment.status)) {
      await prisma.empresa.update({
        where: { id: billingEmpresaId },
        data: { asaasCurrentPaymentId: null, asaasCurrentDueDate: null },
      });
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    const dueDate = String(payment.dueDate ?? "").slice(0, 10);

    // Busca QR code PIX do mesmo pagamento (UNDEFINED suporta PIX + Boleto)
    const pix = await getPixSafe(payment.id);

    return NextResponse.json({
      ok: true,
      hasPayment: true,
      asaas: {
        dueDate,
        pix: {
          paymentId: payment.id,
          dueDate,
          invoiceUrl: payment.invoiceUrl ?? null,
          pix,
        },
        boleto: {
          paymentId: payment.id,
          dueDate,
          invoiceUrl: payment.invoiceUrl ?? null,
          bankSlipUrl: payment.bankSlipUrl ?? null,
          boletoUrl: payment.bankSlipUrl ?? null,
          identificationField: payment.identificationField ?? null,
        },
      },
    });
  } catch (err: any) {
    console.error("[COBRANCA_ATUAL_ASAAS] error:", err?.response?.data ?? err);
    return NextResponse.json({ ok: false, error: "Erro ao consultar cobrança" }, { status: 500 });
  }
}
