import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
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

function rangeDiaSP(date: Date) {
  const dia = getDiaSP(date);
  const inicio = new Date(`${dia}T00:00:00.000-03:00`);
  const fim = new Date(`${dia}T23:59:59.999-03:00`);
  return { dia, inicio, fim };
}

const fmt = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
};

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

    // =========================
    // REJEITAR
    // =========================
    if (acao === 'REJEITAR') {
      await prisma.$transaction(async (tx) => {
        await tx.solicitacaoAjuste.update({
          where: { id },
          data: {
            status: 'REJEITADO',
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

      // ✅ Se for inclusão, tipo (ENTRADA/SAIDA...) vem em sol.tipo e deve virar subTipo no Ponto
      const subTipoSolicitado = sol.tipo || null;

      // ========= TRAVA DEFINITIVA CONTRA DUPLICIDADE =========
      // 1) INCLUSÃO: se já existe ponto do mesmo subTipo no mesmo dia -> rejeita automaticamente
      // 2) AJUSTE: se o ajuste mudar o horário de um ponto e isso causar duplicidade do mesmo subTipo no dia -> bloqueia
      const { dia, inicio, fim } = rangeDiaSP(dataFinal);

      // INCLUSÃO
      if (!sol.pontoId) {
        if (!subTipoSolicitado) {
          return NextResponse.json({ erro: 'Solicitação de inclusão sem tipo (subTipo) informado.' }, { status: 400 });
        }

        const jaExisteMesmoTipoNoDia = await prisma.ponto.findFirst({
          where: {
            usuarioId: sol.usuarioId,
            subTipo: subTipoSolicitado,
            dataHora: { gte: inicio, lte: fim },
          },
          orderBy: { dataHora: 'asc' },
        });

        if (jaExisteMesmoTipoNoDia) {
          // Rejeita automaticamente para impedir duplicidade no espelho
          await prisma.$transaction(async (tx) => {
            await tx.solicitacaoAjuste.update({
              where: { id },
              data: {
                status: 'REJEITADO',
                decididoPorId: adminId,
                decididoPorNome: adminNome,
                decididoEm: new Date(),
              },
            });

            const detalhes = [
              `Funcionário: ${funcionarioNome}`,
              `Tipo: INCLUSAO`,
              `Motivo: Duplicidade bloqueada`,
              `Já existe ${subTipoSolicitado.replaceAll('_', ' ')} em ${dia} (${fmt(new Date(jaExisteMesmoTipoNoDia.dataHora))})`,
              dataSolicitada ? `Horário solicitado: ${fmt(dataSolicitada)}` : null,
              `Horário tentado: ${fmt(dataFinal)}`,
              sol.motivo ? `Motivo do funcionário: "${sol.motivo}"` : null,
            ]
              .filter(Boolean)
              .join(' | ');

            await registrarLog({
              empresaId,
              usuarioId: adminId,
              autor: adminNome,
              acao: 'REJEICAO_SOLICITACAO_DUPLICIDADE',
              detalhes,
            });
          });

          return NextResponse.json(
            {
              erro: `Bloqueado: já existe um registro de ${subTipoSolicitado.replaceAll('_', ' ')} em ${dia}. Funcionário deve solicitar AJUSTE, não INCLUSÃO.`,
              code: 'DUPLICIDADE_PONTO',
              dia,
              subTipo: subTipoSolicitado,
              pontoExistenteId: jaExisteMesmoTipoNoDia.id,
              horarioExistente: jaExisteMesmoTipoNoDia.dataHora,
            },
            { status: 400 }
          );
        }
      }

      // AJUSTE (opcional, mas recomendado)
      if (sol.pontoId && sol.ponto?.subTipo) {
        const subTipoOriginal = sol.ponto.subTipo;

        // Se existe outro ponto do mesmo subTipo no mesmo dia (exceto o próprio)
        const conflito = await prisma.ponto.findFirst({
          where: {
            usuarioId: sol.usuarioId,
            subTipo: subTipoOriginal,
            dataHora: { gte: inicio, lte: fim },
            NOT: { id: sol.pontoId },
          },
          orderBy: { dataHora: 'asc' },
        });

        if (conflito) {
          // Não aprova para não gerar duplicidade
          await prisma.$transaction(async (tx) => {
            await tx.solicitacaoAjuste.update({
              where: { id },
              data: {
                status: 'REJEITADO',
                decididoPorId: adminId,
                decididoPorNome: adminNome,
                decididoEm: new Date(),
              },
            });

            const detalhes = [
              `Funcionário: ${funcionarioNome}`,
              `Tipo: AJUSTE`,
              `Motivo: Conflito de duplicidade bloqueado`,
              `SubTipo: ${subTipoOriginal.replaceAll('_', ' ')}`,
              `Conflito: já existe outro registro no dia ${dia} (${fmt(new Date(conflito.dataHora))})`,
              dataSolicitada ? `Horário solicitado: ${fmt(dataSolicitada)}` : null,
              `Horário tentado: ${fmt(dataFinal)}`,
              sol.motivo ? `Motivo do funcionário: "${sol.motivo}"` : null,
            ]
              .filter(Boolean)
              .join(' | ');

            await registrarLog({
              empresaId,
              usuarioId: adminId,
              autor: adminNome,
              acao: 'REJEICAO_SOLICITACAO_DUPLICIDADE',
              detalhes,
            });
          });

          return NextResponse.json(
            {
              erro: `Bloqueado: este ajuste causaria duplicidade de ${subTipoOriginal.replaceAll(
                '_',
                ' '
              )} no dia ${dia}.`,
              code: 'DUPLICIDADE_PONTO',
              dia,
              subTipo: subTipoOriginal,
              pontoConflitanteId: conflito.id,
              horarioConflitante: conflito.dataHora,
            },
            { status: 400 }
          );
        }
      }
      // =======================================================

      await prisma.$transaction(async (tx) => {
        if (sol.pontoId) {
          // AJUSTE: só muda o horário do ponto existente
          await tx.ponto.update({
            where: { id: sol.pontoId },
            data: { dataHora: dataFinal },
          });
        } else {
          // INCLUSÃO: cria ponto novo
          // ✅ Correção: salvar ação em subTipo
          await tx.ponto.create({
            data: {
              usuarioId: sol.usuarioId,
              dataHora: dataFinal,
              tipo: subTipoSolicitado ?? undefined, 
              subTipo: subTipoSolicitado, // ✅ AQUI é o certo
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
