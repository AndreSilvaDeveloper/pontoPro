import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';

const TIPOS_VALIDOS = ['PAGAMENTO_HE', 'COMPENSACAO_FOLGA', 'CORRECAO_MANUAL'];

const TIPO_LABELS: Record<string, string> = {
  PAGAMENTO_HE: 'Pagamento de Hora Extra',
  COMPENSACAO_FOLGA: 'Compensação com Folga',
  CORRECAO_MANUAL: 'Correção Manual',
};

// GET: Listar ajustes (por usuário ou todos da empresa)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const empresaId = session.user.empresaId as string;
  const { searchParams } = new URL(request.url);
  const usuarioId = searchParams.get('usuarioId');

  const ajustes = await prisma.ajusteBancoHoras.findMany({
    where: {
      usuario: { empresaId },
      ...(usuarioId ? { usuarioId } : {}),
    },
    include: { usuario: { select: { id: true, nome: true } } },
    orderBy: { criadoEm: 'desc' },
  });

  return NextResponse.json(ajustes);
}

// POST: Criar ajuste
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { usuarioId, data, dataFolga, minutos, tipo, motivo } = body;

    if (!usuarioId || !data || !minutos || !tipo || !motivo) {
      return NextResponse.json({ erro: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ erro: 'Tipo inválido' }, { status: 400 });
    }

    if (typeof minutos !== 'number' || minutos === 0) {
      return NextResponse.json({ erro: 'Minutos deve ser diferente de zero' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    // @ts-ignore
    const adminId = session.user.id as string;
    // @ts-ignore
    const adminNome = (session.user.nome || session.user.name || 'Admin') as string;

    // Verificar que o usuário pertence à empresa
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, nome: true, empresaId: true },
    });

    if (!usuario || usuario.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Funcionário não encontrado' }, { status: 404 });
    }

    const ajuste = await prisma.ajusteBancoHoras.create({
      data: {
        usuarioId, data, minutos, tipo, motivo, adminId, adminNome,
        ...(tipo === 'COMPENSACAO_FOLGA' && dataFolga ? { dataFolga } : {}),
      },
    });

    const tipoLabels: Record<string, string> = {
      PAGAMENTO_HE: 'Pagamento de Hora Extra',
      COMPENSACAO_FOLGA: 'Compensação com Folga',
      CORRECAO_MANUAL: 'Correção Manual',
    };

    const sinal = minutos > 0 ? '+' : '';
    const h = Math.floor(Math.abs(minutos) / 60);
    const m = Math.abs(minutos) % 60;
    const tempoFormatado = `${sinal}${minutos < 0 ? '-' : ''}${h}h${String(m).padStart(2, '0')}`;

    await registrarLog({
      empresaId,
      usuarioId: adminId,
      autor: adminNome,
      acao: 'AJUSTE_BANCO_HORAS',
      detalhes: `Funcionário: ${usuario.nome} | Tipo: ${tipoLabels[tipo]} | Ajuste: ${tempoFormatado} | Ref: ${data} | Motivo: "${motivo}"`,
    });

    return NextResponse.json({ success: true, ajuste });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 });
  }
}

// DELETE: Excluir ajuste
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ erro: 'ID obrigatório' }, { status: 400 });

    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    // @ts-ignore
    const adminId = session.user.id as string;
    // @ts-ignore
    const adminNome = (session.user.nome || session.user.name || 'Admin') as string;

    const ajuste = await prisma.ajusteBancoHoras.findUnique({
      where: { id },
      include: { usuario: { select: { nome: true, empresaId: true } } },
    });

    if (!ajuste || ajuste.usuario.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Ajuste não encontrado' }, { status: 404 });
    }

    await prisma.ajusteBancoHoras.delete({ where: { id } });

    const h = Math.floor(Math.abs(ajuste.minutos) / 60);
    const m = Math.abs(ajuste.minutos) % 60;
    const tempoStr = `${ajuste.minutos >= 0 ? '+' : '-'}${h}h${String(m).padStart(2, '0')}`;

    await registrarLog({
      empresaId,
      usuarioId: adminId,
      autor: adminNome,
      acao: 'EXCLUSAO_AJUSTE_BANCO',
      detalhes: `Funcionário: ${ajuste.usuario.nome} | Tipo: ${TIPO_LABELS[ajuste.tipo] || ajuste.tipo} | Ajuste excluído: ${tempoStr} | Ref: ${ajuste.data} | Motivo original: "${ajuste.motivo}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao excluir' }, { status: 500 });
  }
}
