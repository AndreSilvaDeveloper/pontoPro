import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

const ASAAS_ENV = (process.env.ASAAS_ENV || "production").toLowerCase();


const ASAAS_BASE =
  process.env.ASAAS_BASE_URL?.replace(/\/$/, "") ||
  (ASAAS_ENV === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3");

    
async function asaasGet(path: string) {
  const apiKey = process.env.ASAAS_API_KEY || process.env.ASAAS_ACCESS_TOKEN;
  if (!apiKey) throw new Error("ASAAS_API_KEY/ASAAS_ACCESS_TOKEN não configurada.");

  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Resposta não-JSON do Asaas (status ${res.status}).`);
  }

  if (!res.ok) {
    const msg =
      data?.errors?.[0]?.description ||
      data?.message ||
      `Erro Asaas (status ${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const email = session.user.email;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { empresaId: true },
    });

    if (!usuario?.empresaId) {
      return NextResponse.json({ ok: false, error: "Usuário sem empresa" }, { status: 404 });
    }

    const empUser = await prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: { id: true, matrizId: true, asaasCustomerId: true },
    });

    if (!empUser) {
      return NextResponse.json({ ok: false, error: "Empresa não encontrada" }, { status: 404 });
    }

    let billingEmpresa = empUser;
    if (empUser.matrizId) {
      const matriz = await prisma.empresa.findUnique({
        where: { id: empUser.matrizId },
        select: { id: true, matrizId: true, asaasCustomerId: true },
      });
      if (matriz) billingEmpresa = matriz;
    }

    if (!billingEmpresa.asaasCustomerId) {
      return NextResponse.json({ ok: true, items: [], warning: "Empresa sem asaasCustomerId" });
    }

    const customer = encodeURIComponent(billingEmpresa.asaasCustomerId);
    const data = await asaasGet(`/payments?customer=${customer}&limit=30&offset=0`);

    const items = (data?.data ?? []).map((p: any) => ({
      id: p?.id ?? "",
      dateCreated: p?.dateCreated ?? null,
      dueDate: p?.dueDate ?? null,
      status: p?.status ?? null,
      value: typeof p?.value === "number" ? p.value : null,
      invoiceUrl: p?.invoiceUrl ?? null,
      bankSlipUrl: p?.bankSlipUrl ?? null,
      description: p?.description ?? null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno" },
      { status: 500 }
    );
  }
}
