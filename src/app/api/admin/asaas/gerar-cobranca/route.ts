import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";
import { asaas } from "@/lib/asaas";
import { getPlanoConfig, calcularValorAssinatura } from "@/config/planos";

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
    for (let i = 0; i < weights.length; i++) sum += Number(base[i]) * weights[i];
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
  return null;
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
    ...(cpfCnpj ? { cpfCnpj } : {}),
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

/**
 * Busca o pagamento pendente mais recente de uma assinatura.
 */
async function findPendingPaymentFromSubscription(subscriptionId: string) {
  try {
    const { data } = await asaas.get(`/subscriptions/${subscriptionId}/payments`, {
      params: { limit: 5, offset: 0 },
    });

    const list: any[] = Array.isArray(data?.data) ? data.data : [];

    // Prioriza pagamento PENDING ou OVERDUE (mais recente primeiro)
    const pending = list.find(
      (p) => p?.status === "PENDING" || p?.status === "OVERDUE"
    );
    if (pending) return pending;

    // Se não há pendente, retorna o mais recente
    return list[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Verifica se a assinatura existe e está ativa no Asaas.
 */
async function getSubscriptionSafe(subscriptionId: string) {
  try {
    const { data } = await asaas.get(`/subscriptions/${subscriptionId}`);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    if (!process.env.ASAAS_BASE_URL || !process.env.ASAAS_API_KEY) {
      return NextResponse.json({ ok: false, error: "ASAAS não configurado" }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    const empresaIdSessao = (session?.user as any)?.empresaId as string | undefined;
    if (!empresaIdSessao) return NextResponse.json({ ok: false }, { status: 401 });

    const empUser = await prisma.empresa.findUnique({
      where: { id: empresaIdSessao },
      include: { filiais: true },
    });
    if (!empUser) return NextResponse.json({ ok: false }, { status: 404 });

    // se for filial, cobra pela matriz
    let billingEmpresa: any = empUser;
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

    // calcula valor baseado no plano
    const ids = [
      billingEmpresa.id,
      ...(billingEmpresa.filiais?.map((f: any) => f.id) ?? []),
    ];

    const totalFuncionarios = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { notIn: ADMIN_CARGOS as any } },
    });

    const totalAdmins = await prisma.usuario.count({
      where: { empresaId: { in: ids }, cargo: { in: ADMIN_CARGOS as any } },
    });

    const totalFiliais = billingEmpresa.filiais?.length ?? 0;

    const planoConfig = getPlanoConfig(billingEmpresa.plano);
    const { total: valorFinal } = calcularValorAssinatura(
      planoConfig,
      totalFuncionarios,
      totalAdmins,
      totalFiliais
    );

    const customerId = await ensureCustomer({
      empresaId: billingEmpresa.id,
      nome: billingEmpresa.nome,
      cnpj: billingEmpresa.cnpj,
      email: session?.user?.email,
      phone: billingEmpresa.cobrancaWhatsapp,
    });

    let currentPayment: any = null;

    // ========== ASSINATURA RECORRENTE ==========
    if (billingEmpresa.asaasSubscriptionId) {
      // Já tem assinatura: verifica se está ativa
      const sub = await getSubscriptionSafe(billingEmpresa.asaasSubscriptionId);

      if (sub && sub.status === "ACTIVE") {
        // Atualiza valor se mudou (ex: adicionou funcionários ou mudou de plano)
        if (Number(sub.value) !== valorFinal) {
          await asaas.put(`/subscriptions/${sub.id}`, {
            value: valorFinal,
            description: `WorkID ${planoConfig.nome} - ${billingEmpresa.nome}`,
          });
        }

        // Busca o pagamento pendente da assinatura
        currentPayment = await findPendingPaymentFromSubscription(sub.id);

        // Se o valor do pagamento pendente difere do calculado, atualiza
        if (
          currentPayment &&
          (currentPayment.status === "PENDING" || currentPayment.status === "OVERDUE") &&
          Number(currentPayment.value) !== valorFinal
        ) {
          try {
            await asaas.put(`/payments/${currentPayment.id}`, {
              value: valorFinal,
              description: `WorkID ${planoConfig.nome} - ${billingEmpresa.nome}`,
            });
            // Recarrega o pagamento atualizado
            const { data: updated } = await asaas.get(`/payments/${currentPayment.id}`);
            if (updated) currentPayment = updated;
          } catch (e: any) {
            console.error("[GERAR_COBRANCA] Erro ao atualizar valor do pagamento:", e?.response?.data ?? e);
          }
        }
      } else {
        // Assinatura inativa/cancelada: limpa para criar nova
        await prisma.empresa.update({
          where: { id: billingEmpresa.id },
          data: { asaasSubscriptionId: null },
        });
        billingEmpresa.asaasSubscriptionId = null;
      }
    }

    if (!billingEmpresa.asaasSubscriptionId) {
      // Cria nova assinatura recorrente mensal
      const { data: newSub } = await asaas.post("/subscriptions", {
        customer: customerId,
        billingType: "UNDEFINED", // permite PIX + Boleto
        value: valorFinal,
        nextDueDate: dueDate,
        cycle: "MONTHLY",
        description: `WorkID ${planoConfig.nome} - ${billingEmpresa.nome}`,
        externalReference: billingEmpresa.id,
      });

      if (!newSub?.id) {
        throw new Error("ASAAS não retornou subscriptionId");
      }

      // Salva o ID da assinatura
      await prisma.empresa.update({
        where: { id: billingEmpresa.id },
        data: { asaasSubscriptionId: newSub.id },
      });

      // Busca o primeiro pagamento gerado pela assinatura
      currentPayment = await findPendingPaymentFromSubscription(newSub.id);
    }

    // Salva o pagamento atual
    if (currentPayment?.id) {
      const paymentDueDate = currentPayment.dueDate
        ? String(currentPayment.dueDate).slice(0, 10)
        : dueDate;

      await prisma.empresa.update({
        where: { id: billingEmpresa.id },
        data: {
          asaasCurrentPaymentId: currentPayment.id,
          asaasCurrentDueDate: safeDateSP(paymentDueDate),
        },
      });
    }

    // Busca QR code PIX do pagamento
    const pix = currentPayment?.id ? await getPixSafe(currentPayment.id) : null;

    const paymentDueDate = currentPayment?.dueDate
      ? String(currentPayment.dueDate).slice(0, 10)
      : dueDate;

    return NextResponse.json({
      ok: true,
      asaas: {
        dueDate: paymentDueDate,
        pix: currentPayment?.id ? mapPix(currentPayment, paymentDueDate, pix) : null,
        boleto: currentPayment?.bankSlipUrl
          ? {
              paymentId: currentPayment.id,
              invoiceUrl: currentPayment.invoiceUrl ?? null,
              bankSlipUrl: currentPayment.bankSlipUrl ?? null,
              identificationField: currentPayment.identificationField ?? null,
            }
          : null,
      },
    });
  } catch (err: any) {
    console.error("[GERAR_COBRANCA_ASAAS]", err?.response?.data ?? err);
    return NextResponse.json({ ok: false, error: "Erro ao gerar cobrança" }, { status: 500 });
  }
}
