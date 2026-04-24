import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { asaas } from "@/lib/asaas";

export const runtime = "nodejs";

/**
 * Percorre os pagamentos de uma assinatura em ordem crescente de dueDate e
 * retorna o dueDate do ÚLTIMO pagamento pago em sequência contígua (sem pular
 * boletos em aberto). Usado para calcular pagoAte corretamente quando o
 * cliente paga boletos fora de ordem — sem isso, pagar o boleto do próximo
 * mês antes do atual faria o sistema considerar a empresa em dia.
 */
async function getLastContiguousPaidDueDate(subscriptionId: string): Promise<string | null> {
  try {
    const { data } = await asaas.get(`/subscriptions/${subscriptionId}/payments`, {
      params: { limit: 50, offset: 0 },
    });
    const list: any[] = Array.isArray(data?.data) ? data.data : [];

    const paidStatuses = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
    const sorted = list
      .filter((p) => !p?.deleted && p?.dueDate)
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

    let lastPaidDue: string | null = null;
    for (const p of sorted) {
      if (paidStatuses.has(p.status)) {
        lastPaidDue = String(p.dueDate).slice(0, 10);
      } else {
        break;
      }
    }
    return lastPaidDue;
  } catch {
    return null;
  }
}

function parseAsaasDueDate(input: any): Date | null {
  if (!input) return null;

  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T03:00:00.000Z`);
  }

  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

function addMonthsCalendar(base: Date, months: number) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const day = base.getDate();

  const targetMonth = m + months;
  const lastDay = new Date(y, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);

  const result = new Date(base);
  result.setFullYear(y);
  result.setMonth(targetMonth);
  result.setDate(clampedDay);

  return result;
}

/**
 * Aceita:
 * - "empresa:<id>"
 * - "<id>" (id puro)
 */
function extractEmpresaId(externalReference?: string | null) {
  if (!externalReference) return null;
  const raw = String(externalReference).trim();
  if (!raw) return null;

  const m = raw.match(/^empresa:(.+)$/);
  if (m?.[1]) return m[1];

  return raw;
}

function isTruthyEnv(v: string | undefined) {
  if (!v) return false;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export async function POST(req: Request) {
  try {
    const tokenHeader = req.headers.get("asaas-access-token");
    const allowAnon = isTruthyEnv(process.env.ASAAS_WEBHOOK_ALLOW_ANON);

    if (tokenHeader) {
      if (tokenHeader !== process.env.ASAAS_WEBHOOK_TOKEN) {
        return NextResponse.json(
          { ok: false, error: "unauthorized" },
          { status: 401 }
        );
      }
    } else {
      if (!allowAnon) {
        return NextResponse.json(
          { ok: false, error: "missing_token" },
          { status: 401 }
        );
      }
    }

    const body = await req.json();

    const event = body?.event as string | undefined;
    const payment = body?.payment as any | undefined;

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 }
      );
    }

    // Eventos de pagamento confirmado
    const paymentAccepted = new Set([
      "PAYMENT_RECEIVED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_APPROVED",
      "PAYMENT_RECEIVED_IN_CASH",
      "PAYMENT_CREDIT_CARD_CAPTURED",
    ]);

    // Eventos de assinatura (apenas log por agora)
    const subscriptionEvents = new Set([
      "SUBSCRIPTION_CREATED",
      "SUBSCRIPTION_RENEWED",
      "SUBSCRIPTION_UPDATED",
      "SUBSCRIPTION_DELETED",
      "SUBSCRIPTION_INACTIVE",
    ]);

    if (subscriptionEvents.has(event)) {
      console.log("[ASAAS_WEBHOOK] subscription event:", {
        event,
        subscriptionId: body?.subscription?.id ?? null,
        externalReference: body?.subscription?.externalReference ?? null,
      });
      return NextResponse.json({ ok: true, handled: true, event });
    }

    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 }
      );
    }

    if (!paymentAccepted.has(event)) {
      console.log("[ASAAS_WEBHOOK] ignored event:", {
        event,
        paymentId: payment?.id ?? null,
        externalReference: payment?.externalReference ?? null,
        dueDate: payment?.dueDate ?? null,
      });

      return NextResponse.json({ ok: true, ignored: true, event });
    }

    // externalReference pode vir do payment ou da subscription
    let empresaId = extractEmpresaId(
      payment?.externalReference || body?.subscription?.externalReference
    );

    // Fallback: se não tem externalReference, busca empresa pelo asaasCustomerId
    if (!empresaId && payment?.customer) {
      const empByCustomer = await prisma.empresa.findFirst({
        where: { asaasCustomerId: payment.customer },
        select: { id: true },
      });
      if (empByCustomer) {
        empresaId = empByCustomer.id;
        console.log("[ASAAS_WEBHOOK] fallback: found empresa by customerId", {
          customerId: payment.customer,
          empresaId,
        });
      }
    }

    if (!empresaId) {
      return NextResponse.json(
        { ok: false, error: "missing_externalReference_empresa" },
        { status: 400 }
      );
    }

    const dueDate = parseAsaasDueDate(payment?.dueDate);
    if (!dueDate) {
      return NextResponse.json(
        { ok: false, error: "missing_dueDate" },
        { status: 400 }
      );
    }

    const emp = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        matrizId: true,
      },
    });

    if (!emp) {
      return NextResponse.json(
        { ok: false, error: "empresa_not_found" },
        { status: 404 }
      );
    }

    const targetEmpresaId = emp.matrizId ?? emp.id;

    const current = await prisma.empresa.findUnique({
      where: { id: targetEmpresaId },
      select: {
        id: true,
        pagoAte: true,
        billingAnchorAt: true,
        billingCycle: true,
        status: true,
        asaasSubscriptionId: true,
      },
    });

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "matriz_not_found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const isYearly = current.billingCycle === "YEARLY";
    const advanceMonths = isYearly ? 12 : 1;

    // Base do avanço: dueDate do último pagamento em sequência contígua
    // (se a subscription existe e conseguimos consultar). Senão, fallback
    // para o dueDate do evento atual.
    const subscriptionId =
      payment?.subscription ??
      body?.subscription?.id ??
      current.asaasSubscriptionId ??
      null;

    let advanceFromDate = dueDate;
    if (subscriptionId) {
      const lastPaidDueISO = await getLastContiguousPaidDueDate(subscriptionId);
      if (lastPaidDueISO) {
        const parsed = parseAsaasDueDate(lastPaidDueISO);
        if (parsed) advanceFromDate = parsed;
      }
    }

    const paidUntilDate = startOfDay(addMonthsCalendar(advanceFromDate, advanceMonths));

    const paidUntil = maxDate(
      current.pagoAte ? startOfDay(current.pagoAte) : null,
      paidUntilDate
    );

    const anchor = maxDate(
      current.billingAnchorAt ? startOfDay(current.billingAnchorAt) : null,
      paidUntilDate
    );

    await prisma.empresa.update({
      where: { id: targetEmpresaId },
      data: {
        dataUltimoPagamento: now,
        pagoAte: paidUntil,
        billingAnchorAt: anchor,
      } as any,
    });

    console.log("[ASAAS_WEBHOOK] applied:", {
      event,
      empresaId: targetEmpresaId,
      paidUntil: paidUntil?.toISOString() ?? null,
      billingAnchorAt: anchor?.toISOString() ?? null,
      paymentId: payment?.id ?? null,
      externalReference: payment?.externalReference ?? null,
      dueDate: payment?.dueDate ?? null,
      advanceFromDate: advanceFromDate.toISOString(),
      subscriptionId,
    });

    return NextResponse.json({
      ok: true,
      empresaId: targetEmpresaId,
      applied: {
        pagoAte: paidUntil?.toISOString() ?? null,
        billingAnchorAt: anchor?.toISOString() ?? null,
      },
    });
  } catch (err: any) {
    console.error("[ASAAS_WEBHOOK]", err?.response?.data ?? err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
