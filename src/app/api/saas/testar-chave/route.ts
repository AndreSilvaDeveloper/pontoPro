import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const base = (process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3").trim();
  const key = (process.env.ASAAS_KEY || "").trim();

  console.log("TESTE ASAAS base:", base);
  console.log("TESTE ASAAS key prefix:", key.slice(0, 12), "len:", key.length);

  if (!key) {
    return NextResponse.json({ ok: false, erro: "ASAAS_KEY não configurada" }, { status: 500 });
  }

  const r = await fetch(`${base}/myAccount`, {
    headers: {
      access_token: key,
      "User-Agent": "ponto-pro/1.0",
    },
  });

  const text = await r.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }

  return NextResponse.json({ ok: r.ok, status: r.status, data }, { status: r.status });
}
