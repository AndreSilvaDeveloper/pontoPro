import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Segurança básica (adicione verificação de SUPER_ADMIN se tiver)
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  
  try {
    const { empresaId } = await req.json();

    // Define que o pagamento foi feito AGORA
    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        dataUltimoPagamento: new Date()
      }
    });

    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ erro: "Erro ao confirmar" }, { status: 500 });
  }
}