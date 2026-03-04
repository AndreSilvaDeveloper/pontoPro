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
        nome: true,
      },
    });

    if (!empresa?.asaasCurrentPaymentId) {
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    // Busca o pagamento no Asaas
    let payment: any;
    try {
      payment = (await asaas.get(`/payments/${empresa.asaasCurrentPaymentId}`)).data;
    } catch {
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    if (!payment?.id) {
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    // Se já foi pago/cancelado, não há cobrança pendente
    const inactiveStatuses = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "REFUNDED", "CANCELLED"];
    if (inactiveStatuses.includes(payment.status)) {
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
