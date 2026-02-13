import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";
import { asaas } from "@/lib/asaas";

export const runtime = "nodejs";

const ADMIN_CARGOS = ["ADMIN", "SUPER_ADMIN", "DONO"] as const;

function toDateOnlyISO(dateISO?: string | null) {
  if (!dateISO) return null;
  return dateISO.slice(0, 10);
}

function todayISOInSaoPaulo() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function maxISODate(a: string, b: string) {
  return a >= b ? a : b;
}

function safeDateSP(dateISO: string) {
  return new Date(dateISO + "T03:00:00.000Z");
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

// Validação de CPF/CNPJ (aceita apenas se passar DV)
function isValidCPF(cpfRaw?: string | null) {
  const cpf = onlyDigits(String(cpfRaw ?? ""));
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

function isValidCNPJ(cnpjRaw?: string | null) {
  const cnpj = onlyDigits(String(cnpjRaw ?? ""));
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (base: string) => {
    const weights =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += Number(base[i]) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(cnpj.slice(0, 12));
  if (d1 !== Number(cnpj[12])) return false;

  const d2 = calc(cnpj.slice(0, 13));
  return d2 === Number(cnpj[13]);
}

function normalizeCpfCnpj(doc?: string | null) {
  const d = onlyDigits(String(doc ?? ""));
  if (!d) return null;
  if (d.length === 11 && isValidCPF(d)) return d;
  if (d.length === 14 && isValidCNPJ(d)) return d;
  return null; // inválido => não envia pro Asaas
}

async function ensureCustomer(params: {
  empresaId: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: params.empresaId },
    select: { asaasCustomerId: true },
  });

  if (empresa?.asaasCustomerId) return empresa.asaasCustomerId;

  const cpfCnpj = normalizeCpfCnpj(params.cnpj ?? null);

  const { data } = await asaas.post("/customers", {
    name: params.nome,
    ...(cpfCnpj ? { cpfCnpj } : {}), // ✅ só manda se for válido
    email: params.email ?? undefined,
    phone: params.phone ?? undefined,
  });

  if (!data?.id) throw new Error("ASAAS não retornou customerId");

  await prisma.empresa.update({
    where: { id: params.empresaId },
    data: { asaasCustomerId: data.id },
  });

  return data.id;
}

export async function POST() {
  try {
    if (!process.env.ASAAS_BASE_URL || !process.env.ASAAS_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "ASAAS não configurado" },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    const empresaId = (session?.user as any)?.empresaId;

    if (!empresaId)
      return NextResponse.json({ ok: false }, { status: 401 });

    const empUser = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { filiais: true },
    });

    if (!empUser)
      return NextResponse.json({ ok: false }, { status: 404 });

    let billingEmpresa = empUser;

    if (empUser.matrizId) {
      const matriz = await prisma.empresa.findUnique({
        where: { id: empUser.matrizId },
        include: { filiais: true },
      });
      if (matriz) billingEmpresa = matriz;
    }

    const billing = getBillingStatus(billingEmpresa as any);

    const anchorISO = billingEmpresa.billingAnchorAt
      ? new Date(billingEmpresa.billingAnchorAt as any).toISOString()
      : null;

    const dueDateFromAnchor = toDateOnlyISO(anchorISO);
    const dueDateFromBilling = toDateOnlyISO(billing.dueAtISO);

    const todayISO = todayISOInSaoPaulo();
    const rawDueDate = dueDateFromAnchor || dueDateFromBilling || todayISO;
    const dueDate = maxISODate(rawDueDate, todayISO);

    const ids = [
      billingEmpresa.id,
      ...(billingEmpresa.filiais?.map((f) => f.id) ?? []),
    ];

    const totalFuncionarios = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { notIn: ADMIN_CARGOS as any } },
    });

    const totalAdmins = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { in: ADMIN_CARGOS as any } },
    });

    const VALOR_BASE = 99.9;
    const vidasExcedentes = Math.max(0, totalFuncionarios - 20);
    const adminsExcedentes = Math.max(0, totalAdmins - 1);

    const valorFinal = Number(
      (VALOR_BASE + vidasExcedentes * 7.9 + adminsExcedentes * 49.9).toFixed(2)
    );

    if (
      billingEmpresa.asaasCurrentPaymentId &&
      billingEmpresa.asaasCurrentDueDate &&
      billingEmpresa.asaasCurrentDueDate.toISOString().slice(0, 10) === dueDate
    ) {
      const paymentId = billingEmpresa.asaasCurrentPaymentId;

      const payment = (await asaas.get(`/payments/${paymentId}`)).data;
      const pix = (await asaas.get(`/payments/${paymentId}/pixQrCode`)).data;

      return NextResponse.json({
        ok: true,
        reused: true,
        asaas: {
          paymentId,
          dueDate,
          invoiceUrl: payment?.invoiceUrl ?? null,
          boletoUrl: payment?.bankSlipUrl ?? null,
          identificationField: payment?.identificationField ?? null,
          pix,
        },
      });
    }

    const customerId = await ensureCustomer({
      empresaId: billingEmpresa.id,
      nome: billingEmpresa.nome,
      cnpj: billingEmpresa.cnpj,
      email: session?.user?.email,
      phone: billingEmpresa.cobrancaWhatsapp,
    });

    const created = (
      await asaas.post("/payments", {
        customer: customerId,
        billingType: "PIX",
        value: valorFinal,
        dueDate,
        description: `Assinatura Ontime - ${billingEmpresa.nome}`,
        externalReference: billingEmpresa.id, // ok: webhook aceita id puro
      })
    ).data;

    if (!created?.id)
      return NextResponse.json(
        { ok: false, error: "ASAAS não retornou id" },
        { status: 500 }
      );

    await prisma.empresa.update({
      where: { id: billingEmpresa.id },
      data: {
        asaasCurrentPaymentId: created.id,
        asaasCurrentDueDate: safeDateSP(dueDate),
      },
    });

    const pix = (await asaas.get(`/payments/${created.id}/pixQrCode`)).data;

    return NextResponse.json({
      ok: true,
      reused: false,
      asaas: {
        paymentId: created.id,
        dueDate,
        invoiceUrl: created?.invoiceUrl ?? null,
        boletoUrl: created?.bankSlipUrl ?? null,
        identificationField: created?.identificationField ?? null,
        pix,
      },
    });
  } catch (err: any) {
    console.error("[GERAR_COBRANCA_ASAAS]", err?.response?.data ?? err);
    return NextResponse.json(
      { ok: false, error: "Erro ao gerar cobrança" },
      { status: 500 }
    );
  }
}
