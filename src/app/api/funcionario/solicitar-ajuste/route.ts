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

  // SP normalmente -03:00. (mesma abordagem que você já usa)
  const inicio = new Date(`${dia}T00:00:00.000-03:00`);
  const fim = new Date(`${dia}T23:59:59.999-03:00`);

  return { dia, inicio, fim };
}

// ✅ range do minuto (trava “mesmo horário”, ignorando segundos/ms)
function rangeMinuto(date: Date) {
  const ini = new Date(date);
  ini.setSeconds(0, 0);
  const fim = new Date(ini);
  fim.setMinutes(fim.getMinutes() + 1);
  return { ini, fim };
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

    const novoHorarioDate = new Date(novoHorario);

    // ============================
    // ✅ DEFINE O TIPO EFETIVO
    // - EDIÇÃO (pontoId): tipo vem do próprio ponto (subTipo)
    // - INCLUSÃO (sem pontoId): tipo é obrigatório e vem do payload
    // ============================
    let tipoEfetivo: string | null = null;

    if (pontoId) {
      const pontoAtual = await prisma.ponto.findUnique({
        where: { id: pontoId },
        select: { dataHora: true, subTipo: true, usuarioId: true },
      });

      if (!pontoAtual) {
        return NextResponse.json({ erro: 'Registro de ponto não encontrado.' }, { status: 404 });
      }

      // Segurança: impede mexer em ponto de outro usuário
      if (pontoAtual.usuarioId !== session.user.id) {
        return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
      }

      tipoEfetivo = pontoAtual.subTipo;

      // ✅ trava “ajuste para o mesmo horário do próprio registro” (mesmo minuto)
      const { ini: atualIni, fim: atualFim } = rangeMinuto(pontoAtual.dataHora);
      if (novoHorarioDate >= atualIni && novoHorarioDate < atualFim) {
        return NextResponse.json(
          {
            erro: 'O novo horário é igual ao horário atual do registro (mesmo minuto). Altere para um horário diferente.',
            code: 'SAME_AS_CURRENT',
          },
          { status: 400 }
        );
      }
    } else {
      // Inclusão: precisa do tipo
      if (!tipo) {
        return NextResponse.json({ erro: 'Tipo é obrigatório para inclusão.' }, { status: 400 });
      }
      tipoEfetivo = tipo;
    }

    // ============================
    // ✅ TRAVA: “mesmo horário já batido”
    // - checa ponto no MESMO minuto para o MESMO subTipo
    // - se for edição, ignora o próprio pontoId
    // ============================
    const { ini: minutoIni, fim: minutoFim } = rangeMinuto(novoHorarioDate);

    const pontoMesmoHorario = await prisma.ponto.findFirst({
      where: {
        usuarioId: session.user.id,
        subTipo: tipoEfetivo!,
        dataHora: { gte: minutoIni, lt: minutoFim },
        ...(pontoId ? { id: { not: pontoId } } : {}),
      },
      orderBy: { dataHora: 'asc' },
    });

    if (pontoMesmoHorario) {
      return NextResponse.json(
        {
          erro: 'Você já possui um ponto registrado exatamente neste horário (mesmo minuto). Escolha um horário diferente.',
          code: 'DUPLICATE_TIME',
          tipo: tipoEfetivo,
          horarioExistente: pontoMesmoHorario.dataHora,
          pontoIdExistente: pontoMesmoHorario.id,
        },
        { status: 400 }
      );
    }

    // ============================
    // Trava INCLUSÃO indevida (sua regra atual)
    // Regra: só pode incluir se NÃO existir ponto do MESMO tipo no MESMO dia.
    // ============================
    if (!pontoId) {
      const { dia, inicio, fim } = rangeDiaSPFromISO(novoHorario);

      const pontoExistenteDiaTipo = await prisma.ponto.findFirst({
        where: {
          usuarioId: session.user.id,
          subTipo: tipoEfetivo!,
          dataHora: { gte: inicio, lte: fim },
        },
        orderBy: { dataHora: 'asc' },
      });

      if (pontoExistenteDiaTipo) {
        return NextResponse.json(
          {
            erro: `Você já registrou ${String(tipoEfetivo).replaceAll('_', ' ')} em ${dia}. Para corrigir horário, solicite AJUSTE (não INCLUSÃO).`,
            code: 'USE_AJUSTE',
            dia,
            tipoExistente: tipoEfetivo,
            pontoIdSugerido: pontoExistenteDiaTipo.id,
            horarioExistente: pontoExistenteDiaTipo.dataHora,
          },
          { status: 400 }
        );
      }
    }

    // ============================
    // TRAVA DE DUPLICIDADE (solicitação pendente) - sua regra atual
    // ============================
    if (pontoId) {
      const jaExiste = await prisma.solicitacaoAjuste.findFirst({
        where: {
          pontoId: pontoId,
          status: 'PENDENTE',
        },
      });

      if (jaExiste) {
        return NextResponse.json(
          { erro: 'Já existe uma solicitação pendente para este registro.' },
          { status: 400 }
        );
      }
    } else {
      // Inclusão: trava por mesmo horário + tipo + pendente
      const jaExiste = await prisma.solicitacaoAjuste.findFirst({
        where: {
          usuarioId: session.user.id,
          novoHorario: new Date(novoHorario),
          tipo: tipoEfetivo!,
          status: 'PENDENTE',
        },
      });

      if (jaExiste) {
        return NextResponse.json({ erro: 'Você já enviou uma solicitação para este horário.' }, { status: 400 });
      }
    }

    // ============================
    // CRIAR SOLICITAÇÃO
    // - edição: salva tipo como null (ou pode salvar tipoEfetivo se quiser)
    // - inclusão: salva tipoEfetivo
    // ============================
    const solicitacao = await prisma.solicitacaoAjuste.create({
      data: {
        usuarioId: session.user.id,
        pontoId: pontoId || null,
        tipo: pontoId ? null : tipoEfetivo, // <- mantém comportamento: edição não precisa tipo
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
