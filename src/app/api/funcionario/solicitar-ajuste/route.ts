import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { pontoId, novoHorario, motivo, tipo } = await request.json();

    // === TRAVA DE DUPLICIDADE ===
    
    // CASO 1: Ajuste de um ponto existente (tem pontoId)
    // Verifica se já existe solicitação PENDENTE para este mesmo ponto
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
    // Verifica se o usuário já pediu um ajuste para esse mesmo horário exato e tipo
    else {
        const jaExiste = await prisma.solicitacaoAjuste.findFirst({
            where: {
                usuarioId: session.user.id,
                novoHorario: new Date(novoHorario),
                tipo: tipo, // Verifica se é o mesmo tipo (ENTRADA, SAIDA, etc)
                status: 'PENDENTE'
            }
        });

        if (jaExiste) {
            return NextResponse.json({ erro: 'Você já enviou uma solicitação para este horário.' }, { status: 400 });
        }
    }
    // ============================

    // Se passou pela trava, cria a solicitação
    await prisma.solicitacaoAjuste.create({
      data: {
        usuarioId: session.user.id,
        pontoId: pontoId || null, 
        tipo: tipo || null,       
        novoHorario: new Date(novoHorario),
        motivo
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao solicitar ajuste' }, { status: 500 });
  }
}