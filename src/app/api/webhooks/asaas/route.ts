import { processarWebhookAsaas } from '@/lib/asaasWebhookHandler';

export const runtime = 'nodejs';

/**
 * Endpoint legado mantido pra retrocompatibilidade — o canônico é
 * /api/billing/asaas/webhook. Toda a lógica vive em
 * src/lib/asaasWebhookHandler.ts (incluindo idempotência via
 * AsaasWebhookEvent).
 */
export async function POST(req: Request) {
  return processarWebhookAsaas(req);
}
