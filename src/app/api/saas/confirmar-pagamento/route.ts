// src/app/api/saas/confirmar-pagamento/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export const runtime = "nodejs";

/**
 * =========================
 * UTILITÁRIOS
 * =========================
 */

function clampDiaVencimento(dia?: number | null) {
  const n = Number(dia ?? 15);
  if (Number.isNaN(n)) return 15;
  return Math.min(31, Math.max(1, Math.trunc(n)));
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function makeDateSafe(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return new Date(year, month, safeDay);
}

// (mantido, pode ser útil no futuro)
function addMonthsSafe(date: Date, months: number) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  return makeDateSafe(y, m + months, day);
}

function calcPagoAteByVencimento(anchor: Date, diaVencimento?: number | null, meses = 1) {
  const dia = clampDiaVencimento(diaVencimento);

  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);

  let venc = makeDateSafe(base.getFullYear(), base.getMonth(), dia);

  if (base.getTime() > venc.getTime()) {
    venc = makeDateSafe(base.getFullYear(), base.getMonth() + 1, dia);
  }

  const m = Math.max(1, Number(meses || 1));
  const extra = m - 1;
  if (extra > 0) {
    venc = makeDateSafe(venc.getFullYear(), venc.getMonth() + extra, dia);
  }

  return endOfDay(venc);
}

/**
 * =========================
 * CORE DE CONFIRMAÇÃO
 * =========================
 */

async function processarPagamento(empresaId: string, meses = 1, limparTrial = true) {
  const now = new Date();

  const empresaAtual = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      trialAte: true,
      diaVencimento: true,
      billingAnchorAt: true,
      pagoAte: true,
    },
  });

  if (!empresaAtual) throw new Error("Empresa não encontrada");

  const anchor =
    empresaAtual.pagoAte && new Date(empresaAtual.pagoAte).getTime() > now.getTime()
      ? new Date(empresaAtual.pagoAte)
      : now;

  const paidUntil = calcPagoAteByVencimento(anchor, empresaAtual.diaVencimento, meses);

  const updateData: any = {
    status: "ATIVO",
    pagoAte: paidUntil,
    dataUltimoPagamento: now,
    cobrancaAtiva: true,
    billingAnchorAt: empresaAtual.billingAnchorAt ?? now,
  };

  if (limparTrial) updateData.trialAte = null;

  return prisma.empresa.update({
    where: { id: empresaId },
    data: updateData,
    select: {
      id: true,
      nome: true,
      status: true,
      cobrancaAtiva: true,
      trialAte: true,
      pagoAte: true,
      dataUltimoPagamento: true,
      diaVencimento: true,
    },
  });
}

/**
 * =========================
 * PARSE externalReference
 * =========================
 * Suporta:
 * 1) novo: "ponto|<empresaId>|YYYY-MM|<meses>"
 * 2) antigo: JSON string {"empresaId":"...","meses":1}
 * 3) antigo: "<empresaId>"
 */
function parseExternalReference(refRaw: string, fallbackInstallmentCount: number) {
  let empresaId = "";
  let meses = 1;

  const installment = Number(fallbackInstallmentCount || 1);
  const safeInstallment = Number.isFinite(installment) && installment > 0 ? installment : 1;

  // formato novo
  if (refRaw.startsWith("ponto|")) {
    const parts = refRaw.split("|");
    empresaId = String(parts[1] || "");
    const m = Number(parts[3] || 1);
    meses = Number.isFinite(m) && m > 0 ? m : 1;
    return { empresaId, meses };
  }

  // formato JSON antigo
  if (refRaw.startsWith("{")) {
    try {
      const parsed = JSON.parse(refRaw);
      empresaId = String(parsed?.empresaId || "");
      const m = Number(parsed?.meses || safeInstallment);
      meses = Number.isFinite(m) && m > 0 ? m : 1;
      return { empresaId, meses };
    } catch {
      // cai pro formato id puro
    }
  }

  // formato id puro
  empresaId = refRaw;
  meses = safeInstallment;
  return { empresaId, meses };
}

/**
 * =========================
 * HANDLER
 * =========================
 */

