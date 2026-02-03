// src/app/api/saas/confirmar-pagamento/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export const runtime = "nodejs";

/**
 * Regras:
 * - diaVencimento pode ser 1..31
 * - Se o mês não tiver esse dia (ex: 31 em fevereiro), cai no ÚLTIMO dia do mês
 * - Se a empresa já está paga até o futuro, a extensão parte de max(now, pagoAte) (não “perde dias”)
 * - Se hoje ainda não passou do vencimento do mês: paga até este mês
 * - Se já passou: paga até o vencimento do próximo mês
 * - Se meses > 1: adiciona meses ao vencimento calculado
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

/**
 * Cria uma data "segura" no ano/mês desejado:
 * - Ajusta o dia para o último dia do mês se necessário (ex: 31 -> 28/29 em fev)
 * month: 0..11 (Date padrão)
 */
function makeDateSafe(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return new Date(year, month, safeDay);
}

function addMonthsSafe(date: Date, months: number) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  // cria no mês alvo já com fallback pro último dia
  return makeDateSafe(y, m + months, day);
}

/**
 * Calcula pagoAte baseado no dia de vencimento.
 * A âncora (anchor) deve ser:
 *   - now, ou
 *   - pagoAte atual se ele estiver no futuro (renovação antecipada sem perder dias)
 */
function calcPagoAteByVencimento(anchor: Date, diaVencimento?: number | null, meses = 1) {
  const dia = clampDiaVencimento(diaVencimento);

  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);

  // vencimento deste mês (ou último dia do mês se dia não existir)
  let venc = makeDateSafe(base.getFullYear(), base.getMonth(), dia);

  // Se já passou do vencimento deste mês, vai pro próximo mês
  if (base.getTime() > venc.getTime()) {
    venc = makeDateSafe(base.getFullYear(), base.getMonth() + 1, dia);
  }

  // Se pagou mais de 1 mês, empurra mais (meses-1)
  const m = Math.max(1, Number(meses || 1));
  const extra = m - 1;
  if (extra > 0) {
    venc = makeDateSafe(venc.getFullYear(), venc.getMonth() + extra, dia);
  }

  return endOfDay(venc);
}

async function handler(req: Request) {
  const session = await getServerSession(authOptions);
  const cargo = (session?.user as any)?.cargo;

  if (!session || cargo !== "SUPER_ADMIN") {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const empresaId = String(body?.empresaId || "");
    const meses = Number(body?.meses || 1);
    const limparTrial = Boolean(body?.limparTrial ?? true);

    if (!empresaId) {
      return NextResponse.json({ ok: false, erro: "empresaId obrigatório" }, { status: 400 });
    }

    const now = new Date();

    const empresaAtual = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        nome: true,
        trialAte: true,
        diaVencimento: true,
        billingAnchorAt: true,
        pagoAte: true, // importante pra renovar sem perder dias
      },
    });

    if (!empresaAtual) {
      return NextResponse.json({ ok: false, erro: "Empresa não encontrada" }, { status: 404 });
    }

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

    // opcional: se quiser “encerrar trial” quando paga
    if (limparTrial) updateData.trialAte = null;

    const empresa = await prisma.empresa.update({
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

    return NextResponse.json({ ok: true, empresa });
  } catch (e) {
    console.error("confirmar-pagamento error:", e);
    return NextResponse.json({ ok: false, erro: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handler(req);
}

export async function PUT(req: Request) {
  return handler(req);
}
