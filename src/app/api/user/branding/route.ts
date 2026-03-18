import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

// GET: Retorna branding do revendedor vinculado à empresa do usuário logado
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ branding: null });
  }

  const empresaId = (session.user as any).empresaId;
  if (!empresaId) {
    return NextResponse.json({ branding: null });
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { revendedorId: true },
  });

  if (!empresa?.revendedorId) {
    return NextResponse.json({ branding: null });
  }

  const rev = await prisma.revendedor.findUnique({
    where: { id: empresa.revendedorId },
    select: {
      nomeExibicao: true,
      logoUrl: true,
      corPrimaria: true,
      corSecundaria: true,
    },
  });

  if (!rev || !rev.nomeExibicao) {
    return NextResponse.json({ branding: null });
  }

  return NextResponse.json({
    branding: {
      nomeExibicao: rev.nomeExibicao,
      logoUrl: rev.logoUrl,
      corPrimaria: rev.corPrimaria || '#7c3aed',
      corSecundaria: rev.corSecundaria || '#4f46e5',
    },
  });
}
