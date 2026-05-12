import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { storagePut } from '@/lib/storage';
import { hash } from 'bcryptjs';
import { enviarEmailSeguro } from '@/lib/email';
import { htmlEmailAtivacao, assuntoEmailAtivacao } from '@/lib/emailFuncionario';
import { getPlanoConfig } from '@/config/planos';
import { BASE_URL } from '@/config/site';
import { reindexarRostoUsuario } from '@/lib/totem';
import { removerRosto } from '@/lib/rekognition';

// === GET: LISTAR FUNCIONÁRIOS ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: { 
          // @ts-ignore
          empresaId: session.user.empresaId, 
          cargo: { not: 'ADMIN' } 
      },
      orderBy: { nome: 'asc' }
    });
    
    // Remove dados sensíveis antes de enviar para o front
    const seguros = funcionarios.map(f => {
        const {
          senha, resetToken, resetTokenExpiry, ativacaoToken, ativacaoTokenExpiry,
          twoFactorSecret, twoFactorBackupCodes, ...resto
        } = f;
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
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    // 0. BUSCA O NOME DA EMPRESA
    const empresaAtual = await prisma.empresa.findUnique({
        // @ts-ignore
        where: { id: session.user.empresaId },
        select: { nome: true }
    });
    const nomeEmpresa = empresaAtual?.nome || 'Sua Empresa';

    const formData = await request.formData();
    
    // Extração dos dados
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

    const telefone = formData.get('telefone') as string || '';
    const cpf = (formData.get('cpf') as string || '').replace(/\D/g, '');
    const pis = (formData.get('pis') as string || '').replace(/\D/g, '');
    const exigirFotoFuncionario = formData.get('exigirFotoFuncionario') === 'true';
    const exigirCienciaCelular = formData.get('exigirCienciaCelular') === 'true';

    // === NOVOS CAMPOS (IP e MODO) ===
    const modoValidacaoPontoStr = formData.get('modoValidacaoPonto') as string || 'GPS';
    const ipsPermitidos = formData.get('ipsPermitidos') as string || '';

    // 1. Validação
    if (!nome || !email) return NextResponse.json({ erro: 'Obrigatórios.' }, { status: 400 });

    // 2. Duplicidade
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) return NextResponse.json({ erro: 'Email já cadastrado.' }, { status: 409 });

    // 3. Upload Foto
    let fotoPerfilUrl = null;
    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await storagePut(filename, fotoArquivo, { access: 'public', permanente: true });
      fotoPerfilUrl = blob.url;
    }

    // Se admin enviou foto, não precisa exigir do funcionário
    const deveCadastrarFoto = fotoPerfilUrl ? false : exigirFotoFuncionario;

    // 4. Senha provisória forte (nunca mostrada — só pra conta não ficar sem senha).
    //    O acesso de verdade é pelo LINK DE ATIVAÇÃO abaixo, onde o funcionário cria a própria senha.
    const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I/L pra evitar erro de leitura
    let senhaInicial = '';
    const arr = new Uint32Array(8);
    crypto.getRandomValues(arr);
    for (const n of arr) senhaInicial += ALFABETO[n % ALFABETO.length];
    const hashedPassword = await hash(senhaInicial, 10);

    // Link de ativação: token aleatório válido por 7 dias.
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const ativacaoToken = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('');
    const ativacaoTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const linkAtivacao = `${BASE_URL}/ativar/${ativacaoToken}`;

    // 5. JSON Parse (Jornada/Locais)
    let jornadaDados = undefined;
    if (jornadaTexto && jornadaTexto !== 'undefined') {
        try { jornadaDados = JSON.parse(jornadaTexto); } catch (e) {}
    }
    let locaisAdicionaisDados = undefined;
    if (locaisTexto && locaisTexto !== 'undefined') {
        try { locaisAdicionaisDados = JSON.parse(locaisTexto); } catch (e) {}
    }

    // 6. Criação no Banco
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        cargo: 'FUNCIONARIO',
        tituloCargo: tituloCargo || 'Colaborador',
        // @ts-ignore
        empresaId: session.user.empresaId,
        latitudeBase: latitude ? parseFloat(latitude) : 0,
        longitudeBase: longitude ? parseFloat(longitude) : 0,
        raioPermitido: raio ? parseInt(raio) : 100,
        fotoPerfilUrl,
        jornada: jornadaDados,
        pontoLivre,
        locaisAdicionais: locaisAdicionaisDados,
        deveTrocarSenha: true,
        ativacaoToken,
        ativacaoTokenExpiry,
        deveCadastrarFoto,
        deveDarCienciaCelular: exigirCienciaCelular,
        modoValidacaoPonto: modoValidacaoPontoStr as any,
        ipsPermitidos,
        telefone: telefone || null,
        cpf: cpf || null,
        pis: pis || null,
      }
    });

    // Reindexa rosto na coleção AWS (totem) — só se a empresa tem addon ativo
    if (fotoPerfilUrl) {
      reindexarRostoUsuario(novoUsuario.id).catch(err => console.error('[funcionarios POST] reindexar:', err));
    }

    // === 7. E-MAIL DE BOAS-VINDAS — leva direto pro link de ativação (1 clique) ===
    await enviarEmailSeguro(
      email,
      assuntoEmailAtivacao(nome, nomeEmpresa),
      htmlEmailAtivacao({ nome, nomeEmpresa, link: linkAtivacao, email }),
    );

    // Verifica se excedeu limite do plano
    // @ts-ignore
    const empresaId = session.user.empresaId;
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { plano: true, matrizId: true },
    });

    const planoConfig = getPlanoConfig(empresa?.plano);
    const totalFunc = await prisma.usuario.count({
      where: {
        empresaId,
        cargo: { notIn: ['ADMIN', 'SUPER_ADMIN', 'DONO'] },
      },
    });

    let avisoPlano: string | null = null;
    if (totalFunc > planoConfig.maxFuncionarios) {
      const excedentes = totalFunc - planoConfig.maxFuncionarios;
      const custoExtra = (excedentes * planoConfig.extraFuncionario).toFixed(2).replace('.', ',');
      avisoPlano = `Você tem ${excedentes} funcionário(s) acima do limite do plano ${planoConfig.nome} (${planoConfig.maxFuncionarios}). Custo adicional de R$ ${custoExtra}/mês será aplicado na próxima cobrança.`;
    }

    return NextResponse.json({ ...novoUsuario, avisoPlano, linkAtivacao });

  } catch (error) {
    console.error("Erro detalhado no POST:", error);
    return NextResponse.json({ erro: 'Erro ao criar funcionário' }, { status: 500 });
  }
}

