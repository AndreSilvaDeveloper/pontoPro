// src/app/api/admin/fatura/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";
import { getPlanoConfig, calcularValorAssinatura, type BillingCycle } from "@/config/planos";

export const runtime = "nodejs";

const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"] as const;

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
      billingCycle: true,
      billingMethod: true,
      plano: true,

      chavePix: true,
      cobrancaWhatsapp: true,

      addonTotem: true,

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
        billingCycle: true,
        billingMethod: true,
        plano: true,

        chavePix: true,
        cobrancaWhatsapp: true,

        addonTotem: true,

        filiais: { select: { id: true } },
      },
    });
    if (matriz) billingEmpresa = matriz;
  }

  const billing = getBillingStatus(billingEmpresa as any);

  // IDs envolvidos (matriz + filiais)
  const idsEmpresas = [
    billingEmpresa.id,
    ...(billingEmpresa.filiais?.map((f) => f.id) ?? []),
  ];

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

  const planoConfig = getPlanoConfig(billingEmpresa.plano);
  const cycle = (billingEmpresa.billingCycle ?? "MONTHLY") as BillingCycle;
  const totemAtivo = (billingEmpresa as any).addonTotem === true;
  const calculo = calcularValorAssinatura(
    planoConfig,
    totalFuncionarios,
    totalAdmins,
    billingEmpresa.filiais?.length ?? 0,
    cycle,
    totemAtivo,
  );

  const vidasExcedentes = Math.max(0, totalFuncionarios - planoConfig.maxFuncionarios);
  const adminsExcedentes = Math.max(0, totalAdmins - planoConfig.maxAdmins);

  const custoVidas = Number((vidasExcedentes * planoConfig.extraFuncionario).toFixed(2));
  const custoAdmins = Number((adminsExcedentes * planoConfig.extraAdmin).toFixed(2));
  const custoTotem = calculo.totem;

  const valorFinal = calculo.total;

  return NextResponse.json({
    ok: true,
    empresa: {
      id: billingEmpresa.id,
      nome: billingEmpresa.nome,
      cnpj: billingEmpresa.cnpj ?? null,

      // ✅ IMPORTANTÍSSIMO: enviar essas datas para o front mostrar corretamente
      trialAte: billingEmpresa.trialAte ? billingEmpresa.trialAte.toISOString() : null,
      billingAnchorAt: billingEmpresa.billingAnchorAt
        ? billingEmpresa.billingAnchorAt.toISOString()
        : null,
      pagoAte: billingEmpresa.pagoAte ? billingEmpresa.pagoAte.toISOString() : null,

      chavePix: billingEmpresa.chavePix ?? null,
      cobrancaWhatsapp: billingEmpresa.cobrancaWhatsapp ?? null,
      diaVencimento: billingEmpresa.diaVencimento ?? 15,
      billingMethod: (billingEmpresa as any).billingMethod ?? "UNDEFINED",
      isFilial: Boolean(empUser.matrizId),
    },
    billing,
    fatura: {
      valor: valorFinal,
      billingCycle: cycle,
      totalMensal: calculo.totalMensal,

      // billing.dueAtISO em TRIAL = trialAte, em BILLING = dueAt (anchor/fallback)
      vencimentoISO: billing.dueAtISO,

      pago: billing.paidForCycle,
      itens: {
        vidasExcedentes,
        adminsExcedentes,
        custoVidas: Number(custoVidas.toFixed(2)),
        custoAdmins: Number(custoAdmins.toFixed(2)),
        custoTotem: Number(custoTotem.toFixed(2)),
        totemAtivo,
        totemIncluso: planoConfig.totemIncluso,
        totalFiliais: billingEmpresa.filiais?.length ?? 0,
      },
      resumo: {
        totalFuncionarios,
        totalAdmins,
      },
    },
  });
}
