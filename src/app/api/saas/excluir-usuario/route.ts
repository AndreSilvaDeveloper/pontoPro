import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
        return NextResponse.json({ erro: 'ID inválido' }, { status: 400 });
    }

    // === PASSO 1: LIMPEZA TOTAL DE VÍNCULOS ===
    
    // 1. Remove histórico de Pontos (se houver)
    await prisma.ponto.deleteMany({
      where: { usuarioId: id }
    });

    // 2. Remove o vínculo de Admin da Loja (ESTE ERA O ERRO)
    // Mesmo usuário novo tem esse registro para dizer de qual loja ele é dono
    await prisma.adminLoja.deleteMany({
      where: { usuarioId: id }
    });

    // (Opcional) Se tiver logs ou sessões, adicione aqui também se der erro futuro
    // await prisma.log.deleteMany({ where: { usuarioId: id } });

    // === PASSO 2: AGORA SIM, EXCLUI O USUÁRIO ===
    await prisma.usuario.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("ERRO DETALHADO:", error);
    
    return NextResponse.json(
        { erro: 'Erro ao excluir. Verifique se o usuário possui outros vínculos (ex: Vendas, Logs).' }, 
        { status: 500 }
    );
  }
}