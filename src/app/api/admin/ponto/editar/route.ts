import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';
import { formatInTimeZone } from 'date-fns-tz';
import { atualizarHoraExtraDia } from '@/lib/admin/atualizarHoraExtraDia';

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
  }

  try {
    const { id, novoHorario, novoTipo, motivo } = await request.json();

    if (!id || !novoHorario || !motivo) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
    }

    const TIPOS_VALIDOS = [
      'ENTRADA',
      'SAIDA_ALMOCO',
      'VOLTA_ALMOCO',
      'SAIDA_INTERVALO',
      'VOLTA_INTERVALO',
      'SAIDA',
    ];
    if (novoTipo !== undefined && novoTipo !== null && !TIPOS_VALIDOS.includes(String(novoTipo))) {
      return NextResponse.json({ erro: 'Tipo de ponto inválido' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId;
    // @ts-ignore
    const adminId = session.user.id;
    // @ts-ignore
    const adminNome = session.user.nome || session.user.name || 'Admin';

    const ponto = await prisma.ponto.findUnique({
      where: { id },
      include: { usuario: true },
    });

    if (!ponto) {
      return NextResponse.json({ erro: 'Ponto não encontrado' }, { status: 404 });
    }

    if (ponto.usuario.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    const antes = formatInTimeZone(new Date(ponto.dataHora), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
    const depois = formatInTimeZone(new Date(novoHorario), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
    const tipoMudou = novoTipo && novoTipo !== ponto.tipo;

    // Atualiza
    await prisma.ponto.update({
      where: { id },
      data: {
        dataHora: new Date(novoHorario),
        ...(tipoMudou ? { tipo: String(novoTipo) } : {}),
        descricao: ponto.descricao
          ? `${ponto.descricao} | Editado por Admin`
          : 'Editado por Admin',
      },
    });

    const detalhes = [
      `Funcionário: ${ponto.usuario.nome}`,
      `Ação: Edição de ponto`,
      `Antes: ${antes}${tipoMudou ? ` (${ponto.tipo})` : ''}`,
      `Depois: ${depois}${tipoMudou ? ` (${novoTipo})` : ''}`,
      `Motivo: "${motivo}"`,
    ].join(' | ');

    await registrarLog({
      empresaId,
      usuarioId: adminId,
      autor: adminNome,
      acao: 'EDICAO_PONTO',
      detalhes,
    });

    // Reprocessa hora extra nos dias afetados (antes e depois, caso edição atravesse meia-noite)
    const diasAfetados = new Set<string>();
    diasAfetados.add(new Date(ponto.dataHora).toDateString());
    diasAfetados.add(new Date(novoHorario).toDateString());
    for (const diaStr of diasAfetados) {
      await atualizarHoraExtraDia({
        usuarioId: ponto.usuarioId,
        data: new Date(diaStr),
        adminId,
        adminNome,
      }).catch((e) => console.error('Falha ao atualizar hora extra:', e));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro interno ao atualizar.' }, { status: 500 });
  }
}
