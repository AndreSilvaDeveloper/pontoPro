// src/app/api/public/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const empresaNome = String(body?.empresaNome || "").trim();
    const cnpjRaw = String(body?.cnpj || "").trim();
    const cnpj = cnpjRaw ? onlyDigits(cnpjRaw) : "";
    const adminNome = String(body?.adminNome || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const aceitarTermos = Boolean(body?.aceitarTermos);

    if (!empresaNome || empresaNome.length < 2) {
      return NextResponse.json(
        { ok: false, erro: "Informe o nome da empresa." },
        { status: 400 }
      );
    }
    if (!adminNome || adminNome.length < 2) {
      return NextResponse.json(
        { ok: false, erro: "Informe seu nome." },
        { status: 400 }
      );
    }
    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, erro: "E-mail inválido." },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, erro: "A senha deve ter no mínimo 8 caracteres." },
        { status: 400 }
      );
    }
    if (!aceitarTermos) {
      return NextResponse.json(
        { ok: false, erro: "Você precisa aceitar os termos." },
        { status: 400 }
      );
    }
    if (cnpj && cnpj.length !== 14) {
      return NextResponse.json(
        { ok: false, erro: "CNPJ inválido. Informe 14 dígitos ou deixe em branco." },
        { status: 400 }
      );
    }

    const senhaHash = await bcrypt.hash(password, 10);

    // ✅ Trial de 14 dias (regra do "teste grátis")
    const agora = new Date();
    const trialAte = new Date(agora.getTime() + 14 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nome: empresaNome,
          cnpj: cnpj || null,
          status: "ATIVO",
          configuracoes: {
            bloquearForaDoRaio: true,
            exigirFoto: true,
            permitirEdicaoFunc: false,
            ocultarSaldoHoras: false,
          },
          intervaloPago: false,
          fluxoEstrito: true,

          // ✅ cobrança
          cobrancaAtiva: true,
          trialAte,
          pagoAte: null,
        } as any,
      });

      const usuario = await tx.usuario.create({
        data: {
          nome: adminNome,
          email,
          senha: senhaHash,
          cargo: "ADMIN",
          empresaId: empresa.id,
          deveTrocarSenha: false,
        } as any,
      });

      return { empresaId: empresa.id, usuarioId: usuario.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const target = Array.isArray(e?.meta?.target)
        ? e.meta.target.join(",")
        : String(e?.meta?.target || "");

      const msg = target.includes("email")
        ? "Este e-mail já está em uso."
        : target.includes("cnpj")
          ? "Este CNPJ já está cadastrado."
          : "Já existe cadastro com esses dados.";

      return NextResponse.json({ ok: false, erro: msg }, { status: 409 });
    }

    console.error("signup error:", e);
    return NextResponse.json(
      { ok: false, erro: "Erro interno ao cadastrar." },
      { status: 500 }
    );
  }
}
