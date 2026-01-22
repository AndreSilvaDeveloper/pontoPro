import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';

// LISTAR
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const solicitacoes = await prisma.solicitacaoAjuste.findMany({
    where: {
      status: 'PENDENTE',
      // @ts-ignore
      usuario: { empresaId: session.user.empresaId },
    },
    include: { usuario: true, ponto: true },
    orderBy: { criadoEm: 'desc' },
  });

  return NextResponse.json(solicitacoes);
}

// APROVAR OU REJEITAR
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, acao, novoHorarioFinal } = body;

    if (!id || !acao) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    // @ts-ignore
    const adminId = session.user.id as string;
    // @ts-ignore
    const adminNome = (session.user.nome || session.user.name || 'Admin') as string;

    const sol = await prisma.solicitacaoAjuste.findUnique({
      where: { id },
      include: { usuario: true, ponto: true },
    });

    if (!sol) {
      return NextResponse.json({ erro: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (sol.usuario?.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Acesso negado (empresa inválida)' }, { status: 403 });
    }

    const funcionarioNome = sol.usuario?.nome || 'Funcionário';
    const tipoSol = sol.pontoId ? 'AJUSTE' : 'INCLUSAO';
    const dataSolicitada = sol.novoHorario ? new Date(sol.novoHorario) : null;

    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // =========================
    // REJEITAR
    // =========================
    if (acao === 'REJEITAR') {
      await prisma.$transaction(async (tx) => {
        await tx.solicitacaoAjuste.update({
          where: { id },
          data: {
            status: 'REJEITADO',
            // ✅ salva quem decidiu (pra aparecer no histórico do funcionário)
            decididoPorId: adminId,
            decididoPorNome: adminNome,
            decididoEm: new Date(),
          },
        });

        const detalhes = [
          `Funcionário: ${funcionarioNome}`,
          `Tipo: ${tipoSol}`,
          dataSolicitada ? `Horário solicitado: ${fmt(dataSolicitada)}` : null,
          sol.motivo ? `Motivo: "${sol.motivo}"` : null,
        ]
          .filter(Boolean)
          .join(' | ');

        await registrarLog({
          empresaId,
          usuarioId: adminId,
          autor: adminNome,
          acao: 'REJEICAO_SOLICITACAO',
          detalhes,
        });
      });

      return NextResponse.json({ success: true });
    }

    // =========================
    // APROVAR
    // =========================
    if (acao === 'APROVAR') {
      const dataFinal = new Date(novoHorarioFinal || sol.novoHorario);

      await prisma.$transaction(async (tx) => {
        if (sol.pontoId) {
          await tx.ponto.update({
            where: { id: sol.pontoId },
            data: { dataHora: dataFinal },
          });
        } else {
          await tx.ponto.create({
            data: {
              usuarioId: sol.usuarioId,
              dataHora: dataFinal,
              tipo: sol.tipo || 'NORMAL',
              latitude: 0,
              longitude: 0,
              endereco: 'Inclusão Manual (Esquecimento)',
              fotoUrl: null,
            },
          });
        }

        await tx.solicitacaoAjuste.update({
          where: { id },
          data: {
            status: 'APROVADO',
            // ✅ salva quem decidiu (pra aparecer no histórico do funcionário)
            decididoPorId: adminId,
            decididoPorNome: adminNome,
            decididoEm: new Date(),
          },
        });

        const detalhes = [
          `Funcionário: ${funcionarioNome}`,
          `Tipo: ${tipoSol}`,
          dataSolicitada ? `Horário solicitado: ${fmt(dataSolicitada)}` : null,
          `Horário aprovado: ${fmt(dataFinal)}`,
          sol.motivo ? `Motivo: "${sol.motivo}"` : null,
        ]
          .filter(Boolean)
          .join(' | ');

        await registrarLog({
          empresaId,
          usuarioId: adminId,
          autor: adminNome,
          acao: 'APROVACAO_SOLICITACAO',
          detalhes,
        });
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 });
  }
}
