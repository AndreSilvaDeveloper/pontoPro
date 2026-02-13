import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

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

    if (!event || !payment) {
      return NextResponse.json(
        { ok: false, error: "invalid_payload" },
        { status: 400 }
      );
    }

    // ✅ Eventos comuns de "pagamento OK" no Asaas (inclui sandbox "recebida em dinheiro")
    const accepted = new Set([
      "PAYMENT_RECEIVED",
      "PAYMENT_CONFIRMED",
      "PAYMENT_APPROVED",
      "PAYMENT_RECEIVED_IN_CASH",
      "PAYMENT_CREDIT_CARD_CAPTURED",
    ]);

    if (!accepted.has(event)) {
      // ✅ Loga pra você enxergar exatamente o evento que chegou
      console.log("[ASAAS_WEBHOOK] ignored event:", {
        event,
        paymentId: payment?.id ?? null,
        externalReference: payment?.externalReference ?? null,
        dueDate: payment?.dueDate ?? null,
      });

      return NextResponse.json({ ok: true, ignored: true, event });
    }

    const empresaId = extractEmpresaId(payment?.externalReference);
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
        status: true,
      },
    });

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "matriz_not_found" },
        { status: 404 }
      );
    }

    const now = new Date();

    const paidUntil = maxDate(
      current.pagoAte ? startOfDay(current.pagoAte) : null,
      startOfDay(dueDate)
    );

    const nextAnchor = startOfDay(addMonthsCalendar(dueDate, 1));
    const anchor = maxDate(
      current.billingAnchorAt ? startOfDay(current.billingAnchorAt) : null,
      nextAnchor
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
