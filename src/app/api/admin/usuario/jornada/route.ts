import { NextResponse } from "next/server";
import { prisma } from '@/lib/db';


export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { usuarioId, jornada } = body;

    if (!usuarioId || !jornada) {
      return NextResponse.json(
        { error: "Dados incompletos." },
        { status: 400 }
      );
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        jornada: jornada,
      },
    });

    return NextResponse.json({
      message: "Sucesso",
      usuario: usuarioAtualizado,
    });
  } catch (error) {
    console.error("Erro ao salvar jornada:", error);
    return NextResponse.json(
      { error: "Erro interno ao salvar." },
      { status: 500 }
    );
  }
}