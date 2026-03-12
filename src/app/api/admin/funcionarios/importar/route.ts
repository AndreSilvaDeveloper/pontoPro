import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { hash } from 'bcryptjs';
import { enviarEmailSeguro } from '@/lib/email';

interface FuncionarioImport {
  nome: string;
  email: string;
  telefone?: string;
  cargo?: string;
  horario?: string; // "08:00-12:00/13:00-17:00"
  sabado?: string;  // "08:00-12:00"
}

function parseHorario(horario: string): any | null {
  if (!horario || !horario.trim()) return null;

  // Formato: "08:00-12:00/13:00-17:00" ou "08:00-12:00" (contínuo)
  const blocos = horario.trim().split('/');

  if (blocos.length === 1) {
    // Jornada contínua: "06:00-12:00"
    const [e1, s2] = blocos[0].split('-').map(s => s.trim());
    if (!e1 || !s2) return null;
    return { e1, s1: '', e2: '', s2, ativo: true };
  }

  if (blocos.length === 2) {
    const [e1, s1] = blocos[0].split('-').map(s => s.trim());
    const [e2, s2] = blocos[1].split('-').map(s => s.trim());
    if (!e1 || !s1 || !e2 || !s2) return null;
    return { e1, s1, e2, s2, ativo: true };
  }

  return null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { funcionarios, apenasValidar } = await request.json() as {
      funcionarios: FuncionarioImport[];
      apenasValidar?: boolean;
    };

    if (!Array.isArray(funcionarios) || funcionarios.length === 0) {
      return NextResponse.json({ erro: 'Lista vazia.' }, { status: 400 });
    }

    if (funcionarios.length > 200) {
      return NextResponse.json({ erro: 'Máximo de 200 funcionários por importação.' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId;
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nome: true },
    });
    const nomeEmpresa = empresa?.nome || 'Sua Empresa';

    // Busca emails já existentes na empresa
    const emailsExistentes = new Set(
      (await prisma.usuario.findMany({
        where: { empresaId },
        select: { email: true },
      })).map(u => u.email.toLowerCase())
    );

    // Validação
    const resultados: Array<{
      linha: number;
      nome: string;
      email: string;
      valido: boolean;
      erro?: string;
    }> = [];

    const emailsNaImportacao = new Set<string>();

    for (let i = 0; i < funcionarios.length; i++) {
      const f = funcionarios[i];
      const linha = i + 1;
      const nome = (f.nome || '').trim();
      const email = (f.email || '').trim().toLowerCase();

      if (!nome) {
        resultados.push({ linha, nome, email, valido: false, erro: 'Nome obrigatório' });
        continue;
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        resultados.push({ linha, nome, email, valido: false, erro: 'Email inválido' });
        continue;
      }
      if (emailsExistentes.has(email)) {
        resultados.push({ linha, nome, email, valido: false, erro: 'Email já cadastrado' });
        continue;
      }
      if (emailsNaImportacao.has(email)) {
        resultados.push({ linha, nome, email, valido: false, erro: 'Email duplicado na planilha' });
        continue;
      }

      emailsNaImportacao.add(email);
      resultados.push({ linha, nome, email, valido: true });
    }

    // Se é apenas validação, retorna sem criar
    if (apenasValidar) {
      return NextResponse.json({
        total: resultados.length,
        validos: resultados.filter(r => r.valido).length,
        invalidos: resultados.filter(r => !r.valido).length,
        resultados,
      });
    }

    // Criação dos válidos
    const senhaInicial = '1234';
    const hashedPassword = await hash(senhaInicial, 10);

    const jornadaPadrao = {
      seg: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
      ter: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
      qua: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
      qui: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
      sex: { e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ativo: true },
      sab: { e1: '08:00', s1: '12:00', e2: '', s2: '', ativo: false },
      dom: { e1: '', s1: '', e2: '', s2: '', ativo: false },
    };

    let criados = 0;
    const errosCriacao: string[] = [];

    for (let i = 0; i < funcionarios.length; i++) {
      const r = resultados[i];
      if (!r.valido) continue;

      const f = funcionarios[i];
      const nome = f.nome.trim();
      const email = f.email.trim().toLowerCase();
      const telefone = (f.telefone || '').replace(/\D/g, '') || null;
      const tituloCargo = (f.cargo || '').trim() || 'Colaborador';

      // Monta jornada a partir do horário
      let jornada: any = { ...jornadaPadrao };
      const horarioParsed = parseHorario(f.horario || '');
      if (horarioParsed) {
        ['seg', 'ter', 'qua', 'qui', 'sex'].forEach(dia => {
          jornada[dia] = { ...horarioParsed };
        });
      }

      // Sábado
      const sabadoParsed = parseHorario(f.sabado || '');
      if (sabadoParsed) {
        jornada.sab = { ...sabadoParsed, ativo: true };
      }

      try {
        await prisma.usuario.create({
          data: {
            nome,
            email,
            senha: hashedPassword,
            cargo: 'FUNCIONARIO',
            tituloCargo,
            empresaId,
            latitudeBase: 0,
            longitudeBase: 0,
            raioPermitido: 100,
            jornada,
            pontoLivre: false,
            deveTrocarSenha: true,
            deveCadastrarFoto: true,
            deveDarCienciaCelular: true,
            modoValidacaoPonto: 'GPS',
            telefone,
          },
        });

        criados++;

        // Envia email de boas-vindas (fire-and-forget)
        const htmlEmail = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #5b21b6; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px;">WorkID</h1>
              <p style="color: #ddd6fe; margin: 5px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Convite Oficial</p>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">Olá, <strong>${nome}</strong>!</p>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px; font-size: 15px;">
                Seja bem-vindo(a) à equipe <strong>${nomeEmpresa}</strong>.<br>
                Seu cadastro no sistema de ponto digital foi realizado com sucesso.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <p style="margin: 0 0 15px; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">Suas Credenciais</p>
                <div style="margin-bottom: 15px;">
                  <span style="color: #94a3b8; font-size: 13px;">Login:</span><br>
                  <strong style="color: #1e293b; font-size: 16px;">${email}</strong>
                </div>
                <div>
                  <span style="color: #94a3b8; font-size: 13px;">Senha Provisória:</span><br>
                  <strong style="color: #5b21b6; font-size: 18px;">${senhaInicial}</strong>
                </div>
              </div>
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="https://ontimeia.com/login" style="display: inline-block; background-color: #5b21b6; color: #ffffff; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px;">
                  Acessar Sistema
                </a>
              </div>
            </div>
          </div>
        `;
        enviarEmailSeguro(email, `Bem-vindo à ${nomeEmpresa}!`, htmlEmail);
      } catch (err: any) {
        errosCriacao.push(`${nome}: ${err.message || 'Erro desconhecido'}`);
      }
    }

    return NextResponse.json({
      criados,
      total: resultados.length,
      validos: resultados.filter(r => r.valido).length,
      invalidos: resultados.filter(r => !r.valido).length,
      errosCriacao,
      resultados,
    });
  } catch (error: any) {
    console.error('Erro na importação:', error);
    return NextResponse.json({ erro: 'Erro interno na importação.' }, { status: 500 });
  }
}
