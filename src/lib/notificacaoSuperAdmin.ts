import { prisma } from '@/lib/db';
import { enviarPushSuperAdmins } from '@/lib/push';

export type TipoNotificacaoSaaS =
  | 'LEAD_NOVO'
  | 'NOVA_EMPRESA'
  | 'NOVA_VENDA'
  | 'PAGAMENTO_RECEBIDO'
  | 'PAGAMENTO_VENCIDO'
  | 'PAGAMENTO_ESTORNADO'
  | 'SISTEMA';

export type PrioridadeNotificacao = 'BAIXA' | 'NORMAL' | 'ALTA' | 'CRITICA';

interface CriarNotificacaoArgs {
  tipo: TipoNotificacaoSaaS;
  titulo: string;
  mensagem: string;
  url?: string;
  prioridade?: PrioridadeNotificacao;
  metadata?: Record<string, unknown>;
  enviarPush?: boolean;
}

/**
 * Cria notificação global pra super admins (destinatarioId = null) e dispara push.
 * Fire-and-forget: nunca lança — falhas são logadas para não derrubar o caller.
 */
export async function criarNotificacaoSuperAdmin(args: CriarNotificacaoArgs): Promise<void> {
  const {
    tipo,
    titulo,
    mensagem,
    url,
    prioridade = 'NORMAL',
    metadata,
    enviarPush = true,
  } = args;

  try {
    await prisma.notificacao.create({
      data: {
        destinatarioId: null,
        tipo,
        prioridade,
        titulo,
        mensagem,
        url: url ?? null,
        metadata: metadata ? (metadata as any) : undefined,
      },
    });
  } catch (err) {
    console.error('[notificacaoSuperAdmin] criar falhou:', err);
  }

  if (enviarPush) {
    enviarPushSuperAdmins({
      title: titulo,
      body: mensagem,
      url: url || '/saas',
      tag: `saas-${tipo}`,
    }).catch(err => console.error('[notificacaoSuperAdmin] push falhou:', err));
  }
}
