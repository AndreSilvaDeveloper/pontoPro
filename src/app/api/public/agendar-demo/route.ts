import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notificarLead } from '@/lib/leadAlert';

export const runtime = 'nodejs';

function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nome = String(body?.nome || '').trim();
    const whatsappRaw = String(body?.whatsapp || '').trim();
    const whatsapp = whatsappRaw ? onlyDigits(whatsappRaw) : '';
    const email = String(body?.email || '').trim().toLowerCase();
    const empresa = String(body?.empresa || '').trim();
    const data = String(body?.data || '').trim();        // ex: "segunda-feira, 28 de abril"
    const horario = String(body?.horario || '').trim(); // ex: "10:30"

    if (!nome || nome.length < 2) {
      return NextResponse.json({ ok: false, erro: 'Informe o nome.' }, { status: 400 });
    }
    if (!whatsapp || whatsapp.length < 10 || whatsapp.length > 13) {
      return NextResponse.json({ ok: false, erro: 'WhatsApp inválido.' }, { status: 400 });
    }
    if (!data || !horario) {
      return NextResponse.json({ ok: false, erro: 'Informe data e horário.' }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        origem: 'AGENDAR_DEMO',
        nome,
        email: email || null,
        whatsapp,
        empresa: empresa || null,
        utmSource: body?.utm_source ? String(body.utm_source) : null,
        utmMedium: body?.utm_medium ? String(body.utm_medium) : null,
        utmCampaign: body?.utm_campaign ? String(body.utm_campaign) : null,
        utmContent: body?.utm_content ? String(body.utm_content) : null,
        utmTerm: body?.utm_term ? String(body.utm_term) : null,
        referrer: body?.referrer ? String(body.referrer) : null,
        dadosExtras: { data, horario },
      },
    });

    // Dispara alerta sem bloquear (cliente já foi atendido)
    notificarLead({
      origem: 'AGENDAR_DEMO',
      nome,
      whatsapp,
      email: email || null,
      empresa: empresa || null,
      detalhes: { Data: data, 'Horário': horario },
    }).catch(err => console.error('[agendar-demo] notificarLead falhou:', err));

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (e) {
    console.error('[agendar-demo] erro:', e);
    return NextResponse.json({ ok: false, erro: 'Erro interno.' }, { status: 500 });
  }
}
