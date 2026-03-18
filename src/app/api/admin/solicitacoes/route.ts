import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';
import { enviarEmailSeguro } from '@/lib/email';
import { enviarPushSeguro } from '@/lib/push';

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
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
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

      // Notificar funcionário por e-mail sobre rejeição
      if (sol.usuario?.email) {
        const dataFormatada = dataSolicitada ? fmt(dataSolicitada) : 'N/A';
        const tipoLabel = tipoSol === 'INCLUSAO' ? 'Inclusão de ponto' : 'Ajuste de ponto';
        enviarEmailSeguro(
          sol.usuario.email,
          'Sua solicitação foi rejeitada - WorkID',
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #5b21b6; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">WorkID</h1>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 30px;">
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 20px;">
                <h2 style="color: #dc2626; margin: 0 0 8px 0; font-size: 18px;">Solicitação Rejeitada</h2>
                <p style="color: #991b1b; margin: 0;">Sua solicitação foi analisada e rejeitada.</p>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Funcionário:</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${funcionarioNome}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Tipo:</td><td style="padding: 8px 0; color: #111827;">${tipoLabel}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Data/Hora:</td><td style="padding: 8px 0; color: #111827;">${dataFormatada}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 13px; margin: 0;">Este é um e-mail automático do sistema WorkID.</p>
            </div>
          </div>
          `
        );
      }

      // Push notification para funcionário
      enviarPushSeguro(sol.usuarioId, {
        title: 'Solicitação Rejeitada',
        body: 'Sua solicitação de ajuste foi rejeitada.',
        url: '/funcionario/historico',
        tag: 'solicitacao-decidida',
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

      // Notificar funcionário por e-mail sobre aprovação
      if (sol.usuario?.email) {
        const dataFormatada = fmt(dataFinal);
        const tipoLabel = tipoSol === 'INCLUSAO' ? 'Inclusão de ponto' : 'Ajuste de ponto';
        enviarEmailSeguro(
          sol.usuario.email,
          'Sua solicitação foi aprovada - WorkID',
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #5b21b6; padding: 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">WorkID</h1>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; padding: 30px;">
              <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin-bottom: 20px;">
                <h2 style="color: #16a34a; margin: 0 0 8px 0; font-size: 18px;">Solicitação Aprovada</h2>
                <p style="color: #166534; margin: 0;">Sua solicitação foi analisada e aprovada.</p>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Funcionário:</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${funcionarioNome}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Tipo:</td><td style="padding: 8px 0; color: #111827;">${tipoLabel}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280;">Horário aprovado:</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${dataFormatada}</td></tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
              <p style="color: #6b7280; font-size: 13px; margin: 0;">Este é um e-mail automático do sistema WorkID.</p>
            </div>
          </div>
          `
        );
      }

      // Push notification para funcionário
      enviarPushSeguro(sol.usuarioId, {
        title: 'Solicitação Aprovada',
        body: 'Sua solicitação de ajuste foi aprovada!',
        url: '/funcionario/historico',
        tag: 'solicitacao-decidida',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 });
  }
}
