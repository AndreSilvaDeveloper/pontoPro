import webpush from 'web-push';
import { prisma } from '@/lib/db';
import { EMAIL_SUPPORT } from '@/config/site';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    `mailto:${EMAIL_SUPPORT}`,
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Envia push para um usuário (todos os dispositivos).
 * Nunca joga erro — padrão fire-and-forget igual enviarEmailSeguro.
 */
export async function enviarPushSeguro(usuarioId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { usuarioId },
    });

    if (subs.length === 0) {
      console.log(`ℹ️ Push: nenhuma subscription para ${usuarioId}`);
      return;
    }

    const jsonPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload,
          {
            TTL: 60 * 60, // 1 hora — importante para iOS/Safari
            urgency: 'high',
          }
        )
      )
    );

    // Processa resultados
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'rejected') {
        const statusCode = (r.reason as any)?.statusCode;
        const body = (r.reason as any)?.body;
        console.error(`❌ Push falhou para ${usuarioId} (endpoint: ${subs[i].endpoint.substring(0, 60)}...): status=${statusCode}, body=${body}`);

        // Limpa subscriptions que falharam (expirada, inválida, etc)
        await prisma.pushSubscription.delete({
          where: { id: subs[i].id },
        }).catch(() => {});
        console.log(`🗑️ Subscription removida (status ${statusCode}): ${subs[i].id}`);
      } else {
        console.log(`✅ Push enviado para ${usuarioId} (endpoint: ${subs[i].endpoint.substring(0, 60)}...)`);
      }
    }
  } catch (error) {
    console.error(`❌ Falha ao enviar push para ${usuarioId}:`, error);
  }
}

function getHoraSP(date = new Date()): number {
  const hh = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  return parseInt(hh, 10);
}

/**
 * Retorna true se o horário atual (SP) está dentro da janela "não perturbar"
 * configurada pela empresa.
 *
 * Janela é definida por { inicio, fim } em horas (0-23). Se `inicio > fim`,
 * a janela cruza a meia-noite (ex.: inicio=18, fim=8 = "das 18h às 8h").
 */
async function estaEmJanelaNaoPerturbar(empresaId: string): Promise<boolean> {
  try {
    const emp = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { configuracoes: true },
    });
    const cfg = (emp?.configuracoes as any) || {};
    if (cfg.naoPerturbarAtivo !== true) return false;

    const inicio = typeof cfg.naoPerturbarInicio === 'number' ? cfg.naoPerturbarInicio : 18;
    const fim = typeof cfg.naoPerturbarFim === 'number' ? cfg.naoPerturbarFim : 8;
    if (inicio === fim) return false; // janela vazia/ambígua → não bloqueia

    const hora = getHoraSP();
    if (inicio < fim) {
      // janela contínua no mesmo dia (ex.: 13-17): bloqueia se hora ∈ [inicio, fim)
      return hora >= inicio && hora < fim;
    }
    // janela cruzando meia-noite (ex.: 18-8): bloqueia se hora >= inicio OU hora < fim
    return hora >= inicio || hora < fim;
  } catch {
    return false;
  }
}

/**
 * Envia push para todos os admins de uma empresa.
 *
 * Respeita a janela "não perturbar" da empresa por padrão.
 * Use `options.bypassNaoPerturbar` em alertas urgentes (raro).
 */
export async function enviarPushAdmins(
  empresaId: string,
  payload: PushPayload,
  options?: { bypassNaoPerturbar?: boolean },
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  try {
    if (!options?.bypassNaoPerturbar) {
      const naoPerturbar = await estaEmJanelaNaoPerturbar(empresaId);
      if (naoPerturbar) return; // silencioso — admin escolheu não receber agora
    }

    const admins = await prisma.usuario.findMany({
      where: { empresaId, cargo: 'ADMIN' },
      select: { id: true },
    });

    await Promise.allSettled(
      admins.map(admin => enviarPushSeguro(admin.id, payload))
    );
  } catch (error) {
    console.error(`❌ Falha ao enviar push para admins:`, error);
  }
}

/**
 * Envia push para todos os super admins (operadores do SaaS).
 * Usado para alertar sobre eventos globais: novo lead, pagamento, novo cadastro.
 */
export async function enviarPushSuperAdmins(payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  try {
    const supers = await prisma.usuario.findMany({
      where: { cargo: 'SUPER_ADMIN' },
      select: { id: true },
    });

    await Promise.allSettled(
      supers.map(s => enviarPushSeguro(s.id, payload))
    );
  } catch (error) {
    console.error(`❌ Falha ao enviar push para super admins:`, error);
  }
}
