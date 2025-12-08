import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// LISTAR
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const solicitacoes = await prisma.solicitacaoAjuste.findMany({
    where: { 
      status: 'PENDENTE',
      usuario: { empresaId: session.user.empresaId } 
    },
    include: { usuario: true, ponto: true }, // Inclui ponto (pode vir null)
    orderBy: { criadoEm: 'desc' }
  });

  return NextResponse.json(solicitacoes);
}

// APROVAR OU REJEITAR
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const { id, acao, novoHorarioFinal } = await request.json();

    if (acao === 'REJEITAR') {
      await prisma.solicitacaoAjuste.update({
        where: { id },
        data: { status: 'REJEITADO' }
      });
    } else if (acao === 'APROVAR') {
      const sol = await prisma.solicitacaoAjuste.findUnique({ where: { id } });
      if (!sol) throw new Error("Solicitação não encontrada");

      const dataFinal = new Date(novoHorarioFinal || sol.novoHorario);

      if (sol.pontoId) {
        // === CASO 1: EDIÇÃO (JÁ EXISTE) ===
        await prisma.ponto.update({
          where: { id: sol.pontoId },
          data: { dataHora: dataFinal }
        });
      } else {
        // === CASO 2: INCLUSÃO (PONTO ESQUECIDO) ===
        // Precisamos criar um ponto novo "artificial"
        await prisma.ponto.create({
          data: {
            usuarioId: sol.usuarioId,
            dataHora: dataFinal,
            tipo: sol.tipo || 'NORMAL', // Usa o tipo que o funcionário escolheu
            latitude: 0, // Ponto manual não tem GPS
            longitude: 0,
            endereco: 'Inclusão Manual (Esquecimento)',
            fotoUrl: null // Ponto manual não tem foto
          }
        });
      }

      await prisma.solicitacaoAjuste.update({
        where: { id },
        data: { status: 'APROVADO' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 });
  }
}