import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route'; // Ajuste o caminho se necessário
import { format } from 'date-fns';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { id, motivo } = await request.json();

    if (!id || !motivo) {
        return NextResponse.json({ erro: 'ID e Motivo são obrigatórios.' }, { status: 400 });
    }

    // 1. Busca o ponto antes de excluir para pegar os dados para o Log
    const pontoAlvo = await prisma.ponto.findUnique({ 
        where: { id },
        include: { usuario: true }
    });

    if (!pontoAlvo) return NextResponse.json({ erro: 'Ponto não encontrado' }, { status: 404 });

    // 2. Grava o Log de Auditoria
    const dataFormatada = format(pontoAlvo.dataHora, "dd/MM/yyyy HH:mm");
    
    await prisma.logAuditoria.create({
        data: {
            acao: "EXCLUSAO_PONTO",
            detalhes: `Excluiu ponto de ${pontoAlvo.usuario.nome}. Data/Hora original: ${dataFormatada}. Motivo: ${motivo}`,
            adminId: session.user.id,
            adminNome: session.user.name || 'Admin',
            empresaId: session.user.empresaId
        }
    });

    // 3. Exclui o ponto
    await prisma.ponto.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro exclusão:", error);
    return NextResponse.json({ erro: 'Erro interno ao excluir.' }, { status: 500 });
  }
}