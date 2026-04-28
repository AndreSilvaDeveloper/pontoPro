import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import crypto from 'crypto';

export const runtime = 'nodejs';

const CODIGO_TTL_MIN = 30;

function gerarCodigoNumerico(tamanho = 6): string {
  let codigo = '';
  for (let i = 0; i < tamanho; i++) {
    codigo += Math.floor(Math.random() * 10);
  }
  return codigo;
}

/**
 * POST: admin gera um novo TotemDevice com código de pareamento (válido 30min).
 * Body: { nome: "Recepção" }
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const empresaId = session.user.empresaId as string | null;
  if (!empresaId) {
    return NextResponse.json({ erro: 'Sem empresa' }, { status: 400 });
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { addonTotem: true, matrizId: true },
  });

  // Filial usa addon da matriz
  let temAddon = empresa?.addonTotem === true;
  if (!temAddon && empresa?.matrizId) {
    const matriz = await prisma.empresa.findUnique({
      where: { id: empresa.matrizId },
      select: { addonTotem: true },
    });
    temAddon = matriz?.addonTotem === true;
  }

  if (!temAddon) {
    return NextResponse.json(
      { erro: 'Modo Totem não está disponível no seu plano. Fale com o suporte WorkID.' },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const nome = String(body?.nome || '').trim() || 'Totem';

  // Gera código único — tenta até 5 vezes em caso de colisão
  let codigo: string | null = null;
  for (let i = 0; i < 5; i++) {
    const tentativa = gerarCodigoNumerico(6);
    const existe = await prisma.totemDevice.findUnique({ where: { codigo: tentativa } });
    if (!existe) { codigo = tentativa; break; }
  }
  if (!codigo) {
    return NextResponse.json({ erro: 'Tente novamente.' }, { status: 503 });
  }

  const expiraEm = new Date(Date.now() + CODIGO_TTL_MIN * 60 * 1000);

  const totem = await prisma.totemDevice.create({
    data: {
      empresaId,
      nome,
      codigo,
      codigoExpiraEm: expiraEm,
      ativo: true,
    },
  });

  return NextResponse.json({
    ok: true,
    id: totem.id,
    nome: totem.nome,
    codigo,
    expiraEm: expiraEm.toISOString(),
  });
}
