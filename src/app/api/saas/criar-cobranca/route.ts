import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const ASAAS_BASE_URL = (process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3").trim();
const ASAAS_KEY = (process.env.ASAAS_KEY || "").trim();

function onlyDigits(v?: string | null) {
  return String(v ?? "").replace(/\D/g, "");
}

function toCents(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

async function asaasFetch(path: string, init: RequestInit = {}) {
  if (!ASAAS_KEY) throw new Error("ASAAS_KEY não configurada");

  const headers = new Headers(init.headers);
  headers.set("access_token", ASAAS_KEY);
  headers.set("User-Agent", "ponto-pro/1.0");
  if (!headers.get("Content-Type") && init.method && init.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${ASAAS_BASE_URL}${path}`, { ...init, headers });
}

async function getPaymentById(paymentId: string) {
  const r = await asaasFetch(`/payments/${paymentId}`, { method: "GET" });
  const text = await r.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!r.ok) throw new Error(`Falha ao recuperar payment ${paymentId}: ${text}`);
  return data;
}

async function findExistingPaymentIdByExternalRef(externalReference: string) {
  for (const status of ["PENDING", "OVERDUE"]) {
    const qs = new URLSearchParams({
      externalReference,
      status,
      limit: "1",
      offset: "0",
    });

    const r = await asaasFetch(`/lean/payments?${qs.toString()}`, { method: "GET" });
    const text = await r.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    const id = data?.data?.[0]?.id;
    if (r.ok && id) return String(id);
  }

  return null;
}

async function getOrCreateCustomerId(empresa: {
  id: string;
  nome: string | null;
  cnpj?: string | null;
  asaasCustomerId?: string | null;
}) {
  // ✅ já salvo no banco
  if (empresa.asaasCustomerId) return empresa.asaasCustomerId;

  // 1) tenta achar por externalReference no Asaas
  const qs = new URLSearchParams({ externalReference: empresa.id, limit: "1", offset: "0" });
  const rList = await asaasFetch(`/customers?${qs.toString()}`, { method: "GET" });
  const listText = await rList.text();

  let list: any;
  try {
    list = JSON.parse(listText);
  } catch {
    list = null;
  }

  const existingId = list?.data?.[0]?.id;
  if (rList.ok && existingId) {
    const cid = String(existingId);
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { asaasCustomerId: cid },
    });
    return cid;
  }

  // 2) cria cliente
  const cpfCnpj = onlyDigits((empresa as any).cnpj);
  if (!cpfCnpj) throw new Error("Empresa sem CNPJ/CPF (campo cnpj) para cadastrar cliente no Asaas");

  const rCreate = await asaasFetch(`/customers`, {
    method: "POST",
    body: JSON.stringify({
      name: empresa.nome || "Cliente",
      cpfCnpj,
      externalReference: empresa.id,
    }),
  });

  const createText = await rCreate.text();
  let created: any;
  try {
    created = JSON.parse(createText);
  } catch {
    created = null;
  }

  if (!rCreate.ok) throw new Error(`Erro ao criar cliente Asaas: ${createText}`);

  const newId = String(created.id);

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: { asaasCustomerId: newId },
  });

  return newId;
}

function dueDateToDateTimeUtc(dueISO: string) {
  // cria uma Date em UTC meia-noite, evitando timezone bagunçar
  return new Date(`${dueISO}T00:00:00.000Z`);
}

async function handler(req: Request) {
  try {
    const body = await req.json();
    const { empresaId, value, meses = 1, description, dueDateISO } = body;

    if (!empresaId || !value) {
      return NextResponse.json({ ok: false, erro: "empresaId e value são obrigatórios" }, { status: 400 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: String(empresaId) },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        asaasCustomerId: true,
      },
    });

    if (!empresa) {
      return NextResponse.json({ ok: false, erro: "Empresa não encontrada" }, { status: 404 });
    }

    const m = Math.max(1, Number(meses || 1));

    // vencimento (yyyy-mm-dd) ou amanhã
    const due =
      typeof dueDateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDateISO)
        ? dueDateISO
        : new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const competencia = due.slice(0, 7); // YYYY-MM
    const externalReference = `ponto|${empresa.id}|${competencia}|${m}`;

    const valueCents = toCents(value) * m;
    if (valueCents <= 0) {
      return NextResponse.json({ ok: false, erro: "value inválido" }, { status: 400 });
    }

    // ✅ 1) tenta no SEU BANCO primeiro
    const local = await prisma.cobrancaAsaas.findUnique({
      where: { empresaId_competencia: { empresaId: empresa.id, competencia } },
    });

    if (local && (local.status === "PENDING" || local.status === "OVERDUE")) {
      // se faltarem URLs, sincroniza uma vez
      if (!local.bankSlipUrl) {
        const p = await getPaymentById(local.paymentId);

        await prisma.cobrancaAsaas.update({
          where: { id: local.id },
          data: {
            status: String(p.status || local.status),
            bankSlipUrl: p.bankSlipUrl || local.bankSlipUrl,
            invoiceUrl: p.invoiceUrl || local.invoiceUrl,
          },
        });

        return NextResponse.json({
          ok: true,
          reused: true,
          paymentId: p.id,
          status: p.status,
          invoiceUrl: p.invoiceUrl,
          bankSlipUrl: p.bankSlipUrl,
        });
      }

      return NextResponse.json({
        ok: true,
        reused: true,
        paymentId: local.paymentId,
        status: local.status,
        invoiceUrl: local.invoiceUrl,
        bankSlipUrl: local.bankSlipUrl,
      });
    }

    // ✅ 2) garante customer (usa o salvo)
    const customerId = await getOrCreateCustomerId(empresa as any);

    // ✅ 3) tenta reaproveitar no ASAAS (caso exista e não esteja salvo local)
    const existingId = await findExistingPaymentIdByExternalRef(externalReference);
    if (existingId) {
      const p = await getPaymentById(existingId);

      await prisma.cobrancaAsaas.upsert({
        where: { empresaId_competencia: { empresaId: empresa.id, competencia } },
        create: {
          empresaId: empresa.id,
          competencia,
          meses: m,
          valueCents,
          dueDate: dueDateToDateTimeUtc(due),
          status: String(p.status || "PENDING"),
          paymentId: String(p.id),
          bankSlipUrl: p.bankSlipUrl || null,
          invoiceUrl: p.invoiceUrl || null,
          externalReference,
        },
        update: {
          meses: m,
          valueCents,
          dueDate: dueDateToDateTimeUtc(due),
          status: String(p.status || "PENDING"),
          paymentId: String(p.id),
          bankSlipUrl: p.bankSlipUrl || null,
          invoiceUrl: p.invoiceUrl || null,
          externalReference,
        },
      });

      return NextResponse.json({
        ok: true,
        reused: true,
        paymentId: p.id,
        status: p.status,
        invoiceUrl: p.invoiceUrl,
        bankSlipUrl: p.bankSlipUrl,
      });
    }

    // ✅ 4) cria nova cobrança no Asaas
    const rPay = await asaasFetch(`/payments`, {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: Number((valueCents / 100).toFixed(2)),
        dueDate: due,
        description: description || `Mensalidade ${empresa.nome || ""}`.trim(),
        externalReference,
      }),
    });

    const text = await rPay.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!rPay.ok) {
      console.error("Erro Asaas criar cobrança:", data);
      return NextResponse.json({ ok: false, erro: data }, { status: 500 });
    }

    // ✅ salva no seu banco
    await prisma.cobrancaAsaas.upsert({
      where: { empresaId_competencia: { empresaId: empresa.id, competencia } },
      create: {
        empresaId: empresa.id,
        competencia,
        meses: m,
        valueCents,
        dueDate: dueDateToDateTimeUtc(due),
        status: String(data.status || "PENDING"),
        paymentId: String(data.id),
        bankSlipUrl: data.bankSlipUrl || null,
        invoiceUrl: data.invoiceUrl || null,
        externalReference,
      },
      update: {
        meses: m,
        valueCents,
        dueDate: dueDateToDateTimeUtc(due),
        status: String(data.status || "PENDING"),
        paymentId: String(data.id),
        bankSlipUrl: data.bankSlipUrl || null,
        invoiceUrl: data.invoiceUrl || null,
        externalReference,
      },
    });

    return NextResponse.json({
      ok: true,
      reused: false,
      paymentId: data.id,
      status: data.status,
      invoiceUrl: data.invoiceUrl,
      bankSlipUrl: data.bankSlipUrl,
    });
  } catch (e: any) {
    console.error("criar-cobranca error:", e);
    return NextResponse.json({ ok: false, erro: e?.message || "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handler(req);
}
