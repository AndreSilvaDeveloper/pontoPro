import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// === GET: Listar meus contracheques ===
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const contracheques = await prisma.contracheque.findMany({
      where: { usuarioId: session.user.id },
      orderBy: { mes: 'desc' },
      select: {
        id: true,
        mes: true,
        arquivoUrl: true,
        nomeArquivo: true,
        criadoEm: true,
        visualizado: true,
        visualizadoEm: true,
        assinado: true,
        assinadoEm: true,
      },
    });

    return NextResponse.json(contracheques);
  } catch (error) {
    console.error('Erro GET contracheques funcionário:', error);
    return NextResponse.json({ erro: 'Erro ao buscar contracheques' }, { status: 500 });
  }
}

// === PUT: Marcar como visualizado e/ou assinar ===
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { id, assinar } = await request.json();
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    const contracheque = await prisma.contracheque.findFirst({
      where: { id, usuarioId: session.user.id },
    });

    if (!contracheque) {
      return NextResponse.json({ erro: 'Contracheque não encontrado' }, { status: 404 });
    }

    const updateData: any = {};

    if (!contracheque.visualizado) {
      updateData.visualizado = true;
      updateData.visualizadoEm = new Date();
    }

    // Assinar contracheque
    if (assinar && !contracheque.assinado) {
      // Buscar assinatura do funcionário
      const usuario = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { assinaturaUrl: true },
      });

      if (!usuario?.assinaturaUrl) {
        return NextResponse.json({ erro: 'Você precisa ter uma assinatura digital cadastrada.' }, { status: 400 });
      }

      updateData.assinado = true;
      updateData.assinadoEm = new Date();
      updateData.assinaturaUrl = usuario.assinaturaUrl;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.contracheque.update({
        where: { id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro PUT contracheque:', error);
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 });
  }
}
