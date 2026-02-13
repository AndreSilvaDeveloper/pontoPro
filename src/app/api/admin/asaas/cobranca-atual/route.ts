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

function mapPix(payment: any, dueDate: string, pix: any) {
  return {
    paymentId: payment?.id ?? "",
    dueDate,
    invoiceUrl: payment?.invoiceUrl ?? null,
    pix,
  };
}

function mapBoleto(payment: any, dueDate: string) {
  const bankSlipUrl = payment?.bankSlipUrl ?? null;
  return {
    paymentId: payment?.id ?? "",
    dueDate,
    invoiceUrl: payment?.invoiceUrl ?? null,
    bankSlipUrl,
    boletoUrl: bankSlipUrl,
    identificationField: payment?.identificationField ?? payment?.digitableLine ?? null,
  };
}

async function findExistingPayment(params: {
  externalReference: string;
  billingType: "PIX" | "BOLETO";
  dueDate: string;
}) {
  try {
    const { data } = await asaas.get("/payments", {
      params: {
        externalReference: params.externalReference,
        billingType: params.billingType,
        limit: 10,
        offset: 0,
      },
    });

    const list: any[] = Array.isArray(data?.data) ? data.data : [];
    const match =
      list.find((p) => String(p?.dueDate ?? "").slice(0, 10) === params.dueDate) ?? null;

    return match;
  } catch {
    return null;
  }
}

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
        asaasCustomerId: true,
        nome: true,
      },
    });

    if (!empresa?.asaasCurrentPaymentId || !empresa?.asaasCurrentDueDate) {
      return NextResponse.json({ ok: true, hasPayment: false });
    }

    const dueDate = empresa.asaasCurrentDueDate.toISOString().slice(0, 10);

    // current = BOLETO (pela nossa regra)
    const boletoPayment = (await asaas.get(`/payments/${empresa.asaasCurrentPaymentId}`)).data;

    // tenta achar PIX do mesmo ciclo (sem criar toda hora)
    let pixPayment = await findExistingPayment({
      externalReference: billingEmpresaId,
      billingType: "PIX",
      dueDate,
    });

    // se não achou, cria PIX (aqui pode criar 1 por ciclo, no máximo)
    if (!pixPayment) {
      // tenta usar customer do payment do boleto (geralmente vem)
      const customerId = boletoPayment?.customer ?? empresa.asaasCustomerId;

      if (customerId) {
        pixPayment = (
          await asaas.post("/payments", {
            customer: customerId,
            billingType: "PIX",
            value: boletoPayment?.value ?? 99.9,
            dueDate,
            description: boletoPayment?.description ?? `Assinatura Ontime - ${empresa.nome}`,
            externalReference: billingEmpresaId,
          })
        ).data;
      }
    }

    const pix = pixPayment?.id ? await getPixSafe(pixPayment.id) : null;

    return NextResponse.json({
      ok: true,
      hasPayment: true,
      asaas: {
        dueDate,
        pix: pixPayment?.id ? mapPix(pixPayment, dueDate, pix) : null,
        boleto: boletoPayment?.id ? mapBoleto(boletoPayment, dueDate) : null,
      },
    });
  } catch (err: any) {
    console.error("[COBRANCA_ATUAL_ASAAS] error:", err?.response?.data ?? err);
    return NextResponse.json({ ok: false, error: "Erro ao consultar cobrança" }, { status: 500 });
  }
}
