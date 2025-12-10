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
    const dataInicio = formData.get('dataInicio') as string;
    const dataFim = formData.get('dataFim') as string;
    const tipo = formData.get('tipo') as string;
    const motivo = formData.get('motivo') as string;
    const arquivo = formData.get('comprovante') as File | null;

    let comprovanteUrl = null;

    if (arquivo && arquivo.size > 0) {
      // === CORREÇÃO AQUI ===
      // Pega a extensão original do arquivo (.pdf, .png, etc) em vez de forçar .jpg
      const extensao = arquivo.name.split('.').pop() || 'arquivo';
      const filename = `atestado-${session.user.id}-${Date.now()}.${extensao}`;
      
      const blob = await put(filename, arquivo, { access: 'public' });
      comprovanteUrl = blob.url;
    }

    await prisma.ausencia.create({
      data: {
        usuarioId: session.user.id,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        tipo,
        motivo,
        comprovanteUrl,
        status: 'PENDENTE'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao solicitar ausência' }, { status: 500 });
  }
}