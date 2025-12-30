import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function DELETE(request: Request) {
  // 1. SEGURANÇA: Apenas SUPER_ADMIN pode excluir
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'SUPER_ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado.' }, { status: 403 });
  }

  try {
    const { id } = await request.json(); // ID da empresa para excluir

    if (!id) {
        return NextResponse.json({ erro: 'ID da empresa é obrigatório.' }, { status: 400 });
    }

    // 2. EXCLUSÃO CIRÚRGICA (Transaction)
    await prisma.$transaction(async (tx) => {
        
        // === PASSO A: O RESGATE DOS ADMINS 🚑 ===
        // Admins não podem ser excluídos, apenas desvinculados desta loja.
        const adminsDaLoja = await tx.usuario.findMany({
            where: { 
                empresaId: id, 
                cargo: { in: ['ADMIN', 'SUPER_ADMIN'] } 
            }
        });

        for (const admin of adminsDaLoja) {
            // Verifica se esse admin tem acesso a alguma OUTRA loja
            const outraLoja = await tx.adminLoja.findFirst({
                where: { 
                    usuarioId: admin.id,
                    empresaId: { not: id } // Qualquer loja que NÃO seja a que vamos apagar
                }
            });

            if (outraLoja) {
                // Se tem outra loja, movemos ele para lá automaticamente
                await tx.usuario.update({
                    where: { id: admin.id },
                    data: { empresaId: outraLoja.empresaId }
                });
            } else {
                // Se era a única loja dele, deixamos ele "sem teto" (null) mas com a conta VIVA
                await tx.usuario.update({
                    where: { id: admin.id },
                    data: { empresaId: null }
                });
            }
        }

        // === PASSO B: LISTAR OS FUNCIONÁRIOS (Esses serão apagados) ===
        // Funcionários pertencem à empresa, então se a empresa morre, os dados deles morrem junto.
        const funcionarios = await tx.usuario.findMany({
            where: { empresaId: id, cargo: 'FUNCIONARIO' },
            select: { id: true }
        });
        const idsFuncionarios = funcionarios.map(u => u.id);

        if (idsFuncionarios.length > 0) {
            // Apaga dados vinculados aos funcionários
            await tx.ponto.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });
            await tx.solicitacaoAjuste.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });
            await tx.ausencia.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });
            
            // Limpa AdminLoja se por acaso algum funcionário tiver (segurança)
            await tx.adminLoja.deleteMany({ where: { usuarioId: { in: idsFuncionarios } } });

            // Apaga os usuários Funcionários
            await tx.usuario.deleteMany({
                where: { id: { in: idsFuncionarios } }
            });
        }

        // === PASSO C: LIMPEZA DA EMPRESA ===
        
        // Remove todos os vínculos de AdminLoja que apontam para ESTA empresa
        // (Isso tira o acesso dos admins a essa loja, já que ela vai sumir)
        await tx.adminLoja.deleteMany({
            where: { empresaId: id }
        });

        // Apagar dados gerais da empresa
        await tx.feriado.deleteMany({ where: { empresaId: id } });
        await tx.logAuditoria.deleteMany({ where: { empresaId: id } });

        // === PASSO D: FIM DA EMPRESA ===
        await tx.empresa.delete({
            where: { id: id }
        });
    });

    return NextResponse.json({ success: true, message: 'Empresa excluída com sucesso.' });

  } catch (error) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json({ erro: 'Erro técnico ao excluir. Verifique se existem dependências.' }, { status: 500 });
  }
}