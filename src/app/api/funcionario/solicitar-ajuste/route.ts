import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { registrarLog } from '@/lib/logger';

// ============================
// Helpers de Data (SP)
// ============================

function getDiaSP(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;

  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

function rangeDiaSPFromISO(novoHorarioISO: string) {
  const dt = new Date(novoHorarioISO);
  const dia = getDiaSP(dt);

  // Brasil normalmente -03:00 (SP). Isso resolve o caso prático do seu sistema.
  const inicio = new Date(`${dia}T00:00:00.000-03:00`);
  const fim = new Date(`${dia}T23:59:59.999-03:00`);

  return { dia, inicio, fim };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session?.user?.id) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { pontoId, novoHorario, motivo, tipo } = await request.json();

    if (!novoHorario || !motivo) {
      return NextResponse.json({ erro: 'Horário e Motivo são obrigatórios' }, { status: 400 });
    }

    // ============================
    // NOVO: Trava INCLUSÃO indevida
    // ============================
    // Se pontoId for null => é INCLUSÃO.
    // Regra: só pode incluir se NÃO existir ponto do MESMO tipo no MESMO dia.
    if (!pontoId) {
      if (!tipo) {
        return NextResponse.json({ erro: 'Tipo é obrigatório para inclusão.' }, { status: 400 });
      }

      const { dia, inicio, fim } = rangeDiaSPFromISO(novoHorario);

      const pontoExistente = await prisma.ponto.findFirst({
        where: {
          usuarioId: session.user.id,
          // seu schema: tipo = "NORMAL" e subTipo armazena ENTRADA/SAIDA...
          // Pelo seu frontend, você está mandando "tipo" como ENTRADA/SAIDA...
          // então aqui a checagem correta deve ser em subTipo (porque é o que representa ENTRADA/SAIDA_ALMOCO etc)
          subTipo: tipo,
          dataHora: { gte: inicio, lte: fim },
        },
        orderBy: { dataHora: 'asc' },
      });

      if (pontoExistente) {
        return NextResponse.json(
          {
            erro: `Você já registrou ${String(tipo).replaceAll('_', ' ')} em ${dia}. Para corrigir horário, solicite AJUSTE (não INCLUSÃO).`,
            code: 'USE_AJUSTE',
            dia,
            tipoExistente: tipo,
            pontoIdSugerido: pontoExistente.id,
            horarioExistente: pontoExistente.dataHora,
          },
          { status: 400 }
        );
      }
    }

    // ============================
    // TRAVA DE DUPLICIDADE (solicitação pendente)
    // ============================
    if (pontoId) {
      const jaExiste = await prisma.solicitacaoAjuste.findFirst({
        where: {
          pontoId: pontoId,
          status: 'PENDENTE',
        },
      });

      if (jaExiste) {
        return NextResponse.json({ erro: 'Já existe uma solicitação pendente para este registro.' }, { status: 400 });
      }
    } else {
      // Inclusão: trava por mesmo horário + tipo + pendente
      const jaExiste = await prisma.solicitacaoAjuste.findFirst({
        where: {
          usuarioId: session.user.id,
          novoHorario: new Date(novoHorario),
          tipo: tipo,
          status: 'PENDENTE',
        },
      });

      if (jaExiste) {
        return NextResponse.json({ erro: 'Você já enviou uma solicitação para este horário.' }, { status: 400 });
      }
    }

    // ============================
    // CRIAR SOLICITAÇÃO
    // ============================
    const solicitacao = await prisma.solicitacaoAjuste.create({
      data: {
        usuarioId: session.user.id,
        pontoId: pontoId || null,
        tipo: tipo || null,
        novoHorario: new Date(novoHorario),
        motivo,
        status: 'PENDENTE',
      },
    });

    await registrarLog({
      // @ts-ignore
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
      autor: session.user.name || 'Funcionário',
      acao: pontoId ? 'SOLICITACAO_EDICAO' : 'SOLICITACAO_INCLUSAO',
      detalhes: `Solicitou ${pontoId ? 'ajuste' : 'inclusão'} para: ${new Date(novoHorario).toLocaleString(
        'pt-BR'
      )} - Motivo: ${motivo}`,
    });

    return NextResponse.json({ success: true, solicitacao });
  } catch (error) {
    console.error('Erro ao solicitar ajuste:', error);
    return NextResponse.json({ erro: 'Erro interno ao processar solicitação' }, { status: 500 });
  }
}
