// src/app/api/admin/fatura/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";

const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"] as const;

function toISODate(d?: Date | string | null) {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function competenciaFromISO(iso?: string | null) {
  const s = String(iso || "");
  // funciona para "2026-02-07" ou "2026-02-07T00:00:00.000Z"
  if (s.length >= 7) return s.slice(0, 7);
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${mm}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session?.user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const email = session.user.email;

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, empresaId: true, cargo: true },
  });

  if (!usuario?.empresaId) return NextResponse.json({ ok: false }, { status: 404 });

  // pega empresa do usuário
  const empUser = await prisma.empresa.findUnique({
    where: { id: usuario.empresaId },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      matrizId: true,

      status: true,
      cobrancaAtiva: true,
      trialAte: true,
      pagoAte: true,
      diaVencimento: true,
      billingAnchorAt: true,

      chavePix: true,
      cobrancaWhatsapp: true,

      filiais: { select: { id: true } }, // se for matriz, lista filiais
    },
  });

  if (!empUser) return NextResponse.json({ ok: false }, { status: 404 });

  // se for filial, cobra pela matriz
  let billingEmpresa = empUser;
  if (empUser.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empUser.matrizId },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        matrizId: true,

        status: true,
        cobrancaAtiva: true,
        trialAte: true,
        pagoAte: true,
        diaVencimento: true,
        billingAnchorAt: true,

        chavePix: true,
        cobrancaWhatsapp: true,

        filiais: { select: { id: true } },
      },
    });
    if (matriz) billingEmpresa = matriz;
  }

  const billing = getBillingStatus(billingEmpresa as any);

  // IDs envolvidos (matriz + filiais)
  const idsEmpresas = [billingEmpresa.id, ...(billingEmpresa.filiais?.map((f) => f.id) ?? [])];

  // funcionários (vidas) = NÃO admins
  const totalFuncionarios = await prisma.usuario.count({
    where: {
      empresaId: { in: idsEmpresas },
      cargo: { notIn: ADMIN_CARGOS as any },
    },
  });

  // admins pagos
  const totalAdmins = await prisma.usuario.count({
    where: {
      empresaId: { in: idsEmpresas },
      cargo: { in: ADMIN_CARGOS as any },
    },
  });

  const VALOR_BASE = 99.9;
  const FRANQUIA_VIDAS = 20;
  const FRANQUIA_ADMINS = 1;

  const vidasExcedentes = Math.max(0, totalFuncionarios - FRANQUIA_VIDAS);
  const adminsExcedentes = Math.max(0, totalAdmins - FRANQUIA_ADMINS);

  const custoVidas = vidasExcedentes * 7.9;
  const custoAdmins = adminsExcedentes * 49.9;

  const valorFinal = Number((VALOR_BASE + custoVidas + custoAdmins).toFixed(2));

  // =========================
  // ✅ COBRANÇA REAL (ASAAS) PELO BANCO
  // =========================
  const vencimentoISO = billing.dueAtISO; // você já usava isso no front
  const competencia = competenciaFromISO(vencimentoISO);

  const cobrancaAtual = await prisma.cobrancaAsaas.findUnique({
    where: {
      empresaId_competencia: {
        empresaId: billingEmpresa.id,
        competencia,
      },
    },
    select: {
      id: true,
      empresaId: true,
      competencia: true,
      meses: true,
      valueCents: true,
      dueDate: true,
      status: true,
      paymentId: true,
      bankSlipUrl: true,
      invoiceUrl: true,
      externalReference: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // histórico (últimas 12)
  const historico = await prisma.cobrancaAsaas.findMany({
    where: { empresaId: billingEmpresa.id },
    orderBy: { dueDate: "desc" },
    take: 12,
    select: {
      id: true,
      competencia: true,
      meses: true,
      valueCents: true,
      dueDate: true,
      status: true,
      paymentId: true,
      bankSlipUrl: true,
      invoiceUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // histórico pagas (últimas 12 RECEIVED)
  const historicoPagas = await prisma.cobrancaAsaas.findMany({
    where: { empresaId: billingEmpresa.id, status: "RECEIVED" },
    orderBy: { dueDate: "desc" },
    take: 12,
    select: {
      id: true,
      competencia: true,
      meses: true,
      valueCents: true,
      dueDate: true,
      status: true,
      paymentId: true,
      bankSlipUrl: true,
      invoiceUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // pago real: se existir cobrança e status RECEIVED, isso vence qualquer outra lógica
  const pagoReal = cobrancaAtual ? cobrancaAtual.status === "RECEIVED" : Boolean(billing.paidForCycle);

  return NextResponse.json({
    ok: true,
    empresa: {
      id: billingEmpresa.id,
      nome: billingEmpresa.nome,
      cnpj: billingEmpresa.cnpj ?? null,
      chavePix: billingEmpresa.chavePix ?? null,
      cobrancaWhatsapp: billingEmpresa.cobrancaWhatsapp ?? null,
      diaVencimento: billingEmpresa.diaVencimento ?? 15,
      isFilial: Boolean(empUser.matrizId),
    },
    billing,

    // ✅ histórico pra renderizar no painel
    historico: historico.map((h) => ({
      ...h,
      value: Number((h.valueCents / 100).toFixed(2)),
      dueDateISO: toISODate(h.dueDate),
      createdAtISO: toISODate(h.createdAt),
      updatedAtISO: toISODate(h.updatedAt),
    })),

    historicoPagas: historicoPagas.map((h) => ({
      ...h,
      value: Number((h.valueCents / 100).toFixed(2)),
      dueDateISO: toISODate(h.dueDate),
      createdAtISO: toISODate(h.createdAt),
      updatedAtISO: toISODate(h.updatedAt),
    })),

    fatura: {
      valor: valorFinal,
      vencimentoISO, // trial => trialAte, billing => due day
      competencia, // ✅ útil no front
      pago: pagoReal, // ✅ agora reflete CobrancaAsaas quando existir

      // ✅ cobrança atual (se já existir no banco)
      cobranca: cobrancaAtual
        ? {
            status: cobrancaAtual.status,
            paymentId: cobrancaAtual.paymentId,
            bankSlipUrl: cobrancaAtual.bankSlipUrl,
            invoiceUrl: cobrancaAtual.invoiceUrl,
            dueDateISO: toISODate(cobrancaAtual.dueDate),
            competencia: cobrancaAtual.competencia,
            value: Number((cobrancaAtual.valueCents / 100).toFixed(2)),
            meses: cobrancaAtual.meses,
            updatedAtISO: toISODate(cobrancaAtual.updatedAt),
          }
        : null,

      itens: {
        vidasExcedentes,
        adminsExcedentes,
        custoVidas: Number(custoVidas.toFixed(2)),
        custoAdmins: Number(custoAdmins.toFixed(2)),
      },
      resumo: {
        totalFuncionarios,
        totalAdmins,
      },
    },
  });
}
