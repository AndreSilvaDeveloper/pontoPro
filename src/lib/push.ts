import webpush from 'web-push';
import { prisma } from '@/lib/db';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:suporte@ontimeia.com',
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

    if (subs.length === 0) return;

    const jsonPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload
        )
      )
    );

    // Limpa subscriptions expiradas (410 Gone ou 404)
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'rejected') {
        const statusCode = (r.reason as any)?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { id: subs[i].id },
          }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error(`❌ Falha ao enviar push para ${usuarioId}:`, error);
  }
}

/**
 * Envia push para todos os admins de uma empresa.
 */
export async function enviarPushAdmins(empresaId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  try {
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
