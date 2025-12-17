import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Caminho absoluto recomendado
import { put } from '@vercel/blob';
import { hash } from 'bcryptjs';

// === GET: LISTAR FUNCIONÁRIOS ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: { 
          empresaId: session.user.empresaId, 
          cargo: { not: 'ADMIN' } // Lista apenas funcionários, não outros admins
      },
      orderBy: { nome: 'asc' }
    });
    
    // Remove a senha antes de enviar para o front (segurança)
    const seguros = funcionarios.map(f => {
        const { senha, ...resto } = f;
        return resto;
    });

    return NextResponse.json(seguros);
  } catch (error) {
    console.error("Erro no GET:", error);
    return NextResponse.json({ erro: 'Erro ao buscar funcionários' }, { status: 500 });
  }
}

// === POST: CRIAR FUNCIONÁRIO ===
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

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

    // 1. Validação Básica
    if (!nome || !email) {
        return NextResponse.json({ erro: 'Nome e Email são obrigatórios.' }, { status: 400 });
    }

    // 2. VERIFICAÇÃO DE DUPLICIDADE (A Correção Principal)
    const usuarioExistente = await prisma.usuario.findUnique({
        where: { email }
    });

    if (usuarioExistente) {
        return NextResponse.json({ erro: 'Este email já está cadastrado no sistema.' }, { status: 409 });
    }

    // 3. Upload Foto (Só faz se o email estiver livre)
    let fotoPerfilUrl = null;
    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      fotoPerfilUrl = blob.url;
    }

    // 4. Criptografia da Senha
    const hashedPassword = await hash('1234', 10);

    // 5. Tratamento de JSON
    let jornadaDados = undefined;
    if (jornadaTexto && jornadaTexto !== 'undefined') {
        try { jornadaDados = JSON.parse(jornadaTexto); } catch (e) { console.error("Erro parse jornada", e); }
    }

    let locaisAdicionaisDados = undefined;
    if (locaisTexto && locaisTexto !== 'undefined') {
        try { locaisAdicionaisDados = JSON.parse(locaisTexto); } catch (e) { console.error("Erro parse locais", e); }
    }

    // 6. Criação no Banco
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword, // Mantido 'senha' para compatibilidade com seu Login
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
  
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

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
  
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    // Limpeza manual de dependências (Ponto, Solicitações, etc.)
    await prisma.ponto.deleteMany({ where: { usuarioId: id } }).catch(() => null);
    await prisma.solicitacaoAjuste.deleteMany({ where: { usuarioId: id } }).catch(() => null);
    await prisma.ausencia.deleteMany({ where: { usuarioId: id } }).catch(() => null);
    
    await prisma.usuario.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no DELETE:", error);
    return NextResponse.json({ erro: 'Erro ao excluir' }, { status: 500 });
  }
}