import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { encode } from "next-auth/jwt";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

function getSessionCookieName() {
  // NextAuth usa "__Secure-" em produção com HTTPS, e sem prefixo em dev.
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const cargo = (session.user as any).cargo;
    if (cargo !== "SUPER_ADMIN") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const superId = (session.user as any).id as string | undefined;
    if (!superId) {
      return NextResponse.json({ ok: false, error: "missing_super_id" }, { status: 500 });
    }

    const { userId } = await req.json().catch(() => ({}));
    if (!userId) {
      return NextResponse.json({ ok: false, error: "missing_userId" }, { status: 400 });
    }

    const target = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nome: true,
        cargo: true,
        empresaId: true,
        deveTrocarSenha: true,
      },
    });

    if (!target) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    const sessionCookieName = getSessionCookieName();
    const currentSessionToken = cookieStore.get(sessionCookieName)?.value;

    if (!currentSessionToken) {
      return NextResponse.json({ ok: false, error: "missing_session_cookie" }, { status: 401 });
    }

    const alreadyImpersonating = cookieStore.get(IMPERSONATOR_COOKIE)?.value;
      if (alreadyImpersonating) {
        return NextResponse.json(
          { ok: false, error: "already_impersonating" },
          { status: 409 }
        );
      }

    // 1) salva sessão atual em cookie backup (pra voltar depois)
    cookieStore.set(IMPERSONATOR_COOKIE, currentSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // 2) cria novo JWT de sessão para o usuário alvo (com marca de impersonação)
    // ⚠️ inclui `id` porque seus callbacks usam token.id
    const newTokenPayload = {
      sub: target.id,
      id: target.id,

      email: target.email,
      name: target.nome,

      cargo: target.cargo,
      empresaId: target.empresaId ?? null,
      deveTrocarSenha: target.deveTrocarSenha,

      // ✅ marca
      impersonatedBy: superId,
    };

    const newSessionToken = await encode({
      token: newTokenPayload as any,
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 60 * 60 * 8, // 8h (ajuste depois)
    });

    // 3) sobrescreve cookie da sessão do NextAuth
    cookieStore.set(sessionCookieName, newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });



    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const ua = req.headers.get("user-agent") || "unknown";

    await prisma.logAuditoria.create({
      data: {
        acao: "IMPERSONATE_START",
        detalhes: `SUPER_ADMIN ${session.user.name} (${superId}) entrou como ${target.nome} (${target.email}) [${target.cargo}] alvoId=${target.id} empresaAlvo=${target.empresaId ?? "SEM_EMPRESA"} ip=${ip} ua=${ua}`,
        adminNome: String(session.user.name || "SUPER_ADMIN"),
        adminId: superId,
        empresaId: String(target.empresaId || "SEM_EMPRESA"),
      },
    });

    return NextResponse.json({
      ok: true,
      impersonating: target.id,
      impersonatedBy: superId,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "internal_error", detail: String(e) },
      { status: 500 }
    );
  }
}