import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { enviarEmailSeguro } from '@/lib/email'; 

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'SUPER_ADMIN') {
      return NextResponse.json({ erro: 'Acesso restrito ao Super Admin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nomeEmpresa, cnpj, nomeDono, emailDono, senhaInicial } = body;

    const userExistente = await prisma.usuario.findUnique({ where: { email: emailDono } });
    if (userExistente) {
      return NextResponse.json({ erro: 'Este email já possui cadastro.' }, { status: 400 });
    }

    // 1. Cria a Empresa
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

    // 2. Cria o Dono (Admin)
    const hashedPassword = await hash(senhaInicial, 10);
    const dono = await prisma.usuario.create({
      data: {
        nome: nomeDono, email: emailDono, senha: hashedPassword,
        cargo: 'ADMIN', empresaId: empresa.id, deveTrocarSenha: false
      }
    });

    // === 3. E-MAIL DE BOAS-VINDAS AO PARCEIRO (NOVO) ===
    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #5b21b6; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px;">WorkID</h1>
            <p style="color: #ddd6fe; margin: 5px 0 0; font-size: 13px; text-transform: uppercase;">Nova Conta Empresarial</p>
        </div>
        <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">Olá, <strong>${nomeDono}</strong>!</p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
                A empresa <strong>${nomeEmpresa}</strong> foi ativada com sucesso em nossa plataforma. <br>
                Você agora tem acesso total ao Painel Administrativo para gerenciar seus colaboradores.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <p style="margin: 0 0 15px; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">Credenciais de Gestor</p>
                <div style="margin-bottom: 15px;">
                    <span style="color: #94a3b8; font-size: 13px;">Login:</span><br>
                    <strong style="color: #1e293b; font-size: 16px;">${emailDono}</strong>
                </div>
                <div>
                    <span style="color: #94a3b8; font-size: 13px;">Senha Inicial:</span><br>
                    <strong style="color: #5b21b6; font-size: 18px; background: #ede9fe; padding: 2px 8px; rounded: 4px;">${senhaInicial}</strong>
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="https://ontimeia.com/login" style="display: inline-block; background-color: #5b21b6; color: #ffffff; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 50px;">Acessar Painel</a>
            </div>
        </div>
      </div>
    `;

    await enviarEmailSeguro(emailDono, 'Sua empresa foi ativada! 🚀', htmlEmail);

    return NextResponse.json({
      success: true,
      dados: { empresa: empresa.nome, login: dono.email }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}