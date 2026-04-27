import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import { storagePut } from '@/lib/storage';
import { reindexarRostoUsuario } from '@/lib/totem';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Verifica se o usuário realmente precisa cadastrar foto
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { deveCadastrarFoto: true, email: true },
    });

    if (!usuario?.deveCadastrarFoto) {
      return NextResponse.json({ erro: 'Cadastro de foto não solicitado.' }, { status: 403 });
    }

    const { fotoBase64 } = await request.json();

    if (!fotoBase64 || typeof fotoBase64 !== 'string') {
      return NextResponse.json({ erro: 'Foto não enviada.' }, { status: 400 });
    }

    // Remove o prefixo data:image/...;base64, se houver
    const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload via @vercel/blob
    const filename = `referencia-${usuario.email.replace('@', '-')}-${Date.now()}.jpg`;
    const blob = await storagePut(filename, buffer, { access: 'public', permanente: true });

    // Atualiza no banco
    await prisma.usuario.update({
      where: { id: session.user.id },
      data: {
        fotoPerfilUrl: blob.url,
        deveCadastrarFoto: false,
      },
    });

    // Reindexa na coleção AWS (totem) — não bloqueia se falhar
    reindexarRostoUsuario(session.user.id).catch(err => console.error('[cadastrar-foto] reindexar:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao cadastrar foto:', error);
    return NextResponse.json({ erro: 'Erro interno ao salvar foto.' }, { status: 500 });
  }
}
