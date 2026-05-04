import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { criarNotificacaoSuperAdmin } from '@/lib/notificacaoSuperAdmin';

/**
 * Handler unificado para webhooks do Asaas.
 *
 * Responsabilidades:
 * - Valida token (header `asaas-access-token`)
 * - Idempotência: usa AsaasWebhookEvent (unique[event, paymentId]) pra dedup
 * - Trata pagamento confirmado: atualiza pagoAte/billingAnchorAt
 * - Trata pagamento vencido/estornado/cancelado: notifica super admin
 * - Eventos de assinatura: log
 *
 * Endpoints `/api/webhooks/asaas` e `/api/billing/asaas/webhook` chamam esta lib.
 */

const PAYMENT_ACCEPTED = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_APPROVED',
  'PAYMENT_RECEIVED_IN_CASH',
  'PAYMENT_CREDIT_CARD_CAPTURED',
]);

const SUBSCRIPTION_EVENTS = new Set([
  'SUBSCRIPTION_CREATED',
  'SUBSCRIPTION_RENEWED',
  'SUBSCRIPTION_UPDATED',
  'SUBSCRIPTION_DELETED',
  'SUBSCRIPTION_INACTIVE',
]);

function isTruthyEnv(v: string | undefined) {
  return !!v && ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

function parseAsaasDueDate(input: any): Date | null {
  if (!input) return null;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T03:00:00.000Z`);
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

function addMonthsCalendar(base: Date, months: number) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const day = base.getDate();
  const targetMonth = m + months;
  const lastDay = new Date(y, targetMonth + 1, 0).getDate();
  const result = new Date(base);
  result.setFullYear(y);
  result.setMonth(targetMonth);
  result.setDate(Math.min(day, lastDay));
  return result;
}

function extractEmpresaId(externalReference?: string | null) {
  if (!externalReference) return null;
  const raw = String(externalReference).trim();
  if (!raw) return null;
  const m = raw.match(/^empresa:(.+)$/);
  if (m?.[1]) return m[1];
  return raw;
}

export async function processarWebhookAsaas(req: Request): Promise<NextResponse> {
  // === 1. Auth ===
  const tokenHeader = req.headers.get('asaas-access-token');
  const allowAnon = isTruthyEnv(process.env.ASAAS_WEBHOOK_ALLOW_ANON);

  if (tokenHeader) {
    if (tokenHeader !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  } else if (!allowAnon) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 401 });
  }

  // === 2. Parse ===
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const event = body?.event as string | undefined;
  const payment = body?.payment as any | undefined;
  const paymentId = payment?.id as string | undefined;

  if (!event) {
    return NextResponse.json({ ok: false, error: 'missing_event' }, { status: 400 });
  }

  // === 3. Idempotência (só pra eventos de payment com id) ===
  if (paymentId) {
    try {
      await prisma.asaasWebhookEvent.create({
        data: { event, paymentId, payload: body as any },
      });
    } catch (err: any) {
      // P2002 = unique constraint violation → já processamos esse evento
      if (err?.code === 'P2002') {
        return NextResponse.json({ ok: true, duplicated: true, event, paymentId });
      }
      console.error('[asaas-webhook] erro ao registrar idempotência:', err);
      // não bloqueia processamento
    }
  }

  // === 4. Eventos de assinatura: só log ===
  if (SUBSCRIPTION_EVENTS.has(event)) {
    console.log('[asaas-webhook] subscription:', {
      event,
      subscriptionId: body?.subscription?.id ?? null,
      externalReference: body?.subscription?.externalReference ?? null,
    });
    return NextResponse.json({ ok: true, handled: true, event });
  }

  if (!payment) {
    return NextResponse.json({ ok: false, error: 'missing_payment' }, { status: 400 });
  }

  // === 5. Resolver empresa ===
  let empresaId = extractEmpresaId(
    payment?.externalReference || body?.subscription?.externalReference
  );

  if (!empresaId && payment?.customer) {
    const emp = await prisma.empresa.findFirst({
      where: { asaasCustomerId: payment.customer },
      select: { id: true },
    });
    if (emp) empresaId = emp.id;
  }

  if (!empresaId) {
    return NextResponse.json(
      { ok: false, error: 'missing_externalReference_empresa', event },
      { status: 400 }
    );
  }

  const empBase = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { id: true, nome: true, matrizId: true },
  });

  if (!empBase) {
    return NextResponse.json({ ok: false, error: 'empresa_not_found' }, { status: 404 });
  }

  // Filial usa contexto da matriz
  const targetEmpresaId = empBase.matrizId ?? empBase.id;
  const valorFmt = typeof payment?.value === 'number'
    ? payment.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  // === 6a. Pagamento aceito ===
  if (PAYMENT_ACCEPTED.has(event)) {
    const dueDate = parseAsaasDueDate(payment?.dueDate);
    if (!dueDate) {
      return NextResponse.json({ ok: false, error: 'missing_dueDate' }, { status: 400 });
    }

    const target = await prisma.empresa.findUnique({
      where: { id: targetEmpresaId },
      select: { pagoAte: true, billingAnchorAt: true, billingCycle: true },
    });
    if (!target) {
      return NextResponse.json({ ok: false, error: 'target_not_found' }, { status: 404 });
    }

    const isYearly = target.billingCycle === 'YEARLY';
    const advanceMonths = isYearly ? 12 : 1;
    const next = startOfDay(addMonthsCalendar(dueDate, advanceMonths));

    const paidUntil = maxDate(target.pagoAte ? startOfDay(target.pagoAte) : null, next);
    const anchor = maxDate(target.billingAnchorAt ? startOfDay(target.billingAnchorAt) : null, next);

    await prisma.empresa.update({
      where: { id: targetEmpresaId },
      data: {
        status: 'ATIVO',
        cobrancaAtiva: true,
        dataUltimoPagamento: new Date(),
        pagoAte: paidUntil,
        billingAnchorAt: anchor,
      } as any,
    });

    const targetNome = (await prisma.empresa.findUnique({
      where: { id: targetEmpresaId },
      select: { nome: true },
    }))?.nome || targetEmpresaId;

    criarNotificacaoSuperAdmin({
      tipo: 'PAGAMENTO_RECEBIDO',
      titulo: `Pagamento recebido${valorFmt ? ` · ${valorFmt}` : ''}`,
      mensagem: `${targetNome} pagou.${paidUntil ? ` Vigente até ${paidUntil.toLocaleDateString('pt-BR')}.` : ''}`,
      url: `/saas/${targetEmpresaId}`,
      prioridade: 'NORMAL',
      metadata: { empresaId: targetEmpresaId, paymentId, valor: payment?.value, event },
    });

    return NextResponse.json({
      ok: true,
      action: 'paid',
      empresaId: targetEmpresaId,
      pagoAte: paidUntil?.toISOString() ?? null,
    });
  }

  // === 6b. Pagamento vencido ===
  if (event === 'PAYMENT_OVERDUE') {
    criarNotificacaoSuperAdmin({
      tipo: 'PAGAMENTO_VENCIDO',
      titulo: `Pagamento vencido${valorFmt ? ` · ${valorFmt}` : ''}`,
      mensagem: `${empBase.nome} ficou inadimplente. Considere acionar o cliente.`,
      url: `/saas/${targetEmpresaId}`,
      prioridade: 'ALTA',
      metadata: { empresaId: targetEmpresaId, paymentId, valor: payment?.value, event },
    });
    return NextResponse.json({ ok: true, action: 'marked_overdue', empresaId: targetEmpresaId });
  }

  // === 6c. Pagamento estornado/apagado ===
  if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_DELETED') {
    criarNotificacaoSuperAdmin({
      tipo: 'PAGAMENTO_ESTORNADO',
      titulo: `Pagamento ${event === 'PAYMENT_REFUNDED' ? 'estornado' : 'cancelado'}${valorFmt ? ` · ${valorFmt}` : ''}`,
      mensagem: `${empBase.nome} — verificar regularização.`,
      url: `/saas/${targetEmpresaId}`,
      prioridade: 'ALTA',
      metadata: { empresaId: targetEmpresaId, paymentId, valor: payment?.value, event },
    });
    return NextResponse.json({ ok: true, action: 'refunded_or_deleted', empresaId: targetEmpresaId });
  }

  // === 7. Outros eventos: ignorados silenciosamente ===
  return NextResponse.json({ ok: true, ignored: true, event });
}
