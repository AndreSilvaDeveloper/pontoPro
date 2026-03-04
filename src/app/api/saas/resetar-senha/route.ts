import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const cargo = (session?.user as any)?.cargo;

  if (!session || cargo !== "SUPER_ADMIN") {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 403 });
  }

  try {
    const { usuarioId } = await req.json();

    if (!usuarioId) {
      return NextResponse.json({ erro: "usuarioId obrigatório" }, { status: 400 });
    }

    const senhaPadraoHash = await bcrypt.hash("1234", 10);

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        senha: senhaPadraoHash,
        deveTrocarSenha: true,
      },
    });

    return NextResponse.json({ sucesso: true, mensagem: "Senha resetada para 1234" });
  } catch (error) {
    console.error("resetar-senha saas error:", error);
    return NextResponse.json({ erro: "Erro ao resetar senha" }, { status: 500 });
  }
}
