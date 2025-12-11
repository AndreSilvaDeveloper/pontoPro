import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const formData = await request.formData();
    const arquivo = formData.get('assinatura') as File;

    if (!arquivo) {
        return NextResponse.json({ erro: 'Nenhuma assinatura enviada' }, { status: 400 });
    }

    // Salva no Vercel Blob
    const filename = `assinatura-${session.user.id}-${Date.now()}.png`;
    const blob = await put(filename, arquivo, { access: 'public' });

    // Atualiza o usuário
    await prisma.usuario.update({
        where: { id: session.user.id },
        data: { assinaturaUrl: blob.url }
    });

    return NextResponse.json({ success: true, url: blob.url });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao salvar assinatura' }, { status: 500 });
  }
}

// GET para ver se já tem assinatura
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: '401' }, { status: 401 });

    const user = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { assinaturaUrl: true }
    });

    return NextResponse.json({ url: user?.assinaturaUrl });
}