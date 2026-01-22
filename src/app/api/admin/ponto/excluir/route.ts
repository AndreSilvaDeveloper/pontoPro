import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { format } from 'date-fns';
import { registrarLog } from '@/lib/logger';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { id, motivo } = await request.json();

    if (!id || !motivo) {
      return NextResponse.json({ erro: 'ID e Motivo são obrigatórios.' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId;
    // @ts-ignore
    const adminId = session.user.id;
    // @ts-ignore
    const adminNome = session.user.nome || session.user.name || 'Admin';

    // Busca o ponto antes de excluir
    const ponto = await prisma.ponto.findUnique({
      where: { id },
      include: { usuario: true },
    });

    if (!ponto) {
      return NextResponse.json({ erro: 'Ponto não encontrado' }, { status: 404 });
    }

    // Segurança: mesma empresa
    if (ponto.usuario.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    const dataHora = format(new Date(ponto.dataHora), 'dd/MM/yyyy HH:mm');

    const detalhes = [
      `Funcionário: ${ponto.usuario.nome}`,
      `Ação: Exclusão de ponto`,
      `Data/Hora: ${dataHora}`,
      `Motivo: "${motivo}"`,
    ].join(' | ');

    // Log
    await registrarLog({
      empresaId,
      usuarioId: adminId,
      autor: adminNome,
      acao: 'EXCLUSAO_PONTO',
      detalhes,
    });

    // Exclui
    await prisma.ponto.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro interno ao excluir.' }, { status: 500 });
  }
}
