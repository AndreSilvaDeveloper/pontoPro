import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Verifica se o usuário já viu a versão atual das novidades
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: (session.user as any).id },
    select: { novidadesVisto: true },
  });

  return NextResponse.json({ novidadesVisto: usuario?.novidadesVisto ?? null });
}

// Marca a versão como vista
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { versao } = await req.json();
  if (!versao) {
    return NextResponse.json({ error: "Versão obrigatória" }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: (session.user as any).id },
    data: { novidadesVisto: versao },
  });

  return NextResponse.json({ ok: true });
}
