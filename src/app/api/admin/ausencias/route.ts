import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';

// helper simples pra formatar data
const fmt = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// GET: Lista todas as ausências PENDENTES (SÓ DA EMPRESA DO ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // @ts-ignore
    const empresaId = session.user.empresaId as string;

    const pendencias = await prisma.ausencia.findMany({
      where: {
        status: 'PENDENTE',
        usuario: { empresaId },
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: {
        criadoEm: 'asc',
      },
    });

    return NextResponse.json(pendencias);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao listar pendências' }, { status: 500 });
  }
}

// POST: Aprova ou Rejeita (E REGISTRA NO LOG)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id, status } = await request.json();

    if (!id || !['APROVADO', 'REJEITADO'].includes(status)) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    // @ts-ignore
    const adminId = session.user.id as string;
    // @ts-ignore
    const adminNome = (session.user.nome || session.user.name || 'Admin') as string;

    // Carrega a ausência + usuário pra validar empresa e montar detalhes
    const ausencia = await prisma.ausencia.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, nome: true, email: true, empresaId: true } },
      },
    });

    if (!ausencia) {
      return NextResponse.json({ erro: 'Ausência não encontrada' }, { status: 404 });
    }

    // Proteção: não deixa aprovar ausência de outra empresa
    if (ausencia.usuario?.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Acesso negado (empresa inválida)' }, { status: 403 });
    }

    // Atualiza + registra log em transação (consistência)
    const ausenciaAtualizada = await prisma.$transaction(async (tx) => {
      const updated = await tx.ausencia.update({
        where: { id },
        data: { status },
      });

      const funcionarioNome = ausencia.usuario?.nome || 'Funcionário';
      const tipo = ausencia.tipo || 'AUSENCIA'; // ex: ATESTADO, FALTA_JUSTIFICADA etc.
      const periodo =
        ausencia.dataFim
          ? `${fmt(new Date(ausencia.dataInicio))} até ${fmt(new Date(ausencia.dataFim))}`
          : `${fmt(new Date(ausencia.dataInicio))}`;

      const detalhes = [
        // `Ausência: ${id}`,
        `Funcionário: ${funcionarioNome}`,
        `Tipo: ${tipo}`,
        `Período: ${periodo}`,
        ausencia.motivo ? `Motivo: "${ausencia.motivo}"` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const acaoLog =
        status === 'APROVADO' ? 'APROVACAO_AUSENCIA' : 'REJEICAO_AUSENCIA';

      await registrarLog({
        empresaId,
        usuarioId: adminId,
        autor: adminNome,
        acao: acaoLog,
        detalhes,
      });

      return updated;
    });

    return NextResponse.json({ success: true, ausencia: ausenciaAtualizada });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao atualizar ausência' }, { status: 500 });
  }
}
