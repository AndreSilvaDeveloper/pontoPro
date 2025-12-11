import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';
import { hash } from 'bcryptjs';

// === LISTAR ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: { 
        empresaId: session.user.empresaId,
        cargo: { not: 'ADMIN' } 
      },
      orderBy: { nome: 'asc' }
    });
    
    // Remove a senha antes de enviar para o front
    const seguros = funcionarios.map(f => {
        const { senha, ...resto } = f;
        return resto;
    });

    return NextResponse.json(seguros);
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
    const tituloCargo = formData.get('tituloCargo') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const raio = formData.get('raio') as string;
    const fotoArquivo = formData.get('foto') as File | null;
    
    // A jornada vem como texto JSON stringify do frontend
    const jornadaTexto = formData.get('jornada') as string; 

    // Validação Básica
    if (!nome || !email) {
        return NextResponse.json({ erro: 'Campos obrigatórios faltando.' }, { status: 400 });
    }

    // Upload da Foto (se houver)
    let fotoPerfilUrl = null;
    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      fotoPerfilUrl = blob.url;
    }

    // Hash da senha
    const hashedPassword = await hash('1234', 10);

    // Tratamento da Jornada (Converter string JSON para Objeto)
    let jornadaDados = undefined;
    if (jornadaTexto) {
        try {
            jornadaDados = JSON.parse(jornadaTexto);
        } catch (e) {
            console.error("Erro ao converter jornada:", e);
        }
    }

    // Criação no Banco
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword, // Campo correto conforme schema Prisma
        cargo: 'FUNCIONARIO',
        tituloCargo: tituloCargo || 'Colaborador',
        empresaId: session.user.empresaId,
        
        // Dados Geográficos
        latitudeBase: latitude ? parseFloat(latitude) : 0,
        longitudeBase: longitude ? parseFloat(longitude) : 0,
        raioPermitido: raio ? parseInt(raio) : 100,
        
        fotoPerfilUrl,
        
        // Banco de Horas
        jornada: jornadaDados 
        
      }
    });

    return NextResponse.json(novoUsuario);

  } catch (error) {
    console.error("Erro no POST Funcionário:", error);
    return NextResponse.json({ erro: 'Erro ao criar funcionário' }, { status: 500 });
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
    const tituloCargo = formData.get('tituloCargo') as string;
    const latitude = formData.get('latitude') as string;
    const longitude = formData.get('longitude') as string;
    const raio = formData.get('raio') as string;
    const fotoArquivo = formData.get('foto') as File | null;
    const jornadaTexto = formData.get('jornada') as string;

    const dadosParaAtualizar: any = {
      nome, 
      email,
      tituloCargo,
      latitudeBase: latitude ? parseFloat(latitude) : undefined,
      longitudeBase: longitude ? parseFloat(longitude) : undefined,
      raioPermitido: raio ? parseInt(raio) : undefined,
    };

    // Atualiza Jornada se foi enviada
    if (jornadaTexto) {
        try {
            dadosParaAtualizar.jornada = JSON.parse(jornadaTexto);
        } catch (e) { console.error(e); }
    }

    // Atualiza Foto se foi enviada
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

    // Deleta pontos, solicitações e ausências antes do usuário
    await prisma.ponto.deleteMany({ where: { usuarioId: id } });
    await prisma.solicitacaoAjuste.deleteMany({ where: { usuarioId: id } });
    await prisma.ausencia.deleteMany({ where: { usuarioId: id } });
    
    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao excluir' }, { status: 500 });
  }
}