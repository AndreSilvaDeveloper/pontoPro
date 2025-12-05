import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';

// === LISTAR ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

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

// === CRIAR ===
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const formData = await request.formData();
    // (Lógica de criação igual a antes...)
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const raio = formData.get('raio') as string;
    const fotoArquivo = formData.get('foto') as File | null;
    const jornadaTexto = formData.get('jornada') as string;

    let fotoPerfilUrl = null;
    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      fotoPerfilUrl = blob.url;
    }

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome, email, senha: 'mudar123', deveTrocarSenha: true, cargo: 'FUNCIONARIO',
        empresaId: session.user.empresaId,
        latitudeBase: parseFloat(latitude), longitudeBase: parseFloat(longitude),
        raioPermitido: parseInt(raio) || 100,
        fotoPerfilUrl,
        jornada: jornadaTexto ? JSON.parse(jornadaTexto) : undefined,
      }
    });
    return NextResponse.json(novoUsuario);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao criar' }, { status: 500 });
  }
}

// === ATUALIZAR (NOVO!) ===
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const formData = await request.formData();
    const id = formData.get('id') as string; // Precisamos do ID para saber quem editar
    
    if (!id) return NextResponse.json({ erro: 'ID não informado' }, { status: 400 });

    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const raio = formData.get('raio') as string;
    const fotoArquivo = formData.get('foto') as File | null;
    const jornadaTexto = formData.get('jornada') as string;

    // Prepara os dados para atualização
    const dadosParaAtualizar: any = {
      nome,
      email,
      latitudeBase: parseFloat(latitude),
      longitudeBase: parseFloat(longitude),
      raioPermitido: parseInt(raio) || 100,
      jornada: jornadaTexto ? JSON.parse(jornadaTexto) : undefined,
    };

    // Só atualiza a foto se o admin enviou uma nova
    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      dadosParaAtualizar.fotoPerfilUrl = blob.url;
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dadosParaAtualizar,
    });

    return NextResponse.json(usuarioAtualizado);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 });
  }
}