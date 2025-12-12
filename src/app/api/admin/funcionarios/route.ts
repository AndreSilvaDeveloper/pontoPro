import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put } from '@vercel/blob';
import { hash } from 'bcryptjs';

// === GET: LISTAR FUNCIONÁRIOS ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: { empresaId: session.user.empresaId, cargo: { not: 'ADMIN' } },
      orderBy: { nome: 'asc' }
    });
    
    // Remove a senha antes de enviar para o front (segurança)
    const seguros = funcionarios.map(f => {
        const { senha, ...resto } = f;
        return resto;
    });

    return NextResponse.json(seguros);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar' }, { status: 500 });
  }
}

// === POST: CRIAR FUNCIONÁRIO ===
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
    
    // Campos Especiais (JSON / Boolean)
    const pontoLivre = formData.get('pontoLivre') === 'true';
    const jornadaTexto = formData.get('jornada') as string;
    const locaisTexto = formData.get('locaisAdicionais') as string;

    if (!nome || !email) return NextResponse.json({ erro: 'Campos obrigatórios faltando.' }, { status: 400 });

    // Upload Foto
    let fotoPerfilUrl = null;
    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      fotoPerfilUrl = blob.url;
    }

    // Hash da Senha Padrão
    const hashedPassword = await hash('1234', 10);

    // Tratamento de JSON (Evita erro 500 se vier undefined ou inválido)
    let jornadaDados = undefined;
    if (jornadaTexto && jornadaTexto !== 'undefined') {
        try { jornadaDados = JSON.parse(jornadaTexto); } catch (e) { console.error("Erro parse jornada", e); }
    }

    let locaisAdicionaisDados = undefined;
    if (locaisTexto && locaisTexto !== 'undefined') {
        try { locaisAdicionaisDados = JSON.parse(locaisTexto); } catch (e) { console.error("Erro parse locais", e); }
    }

    // Criação no Banco
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword, // <--- CORREÇÃO AQUI: Mudamos de 'senha' para 'password'
        cargo: 'FUNCIONARIO',
        tituloCargo: tituloCargo || 'Colaborador',
        empresaId: session.user.empresaId,
        latitudeBase: latitude ? parseFloat(latitude) : 0,
        longitudeBase: longitude ? parseFloat(longitude) : 0,
        raioPermitido: raio ? parseInt(raio) : 100,
        fotoPerfilUrl,
        jornada: jornadaDados,
        pontoLivre,
        locaisAdicionais: locaisAdicionaisDados,
        deveTrocarSenha: true
      }
    });

    return NextResponse.json(novoUsuario);

  } catch (error) {
    console.error("Erro detalhado no POST:", error);
    return NextResponse.json({ erro: 'Erro ao criar funcionário' }, { status: 500 });
  }
}

// === PUT: ATUALIZAR FUNCIONÁRIO ===
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
    const pontoLivre = formData.get('pontoLivre') === 'true';
    const jornadaTexto = formData.get('jornada') as string;
    const locaisTexto = formData.get('locaisAdicionais') as string;

    const dados: any = {
      nome, 
      email,
      tituloCargo,
      latitudeBase: latitude ? parseFloat(latitude) : 0,
      longitudeBase: longitude ? parseFloat(longitude) : 0,
      raioPermitido: raio ? parseInt(raio) : 100,
      pontoLivre
    };

    // Tratamento JSON no Update
    if (jornadaTexto && jornadaTexto !== 'undefined') {
        try { dados.jornada = JSON.parse(jornadaTexto); } catch (e) {}
    }
    if (locaisTexto && locaisTexto !== 'undefined') {
        try { dados.locaisAdicionais = JSON.parse(locaisTexto); } catch (e) {}
    }

    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      dados.fotoPerfilUrl = blob.url;
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dados,
    });

    return NextResponse.json(usuarioAtualizado);
  } catch (error) {
    console.error("Erro no PUT:", error);
    return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 });
  }
}

// === DELETE: EXCLUIR FUNCIONÁRIO ===
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    // Limpeza em cascata manual (caso o banco não tenha cascade configurado)
    await prisma.ponto.deleteMany({ where: { usuarioId: id } });
    await prisma.solicitacaoAjuste.deleteMany({ where: { usuarioId: id } });
    await prisma.ausencia.deleteMany({ where: { usuarioId: id } });
    
    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao excluir' }, { status: 500 });
  }
}