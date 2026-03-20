import { NextRequest, NextResponse } from 'next/server';
import { limparTemporarios, DIAS_RETENCAO } from '@/lib/storage';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Autenticação
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }

  try {
    const dias = parseInt(req.nextUrl.searchParams.get('dias') || String(DIAS_RETENCAO), 10);

    // 1. Limpar arquivos temporários do filesystem
    const resultado = limparTemporarios(dias);

    // 2. Limpar URLs de fotoUrl nos pontos antigos (opcional: libera referências no banco)
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);

    const pontosAtualizados = await prisma.ponto.updateMany({
      where: {
        fotoUrl: { not: null },
        dataHora: { lt: limite },
      },
      data: { fotoUrl: null },
    });

    return NextResponse.json({
      diasRetencao: dias,
      arquivosRemovidos: resultado.removidos,
      erros: resultado.erros,
      pontosLimpos: pontosAtualizados.count,
    });
  } catch (error) {
    console.error('Erro na limpeza de storage:', error);
    return NextResponse.json({ error: 'Erro na limpeza' }, { status: 500 });
  }
}
