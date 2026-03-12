import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    if (!usuarioId) return NextResponse.json({ status: 'Nenhum' });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const fimHoje = new Date();
    fimHoje.setHours(23, 59, 59, 999);

    // Busca TODOS os pontos do dia (para calcular minutos trabalhados)
    const pontosHoje = await prisma.ponto.findMany({
      where: {
        usuarioId,
        dataHora: { gte: hoje, lte: fimHoje },
      },
      orderBy: { dataHora: 'asc' },
    });

    // Busca jornada do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { jornada: true },
    });

    const ultimoPonto = pontosHoje.length > 0 ? pontosHoje[pontosHoje.length - 1] : null;

    // Verifica se JÁ HOUVE um Almoço hoje
    const almocoRealizado = pontosHoje.find(p =>
      p.tipo === 'SAIDA_ALMOCO' || p.subTipo === 'SAIDA_ALMOCO'
    );

    if (!ultimoPonto) {
      return NextResponse.json({
        status: 'Nenhum',
        ultimoTipo: null,
        jaAlmocou: false,
        ultimoRegistro: null,
        minutosTrabalhadosHoje: 0,
        primeiraEntrada: null,
        metaMinutosHoje: 0,
        jornada: usuario?.jornada || null,
      });
    }

    let tipo = ultimoPonto.subTipo || ultimoPonto.tipo;
    if (tipo === 'PONTO') tipo = 'ENTRADA';

    let statusFrontend = 'Nenhum';

    if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO'].includes(tipo)) {
      statusFrontend = 'TRABALHANDO';
    } else if (tipo === 'SAIDA_ALMOCO') {
      statusFrontend = 'EM_ALMOCO';
    } else if (tipo === 'SAIDA_INTERVALO') {
      statusFrontend = 'EM_INTERVALO';
    } else if (tipo === 'SAIDA') {
      statusFrontend = 'ENCERRADO';
    }

    // Calcula minutos trabalhados hoje
    const agora = new Date();
    let minutosTrabalhadosHoje = 0;
    let primeiraEntrada: Date | null = null;

    for (let i = 0; i < pontosHoje.length; i++) {
      const p = pontosHoje[i];
      const tipoP = p.subTipo || p.tipo;
      if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipoP)) {
        const entrada = new Date(p.dataHora);
        if (!primeiraEntrada) primeiraEntrada = entrada;

        const pSaida = pontosHoje[i + 1];
        if (pSaida) {
          const tipoSaida = pSaida.subTipo || pSaida.tipo;
          if (['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
            const saida = new Date(pSaida.dataHora);
            const diff = Math.floor((saida.getTime() - entrada.getTime()) / 60000);
            if (diff > 0 && diff < 1440) minutosTrabalhadosHoje += diff;
            i++;
          } else {
            const diff = Math.floor((agora.getTime() - entrada.getTime()) / 60000);
            if (diff > 0) minutosTrabalhadosHoje += diff;
          }
        } else {
          const diff = Math.floor((agora.getTime() - entrada.getTime()) / 60000);
          if (diff > 0) minutosTrabalhadosHoje += diff;
        }
      }
    }

    // Calcula meta de minutos do dia baseado na jornada
    let metaMinutosHoje = 0;
    const jornada = usuario?.jornada as any;
    if (jornada) {
      const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const diaAtual = diasSemana[agora.getDay()];
      const jornadaDia = jornada[diaAtual];
      if (jornadaDia?.ativo) {
        const parseHM = (h: string) => {
          if (!h || !/^\d{2}:\d{2}$/.test(h)) return 0;
          const [hh, mm] = h.split(':').map(Number);
          return hh * 60 + mm;
        };
        const e1 = parseHM(jornadaDia.e1);
        const s1 = parseHM(jornadaDia.s1);
        const e2 = parseHM(jornadaDia.e2);
        const s2 = parseHM(jornadaDia.s2);

        if (e1 && s2 && !s1 && !e2) {
          // Jornada contínua
          metaMinutosHoje = s2 - e1;
        } else if (e1 && s1 && e2 && s2) {
          // Jornada com almoço
          metaMinutosHoje = (s1 - e1) + (s2 - e2);
        }
      }
    }

    return NextResponse.json({
      status: statusFrontend,
      ultimoTipo: tipo,
      ultimoRegistro: ultimoPonto.dataHora,
      jaAlmocou: !!almocoRealizado,
      minutosTrabalhadosHoje,
      primeiraEntrada: primeiraEntrada?.toISOString() || null,
      metaMinutosHoje,
      jornada: jornada || null,
    });

  } catch (error) {
    console.error("Erro status:", error);
    return NextResponse.json({ status: 'Erro' }, { status: 500 });
  }
}