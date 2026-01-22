import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { format } from 'date-fns';
import { registrarLog } from '@/lib/logger';

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { id, novoHorario, motivo } = await request.json();

    if (!id || !novoHorario || !motivo) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId;
    // @ts-ignore
    const adminId = session.user.id;
    // @ts-ignore
    const adminNome = session.user.nome || session.user.name || 'Admin';

    const ponto = await prisma.ponto.findUnique({
      where: { id },
      include: { usuario: true },
    });

    if (!ponto) {
      return NextResponse.json({ erro: 'Ponto não encontrado' }, { status: 404 });
    }

    if (ponto.usuario.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    const antes = format(new Date(ponto.dataHora), 'dd/MM/yyyy HH:mm');
    const depois = format(new Date(novoHorario), 'dd/MM/yyyy HH:mm');

    // Atualiza
    await prisma.ponto.update({
      where: { id },
      data: {
        dataHora: new Date(novoHorario),
        descricao: ponto.descricao
          ? `${ponto.descricao} | Editado por Admin`
          : 'Editado por Admin',
      },
    });

    const detalhes = [
      `Funcionário: ${ponto.usuario.nome}`,
      `Ação: Edição de ponto`,
      `Antes: ${antes}`,
      `Depois: ${depois}`,
      `Motivo: "${motivo}"`,
    ].join(' | ');

    await registrarLog({
      empresaId,
      usuarioId: adminId,
      autor: adminNome,
      acao: 'EDICAO_PONTO',
      detalhes,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro interno ao atualizar.' }, { status: 500 });
  }
}
