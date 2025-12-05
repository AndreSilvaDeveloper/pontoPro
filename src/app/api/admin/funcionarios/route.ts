import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: { empresaId: session.user.empresaId },
      orderBy: { nome: 'asc' }
    });
    return NextResponse.json(funcionarios);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const raio = formData.get('raio') as string;
    const fotoArquivo = formData.get('foto') as File | null;
    const jornadaTexto = formData.get('jornada') as string; // Recebe o JSON em texto

    let fotoPerfilUrl = null;
    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      fotoPerfilUrl = blob.url;
    }

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: 'mudar123',
        deveTrocarSenha: true,
        cargo: 'FUNCIONARIO',
        empresaId: session.user.empresaId,
        latitudeBase: parseFloat(latitude),
        longitudeBase: parseFloat(longitude),
        raioPermitido: parseInt(raio) || 100,
        fotoPerfilUrl: fotoPerfilUrl,
        jornada: jornadaTexto ? JSON.parse(jornadaTexto) : undefined, // Salva o JSON da semana
      }
    });

    return NextResponse.json(novoUsuario);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao criar' }, { status: 500 });
  }
}