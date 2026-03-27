import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { storagePut } from '@/lib/storage';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const foto = formData.get('foto') as File | null;
    const id = formData.get('id') as string;

    if (!foto || !id) {
      return NextResponse.json({ erro: 'Foto e ID são obrigatórios' }, { status: 400 });
    }

    // Verificar que o usuário pertence à empresa
    // @ts-ignore
    const empresaId = session.user.empresaId;
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { id: true, empresaId: true },
    });

    if (!usuario || usuario.empresaId !== empresaId) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
    }

    const buffer = Buffer.from(await foto.arrayBuffer());
    const ext = foto.name.split('.').pop() || 'jpg';
    const filename = `perfil-${id}-${Date.now().toString(36)}.${ext}`;

    const blob = await storagePut(filename, buffer, { access: 'public', permanente: true });

    await prisma.usuario.update({
      where: { id },
      data: { fotoPerfilUrl: blob.url },
    });

    return NextResponse.json({ fotoPerfilUrl: blob.url });
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    return NextResponse.json({ erro: 'Erro ao salvar foto' }, { status: 500 });
  }
}
