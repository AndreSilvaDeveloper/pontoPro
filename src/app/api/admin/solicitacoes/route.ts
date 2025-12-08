import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// LISTAR SOLICITAÇÕES PENDENTES
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const solicitacoes = await prisma.solicitacaoAjuste.findMany({
    where: { 
      status: 'PENDENTE',
      usuario: { empresaId: session.user.empresaId } 
    },
    include: { usuario: true, ponto: true },
    orderBy: { criadoEm: 'desc' }
  });

  return NextResponse.json(solicitacoes);
}

// APROVAR OU REJEITAR
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const { id, acao, novoHorarioFinal } = await request.json(); // novoHorarioFinal é caso o admin edite

    if (acao === 'REJEITAR') {
      await prisma.solicitacaoAjuste.update({
        where: { id },
        data: { status: 'REJEITADO' }
      });
    } else if (acao === 'APROVAR') {
      // 1. Busca a solicitação
      const sol = await prisma.solicitacaoAjuste.findUnique({ where: { id } });
      if (!sol) throw new Error("Solicitação não encontrada");

      // 2. Atualiza o PONTO ORIGINAL com o horário aprovado (ou editado pelo admin)
      await prisma.ponto.update({
        where: { id: sol.pontoId },
        data: { dataHora: new Date(novoHorarioFinal || sol.novoHorario) }
      });

      // 3. Marca como aprovado
      await prisma.solicitacaoAjuste.update({
        where: { id },
        data: { status: 'APROVADO' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 });
  }
}