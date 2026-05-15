import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import {
  TZ_AGENDA,
  estaDentroDaJanela,
  dataHoraDoSlot,
} from '@/lib/agendamento';
import { getConfigNumber, CONFIGS } from '@/lib/configs';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function autorizar(id: string, token: string | null) {
  if (!token) return null;
  const ag = await prisma.agendamento.findUnique({
    where: { id },
    include: { lead: { select: { nome: true } } },
  });
  if (!ag || !ag.tokenAcesso || ag.tokenAcesso !== token) return null;
  return ag;
}

function publico(ag: Awaited<ReturnType<typeof autorizar>>) {
  if (!ag) return null;
  return {
    id: ag.id,
    dataHora: ag.dataHora.toISOString(),
    duracaoMinutos: ag.duracaoMinutos,
    status: ag.status,
    nome: ag.lead?.nome || null,
    diaFormatado: formatInTimeZone(ag.dataHora, TZ_AGENDA, "EEEE, dd 'de' MMMM", { locale: ptBR }),
    horario: formatInTimeZone(ag.dataHora, TZ_AGENDA, 'HH:mm'),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `ag-pub:${ip}`, max: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, erro: 'Muitas requisições.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const ag = await autorizar(id, token);
  if (!ag) return NextResponse.json({ ok: false, erro: 'Link inválido ou expirado.' }, { status: 404 });

  return NextResponse.json({ ok: true, agendamento: publico(ag) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `ag-pub-patch:${ip}`, max: 10, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    );
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('t');
  const ag = await autorizar(id, token);
  if (!ag) return NextResponse.json({ ok: false, erro: 'Link inválido ou expirado.' }, { status: 404 });

  if (['REALIZADO', 'CANCELADO', 'NO_SHOW'].includes(ag.status)) {
    return NextResponse.json(
      { ok: false, erro: 'Esse agendamento não pode mais ser modificado.' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action || '');

  if (action === 'cancelar') {
    const motivo = String(body?.motivo || 'Cancelado pelo lead').trim().slice(0, 200);
    const updated = await prisma.agendamento.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        alteradoPor: 'lead (auto-cancel)',
        alteradoEm: new Date(),
        observacao: motivo,
      },
      include: { lead: { select: { nome: true } } },
    });
    return NextResponse.json({ ok: true, agendamento: publico(updated) });
  }

  if (action === 'reagendar') {
    const dia = String(body?.dia || '').trim();
    const horario = String(body?.horario || '').trim();
    if (!(await estaDentroDaJanela(dia, horario))) {
      return NextResponse.json({ ok: false, erro: 'Horário fora do atendimento.' }, { status: 400 });
    }
    const novaData = dataHoraDoSlot(dia, horario);
    const minMinutos = await getConfigNumber(CONFIGS.AGENDAMENTO_ANTECEDENCIA_MIN_MIN, 60);
    const maxDias = await getConfigNumber(CONFIGS.AGENDAMENTO_ANTECEDENCIA_MAX_DIAS, 30);
    const agora = Date.now();
    if (novaData.getTime() < agora + minMinutos * 60_000) {
      return NextResponse.json(
        { ok: false, erro: `Escolha um horário com pelo menos ${minMinutos} minutos de antecedência.` },
        { status: 400 }
      );
    }
    if (novaData.getTime() > agora + maxDias * 24 * 60 * 60_000) {
      return NextResponse.json(
        { ok: false, erro: `Só aceitamos agendamento até ${maxDias} dias no futuro.` },
        { status: 400 }
      );
    }
    if (novaData.getTime() === ag.dataHora.getTime()) {
      return NextResponse.json({ ok: false, erro: 'Esse já é o horário atual do seu agendamento.' }, { status: 400 });
    }

    try {
      const updated = await prisma.agendamento.update({
        where: { id },
        data: {
          dataHora: novaData,
          status: 'PENDENTE',
          alteradoPor: 'lead (auto-reagendar)',
          alteradoEm: new Date(),
          // Reseta flags de mensagens — vai mandar nova confirmação/lembrete pro novo horário.
          confirmacaoEnviadaEm: null,
          lembreteEnviadoEm: null,
        },
        include: { lead: { select: { nome: true } } },
      });
      return NextResponse.json({ ok: true, agendamento: publico(updated) });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          { ok: false, erro: 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro.' },
          { status: 409 }
        );
      }
      throw e;
    }
  }

  return NextResponse.json({ ok: false, erro: 'Ação inválida.' }, { status: 400 });
}
