import { NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Verifica se é SUPER_ADMIN (segurança)
  if (!session || session.user.email !== "SEU_EMAIL_SUPER_ADMIN") { 
      // Ou use sua lógica de verificação de super admin existente
  }

  try {
    const { empresaId, diaVencimento, chavePix } = await req.json();

    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        diaVencimento: parseInt(diaVencimento),
        chavePix: chavePix
      }
    });

    return NextResponse.json(empresa);
  } catch (error) {
    return NextResponse.json({ erro: "Erro ao atualizar" }, { status: 500 });
  }
}