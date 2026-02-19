import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { format } from 'date-fns';

function isValidTimeHHMM(v: any) {
  if (typeof v !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

// Mantém o comportamento anterior (meio-dia) para evitar bugs de fuso em Date-only
const criarDataAjustada = (dataString: string) => {
  if (!dataString) return new Date();
  return new Date(`${dataString}T12:00:00`);
};

// Novo: cria Date com hora (para folga parcial)
const criarDataComHora = (dataString: string, hhmm: string) => {
  if (!dataString) return new Date();
  return new Date(`${dataString}T${hhmm}:00`);
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN')
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });

  try {
    const { usuarioId, tipo, dataInicio, dataFim, motivo, horaInicio, horaFim } = await request.json();

    if (!usuarioId || !dataInicio || !tipo)
      return NextResponse.json({ erro: 'Preencha os campos obrigatórios.' }, { status: 400 });

    const isFolgaParcial = tipo === 'FOLGA' && isValidTimeHHMM(horaInicio) && isValidTimeHHMM(horaFim);

    let inicio: Date;
    let fim: Date;

    if (isFolgaParcial) {
      const ini = criarDataComHora(dataInicio, horaInicio);
      const fimData = dataFim ? dataFim : dataInicio;
      const fimD = criarDataComHora(fimData, horaFim);

      if (!(ini instanceof Date) || isNaN(ini.getTime()))
        return NextResponse.json({ erro: 'Hora início inválida.' }, { status: 400 });

      if (!(fimD instanceof Date) || isNaN(fimD.getTime()))
        return NextResponse.json({ erro: 'Hora fim inválida.' }, { status: 400 });

      if (fimD.getTime() <= ini.getTime())
        return NextResponse.json({ erro: 'Hora fim precisa ser maior que a hora início.' }, { status: 400 });

      inicio = ini;
      fim = fimD;
    } else {
      inicio = criarDataAjustada(dataInicio);
      fim = dataFim ? criarDataAjustada(dataFim) : inicio;
    }

    // Busca nome do funcionário para o log
    const funcionario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

    await prisma.ausencia.create({
      data: {
        usuarioId,
        tipo,
        dataInicio: inicio,
        dataFim: fim,
        motivo: motivo || 'Lançamento Administrativo',
        status: 'APROVADO',
        comprovanteUrl: null,
      },
    });

    // === GRAVA O LOG ===
    const periodoTexto = isFolgaParcial
      ? `${format(inicio, 'dd/MM HH:mm')} até ${format(fim, 'dd/MM HH:mm')}`
      : `${format(inicio, 'dd/MM')} até ${format(fim, 'dd/MM')}`;

    await prisma.logAuditoria.create({
      data: {
        acao: 'LANCAMENTO_AUSENCIA',
        detalhes: `Lançou ${tipo} para ${funcionario?.nome}. ${periodoTexto}. Obs: ${motivo}`,
        adminId: session.user.id,
        adminNome: session.user.name || 'Admin',
        empresaId: session.user.empresaId,
      },
    });
    // ===================

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro interno ao salvar.' }, { status: 500 });
  }
}
