import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { getConfig, CONFIGS } from '@/lib/configs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Retorna o link de WhatsApp do suporte (configurado pela super admin)
 * + uma mensagem inicial pré-preenchida com o nome do usuário e a empresa.
 *
 * Quando o agente n8n entrar, esta rota pode mudar pra apontar pra um
 * webhook/handle dele sem mexer no botão.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const userId: string | undefined = session?.user?.id;
  if (!userId) return NextResponse.json({ erro: 'unauthenticated' }, { status: 401 });

  const [link, telefone, usuario] = await Promise.all([
    getConfig(CONFIGS.CONTATO_WHATSAPP_LINK, ''),
    getConfig(CONFIGS.CONTATO_TELEFONE_PRINCIPAL, ''),
    prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        nome: true,
        cargo: true,
        empresa: { select: { nome: true } },
      },
    }),
  ]);

  if (!link) {
    return NextResponse.json({ ativo: false });
  }

  const nome = usuario?.nome || 'Cliente';
  const empresa = usuario?.empresa?.nome || '';
  const cargo = usuario?.cargo || '';

  const mensagem =
    `Olá, suporte WorkID! Sou *${nome}*` +
    (empresa ? ` da empresa *${empresa}*` : '') +
    (cargo ? ` (${cargo.toLowerCase()})` : '') +
    `.\n\nPreciso de ajuda com: `;

  const separator = link.includes('?') ? '&' : '?';
  const linkComMensagem = `${link}${separator}text=${encodeURIComponent(mensagem)}`;

  return NextResponse.json({
    ativo: true,
    link: linkComMensagem,
    telefone,
  });
}
