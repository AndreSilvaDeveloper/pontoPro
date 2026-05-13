// src/app/api/saas/criar-empresa/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { enviarEmailSeguro } from "@/lib/email";
import { validarCNPJ } from "@/utils/cnpj";
import { BASE_URL } from "@/config/site";
import { criarNotificacaoSuperAdmin } from "@/lib/notificacaoSuperAdmin";

export const runtime = "nodejs";

const MS_DAY = 24 * 60 * 60 * 1000;
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_DAY);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session || session.user.cargo !== "SUPER_ADMIN") {
    return NextResponse.json(
      { erro: "Acesso restrito ao Super Admin" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { nomeEmpresa, cnpj, nomeDono, emailDono, plano, leadId } = body;

    if (cnpj && !validarCNPJ(String(cnpj))) {
      return NextResponse.json({ erro: "CNPJ inválido." }, { status: 400 });
    }

    const userExistente = await prisma.usuario.findUnique({
      where: { email: emailDono },
    });
    if (userExistente) {
      return NextResponse.json(
        { erro: "Este email já possui cadastro." },
        { status: 400 }
      );
    }

    // ✅ Trial 14 dias + 1ª fatura 30 dias depois do trial (44 dias após criação)
    const agora = new Date();
    const trialAte = addDays(agora, 14);
    const primeiraFaturaVenceEm = addDays(trialAte, 30);

    // 1) Cria a Empresa (já com cobrança configurada)
    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeEmpresa,
        cnpj: cnpj || null,
        status: "ATIVO",
        configuracoes: {
          bloquearForaDoRaio: true,
          exigirFoto: true,
          permitirEdicaoFunc: false,
          ocultarSaldoHoras: false,
        },

        // ✅ defaults do SaaS
        intervaloPago: false,
        fluxoEstrito: true,

        // ✅ cobrança / trial
        cobrancaAtiva: true,
        trialAte,
        pagoAte: null,

        // ✅ vencimento oficial do ciclo (1ª fatura)
        billingAnchorAt: primeiraFaturaVenceEm,

        // mantém por compatibilidade (não é mais fonte principal)
        diaVencimento: 15,

        // plano selecionado na venda
        plano: plano || "PROFESSIONAL",
      } as any,
    });

    // 2) Cria o Dono (Admin) — sem senha definida ainda: ele cria a própria
    //    pelo link de ativação. A senha provisória é aleatória e nunca é mostrada.
    const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const arr = new Uint32Array(8);
    crypto.getRandomValues(arr);
    let senhaProvisoria = '';
    for (const n of arr) senhaProvisoria += ALFABETO[n % ALFABETO.length];
    const hashedPassword = await hash(senhaProvisoria, 10);

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const ativacaoToken = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('');
    const ativacaoTokenExpiry = new Date(agora.getTime() + 7 * MS_DAY);
    const linkAtivacao = `${BASE_URL}/ativar/${ativacaoToken}`;

    const dono = await prisma.usuario.create({
      data: {
        nome: nomeDono,
        email: emailDono,
        senha: hashedPassword,
        cargo: "ADMIN",
        empresaId: empresa.id,
        deveTrocarSenha: false,
        ativacaoToken,
        ativacaoTokenExpiry,
      } as any,
    });

    // 3) E-mail de boas-vindas — leva direto pro link onde o gestor cria a senha
    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #5b21b6; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px;">WorkID</h1>
            <p style="color: #ddd6fe; margin: 5px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Sua conta está pronta</p>
        </div>
        <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 18px; margin-bottom: 20px;">Olá, <strong>${nomeDono}</strong>! 👋</p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 28px; font-size: 15px;">
                A conta da empresa <strong>${nomeEmpresa}</strong> foi criada na WorkID. Para começar a usar, é só
                clicar no botão abaixo e criar a sua senha de acesso ao painel.<br><br>
                Seu período de teste é de <strong>14 dias</strong> e a <strong>primeira fatura</strong> vence 30 dias depois do fim do teste.
            </p>
            <div style="text-align: center; margin-bottom: 28px;">
                <a href="${linkAtivacao}" style="display: inline-block; background-color: #5b21b6; color: #ffffff; font-weight: bold; text-decoration: none; padding: 16px 44px; border-radius: 50px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(91, 33, 182, 0.3);">
                    Criar minha senha e entrar
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; text-align: center; margin-bottom: 24px;">
                Se o botão não funcionar, copie e cole este endereço no navegador:<br>
                <span style="color: #5b21b6; word-break: break-all;">${linkAtivacao}</span>
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px;">
                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.6;">
                    Este link vale por <strong>7 dias</strong> e só pode ser usado uma vez. Depois disso, é só entrar em
                    <strong>${BASE_URL.replace(/^https?:\/\//, '')}/login</strong> com o e-mail (<strong>${emailDono}</strong>) e a senha que você criou.
                </p>
            </div>
        </div>
      </div>
    `;

    await enviarEmailSeguro(emailDono, `${nomeDono}, ative o acesso da ${nomeEmpresa} 🚀`, htmlEmail);

    criarNotificacaoSuperAdmin({
      tipo: 'NOVA_VENDA',
      titulo: `Nova venda registrada: ${empresa.nome}`,
      mensagem: `Plano ${empresa.plano || 'PROFESSIONAL'} · Trial até ${trialAte.toLocaleDateString('pt-BR')} · 1ª fatura ${primeiraFaturaVenceEm.toLocaleDateString('pt-BR')}`,
      url: `/saas/${empresa.id}`,
      prioridade: 'ALTA',
      metadata: { empresaId: empresa.id, plano: empresa.plano, donoEmail: emailDono },
    });

    // Conversão automática Lead → Cliente: se a venda partiu de um lead conhecido,
    // marca como CONVERTIDO e fecha agendamentos pendentes/confirmados como REALIZADO.
    if (leadId) {
      try {
        await prisma.$transaction([
          prisma.lead.update({
            where: { id: String(leadId) },
            data: { status: 'CONVERTIDO' },
          }),
          prisma.agendamento.updateMany({
            where: {
              leadId: String(leadId),
              status: { in: ['PENDENTE', 'CONFIRMADO'] },
            },
            data: {
              status: 'REALIZADO',
              alteradoPor: 'criar-empresa',
              alteradoEm: new Date(),
            },
          }),
        ]);
      } catch (e) {
        console.error('[criar-empresa] falha ao converter lead:', e);
      }
    }

    return NextResponse.json({
      success: true,
      dados: { empresa: empresa.nome, login: dono.email },
      linkAtivacao,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
