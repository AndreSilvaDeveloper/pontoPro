import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { format } from 'date-fns';

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { id, novoHorario, motivo } = await request.json();

    if (!id || !novoHorario) return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });

    const pontoOriginal = await prisma.ponto.findUnique({ 
        where: { id },
        include: { usuario: true } // Inclui dados do funcionário para o log
    });

    if (!pontoOriginal) return NextResponse.json({ erro: 'Ponto não encontrado' }, { status: 404 });

    // Atualiza o Ponto
    await prisma.ponto.update({
      where: { id },
      data: {
        dataHora: new Date(novoHorario),
        descricao: pontoOriginal.descricao 
            ? `${pontoOriginal.descricao} | (Editado por Admin: ${motivo})`
            : `(Editado por Admin: ${motivo})`
      }
    });

    // === GRAVA O LOG DE AUDITORIA ===
    const horarioAntigo = format(pontoOriginal.dataHora, "dd/MM HH:mm");
    const horarioNovo = format(new Date(novoHorario), "dd/MM HH:mm");

    await prisma.logAuditoria.create({
        data: {
            acao: "EDICAO_PONTO",
            detalhes: `Editou ponto de ${pontoOriginal.usuario.nome}. De: ${horarioAntigo} Para: ${horarioNovo}. Motivo: ${motivo}`,
            adminId: session.user.id,
            adminNome: session.user.name || 'Admin',
            empresaId: session.user.empresaId
        }
    });
    // ================================

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro interno ao atualizar.' }, { status: 500 });
  }
}