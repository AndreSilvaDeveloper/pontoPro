import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { asaas } from "@/lib/asaas";

export const runtime = "nodejs";

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
      },
    });

    if (!empresa?.asaasCurrentPaymentId) {
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    const paymentId = empresa.asaasCurrentPaymentId;

    const payment = (await asaas.get(`/payments/${paymentId}`)).data;

    let pix: any = null;
    try {
      pix = (await asaas.get(`/payments/${paymentId}/pixQrCode`)).data;
    } catch {}

    return NextResponse.json({
      ok: true,
      hasPayment: true,
      asaas: {
        paymentId,
        dueDate: empresa.asaasCurrentDueDate?.toISOString().slice(0, 10) ?? null,
        invoiceUrl: payment?.invoiceUrl ?? null,
        boletoUrl: payment?.bankSlipUrl ?? null,
        identificationField: payment?.identificationField ?? payment?.digitableLine ?? null,
        pix,
      },
    });
  } catch (err: any) {
    console.error("[COBRANCA_ATUAL_ASAAS] error:", err?.response?.data ?? err);
    return NextResponse.json({ ok: false, error: "Erro ao consultar cobrança" }, { status: 500 });
  }
}
