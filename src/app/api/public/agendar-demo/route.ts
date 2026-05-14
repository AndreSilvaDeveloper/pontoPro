import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { notificarLead } from '@/lib/leadAlert';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import {
  TZ_AGENDA,
  estaDentroDaJanela,
  dataHoraDoSlot,
} from '@/lib/agendamento';
import { enviarMensagemPreferindo, type CanalMensagem } from '@/lib/messaging';
import { getConfig, getConfigBoolean, getConfigNumber, CONFIGS } from '@/lib/configs';

function gerarTokenAcesso() {
  return randomBytes(24).toString('base64url');
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://workid.com.br'
  ).replace(/\/+$/, '');
}

export const runtime = 'nodejs';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

export async function POST(req: Request) {
  // Rate-limit: máx 5 leads por IP em 10 minutos
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `agendar-demo:${ip}`, max: 5, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    );
  }

  try {
    const body = await req.json();

    const nome = String(body?.nome || '').trim();
    const whatsappRaw = String(body?.whatsapp || '').trim();
    const whatsapp = whatsappRaw ? onlyDigits(whatsappRaw) : '';
    const email = String(body?.email || '').trim().toLowerCase();
    const empresa = String(body?.empresa || '').trim();
    const dia = String(body?.dia || '').trim();          // YYYY-MM-DD
    const horario = String(body?.horario || '').trim(); // HH:MM

    if (!nome || nome.length < 2) {
      return NextResponse.json({ ok: false, erro: 'Informe o nome.' }, { status: 400 });
    }
    if (!whatsapp || whatsapp.length < 10 || whatsapp.length > 13) {
      return NextResponse.json({ ok: false, erro: 'WhatsApp inválido.' }, { status: 400 });
    }
    if (!(await estaDentroDaJanela(dia, horario))) {
      return NextResponse.json(
        { ok: false, erro: 'Horário fora do atendimento.' },
        { status: 400 }
      );
    }

    const dataHora = dataHoraDoSlot(dia, horario);
    const minMinutos = await getConfigNumber(CONFIGS.AGENDAMENTO_ANTECEDENCIA_MIN_MIN, 60);
    const maxDias = await getConfigNumber(CONFIGS.AGENDAMENTO_ANTECEDENCIA_MAX_DIAS, 30);
    const agora = Date.now();
    if (dataHora.getTime() < agora + minMinutos * 60_000) {
      return NextResponse.json(
        { ok: false, erro: `Escolha um horário com pelo menos ${minMinutos} minutos de antecedência.` },
        { status: 400 }
      );
    }
    if (dataHora.getTime() > agora + maxDias * 24 * 60 * 60_000) {
      return NextResponse.json(
        { ok: false, erro: `Só aceitamos agendamento até ${maxDias} dias no futuro.` },
        { status: 400 }
      );
    }

    // Texto legível pra usar no alerta de lead, no painel e no dadosExtras
    // (mantém compatível com o histórico antigo que guardava `data` formatada).
    const dataFormatada = formatInTimeZone(
      dataHora,
      TZ_AGENDA,
      "EEEE, dd 'de' MMMM",
      { locale: ptBR }
    );

    // Detecta duplicata: mesmo whatsapp já tem agendamento futuro ativo?
    const duplicado = await prisma.agendamento.findFirst({
      where: {
        dataHora: { gte: new Date() },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
        lead: { whatsapp },
      },
      select: { id: true, dataHora: true },
    });
    if (duplicado) {
      const horaExistente = formatInTimeZone(duplicado.dataHora, TZ_AGENDA, "dd/MM 'às' HH:mm");
      return NextResponse.json(
        {
          ok: false,
          motivo: 'duplicata',
          erro: `Você já tem uma demo marcada para ${horaExistente}. Cancele a atual antes de marcar outra.`,
        },
        { status: 409 }
      );
    }

    const tokenAcesso = gerarTokenAcesso();
    const utmSource = body?.utm_source ? String(body.utm_source) : null;
    const utmMedium = body?.utm_medium ? String(body.utm_medium) : null;
    const utmCampaign = body?.utm_campaign ? String(body.utm_campaign) : null;
    const utmContent = body?.utm_content ? String(body.utm_content) : null;
    const utmTerm = body?.utm_term ? String(body.utm_term) : null;

    let leadId: string;
    let agendamentoId: string;
    try {
      const result = await prisma.$transaction(async tx => {
        const lead = await tx.lead.create({
          data: {
            origem: 'AGENDAR_DEMO',
            nome,
            email: email || null,
            whatsapp,
            empresa: empresa || null,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            utmTerm,
            referrer: body?.referrer ? String(body.referrer) : null,
            dadosExtras: { dia, horario, data: dataFormatada },
          },
        });

        const ag = await tx.agendamento.create({
          data: {
            dataHora,
            duracaoMinutos: 30,
            status: 'PENDENTE',
            leadId: lead.id,
            tokenAcesso,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            utmTerm,
          },
        });

        return { lead, ag };
      });
      leadId = result.lead.id;
      agendamentoId = result.ag.id;
    } catch (e) {
      // Unique violation = alguém pegou esse slot entre a consulta e o submit.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          {
            ok: false,
            motivo: 'slot_tomado',
            erro: 'Esse horário acabou de ser reservado. Escolha outro.',
          },
          { status: 409 }
        );
      }
      throw e;
    }

    // Dispara alerta sem bloquear (cliente já foi atendido)
    notificarLead({
      origem: 'AGENDAR_DEMO',
      nome,
      whatsapp,
      email: email || null,
      empresa: empresa || null,
      detalhes: { Data: dataFormatada, 'Horário': horario },
    }).catch(err => console.error('[agendar-demo] notificarLead falhou:', err));

    // Confirmação automática pro lead (não bloqueia o response)
    (async () => {
      try {
        const ativo = await getConfigBoolean(CONFIGS.AGENDAMENTO_CONFIRMAR_AUTOMATICO, true);
        if (!ativo) return;
        const canalCfg = await getConfig(CONFIGS.AGENDAMENTO_CANAL_DEFAULT, 'sms');
        const canal: CanalMensagem = canalCfg === 'whatsapp' ? 'whatsapp' : 'sms';
        const primeiroNome = nome.split(' ')[0];
        const link = `${siteUrl()}/agendamento/${agendamentoId}?t=${tokenAcesso}`;
        const msg = [
          `Olá, ${primeiroNome}! Sua demo do WorkID está marcada.`,
          `📅 ${dataFormatada} às ${horario}`,
          `Reagendar/cancelar: ${link}`,
        ].join('\n');
        const r = await enviarMensagemPreferindo(whatsapp, msg, canal);
        if (r.ok) {
          await prisma.agendamento.update({
            where: { id: agendamentoId },
            data: { confirmacaoEnviadaEm: new Date() },
          }).catch(() => {});
        }
      } catch (err) {
        console.error('[agendar-demo] confirmação falhou:', err);
      }
    })();

    return NextResponse.json({ ok: true, leadId });
  } catch (e) {
    console.error('[agendar-demo] erro:', e);
    return NextResponse.json(
      { ok: false, erro: 'Não foi possível registrar seu agendamento agora. Tente novamente em alguns instantes.' },
      { status: 500 }
    );
  }
}
