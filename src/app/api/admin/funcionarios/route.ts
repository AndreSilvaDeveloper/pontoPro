import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';
import bcrypt from 'bcryptjs';

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
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    
    // NOVO CAMPO
    const tituloCargo = formData.get('tituloCargo') as string; 

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

    const senhaPadraoHash = await bcrypt.hash('mudar123', 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome, email, senha: senhaPadraoHash, deveTrocarSenha: true, cargo: 'FUNCIONARIO',
        tituloCargo: tituloCargo || null, // Salva o cargo
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

// === ATUALIZAR ===
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return NextResponse.json({ erro: 'ID não informado' }, { status: 400 });

    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const tituloCargo = formData.get('tituloCargo') as string; // NOVO CAMPO
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const raio = formData.get('raio') as string;
    const fotoArquivo = formData.get('foto') as File | null;
    const jornadaTexto = formData.get('jornada') as string;

    const dadosParaAtualizar: any = {
      nome, email,
      tituloCargo: tituloCargo || null, // Atualiza o cargo
      latitudeBase: parseFloat(latitude), longitudeBase: parseFloat(longitude),
      raioPermitido: parseInt(raio) || 100,
      jornada: jornadaTexto ? JSON.parse(jornadaTexto) : undefined,
    };

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
    return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 });
  }
}

// === EXCLUIR ===
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    await prisma.ponto.deleteMany({ where: { usuarioId: id } });
    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao excluir' }, { status: 500 });
  }
}