import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enviarPushSeguro } from '@/lib/push';

export const dynamic = 'force-dynamic';

const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function parseHM(h: string): number {
  if (!h || !/^\d{2}:\d{2}$/.test(h)) return -1;
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
}

function getAgoraSP() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find(p => p.type === t)!.value;
  const dataSP = `${get('year')}-${get('month')}-${get('day')}`;
  const hora = parseInt(get('hour'));
  const minuto = parseInt(get('minute'));

  // Dia da semana em SP
  const diaStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  }).format(now);
  const diaMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    dataSP,
    minutosAgora: hora * 60 + minuto,
    diaSemana: diaMap[diaStr] ?? now.getDay(),
  };
}

const LEMBRETES = {
  ALMOCO_5MIN: {
    title: 'Hora do almoço!',
    body: 'Faltam 5 minutos para o seu horário de almoço.',
    tag: 'lembrete-almoco',
  },
  VOLTA_ALMOCO: {
    title: 'Hora de voltar!',
    body: 'Seu horário de almoço terminou. Hora de voltar ao trabalho.',
    tag: 'lembrete-volta-almoco',
  },
  SAIDA_5MIN: {
    title: 'Quase lá!',
    body: 'Faltam 5 minutos para encerrar seu expediente.',
    tag: 'lembrete-saida',
  },
  PAUSA_CAFE_EXCEDIDA: {
    title: 'Pausa excedida',
    body: 'Sua pausa para café já passou de 15 minutos.',
    tag: 'lembrete-pausa-cafe',
  },
} as const;

type TipoLembrete = keyof typeof LEMBRETES;

export async function GET(req: NextRequest) {
  try {
    // Auth
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    const { dataSP, minutosAgora, diaSemana } = getAgoraSP();
    const diaKey = diasMap[diaSemana];

    // Janela do dia em UTC para queries de Ponto
    const inicioHoje = new Date(`${dataSP}T00:00:00.000-03:00`);
    const fimHoje = new Date(`${dataSP}T23:59:59.999-03:00`);

    // Buscar funcionários com push subscriptions que bateram ponto hoje
    const usuarios = await prisma.usuario.findMany({
      where: {
        cargo: 'FUNCIONARIO',
        empresa: { status: 'ATIVO' },
        pushSubscriptions: { some: {} },
        pontos: {
          some: {
            subTipo: 'ENTRADA',
            dataHora: { gte: inicioHoje, lte: fimHoje },
          },
        },
      },
      select: {
        id: true,
        jornada: true,
        pontos: {
          where: { dataHora: { gte: inicioHoje, lte: fimHoje } },
          orderBy: { dataHora: 'desc' },
          take: 1,
          select: { subTipo: true, tipo: true, dataHora: true },
        },
      },
    });

    if (usuarios.length === 0) {
      return NextResponse.json({ processados: 0, enviados: 0 });
    }

    // Buscar lembretes já enviados hoje em batch
    const usuarioIds = usuarios.map(u => u.id);
    const jaEnviados = await prisma.lembretePush.findMany({
      where: { data: dataSP, usuarioId: { in: usuarioIds } },
      select: { usuarioId: true, tipo: true },
    });

    const enviadoSet = new Set(jaEnviados.map(e => `${e.usuarioId}:${e.tipo}`));

    const pushPromises: Promise<void>[] = [];
    const inserts: { usuarioId: string; tipo: string; data: string }[] = [];

    for (const usuario of usuarios) {
      const jornada = (usuario.jornada as any)?.[diaKey];
      if (!jornada?.ativo) continue;

      const ultimoPonto = usuario.pontos[0]; // desc, primeiro = último
      const ultimoTipo = ultimoPonto?.subTipo || ultimoPonto?.tipo;

      const deveLembrar = (tipo: TipoLembrete) =>
        !enviadoSet.has(`${usuario.id}:${tipo}`);

      const agendar = (tipo: TipoLembrete) => {
        const cfg = LEMBRETES[tipo];
        pushPromises.push(
          enviarPushSeguro(usuario.id, {
            title: cfg.title,
            body: cfg.body,
            tag: cfg.tag,
            url: '/funcionario',
          })
        );
        inserts.push({ usuarioId: usuario.id, tipo, data: dataSP });
      };

      // 1) 5 min antes do almoço (s1)
      const s1 = parseHM(jornada.s1);
      if (s1 > 0 && deveLembrar('ALMOCO_5MIN')) {
        if (minutosAgora >= s1 - 5 && minutosAgora < s1) {
          // Só se ainda não saiu para almoço/intervalo/encerrou
          if (!['SAIDA_ALMOCO', 'SAIDA_INTERVALO', 'SAIDA'].includes(ultimoTipo)) {
            agendar('ALMOCO_5MIN');
          }
        }
      }

      // 2) Hora de voltar do almoço (e2)
      const e2 = parseHM(jornada.e2);
      if (e2 > 0 && deveLembrar('VOLTA_ALMOCO')) {
        if (minutosAgora >= e2 && minutosAgora < e2 + 5) {
          // Só se está no almoço
          if (ultimoTipo === 'SAIDA_ALMOCO') {
            agendar('VOLTA_ALMOCO');
          }
        }
      }

      // 3) 5 min antes de encerrar (s2)
      const s2 = parseHM(jornada.s2);
      if (s2 > 0 && deveLembrar('SAIDA_5MIN')) {
        if (minutosAgora >= s2 - 5 && minutosAgora < s2) {
          if (ultimoTipo !== 'SAIDA') {
            agendar('SAIDA_5MIN');
          }
        }
      }

      // 4) Pausa café excedida (> 15 min)
      if (deveLembrar('PAUSA_CAFE_EXCEDIDA') && ultimoTipo === 'SAIDA_INTERVALO') {
        const saidaCafe = new Date(ultimoPonto.dataHora);
        const diffMin = Math.floor((Date.now() - saidaCafe.getTime()) / 60000);
        if (diffMin > 15) {
          agendar('PAUSA_CAFE_EXCEDIDA');
        }
      }
    }

    // Enviar pushes em paralelo
    await Promise.allSettled(pushPromises);

    // Gravar lembretes enviados (skipDuplicates para segurança)
    if (inserts.length > 0) {
      await prisma.lembretePush.createMany({
        data: inserts,
        skipDuplicates: true,
      });
    }

    console.log(`Lembretes: ${usuarios.length} processados, ${inserts.length} enviados (${dataSP})`);

    return NextResponse.json({
      processados: usuarios.length,
      enviados: inserts.length,
    });
  } catch (error) {
    console.error('Erro nos lembretes:', error);
    return NextResponse.json(
      { error: 'Erro ao processar lembretes' },
      { status: 500 }
    );
  }
}
