import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET: Lista todas as ausências PENDENTES
export async function GET() {
  const session = await getServerSession(authOptions);
  
  // CORREÇÃO AQUI: Mudamos de .role para .cargo
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const pendencias = await prisma.ausencia.findMany({
      where: {
        status: 'PENDENTE',
      },
      include: {
        usuario: {
          select: {
            nome: true,
            email: true,
          }
        }
      },
      orderBy: {
        criadoEm: 'asc'
      }
    });

    return NextResponse.json(pendencias);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao listar pendências' }, { status: 500 });
  }
}

// POST: Aprova ou Rejeita
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // CORREÇÃO AQUI TAMBÉM: Mudamos de .role para .cargo
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id, status } = await request.json(); 

    if (!['APROVADO', 'REJEITADO'].includes(status)) {
        return NextResponse.json({ erro: 'Status inválido' }, { status: 400 });
    }

    const ausenciaAtualizada = await prisma.ausencia.update({
      where: { id },
      data: {
        status: status,
        // admin_approval_id: session.user.id // (Opcional)
      }
    });

    return NextResponse.json({ success: true, ausencia: ausenciaAtualizada });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao atualizar ausência' }, { status: 500 });
  }
}