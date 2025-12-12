import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  // 1. VALIDAÇÃO PELA SESSÃO (Segurança Automática)
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'SUPER_ADMIN') {
      return NextResponse.json({ erro: 'Acesso restrito ao Super Admin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    // Não precisa mais receber masterKey
    const { nomeEmpresa, cnpj, nomeDono, emailDono, senhaInicial } = body;

    const userExistente = await prisma.usuario.findUnique({ where: { email: emailDono } });
    if (userExistente) {
      return NextResponse.json({ erro: 'Este email já possui cadastro.' }, { status: 400 });
    }

    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeEmpresa,
        cnpj: cnpj || null,
        status: 'ATIVO',
        configuracoes: { 
            bloquearForaDoRaio: true, exigirFoto: true, permitirEdicaoFunc: false, ocultarSaldoHoras: false 
        }
      }
    });

    const hashedPassword = await hash(senhaInicial, 10);

    const dono = await prisma.usuario.create({
      data: {
        nome: nomeDono, email: emailDono, senha: hashedPassword,
        cargo: 'ADMIN', empresaId: empresa.id, deveTrocarSenha: false
      }
    });

    return NextResponse.json({
      success: true,
      dados: { empresa: empresa.nome, login: dono.email, senha: senhaInicial }
    });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}