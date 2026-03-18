import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/public/branding?domain=pontomax.com.br
// Retorna branding do revendedor pelo domínio (usado na tela de login)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ branding: null });
  }

  const revendedor = await prisma.revendedor.findFirst({
    where: {
      dominio: domain,
      ativo: true,
    },
    select: {
      nomeExibicao: true,
      logoUrl: true,
      corPrimaria: true,
      corSecundaria: true,
    },
  });

  if (!revendedor) {
    return NextResponse.json({ branding: null });
  }

  return NextResponse.json({
    branding: {
      nomeExibicao: revendedor.nomeExibicao || 'WorkID',
      logoUrl: revendedor.logoUrl,
      corPrimaria: revendedor.corPrimaria || '#7c3aed',
      corSecundaria: revendedor.corSecundaria || '#4f46e5',
    },
  });
}
