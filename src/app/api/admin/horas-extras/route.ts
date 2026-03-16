import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';

// LISTAR horas extras (filtro por status via query param)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const empresaId = session.user.empresaId as string;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // PENDENTE | APROVADO | REJEITADO

  const horasExtras = await prisma.horaExtra.findMany({
    where: {
      usuario: { empresaId },
      ...(status ? { status } : {}),
    },
    include: { usuario: { select: { id: true, nome: true, jornada: true } } },
    orderBy: { criadoEm: 'desc' },
  });

  return NextResponse.json(horasExtras);
}

// APROVAR ou REJEITAR (individual ou batch)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ids, acao } = body;

    if (!acao || (!id && !ids)) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    // @ts-ignore
    const adminId = session.user.id as string;
    // @ts-ignore
    const adminNome = (session.user.nome || session.user.name || 'Admin') as string;

    const idsParaProcessar: string[] = ids ? ids : [id];
    const novoStatus = acao === 'APROVAR' ? 'APROVADO' : 'REJEITADO';

    for (const itemId of idsParaProcessar) {
      const he = await prisma.horaExtra.findUnique({
        where: { id: itemId },
        include: { usuario: true },
      });

      if (!he || he.usuario?.empresaId !== empresaId) continue;

      await prisma.horaExtra.update({
        where: { id: itemId },
        data: {
          status: novoStatus,
          aprovadoPorId: adminId,
          aprovadoPorNome: adminNome,
          aprovadoEm: new Date(),
        },
      });

      await registrarLog({
        empresaId,
        usuarioId: adminId,
        autor: adminNome,
        acao: acao === 'APROVAR' ? 'APROVACAO_HORA_EXTRA' : 'REJEICAO_HORA_EXTRA',
        detalhes: `Funcionário: ${he.usuario?.nome} | Data: ${he.data} | Minutos extra: ${he.minutosExtra}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 });
  }
}
