// src/app/api/reset-super/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    // 1) exige token
    if (!process.env.SUPER_RESET_TOKEN || token !== process.env.SUPER_RESET_TOKEN) {
      return NextResponse.json({ erro: "unauthorized" }, { status: 401 });
    }

    // 2) opcional: bloqueia em produção
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ erro: "disabled_in_production" }, { status: 403 });
    }

    // ✅ troque pra uma senha forte (mesmo sendo dev)
    const passwordHash = await hash(process.env.SUPER_RESET_PASSWORD ?? "Andresamara93@", 10);

    const user = await prisma.usuario.upsert({
      where: { email: "super@workid.com" },
      update: {
        senha: passwordHash,
        cargo: "SUPER_ADMIN",
        empresaId: null,
        deveTrocarSenha: false,
      },
      create: {
        nome: "Super Admin",
        email: "super@workid.com",
        senha: passwordHash,
        cargo: "SUPER_ADMIN",
        empresaId: null,
        deveTrocarSenha: false,
      },
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Super Admin restaurado com sucesso!",
      login: user.email,
    });
  } catch (error) {
    return NextResponse.json(
      { erro: "Falha ao resetar", detalhe: String(error) },
      { status: 500 }
    );
  }
}