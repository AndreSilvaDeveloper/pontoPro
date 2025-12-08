import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs'; 

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterKey, nomeEmpresa, cnpj, nomeDono, emailDono, senhaInicial } = body;

    // 🔒 SEGURANÇA MÁXIMA: Verifica se é você mesmo
    if (masterKey !== process.env.SAAS_MASTER_KEY) {
      return NextResponse.json({ erro: 'Senha Mestra incorreta! Acesso negado.' }, { status: 401 });
    }

    // 1. Verificar se já existe email
    const existe = await prisma.usuario.findUnique({ where: { email: emailDono } });
    if (existe) {
      return NextResponse.json({ erro: 'Este email já está cadastrado no sistema.' }, { status: 400 });
    }

    // 2. Criar a Empresa
    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeEmpresa,
        cnpj: cnpj,
      }
    });

    const senhaHash = await bcrypt.hash(senhaInicial, 10); 

    // 3. Criar o Usuário Dono (Admin)
    const dono = await prisma.usuario.create({
      data: {
        nome: nomeDono,
        email: emailDono,
        senha: senhaHash, 
        cargo: 'ADMIN',
        empresaId: empresa.id,
        deveTrocarSenha: true, 
      }
    });

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Venda registrada com sucesso!',
      dados: {
        empresa: empresa.nome,
        login: dono.email,
        senha: senhaInicial
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao criar empresa.' }, { status: 500 });
  }
}