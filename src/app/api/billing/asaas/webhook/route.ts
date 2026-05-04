import { processarWebhookAsaas } from '@/lib/asaasWebhookHandler';

export const runtime = 'nodejs';

/**
 * Endpoint canônico do webhook Asaas. Toda a lógica está em
 * src/lib/asaasWebhookHandler.ts (compartilhada com /api/webhooks/asaas
 * pra retrocompatibilidade com configurações antigas).
 */
export async function POST(req: Request) {
  return processarWebhookAsaas(req);
}
