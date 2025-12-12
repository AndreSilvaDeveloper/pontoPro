import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { format } from 'date-fns';

const criarDataAjustada = (dataString: string) => {
  if (!dataString) return new Date();
  return new Date(`${dataString}T12:00:00`);
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });

  try {
    const { usuarioId, tipo, dataInicio, dataFim, motivo } = await request.json();

    if (!usuarioId || !dataInicio || !tipo) return NextResponse.json({ erro: 'Preencha os campos obrigatórios.' }, { status: 400 });

    const inicio = criarDataAjustada(dataInicio);
    const fim = dataFim ? criarDataAjustada(dataFim) : inicio;

    // Busca nome do funcionário para o log
    const funcionario = await prisma.usuario.findUnique({ where: { id: usuarioId } });

    await prisma.ausencia.create({
      data: {
        usuarioId, tipo, dataInicio: inicio, dataFim: fim,
        motivo: motivo || 'Lançamento Administrativo',
        status: 'APROVADO', comprovanteUrl: null
      }
    });

    // === GRAVA O LOG ===
    await prisma.logAuditoria.create({
        data: {
            acao: "LANCAMENTO_AUSENCIA",
            detalhes: `Lançou ${tipo} para ${funcionario?.nome}. De ${format(inicio, 'dd/MM')} até ${format(fim, 'dd/MM')}. Obs: ${motivo}`,
            adminId: session.user.id,
            adminNome: session.user.name || 'Admin',
            empresaId: session.user.empresaId
        }
    });
    // ===================

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro interno ao salvar.' }, { status: 500 });
  }
}