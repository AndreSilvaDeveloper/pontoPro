import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST() {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    // @ts-ignore
    const empresaId = session.user.empresaId;

    // Atualizar todos os funcionários que ainda não assinaram o termo
    const resultado = await prisma.usuario.updateMany({
      where: {
        empresaId,
        cargo: { not: 'ADMIN' },
        cienciaCelularDocUrl: null,
      },
      data: {
        deveDarCienciaCelular: true,
      },
    });

    return NextResponse.json({
      success: true,
      atualizados: resultado.count,
    });
  } catch (error) {
    console.error('Erro ao aplicar ciência em massa:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
