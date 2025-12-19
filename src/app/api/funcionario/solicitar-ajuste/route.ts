import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; 
import { prisma } from '@/lib/db';
import { registrarLog } from '@/lib/logger';

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

    // === TRAVA DE DUPLICIDADE ===
    if (pontoId) {
        const jaExiste = await prisma.solicitacaoAjuste.findFirst({
            where: {
                pontoId: pontoId,
                status: 'PENDENTE'
            }
        });

        if (jaExiste) {
            return NextResponse.json({ erro: 'Já existe uma solicitação pendente para este registro.' }, { status: 400 });
        }
    } 
    else {
        const jaExiste = await prisma.solicitacaoAjuste.findFirst({
            where: {
                usuarioId: session.user.id,
                novoHorario: new Date(novoHorario),
                tipo: tipo,
                status: 'PENDENTE'
            }
        });

        if (jaExiste) {
            return NextResponse.json({ erro: 'Você já enviou uma solicitação para este horário.' }, { status: 400 });
        }
    }
    // ====================================================

    // CRIAR A SOLICITAÇÃO
    const solicitacao = await prisma.solicitacaoAjuste.create({
      data: {
        usuarioId: session.user.id,
        // REMOVI A LINHA 'empresaId' AQUI POIS ELA NÃO EXISTE NA TABELA
        pontoId: pontoId || null, 
        tipo: tipo || null,       
        novoHorario: new Date(novoHorario),
        motivo,
        status: 'PENDENTE'
      }
    });

    // === GERA O LOG DE AUDITORIA ===
    // Aqui mantemos o empresaId, pois a tabela de Logs tem esse campo
    await registrarLog({
      // @ts-ignore
      empresaId: session.user.empresaId,
      usuarioId: session.user.id,
      autor: session.user.name || 'Funcionário',
      acao: pontoId ? 'SOLICITACAO_EDICAO' : 'SOLICITACAO_INCLUSAO',
      detalhes: `Solicitou ${pontoId ? 'ajuste' : 'inclusão'} para: ${new Date(novoHorario).toLocaleString('pt-BR')} - Motivo: ${motivo}`
    });

    return NextResponse.json({ success: true, solicitacao });

  } catch (error) {
    console.error("Erro ao solicitar ajuste:", error);
    return NextResponse.json({ erro: 'Erro interno ao processar solicitação' }, { status: 500 });
  }
}