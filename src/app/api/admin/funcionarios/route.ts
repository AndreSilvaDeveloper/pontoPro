import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob'; // Importante para salvar a foto

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: {
        empresaId: session.user.empresaId,
        cargo: 'FUNCIONARIO',
      },
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
    // 1. Ler os dados como FormData (porque tem arquivo)
    const formData = await request.formData();
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const raio = formData.get('raio') as string;
    const fotoArquivo = formData.get('foto') as File | null;

    // 2. Upload da Foto de Referência (se tiver)
    let fotoPerfilUrl = null;
    
    if (fotoArquivo && fotoArquivo.size > 0) {
      // Cria um nome único: referencia-EMAIL.jpg
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      
      const blob = await put(filename, fotoArquivo, {
        access: 'public',
      });
      
      fotoPerfilUrl = blob.url;
    }

    // 3. Criar no Banco de Dados
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
        fotoPerfilUrl: fotoPerfilUrl, // Salvamos o link da foto oficial!
      }
    });

    return NextResponse.json(novoUsuario);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao criar (Email já existe?)' }, { status: 500 });
  }
}