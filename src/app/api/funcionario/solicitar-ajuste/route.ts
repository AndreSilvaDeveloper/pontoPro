import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { registrarLog } from '@/lib/logger';
import { enviarEmailSeguro } from '@/lib/email';
import { enviarPushAdmins } from '@/lib/push';

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
    // Mantido fora do `if` pra reaproveitar na lógica de auto-aprovação abaixo.
    let horarioOriginal: Date | null = null;

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
      horarioOriginal = pontoAtual.dataHora;

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
    // VERIFICA AUTO-GESTÃO / AUTO-APROVAÇÃO
    // - autoGestao (permitirEdicaoFunc): funcionário cria/edita ponto direto, sem solicitação
    // - autoAprovarAjusteMin: ajustes pequenos (≤ N min) são aprovados automaticamente,
    //   mantendo registro auditável com status APROVADO
    // ============================
    // @ts-ignore
    const empresaIdSess = session.user.empresaId as string;
    const empresaCfg = await prisma.empresa.findUnique({
      where: { id: empresaIdSess },
      select: { configuracoes: true },
    });
    const cfg = (empresaCfg?.configuracoes as any) || {};
    const autoGestao = !!cfg.permitirEdicaoFunc;
    const autoAprovarAjusteMin = typeof cfg.autoAprovarAjusteMinutos === 'number'
      ? Math.max(0, Math.floor(cfg.autoAprovarAjusteMinutos))
      : 0;

    if (autoGestao) {
      if (pontoId) {
        // Edição direta
        await prisma.ponto.update({
          where: { id: pontoId },
          data: { dataHora: new Date(novoHorario) },
        });
      } else {
        // Inclusão direta
        await prisma.ponto.create({
          data: {
            usuarioId: session.user.id,
            dataHora: new Date(novoHorario),
            latitude: 0,
            longitude: 0,
            tipo: tipoEfetivo!,
            subTipo: tipoEfetivo!,
            endereco: 'Auto-gestão (funcionário)',
          },
        });
      }

      await registrarLog({
        empresaId: empresaIdSess,
        usuarioId: session.user.id,
        autor: session.user.name || 'Funcionário',
        acao: pontoId ? 'AUTO_EDICAO' : 'AUTO_INCLUSAO',
        detalhes: pontoId
          ? `Editou o próprio ponto (auto-gestão) para ${new Date(novoHorario).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} | Motivo: "${motivo}"`
          : `Incluiu ${String(tipoEfetivo).replaceAll('_', ' ')} (auto-gestão) em ${new Date(novoHorario).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} | Motivo: "${motivo}"`,
      });

      return NextResponse.json({ success: true, autoGestao: true });
    }

    // ============================
    // AUTO-APROVAÇÃO de ajustes pequenos (só para AJUSTE, não inclusão)
    // Se a diferença entre o horário atual e o novo é ≤ N minutos, aplica direto
    // mas mantém SolicitacaoAjuste com status APROVADO pro histórico.
    // ============================
    if (pontoId && horarioOriginal && autoAprovarAjusteMin > 0) {
      const diffMin = Math.abs(novoHorarioDate.getTime() - horarioOriginal.getTime()) / 60_000;
      if (diffMin <= autoAprovarAjusteMin) {
        const agora = new Date();

        await prisma.ponto.update({
          where: { id: pontoId },
          data: { dataHora: novoHorarioDate },
        });

        const solicitacaoAuto = await prisma.solicitacaoAjuste.create({
          data: {
            usuarioId: session.user.id,
            pontoId,
            tipo: null,
            novoHorario: novoHorarioDate,
            motivo,
            status: 'APROVADO',
            decididoPorId: null,
            decididoPorNome: `Auto-aprovação (≤${autoAprovarAjusteMin} min)`,
            decididoEm: agora,
          },
        });

        const fmtSP = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        await registrarLog({
          empresaId: empresaIdSess,
          usuarioId: session.user.id,
          autor: session.user.name || 'Funcionário',
          acao: 'AJUSTE_AUTO_APROVADO',
          detalhes: `Ajuste auto-aprovado (Δ=${diffMin.toFixed(1)}min ≤ ${autoAprovarAjusteMin}min): novo horário ${fmtSP(novoHorarioDate)} | Motivo: "${motivo}"`,
        });

        return NextResponse.json({ success: true, autoAprovado: true, solicitacao: solicitacaoAuto });
      }
    }

    // ============================
    // CRIAR SOLICITAÇÃO (fluxo padrão com aprovação do admin)
    // ============================
    const solicitacao = await prisma.solicitacaoAjuste.create({
      data: {
        usuarioId: session.user.id,
        pontoId: pontoId || null,
        tipo: pontoId ? null : tipoEfetivo,
        novoHorario: new Date(novoHorario),
        motivo,
        status: 'PENDENTE',
      },
    });

    const fmtSP = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const tipoNome = (tipoEfetivo || tipo || '').replace(/_/g, ' ');
    let logDetalhes: string;

    if (pontoId) {
      // Ajuste: mostra horário original → novo
      const pontoOriginal = await prisma.ponto.findUnique({ where: { id: pontoId }, select: { dataHora: true } });
      const horaOriginal = pontoOriginal ? fmtSP(new Date(pontoOriginal.dataHora)) : '?';
      logDetalhes = `Solicitou ajuste de ${tipoNome} no dia ${fmtSP(novoHorarioDate).split(',')[0]}: de ${horaOriginal.split(', ')[1] || horaOriginal} para ${fmtSP(novoHorarioDate).split(', ')[1] || fmtSP(novoHorarioDate)} | Motivo: "${motivo}"`;
    } else {
      // Inclusão: mostra data, horário e tipo
      logDetalhes = `Solicitou inclusão de ${tipoNome} para ${fmtSP(novoHorarioDate)} | Motivo: "${motivo}"`;
    }

    await registrarLog({
      // @ts-ignore
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
      autor: session.user.name || 'Funcionário',
      acao: pontoId ? 'SOLICITACAO_EDICAO' : 'SOLICITACAO_INCLUSAO',
      detalhes: logDetalhes,
    });

    // Notificar todos os admins da empresa por e-mail
    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    const funcionarioNome = session.user.name || 'Funcionário';
    const tipoLabel = pontoId ? 'Ajuste de ponto' : 'Inclusão de ponto';
    const dataFormatada = new Date(novoHorario).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const admins = await prisma.usuario.findMany({
      where: { empresaId, cargo: 'ADMIN' },
      select: { email: true },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #5b21b6; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">WorkID</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 30px;">
          <div style="background-color: #f5f3ff; border-left: 4px solid #5b21b6; padding: 16px; margin-bottom: 20px;">
            <h2 style="color: #5b21b6; margin: 0 0 8px 0; font-size: 18px;">Nova Solicitação de Ajuste</h2>
            <p style="color: #4c1d95; margin: 0;">Um funcionário enviou uma nova solicitação que aguarda sua análise.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Funcionário:</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${funcionarioNome}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Tipo:</td><td style="padding: 8px 0; color: #111827;">${tipoLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Data/Hora:</td><td style="padding: 8px 0; color: #111827;">${dataFormatada}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Motivo:</td><td style="padding: 8px 0; color: #111827;">${motivo}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 13px; margin: 0;">Este é um e-mail automático do sistema WorkID.</p>
        </div>
      </div>
    `;

    for (const admin of admins) {
      if (admin.email) {
        enviarEmailSeguro(admin.email, 'Nova solicitação de ajuste - WorkID', emailHtml);
      }
    }

    // Push notification para admins
    enviarPushAdmins(empresaId, {
      title: 'Nova Solicitação de Ajuste',
      body: `${session.user.name} enviou uma solicitação`,
      url: '/admin/solicitacoes',
      tag: 'nova-solicitacao',
    });

    return NextResponse.json({ success: true, solicitacao });
  } catch (error) {
    console.error('Erro ao solicitar ajuste:', error);
    return NextResponse.json({ erro: 'Erro interno ao processar solicitação' }, { status: 500 });
  }
}
