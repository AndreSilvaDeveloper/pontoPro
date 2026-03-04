import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { format } from 'date-fns';
import { registrarLog } from '@/lib/logger';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ erro: 'ID do ponto é obrigatório.' }, { status: 400 });
    }

    const userId = session.user.id;

    const ponto = await prisma.ponto.findUnique({
      where: { id },
      include: { usuario: true },
    });

    if (!ponto) {
      return NextResponse.json({ erro: 'Ponto não encontrado.' }, { status: 404 });
    }

    // Segurança: só pode excluir os próprios pontos
    if (ponto.usuarioId !== userId) {
      return NextResponse.json({ erro: 'Você só pode excluir seus próprios registros.' }, { status: 403 });
    }

    const dataHora = format(new Date(ponto.dataHora), 'dd/MM/yyyy HH:mm');
    const tipo = ponto.subTipo || ponto.tipo || 'PONTO';

    await registrarLog({
      empresaId: ponto.usuario.empresaId!,
      usuarioId: userId,
      autor: ponto.usuario.nome,
      acao: 'EXCLUSAO_PONTO_FUNC',
      detalhes: `Funcionário excluiu próprio ponto | Tipo: ${tipo} | Data/Hora: ${dataHora}`,
    });

    await prisma.ponto.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir ponto (funcionário):', error);
    return NextResponse.json({ erro: 'Erro interno ao excluir.' }, { status: 500 });
  }
}