// === PUT: ATUALIZAR FUNCIONÁRIO ===
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
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

    const telefone = formData.get('telefone') as string || '';
    const cpf = (formData.get('cpf') as string || '').replace(/\D/g, '');
    const pis = (formData.get('pis') as string || '').replace(/\D/g, '');
    const exigirFotoFuncionarioStr = formData.get('exigirFotoFuncionario');
    const exigirCienciaCelularStr = formData.get('exigirCienciaCelular');

    // === NOVOS CAMPOS (IP e MODO) ===
    const modoValidacaoPontoStr = formData.get('modoValidacaoPonto') as string || 'GPS';
    const ipsPermitidos = formData.get('ipsPermitidos') as string || '';

    const dados: any = {
      nome,
      email,
      tituloCargo,
      latitudeBase: latitude ? parseFloat(latitude) : 0,
      longitudeBase: longitude ? parseFloat(longitude) : 0,
      raioPermitido: raio ? parseInt(raio) : 100,
      pontoLivre,
      // === ATUALIZANDO NOVOS CAMPOS ===
      modoValidacaoPonto: modoValidacaoPontoStr as any,
      ipsPermitidos,
      telefone: telefone || null,
      cpf: cpf || null,
      pis: pis || null,
    };

    if (jornadaTexto && jornadaTexto !== 'undefined') {
        try { dados.jornada = JSON.parse(jornadaTexto); } catch (e) {}
    }
    if (locaisTexto && locaisTexto !== 'undefined') {
        try { dados.locaisAdicionais = JSON.parse(locaisTexto); } catch (e) {}
    }

    if (fotoArquivo && fotoArquivo.size > 0) {
      const filename = `referencia-${email.replace('@', '-')}-${Date.now()}.jpg`;
      const blob = await storagePut(filename, fotoArquivo, { access: 'public', permanente: true });
      dados.fotoPerfilUrl = blob.url;
      // Se admin enviou foto nova, não precisa mais exigir do funcionário
      dados.deveCadastrarFoto = false;
    } else if (exigirFotoFuncionarioStr !== null) {
      // Admin alterou o checkbox de exigir foto
      dados.deveCadastrarFoto = exigirFotoFuncionarioStr === 'true';
    }

    if (exigirCienciaCelularStr !== null) {
      dados.deveDarCienciaCelular = exigirCienciaCelularStr === 'true';
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dados,
    });

    // Se admin trocou a foto, reindexa na coleção AWS Rekognition (fire-and-forget)
    if (dados.fotoPerfilUrl) {
      reindexarRostoUsuario(id).catch(err => console.error('[funcionarios PUT] reindexar:', err));
    }

    return NextResponse.json(usuarioAtualizado);
  } catch (error) {
    console.error("Erro no PUT:", error);
    return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 });
  }
}

// === DELETE: EXCLUIR FUNCIONÁRIO ===
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    // Antes de deletar, captura empresaId + faceId pra limpar a coleção AWS
    const usuarioAntes = await prisma.usuario.findUnique({
      where: { id },
      select: { empresaId: true, rekognitionFaceId: true },
    });

    // Limpeza manual de dependências
    await prisma.ponto.deleteMany({ where: { usuarioId: id } }).catch(() => null);
    await prisma.solicitacaoAjuste.deleteMany({ where: { usuarioId: id } }).catch(() => null);
    await prisma.ausencia.deleteMany({ where: { usuarioId: id } }).catch(() => null);

    await prisma.usuario.delete({ where: { id } });

    // Remove rosto da coleção AWS (fire-and-forget) — evita match futuro com usuário excluído
    if (usuarioAntes?.empresaId && usuarioAntes.rekognitionFaceId) {
      removerRosto(usuarioAntes.empresaId, usuarioAntes.rekognitionFaceId)
        .catch(err => console.error('[funcionarios DELETE] removerRosto:', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no DELETE:", error);
    return NextResponse.json({ erro: 'Erro ao excluir' }, { status: 500 });
  }
}