async function handler(req: Request) {
  try {
    const body = await req.json();

    /**
     * =====================================
     * CASO 1 — WEBHOOK ASAAS (automático)
     * =====================================
     */
    if (body?.event) {
      console.log("ASAAS WEBHOOK:", {
        event: body?.event,
        paymentId: body?.payment?.id,
        externalReference: body?.payment?.externalReference,
        status: body?.payment?.status,
        installmentCount: body?.payment?.installmentCount,
      });

      const event = String(body.event || "");
      const paymentId = String(body?.payment?.id || "");
      const refRaw = String(body?.payment?.externalReference || "");
      const asaasStatus = String(body?.payment?.status || "");

      // --- parse do seu externalReference (novo/antigo) ---
      let empresaId = "";
      let meses = 1;
      let competencia: string | null = null;

      // formato novo: ponto|empresaId|YYYY-MM|meses
      if (refRaw.startsWith("ponto|")) {
        const parts = refRaw.split("|");
        empresaId = String(parts[1] || "");
        competencia = String(parts[2] || "") || null;
        const m = Number(parts[3] || 1);
        meses = Number.isFinite(m) && m > 0 ? m : 1;
      }
      // formato antigo: JSON {"empresaId":"...","meses":1}
      else if (refRaw.startsWith("{")) {
        try {
          const parsed = JSON.parse(refRaw);
          empresaId = String(parsed?.empresaId || "");
          const m = Number(parsed?.meses || body?.payment?.installmentCount || 1);
          meses = Number.isFinite(m) && m > 0 ? m : 1;
        } catch {
          empresaId = "";
          meses = 1;
        }
      }
      // formato antigo: id puro
      else {
        empresaId = refRaw;
        const m = Number(body?.payment?.installmentCount || 1);
        meses = Number.isFinite(m) && m > 0 ? m : 1;
      }

      if (!empresaId) {
        console.error("Webhook Asaas sem externalReference válido:", refRaw);
        return NextResponse.json({ ok: false, erro: "externalReference inválido" }, { status: 400 });
      }

      // ✅ 1) Se venceu, só marca OVERDUE no seu banco (não ativa assinatura)
      if (event === "PAYMENT_OVERDUE") {
        if (paymentId) {
          await prisma.cobrancaAsaas.updateMany({
            where: { paymentId },
            data: { status: "OVERDUE" },
          });
        } else if (competencia) {
          await prisma.cobrancaAsaas.updateMany({
            where: { empresaId, competencia },
            data: { status: "OVERDUE" },
          });
        }

        return NextResponse.json({ ok: true });
      }

      // Só processa pagamento quando recebido
      if (event !== "PAYMENT_RECEIVED") {
        return NextResponse.json({ ok: true });
      }

      // ✅ 2) Atualiza sua empresa (ATIVO / pagoAte etc.)
      const empresa = await processarPagamento(empresaId, meses, true);

      // ✅ 3) Atualiza sua CobrancaAsaas como RECEIVED (baixa no histórico)
      if (paymentId) {
        await prisma.cobrancaAsaas.updateMany({
          where: { paymentId },
          data: { status: "RECEIVED" },
        });
      } else if (competencia) {
        await prisma.cobrancaAsaas.updateMany({
          where: { empresaId, competencia },
          data: { status: "RECEIVED" },
        });
      }

      return NextResponse.json({ ok: true, empresa });
    }


    /**
     * =====================================
     * CASO 2 — CONFIRMAÇÃO MANUAL (SUPER_ADMIN)
     * =====================================
     */

    const session = await getServerSession(authOptions);
    const cargo = (session?.user as any)?.cargo;

    if (!session || cargo !== "SUPER_ADMIN") {
      return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 403 });
    }

    const empresaId = String(body?.empresaId || "");
    const meses = Number(body?.meses || 1);
    const limparTrial = Boolean(body?.limparTrial ?? true);

    if (!empresaId) {
      return NextResponse.json({ ok: false, erro: "empresaId obrigatório" }, { status: 400 });
    }

    const empresa = await processarPagamento(empresaId, meses, limparTrial);
    return NextResponse.json({ ok: true, empresa });
  } catch (e: any) {
    console.error("confirmar-pagamento error:", e);
    return NextResponse.json(
      { ok: false, erro: e?.message || String(e) || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return handler(req);
}

export async function PUT(req: Request) {
  return handler(req);
}
