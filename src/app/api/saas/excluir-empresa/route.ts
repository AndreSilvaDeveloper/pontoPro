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
    const { id } = await request.json();

    if (!id) {
        return NextResponse.json({ erro: 'ID da empresa é obrigatório.' }, { status: 400 });
    }

    // 2. EXCLUSÃO EM CASCATA TOTAL (Transaction)
    await prisma.$transaction(async (tx) => {
        
        // A. Encontra todos os usuários dessa empresa para limpar os dados deles
        const usuarios = await tx.usuario.findMany({
            where: { empresaId: id },
            select: { id: true }
        });
        const idsUsuarios = usuarios.map(u => u.id);

        if (idsUsuarios.length > 0) {
            // B. Limpeza de dados ligados aos Usuários (Filhos)
            await tx.ponto.deleteMany({
                where: { usuarioId: { in: idsUsuarios } }
            });

            await tx.solicitacaoAjuste.deleteMany({
                where: { usuarioId: { in: idsUsuarios } }
            });

            await tx.ausencia.deleteMany({
                where: { usuarioId: { in: idsUsuarios } }
            });

            // === C. A CORREÇÃO DO ERRO ===
            // Antes de apagar o usuário, precisamos apagar TODOS os vínculos de admin que ele tem.
            // Isso inclui vínculos com a loja atual E com filiais que ele tenha criado.
            // Se não fizermos isso, o banco bloqueia dizendo que o usuário ainda é dono de uma loja.
            await tx.adminLoja.deleteMany({
                where: { usuarioId: { in: idsUsuarios } }
            });
        }

        // D. Limpeza de dados ligados à Empresa
        
        // Limpa AdminLoja reverso (caso tenha sobrado algum vínculo órfão apontando para esta empresa)
        await tx.adminLoja.deleteMany({
            where: { empresaId: id }
        });

        // Apagar Feriados da empresa
        await tx.feriado.deleteMany({
            where: { empresaId: id }
        });

        // Apagar Logs
        await tx.logAuditoria.deleteMany({
            where: { empresaId: id }
        });

        // E. Agora sim, apaga os Usuários (O banco libera pois AdminLoja já foi limpo no passo C)
        await tx.usuario.deleteMany({
            where: { empresaId: id }
        });

        // F. Finalmente, apaga a Empresa
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