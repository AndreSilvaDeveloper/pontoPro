import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajustei para caminho absoluto para evitar erro
import { prisma } from '@/lib/db';
import { registrarLog } from '@/lib/logger'; // <--- O NOVO IMPORT

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

    // === TRAVA DE DUPLICIDADE (MANTIDA DO SEU CÓDIGO) ===
    
    // CASO 1: Ajuste de um ponto existente (tem pontoId)
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
    // CASO 2: Inclusão de ponto esquecido (não tem pontoId)
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

    // CRIAR A SOLICITAÇÃO (Adicionei empresaId e status explícito)
    const solicitacao = await prisma.solicitacaoAjuste.create({
      data: {
        usuarioId: session.user.id,
        // @ts-ignore
        empresaId: session.user.empresaId, // <--- IMPORTANTE PARA O ADMIN VER
        pontoId: pontoId || null, 
        tipo: tipo || null,       
        novoHorario: new Date(novoHorario),
        motivo,
        status: 'PENDENTE'
      }
    });

    // === GERA O LOG DE AUDITORIA (NOVIDADE) ===
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
