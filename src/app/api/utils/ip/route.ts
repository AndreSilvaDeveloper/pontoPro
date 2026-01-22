import { NextResponse } from "next/server";

function extractClientIp(headers: Headers) {
  const cf = headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();

  const xReal = headers.get("x-real-ip");
  if (xReal && xReal.trim()) return xReal.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff && xff.trim()) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const forwarded = headers.get("forwarded");
  if (forwarded && forwarded.includes("for=")) {
    const match = forwarded.match(/for="?([^;,"\s]+)"?/i);
    if (match?.[1]) return match[1];
  }

  return null;
}

function isPrivateIp(ip: string) {
  if (ip === "::1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;

  const m = ip.match(/^172\.(\d{1,3})\./);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }

  return false;
}

export async function GET(request: Request) {
  const ip = extractClientIp(request.headers);

  return NextResponse.json({
    ip,
    tipo: ip ? (isPrivateIp(ip) ? "privado" : "publico") : "desconhecido",
  });
}
