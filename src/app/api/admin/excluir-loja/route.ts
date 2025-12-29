import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado.' }, { status: 403 });
  }

  try {
    const { id } = await request.json(); // ID da loja para excluir

    if (!id) return NextResponse.json({ erro: 'ID obrigatório.' }, { status: 400 });

    // @ts-ignore
    const idLojaSegura = session.user.empresaId; // A loja onde VOCÊ (Deletador) está

    // 1. SEGURANÇA: Não pode apagar a própria loja que está usando
    if (id === idLojaSegura) {
        return NextResponse.json({ erro: 'Você não pode excluir a loja que está usando no momento. Troque de loja primeiro.' }, { status: 400 });
    }

    // 2. VERIFICAÇÃO: Você tem direito sobre essa loja?
    const temAcesso = await prisma.adminLoja.findFirst({
        where: { 
            // @ts-ignore
            usuarioId: session.user.id,
            empresaId: id 
        }
    });
    
    // Fallback: Verifica se você é o dono "Nativo" dessa loja (caso raro, mas possível)
    const ehDonoNativo = await prisma.usuario.findFirst({
        // @ts-ignore
        where: { id: session.user.id, empresaId: id }
    });

    if (!temAcesso && !ehDonoNativo) {
         return NextResponse.json({ erro: 'Sem permissão para excluir esta loja.' }, { status: 403 });
    }

    // === TRANSAÇÃO BLINDADA ===
    await prisma.$transaction(async (tx) => {
        
        // PASSO A: O RESGATE 🚑
        // Antes de explodir a loja, tiramos os Admins de lá.
        // Se houver admins "olhando" para essa loja agora, movemos eles para a loja de quem está deletando.
        await tx.usuario.updateMany({
            where: { 
                empresaId: id,
                cargo: 'ADMIN' // Apenas Admins são salvos
            },
            data: {
                empresaId: idLojaSegura // Movem para a segurança da loja principal
            }
        });

        // PASSO B: LISTAR AS VÍTIMAS (Apenas Funcionários)
        // Agora buscamos quem realmente deve ser deletado
        const funcionariosParaDeletar = await tx.usuario.findMany({
            where: { 
                empresaId: id,
                cargo: { not: 'ADMIN' } // Garante que não pega admin
            },
            select: { id: true }
        });
        const idsFuncionarios = funcionariosParaDeletar.map(u => u.id);

        if (idsFuncionarios.length > 0) {
            // Apaga dados apenas dos funcionários
            await tx.ponto.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });
            await tx.solicitacaoAjuste.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });
            await tx.ausencia.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });
            
            // Remove vínculo de AdminLoja caso algum funcionário tivesse (improvável, mas limpa sujeira)
            await tx.adminLoja.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });

            // Apaga os Funcionários
            await tx.usuario.deleteMany({
                where: { 
                    id: { in: idsFuncionarios } 
                }
            });
        }

        // PASSO C: LIMPEZA DA EMPRESA
        // Remove permissões de AdminLoja apontando para essa empresa (a empresa vai sumir, o vínculo também)
        await tx.adminLoja.deleteMany({ where: { empresaId: id } });
        await tx.feriado.deleteMany({ where: { empresaId: id } });
        await tx.logAuditoria.deleteMany({ where: { empresaId: id } });

        // PASSO D: FIM DA EMPRESA
        await tx.empresa.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao excluir filial:", error);
    return NextResponse.json({ erro: 'Erro ao excluir filial.' }, { status: 500 });
  }
}