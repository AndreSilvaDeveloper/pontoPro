import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { enviarEmailSeguro } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { empresaId, nome, email, senha } = await req.json();

    // 1. Busca o nome da empresa para usar no e-mail
    const empresa = await prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { nome: true }
    });
    const nomeEmpresa = empresa?.nome || 'Sua Empresa';

    // 2. Verifica existência
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return NextResponse.json({ erro: 'Email já cadastrado no sistema.' }, { status: 400 });
    }

    // 3. Cria Usuário
    const hashedPassword = await hash(senha, 10);
    const novoAdmin = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        cargo: 'ADMIN',
        empresaId: empresaId
      }
    });

    // === 4. E-MAIL DE CONVITE ADMINISTRATIVO ===
    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #4338ca; padding: 30px; text-align: center;"> <h1 style="color: #ffffff; margin: 0; font-size: 26px;">WorkID</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0; font-size: 13px; text-transform: uppercase;">Acesso Administrativo</p>
        </div>
        <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">Olá, <strong>${nome}</strong>!</p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
                Você foi adicionado como <strong>Administrador</strong> na conta da empresa <strong>${nomeEmpresa}</strong>. <br>
                Isso lhe dá permissão para gerenciar funcionários e visualizar relatórios.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
                <p style="margin: 0 0 15px; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">Seus Dados de Acesso</p>
                <div style="margin-bottom: 15px;">
                    <span style="color: #94a3b8; font-size: 13px;">Email:</span><br>
                    <strong style="color: #1e293b; font-size: 16px;">${email}</strong>
                </div>
                <div>
                    <span style="color: #94a3b8; font-size: 13px;">Senha Provisória:</span><br>
                    <strong style="color: #4338ca; font-size: 18px; background: #e0e7ff; padding: 2px 8px; rounded: 4px;">${senha}</strong>
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 30px;">
                <a href="https://ontimeia.com/admin" style="display: inline-block; background-color: #4338ca; color: #ffffff; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 50px;">Acessar Gestão</a>
            </div>
        </div>
      </div>
    `;

    await enviarEmailSeguro(email, `Convite Admin: ${nomeEmpresa}`, htmlEmail);

    return NextResponse.json(novoAdmin);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao criar admin.' }, { status: 500 });
  }
}