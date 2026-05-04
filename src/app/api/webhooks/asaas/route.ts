import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { criarNotificacaoSuperAdmin } from "@/lib/notificacaoSuperAdmin";

export const runtime = "nodejs";

// tolerância padrão (em dias) antes de bloquear
const GRACE_DAYS = 10;

// adiciona dias mantendo hora em 00:00 (pra evitar timezone estranho)
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseEmpresaId(externalReference?: string | null) {
  if (!externalReference) return null;
  if (!externalReference.startsWith("empresa:")) return null;
  return externalReference.replace("empresa:", "").trim();
}

export async function POST(req: Request) {
  try {
    // segurança: token simples via header (o seu já está funcionando)
    const token = req.headers.get("asaas-access-token")?.trim();
    if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
    }

    const body = await req.json();

    const event = body?.event as string | undefined;
    const payment = body?.payment;

    if (!event || !payment) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const paymentId = payment?.id as string | undefined;
    const externalReference = payment?.externalReference as string | undefined;
    const empresaId = parseEmpresaId(externalReference);

    if (!empresaId) {
      return NextResponse.json({ ok: true, ignored: true, reason: "no empresa externalReference" });
    }

    // idempotência (evita duplicar processamento)
    // se você já criou uma tabela/registro de eventos, mantenha.
    // se não existir no schema, isso não quebra: comentado por segurança.
    // -------------------------------------------------------------
    // const already = await prisma.asaasWebhookEvent.findUnique({ where: { paymentId_event: { paymentId, event } }});
    // if (already) return NextResponse.json({ ok: true, duplicated: true });
    // await prisma.asaasWebhookEvent.create({ data: { paymentId, event, payload: body }});
    // -------------------------------------------------------------

    const agora = new Date();

    // Busca nome da empresa pra usar nas notificações
    const empresaInfo = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nome: true },
    });
    const nomeEmpresa = empresaInfo?.nome || empresaId;
    const valorPagamento = typeof payment?.value === 'number'
      ? payment.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null;

    // ✅ Pagamento confirmado/recebido: libera e estende assinatura
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // regra simples: paga por +30 dias a partir de hoje
      // (se quiser alinhar com diaVencimento depois, a gente refina)
      const novoPagoAte = addDays(agora, 30);

      await prisma.empresa.update({
        where: { id: empresaId },
        data: {
          status: "ATIVO",
          dataUltimoPagamento: agora,
          pagoAte: novoPagoAte,
          cobrancaAtiva: true,
        },
      });

      criarNotificacaoSuperAdmin({
        tipo: 'PAGAMENTO_RECEBIDO',
        titulo: `Pagamento recebido${valorPagamento ? ` · ${valorPagamento}` : ''}`,
        mensagem: `${nomeEmpresa} pagou. Próximo vencimento: ${novoPagoAte.toLocaleDateString('pt-BR')}.`,
        url: `/saas/${empresaId}`,
        prioridade: 'NORMAL',
        metadata: { empresaId, paymentId, valor: payment?.value, event },
      });

      return NextResponse.json({ ok: true, action: "unblocked", empresaId, pagoAte: novoPagoAte.toISOString() });
    }

    // ⚠️ Cobrança vencida: registra vencimento (bloqueio real será pelo PASSO 2)
    if (event === "PAYMENT_OVERDUE") {
      criarNotificacaoSuperAdmin({
        tipo: 'PAGAMENTO_VENCIDO',
        titulo: `Pagamento vencido${valorPagamento ? ` · ${valorPagamento}` : ''}`,
        mensagem: `${nomeEmpresa} ficou inadimplente. Considere acionar o cliente.`,
        url: `/saas/${empresaId}`,
        prioridade: 'ALTA',
        metadata: { empresaId, paymentId, valor: payment?.value, event },
      });
      return NextResponse.json({ ok: true, action: "marked_overdue", empresaId });
    }

    // Estorno / apagada: registra; bloqueio fica pelo PASSO 2
    if (event === "PAYMENT_REFUNDED" || event === "PAYMENT_DELETED") {
      criarNotificacaoSuperAdmin({
        tipo: 'PAGAMENTO_ESTORNADO',
        titulo: `Pagamento ${event === 'PAYMENT_REFUNDED' ? 'estornado' : 'cancelado'}${valorPagamento ? ` · ${valorPagamento}` : ''}`,
        mensagem: `${nomeEmpresa} — verificar regularização.`,
        url: `/saas/${empresaId}`,
        prioridade: 'ALTA',
        metadata: { empresaId, paymentId, valor: payment?.value, event },
      });
      return NextResponse.json({ ok: true, action: "marked_refunded_or_deleted", empresaId });
    }

    return NextResponse.json({ ok: true, ignored: true, event });
  } catch (err: any) {
    console.error("[ASAAS_WEBHOOK] error:", err?.response?.data ?? err);
    return NextResponse.json({ ok: false, error: "Erro no webhook" }, { status: 500 });
  }
}
