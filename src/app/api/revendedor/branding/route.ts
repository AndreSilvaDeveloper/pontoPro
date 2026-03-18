import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';

// GET: Buscar configurações de branding
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'REVENDEDOR') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const revendedorId = session.user.revendedorId;
  const rev = await prisma.revendedor.findUnique({ where: { id: revendedorId } });
  if (!rev) return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });

  return NextResponse.json({
    nomeExibicao: rev.nomeExibicao,
    logoUrl: rev.logoUrl,
    corPrimaria: rev.corPrimaria,
    corSecundaria: rev.corSecundaria,
    dominio: rev.dominio,
  });
}

// POST: Salvar configurações de branding (com upload de logo)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'REVENDEDOR') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const revendedorId = session.user.revendedorId;

  const formData = await request.formData();
  const nomeExibicao = formData.get('nomeExibicao') as string | null;
  const corPrimaria = formData.get('corPrimaria') as string | null;
  const corSecundaria = formData.get('corSecundaria') as string | null;
  const logoFile = formData.get('logo') as File | null;

  const updateData: any = {};
  if (nomeExibicao !== null) updateData.nomeExibicao = nomeExibicao || null;
  if (corPrimaria) updateData.corPrimaria = corPrimaria;
  if (corSecundaria) updateData.corSecundaria = corSecundaria;

  if (logoFile && logoFile.size > 0) {
    const blob = await put(`revendedor/${revendedorId}/logo-${Date.now()}.png`, logoFile, {
      access: 'public',
      contentType: logoFile.type,
    });
    updateData.logoUrl = blob.url;
  }

  const rev = await prisma.revendedor.update({
    where: { id: revendedorId },
    data: updateData,
  });

  return NextResponse.json({ success: true, logoUrl: rev.logoUrl });
}
