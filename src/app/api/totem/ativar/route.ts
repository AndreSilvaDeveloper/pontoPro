import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST: tablet manda o código de pareamento e recebe um token longo.
 * Body: { codigo: "123456" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const codigo = String(body?.codigo || '').trim();

    if (!/^\d{6}$/.test(codigo)) {
      return NextResponse.json({ erro: 'Código inválido' }, { status: 400 });
    }

    const totem = await prisma.totemDevice.findUnique({
      where: { codigo },
      include: {
        empresa: {
          select: { id: true, nome: true, addonTotem: true, matrizId: true },
        },
      },
    });

    if (!totem) {
      return NextResponse.json({ erro: 'Código inválido ou expirado' }, { status: 404 });
    }
    if (totem.codigoExpiraEm && totem.codigoExpiraEm < new Date()) {
      return NextResponse.json({ erro: 'Código expirado. Gere um novo.' }, { status: 410 });
    }

    // Confirma que a empresa tem addon ativo (ou a matriz)
    let temAddon = totem.empresa.addonTotem === true;
    if (!temAddon && totem.empresa.matrizId) {
      const matriz = await prisma.empresa.findUnique({
        where: { id: totem.empresa.matrizId },
        select: { addonTotem: true },
      });
      temAddon = matriz?.addonTotem === true;
    }
    if (!temAddon) {
      return NextResponse.json({ erro: 'Modo Totem desativado pra essa empresa.' }, { status: 402 });
    }

    // Gera token longo (64 hex)
    const token = crypto.randomBytes(48).toString('hex');

    await prisma.totemDevice.update({
      where: { id: totem.id },
      data: {
        token,
        codigo: null,        // queima o código (uso único)
        codigoExpiraEm: null,
        pareadoEm: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      token,
      totemId: totem.id,
      empresaNome: totem.empresa.nome,
      totemNome: totem.nome,
    });
  } catch (err) {
    console.error('[totem/ativar] erro:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
