// src/app/api/admin/fatura/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";

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
    fatura: {
      valor: valorFinal,
      vencimentoISO: billing.dueAtISO, // trial => trialAte, billing => due day
      pago: billing.paidForCycle,
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
