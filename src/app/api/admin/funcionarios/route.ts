import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { put } from '@vercel/blob';
import { hash } from 'bcryptjs';
import { enviarEmailSeguro } from '@/lib/email';
import { getPlanoConfig } from '@/config/planos';

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
    
    // Remove a senha antes de enviar para o front
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
    const exigirFotoFuncionario = formData.get('exigirFotoFuncionario') === 'true';

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
      const blob = await put(filename, fotoArquivo, { access: 'public' });
      fotoPerfilUrl = blob.url;
    }

    // Se admin enviou foto, não precisa exigir do funcionário
    const deveCadastrarFoto = fotoPerfilUrl ? false : exigirFotoFuncionario;

    // 4. Senha e Hash
    const senhaInicial = '1234';
    const hashedPassword = await hash(senhaInicial, 10);

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
        deveCadastrarFoto,
        modoValidacaoPonto: modoValidacaoPontoStr as any,
        ipsPermitidos,
        telefone: telefone || null,
      }
    });

    // === 7. E-MAIL PROFISSIONAL ===
    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        
        <div style="background-color: #5b21b6; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: -0.5px;">WorkID</h1>
            <p style="color: #ddd6fe; margin: 5px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Convite Oficial</p>
        </div>

        <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">Olá, <strong>${nome}</strong>! 👋</p>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px; font-size: 15px;">
                Seja bem-vindo(a) à equipe <strong>${nomeEmpresa}</strong>. <br>
                Seu cadastro no sistema de ponto digital foi realizado com sucesso.
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <p style="margin: 0 0 15px; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Suas Credenciais de Acesso</p>
                
                <div style="margin-bottom: 15px;">
                    <span style="color: #94a3b8; font-size: 13px;">Login (E-mail):</span><br>
                    <strong style="color: #1e293b; font-size: 16px;">${email}</strong>
                </div>
                
                <div>
                    <span style="color: #94a3b8; font-size: 13px;">Senha Provisória:</span><br>
                    <strong style="color: #5b21b6; font-size: 18px; letter-spacing: 1px; background: #ede9fe; padding: 2px 8px; rounded: 4px;">${senhaInicial}</strong>
                </div>
            </div>

            <div style="text-align: center; margin-bottom: 30px;">
                <a href="https://ontimeia.com/login" style="display: inline-block; background-color: #5b21b6; color: #ffffff; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(91, 33, 182, 0.3);">
                    Acessar Sistema Agora
                </a>
            </div>

            <p style="color: #6b7280; font-size: 13px; text-align: center;">
                Por segurança, recomendamos que você altere sua senha logo no primeiro acesso.
            </p>
        </div>

        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
                © 2025 WorkID • Tecnologia em Gestão<br>
                Este convite foi enviado por solicitação de <strong>${nomeEmpresa}</strong>.
            </p>
        </div>
      </div>
    `;

    await enviarEmailSeguro(email, `Bem-vindo à ${nomeEmpresa}! 🚀`, htmlEmail);

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

    return NextResponse.json({ ...novoUsuario, avisoPlano });

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
    const exigirFotoFuncionarioStr = formData.get('exigirFotoFuncionario');

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
      // Se admin enviou foto nova, não precisa mais exigir do funcionário
      dados.deveCadastrarFoto = false;
    } else if (exigirFotoFuncionarioStr !== null) {
      // Admin alterou o checkbox de exigir foto
      dados.deveCadastrarFoto = exigirFotoFuncionarioStr === 'true';
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
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    // Limpeza manual de dependências
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