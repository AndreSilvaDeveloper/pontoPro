import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";

function getSessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}

const IMPERSONATOR_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.impersonator-token"
    : "next-auth.impersonator-token";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookieName = getSessionCookieName();

    // Token atual (impersonado) antes de restaurar backup
    const currentToken = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET! });

    const backup = cookieStore.get(IMPERSONATOR_COOKIE)?.value;

    if (!backup) {
      return NextResponse.json({ ok: false, error: "not_impersonating" }, { status: 400 });
    }

    // Auditoria STOP (antes de restaurar cookie)
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";

      const ua = req.headers.get("user-agent") || "unknown";

      const superId = (currentToken as any)?.impersonatedBy as string | undefined;

      const alvoId = (currentToken as any)?.id || (currentToken as any)?.sub;
      const alvoEmail = (currentToken as any)?.email;
      const alvoNome = (currentToken as any)?.name;
      const alvoCargo = (currentToken as any)?.cargo;
      const alvoEmpresaId = (currentToken as any)?.empresaId;

      await prisma.logAuditoria.create({
        data: {
          acao: "IMPERSONATE_STOP",
          detalhes: `SUPER_ADMIN ${superId ?? "unknown"} voltou da sessão de ${alvoNome ?? "unknown"} (${alvoEmail ?? "unknown"}) [${alvoCargo ?? "unknown"}] alvoId=${alvoId ?? "unknown"} empresaAlvo=${alvoEmpresaId ?? "SEM_EMPRESA"} ip=${ip} ua=${ua}`,
          adminNome: "SUPER_ADMIN",
          adminId: String(superId || "unknown"),
          empresaId: String(alvoEmpresaId || "SEM_EMPRESA"),
        },
      });
    } catch (auditErr) {
      // não quebra o fluxo de voltar caso auditoria falhe
      console.error("Audit IMPERSONATE_STOP failed:", auditErr);
    }

    // restaura sessão original
    cookieStore.set(sessionCookieName, backup, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // apaga backup
    cookieStore.set(IMPERSONATOR_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "internal_error", detail: String(e) },
      { status: 500 }
    );
  }
}