import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enviarMensagemPreferindo, type CanalMensagem } from '@/lib/messaging';
import { getConfig, getConfigBoolean, CONFIGS } from '@/lib/configs';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Janela em minutos: dispara lembrete pra agendamentos cuja dataHora cai
// entre [agora + JANELA_INICIO_MIN, agora + JANELA_FIM_MIN].
// Idealmente o cron roda a cada 5-10 min; a janela cobre meia-hora pra dar
// folga em rodadas atrasadas sem spammar.
const JANELA_INICIO_MIN = 45;
const JANELA_FIM_MIN = 75;

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    const ativo = await getConfigBoolean(CONFIGS.AGENDAMENTO_LEMBRETE_1H, true);
    if (!ativo) {
      return NextResponse.json({ ok: true, skipped: 'config off', enviados: 0 });
    }

    const canalCfg = await getConfig(CONFIGS.AGENDAMENTO_CANAL_DEFAULT, 'sms');
    const canalDefault: CanalMensagem = canalCfg === 'whatsapp' ? 'whatsapp' : 'sms';

    const agora = Date.now();
    const inicio = new Date(agora + JANELA_INICIO_MIN * 60_000);
    const fim = new Date(agora + JANELA_FIM_MIN * 60_000);

    const candidatos = await prisma.agendamento.findMany({
      where: {
        dataHora: { gte: inicio, lte: fim },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
        lembreteEnviadoEm: null,
        lead: { whatsapp: { not: null } },
      },
      include: {
        lead: { select: { id: true, nome: true, whatsapp: true } },
      },
      take: 100,
    });

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://workid.com.br').replace(/\/+$/, '');

    let enviados = 0;
    for (const ag of candidatos) {
      const wpp = ag.lead?.whatsapp;
      const nome = ag.lead?.nome || 'Olá';
      if (!wpp) continue;

      const horario = formatInTimeZone(ag.dataHora, 'America/Sao_Paulo', 'HH:mm');
      const dataFmt = formatInTimeZone(ag.dataHora, 'America/Sao_Paulo', "EEEE, dd 'de' MMMM", { locale: ptBR });
      const primeiroNome = String(nome).split(' ')[0];
      const link = ag.tokenAcesso ? `${baseUrl}/agendamento/${ag.id}?t=${ag.tokenAcesso}` : null;

      const msgLinhas = [
        `Olá, ${primeiroNome}! Lembrete da sua demo do WorkID.`,
        `📅 Hoje, ${dataFmt} às ${horario}`,
      ];
      if (link) msgLinhas.push(`Reagendar/cancelar: ${link}`);
      const msg = msgLinhas.join('\n');

      try {
        const r = await enviarMensagemPreferindo(wpp, msg, canalDefault);
        if (r.ok) {
          await prisma.agendamento.update({
            where: { id: ag.id },
            data: { lembreteEnviadoEm: new Date() },
          });
          enviados++;
        } else {
          console.warn(`[cron lembretes] falhou pra agendamento ${ag.id}:`, r.erro);
        }
      } catch (err) {
        console.error(`[cron lembretes] erro inesperado em ${ag.id}:`, err);
      }
    }

    return NextResponse.json({ ok: true, candidatos: candidatos.length, enviados });
  } catch (e) {
    console.error('[cron agendamento-lembretes] erro:', e);
    return NextResponse.json({ error: 'erro interno' }, { status: 500 });
  }
}
