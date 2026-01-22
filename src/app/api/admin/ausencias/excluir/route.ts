import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route'; 
import { prisma } from '@/lib/db';

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, motivo } = body || {};

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }
    if (!motivo || typeof motivo !== 'string' || !motivo.trim()) {
      return NextResponse.json({ error: 'Motivo obrigatório' }, { status: 400 });
    }

    // 🔒 (Recomendado) garanta que o admin só exclui da empresa/loja atual
    // Se você usa empresaId no session, aplique aqui:
    // const empresaId = session.user.empresaId;
    // e filtre no findFirst({ where: { id, empresaId } })

    const ausencia = await prisma.ausencia.findFirst({
      where: { id },
      select: {
        id: true,
        tipo: true,
        dataInicio: true,
        dataFim: true,
        motivo: true,
        usuarioId: true,
      },
    });

    if (!ausencia) {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 });
    }


    await prisma.logAuditoria.create({
      data: {
        acao: 'EXCLUIR_AUSENCIA',
        detalhes: motivo.trim(),
        adminId: session.user.id,
        adminNome: session.user.name || 'Admin',
        empresaId: session.user.empresaId
      },
    });

    await prisma.ausencia.delete({
      where: { id: ausencia.id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Erro ao excluir ausência:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
