import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";

export const runtime = "nodejs";

const ehAdminPago = (cargo?: string) =>
  ["ADMIN", "SUPER_ADMIN", "DONO"].includes(String(cargo || "").toUpperCase());

export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const cargo = session?.user?.cargo;

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!ehAdminPago(cargo)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 403 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true, empresaId: true },
  });
  if (!usuario?.empresaId) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const empresa = await prisma.empresa.findUnique({
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
      chavePix: true,
      cobrancaWhatsapp: true,
      billingAnchorAt: true,

      _count: { select: { usuarios: true } },
      usuarios: { select: { id: true, cargo: true } },

      filiais: {
        select: {
          id: true,
          nome: true,
          _count: { select: { usuarios: true } },
          usuarios: { select: { id: true, cargo: true } },
        },
      },
    },
  });

  if (!empresa) return NextResponse.json({ ok: false }, { status: 404 });

  // Filial não gera fatura aqui (fica na matriz)
  if (empresa.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empresa.matrizId },
      select: { id: true, nome: true },
    });

    return NextResponse.json({
      ok: true,
      managedByMatriz: true,
      matriz: matriz ?? { id: empresa.matrizId, nome: "Matriz" },
    });
  }

  // ===== CÁLCULO FINANCEIRO (CENTRAL) =====
  let totalVidas = empresa._count?.usuarios || 0;

  const adminsUnicos = new Set<string>();
  (empresa.usuarios || []).forEach((u) => {
    if (ehAdminPago(u.cargo)) adminsUnicos.add(u.id);
  });

  (empresa.filiais || []).forEach((f) => {
    totalVidas += f._count?.usuarios || 0;
    (f.usuarios || []).forEach((u) => {
      if (ehAdminPago(u.cargo)) adminsUnicos.add(u.id);
    });
  });

  const totalAdmins = adminsUnicos.size;
  const totalVidasAjustado = Math.max(0, totalVidas - totalAdmins);

  const VALOR_BASE = 99.9;
  const FRANQUIA_VIDAS = 20;
  const FRANQUIA_ADMINS = 1;
  const PRECO_VIDA_EXTRA = 7.9;
  const PRECO_ADMIN_EXTRA = 49.9;

  const vidasExcedentes = Math.max(0, totalVidasAjustado - FRANQUIA_VIDAS);
  const adminsExcedentes = Math.max(0, totalAdmins - FRANQUIA_ADMINS);

  const custoVidas = vidasExcedentes * PRECO_VIDA_EXTRA;
  const custoAdmins = adminsExcedentes * PRECO_ADMIN_EXTRA;
  const valorFinal = VALOR_BASE + custoVidas + custoAdmins;

  const billing = getBillingStatus(empresa);

  const itensTabela: Array<{
    descricao: string;
    qtd: number;
    valorUnit: number;
    total: number;
  }> = [
    { descricao: "Assinatura Mensal (Pacote Base)", qtd: 1, valorUnit: VALOR_BASE, total: VALOR_BASE },
  ];

  if (vidasExcedentes > 0) {
    itensTabela.push({
      descricao: `Funcionários Excedentes`,
      qtd: vidasExcedentes,
      valorUnit: PRECO_VIDA_EXTRA,
      total: custoVidas,
    });
  }

  if (adminsExcedentes > 0) {
    itensTabela.push({
      descricao: `Administradores Adicionais`,
      qtd: adminsExcedentes,
      valorUnit: PRECO_ADMIN_EXTRA,
      total: custoAdmins,
    });
  }

  return NextResponse.json({
    ok: true,
    empresa: {
      id: empresa.id,
      nome: empresa.nome,
      cnpj: empresa.cnpj ?? null,
      diaVencimento: empresa.diaVencimento ?? 15,
      chavePix: empresa.chavePix ?? null,
      cobrancaWhatsapp: (empresa as any).cobrancaWhatsapp ?? null,
    },
    fatura: {
      valor: Number(valorFinal.toFixed(2)),
      vencimentoISO: billing.dueAtISO,
      pago: billing.paidForCycle,
      itens: itensTabela,
      resumo: {
        totalVidas,
        totalAdmins,
        vidasExcedentes,
        adminsExcedentes,
      },
    },
    billing,
  });
}
