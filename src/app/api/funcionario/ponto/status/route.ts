import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Confirme se é @/lib/db ou @/lib/prisma

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    if (!usuarioId) return NextResponse.json({ status: 'Nenhum' });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 1. Busca o Último Ponto (para saber o status atual e a HORA exata para o cronômetro)
    const ultimoPonto = await prisma.ponto.findFirst({
      where: { 
        usuarioId: usuarioId, 
        dataHora: { gte: hoje } 
      },
      orderBy: { dataHora: 'desc' },
    });

    // 2. Verifica se JÁ HOUVE um Almoço hoje
    const almocoRealizado = await prisma.ponto.findFirst({
      where: {
        usuarioId: usuarioId,
        dataHora: { gte: hoje },
        OR: [
            { tipo: 'SAIDA_ALMOCO' },
            { subTipo: 'SAIDA_ALMOCO' }
        ]
      }
    });

    if (!ultimoPonto) {
      return NextResponse.json({ status: 'Nenhum', ultimoTipo: null, jaAlmocou: false, ultimoRegistro: null });
    }

    let tipo = ultimoPonto.subTipo || ultimoPonto.tipo;
    if (tipo === 'PONTO') tipo = 'ENTRADA';

    let statusFrontend = 'Nenhum';

    if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO'].includes(tipo)) {
        statusFrontend = 'TRABALHANDO'; 
    } 
    else if (tipo === 'SAIDA_ALMOCO') {
        statusFrontend = 'EM_ALMOCO'; 
    } 
    else if (tipo === 'SAIDA_INTERVALO') {
        statusFrontend = 'EM_INTERVALO'; 
    } 
    else if (tipo === 'SAIDA') {
        statusFrontend = 'ENCERRADO';
    }

    return NextResponse.json({
      status: statusFrontend,
      ultimoTipo: tipo,
      // AQUI ESTÁ A CHAVE: Enviamos a data exata para o frontend calcular o tempo decorrido
      ultimoRegistro: ultimoPonto.dataHora, 
      jaAlmocou: !!almocoRealizado 
    });

  } catch (error) {
    console.error("Erro status:", error);
    return NextResponse.json({ status: 'Erro' }, { status: 500 });
  }
}