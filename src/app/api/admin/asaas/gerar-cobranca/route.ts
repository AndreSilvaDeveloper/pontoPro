import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getBillingStatus } from "@/lib/billing";
import { asaas } from "@/lib/asaas";
import { getPlanoConfig, calcularValorEmpresa, type BillingCycle } from "@/config/planos";

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
  const cpfCnpj = normalizeCpfCnpj(params.cnpj ?? null);

  if (!cpfCnpj) {
    throw new Error("CPF ou CNPJ da empresa é obrigatório para gerar cobrança.");
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: params.empresaId },
    select: { asaasCustomerId: true },
  });

  if (empresa?.asaasCustomerId) {
    // Atualiza CPF/CNPJ do cliente caso tenha sido criado sem
    try {
      await asaas.put(`/customers/${empresa.asaasCustomerId}`, {
        name: params.nome,
        cpfCnpj,
      });
    } catch {
      // ignora erro de atualização — pode já estar correto
    }
    return empresa.asaasCustomerId;
  }

  const { data } = await asaas.post("/customers", {
    name: params.nome,
    cpfCnpj,
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

/**
 * Busca o pagamento em aberto mais ANTIGO de uma assinatura.
 * Quando Asaas gera o boleto do próximo ciclo antes do anterior ser pago,
 * ambos ficam abertos — o admin deve pagar o mais antigo primeiro.
 */
async function findPendingPaymentFromSubscription(subscriptionId: string) {
  try {
    const { data } = await asaas.get(`/subscriptions/${subscriptionId}/payments`, {
      params: { limit: 50, offset: 0 },
    });

    const list: any[] = Array.isArray(data?.data) ? data.data : [];

    const pendentes = list
      .filter((p) => !p?.deleted && (p?.status === "PENDING" || p?.status === "OVERDUE"))
      .sort((a, b) => String(a.dueDate ?? "").localeCompare(String(b.dueDate ?? "")));

    if (pendentes.length > 0) return pendentes[0];

    return list[0] ?? null;
  } catch {
    return null;
  }
}

async function getSubscriptionSafe(subscriptionId: string) {
  try {
    const { data } = await asaas.get(`/subscriptions/${subscriptionId}`);
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Verifica se já existe um pagamento pendente (PENDING/OVERDUE) no DB
 * e se ele ainda é válido no Asaas. Se sim, retorna para evitar duplicação.
 */
async function getExistingPendingPayment(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { asaasCurrentPaymentId: true },
  });

  if (!empresa?.asaasCurrentPaymentId) return null;

  try {
    const { data: payment } = await asaas.get(`/payments/${empresa.asaasCurrentPaymentId}`);
    if (payment && !payment.deleted && (payment.status === "PENDING" || payment.status === "OVERDUE")) {
      return payment;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * POST — Gera ou atualiza a cobrança do ciclo atual.
 *
 * Fluxo:
 * 1. Se já existe pagamento pendente com valor correto → retorna ele
 * 2. Se existe mas valor mudou → atualiza
 * 3. Se não existe → cria via assinatura recorrente
 */
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

    // Calcula valor baseado no plano
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
    const cycle = (billingEmpresa.billingCycle ?? "MONTHLY") as BillingCycle;
    const billingMethod = billingEmpresa.billingMethod ?? "UNDEFINED";
    const { total: valorFinal } = calcularValorEmpresa(
      billingEmpresa,
      totalFuncionarios,
      totalAdmins,
      totalFiliais,
    );

    const description = `WorkID ${planoConfig.nome} - ${billingEmpresa.nome}`;

    // ====== 1) Já existe pagamento pendente? Reutiliza. ======
    let currentPayment = await getExistingPendingPayment(billingEmpresa.id);

    if (currentPayment) {
      // Atualiza valor se mudou (troca de plano, funcionários extras)
      if (Number(currentPayment.value) !== valorFinal) {
        try {
          await asaas.put(`/payments/${currentPayment.id}`, {
            value: valorFinal,
            description,
          });
          const { data: updated } = await asaas.get(`/payments/${currentPayment.id}`);
          if (updated) currentPayment = updated;
        } catch (e: any) {
          console.error("[GERAR_COBRANCA] Erro ao atualizar valor:", e?.response?.data ?? e);
        }
      }

      // Retorna o pagamento existente (sem criar nada novo)
      return respondWithPayment(currentPayment, billingEmpresa.id);
    }

    // ====== 2) Sem pagamento pendente. Verifica assinatura. ======
    const customerId = await ensureCustomer({
      empresaId: billingEmpresa.id,
      nome: billingEmpresa.nome,
      cnpj: billingEmpresa.cnpj,
      email: session?.user?.email,
      phone: billingEmpresa.cobrancaWhatsapp,
    });

    // Map billingCycle to Asaas cycle value
    const asaasCycle = cycle === "YEARLY" ? "YEARLY" : "MONTHLY";
    const asaasBillingType = billingMethod === "CREDIT_CARD" ? "CREDIT_CARD" : "UNDEFINED";

    if (billingEmpresa.asaasSubscriptionId) {
      const sub = await getSubscriptionSafe(billingEmpresa.asaasSubscriptionId);

      if (sub && sub.status === "ACTIVE") {
        // Se cycle ou billingType mudou → cancela e recria
        const needsRecreate =
          sub.cycle !== asaasCycle || sub.billingType !== asaasBillingType;

        if (needsRecreate) {
          try {
            await asaas.delete(`/subscriptions/${sub.id}`);
          } catch {
            // ignora erro ao cancelar
          }
          await prisma.empresa.update({
            where: { id: billingEmpresa.id },
            data: { asaasSubscriptionId: null, asaasCurrentPaymentId: null },
          });
          billingEmpresa.asaasSubscriptionId = null;
        } else {
          // Atualiza valor da assinatura se mudou
          if (Number(sub.value) !== valorFinal) {
            await asaas.put(`/subscriptions/${sub.id}`, { value: valorFinal, description });
          }

          // Busca pagamento pendente da assinatura
          currentPayment = await findPendingPaymentFromSubscription(sub.id);

          if (currentPayment && Number(currentPayment.value) !== valorFinal) {
            if (currentPayment.status === "PENDING" || currentPayment.status === "OVERDUE") {
              try {
                await asaas.put(`/payments/${currentPayment.id}`, { value: valorFinal, description });
                const { data: updated } = await asaas.get(`/payments/${currentPayment.id}`);
                if (updated) currentPayment = updated;
              } catch (e: any) {
                console.error("[GERAR_COBRANCA] Erro ao atualizar valor:", e?.response?.data ?? e);
              }
            }
          }

          if (currentPayment) {
            return respondWithPayment(currentPayment, billingEmpresa.id);
          }

          // Assinatura ativa mas sem pagamento pendente (deletados/pagos):
          // cancela a assinatura para criar uma nova limpa
          try {
            await asaas.delete(`/subscriptions/${sub.id}`);
          } catch {
            // ignora erro ao cancelar
          }
        }
      }

      if (billingEmpresa.asaasSubscriptionId) {
        // Assinatura inativa/cancelada/sem pagamentos: limpa para criar nova
        await prisma.empresa.update({
          where: { id: billingEmpresa.id },
          data: { asaasSubscriptionId: null },
        });
        billingEmpresa.asaasSubscriptionId = null;
      }
    }

    // ====== 3) Cria nova assinatura (gera 1 pagamento automaticamente) ======
    const { data: newSub } = await asaas.post("/subscriptions", {
      customer: customerId,
      billingType: asaasBillingType,
      value: valorFinal,
      nextDueDate: dueDate,
      cycle: asaasCycle,
      description,
      externalReference: billingEmpresa.id,
    });

    if (!newSub?.id) {
      throw new Error("ASAAS não retornou subscriptionId");
    }

    await prisma.empresa.update({
      where: { id: billingEmpresa.id },
      data: { asaasSubscriptionId: newSub.id },
    });

    currentPayment = await findPendingPaymentFromSubscription(newSub.id);

    if (currentPayment) {
      return respondWithPayment(currentPayment, billingEmpresa.id);
    }

    return NextResponse.json({ ok: true, asaas: { dueDate, pix: null, boleto: null } });
  } catch (err: any) {
    const msg = err?.message ?? "";
    console.error("[GERAR_COBRANCA_ASAAS]", err?.response?.data ?? err);
    if (msg.includes("CPF ou CNPJ")) {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Erro ao gerar cobrança" }, { status: 500 });
  }
}

/**
 * Salva o payment no DB e retorna resposta padronizada com PIX + Boleto.
 */
async function respondWithPayment(payment: any, empresaId: string) {
  const paymentDueDate = String(payment.dueDate ?? "").slice(0, 10);

  // Salva como pagamento atual no DB
  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      asaasCurrentPaymentId: payment.id,
      asaasCurrentDueDate: safeDateSP(paymentDueDate),
    },
  });

  const pix = await getPixSafe(payment.id);

  return NextResponse.json({
    ok: true,
    asaas: {
      dueDate: paymentDueDate,
      pix: {
        paymentId: payment.id,
        dueDate: paymentDueDate,
        invoiceUrl: payment.invoiceUrl ?? null,
        pix,
      },
      boleto: {
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl ?? null,
        bankSlipUrl: payment.bankSlipUrl ?? null,
        identificationField: payment.identificationField ?? null,
      },
    },
  });
}
