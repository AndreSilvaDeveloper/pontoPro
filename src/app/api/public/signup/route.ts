// src/app/api/public/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PLANOS, PLANO_DEFAULT, type PlanoId } from "@/config/planos";
import { validarCNPJ } from "@/utils/cnpj";
import { notificarLead } from "@/lib/leadAlert";

export const runtime = "nodejs";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

const MS_DAY = 24 * 60 * 60 * 1000;
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_DAY);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const empresaNome = String(body?.empresaNome || "").trim();
    const cnpjRaw = String(body?.cnpj || "").trim();
    const cnpj = cnpjRaw ? onlyDigits(cnpjRaw) : "";
    const adminNome = String(body?.adminNome || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const telefoneRaw = String(body?.telefone || "").trim();
    const telefone = telefoneRaw ? onlyDigits(telefoneRaw) : "";
    const aceitarTermos = Boolean(body?.aceitarTermos);
    const planoRaw = String(body?.plano || "").trim().toUpperCase();
    const plano: PlanoId = (planoRaw in PLANOS ? planoRaw : PLANO_DEFAULT) as PlanoId;

    if (!empresaNome || empresaNome.length < 2) {
      return NextResponse.json(
        { ok: false, erro: "Informe o nome da empresa." },
        { status: 400 }
      );
    }
    if (!adminNome || adminNome.length < 2) {
      return NextResponse.json(
        { ok: false, erro: "Informe seu nome." },
        { status: 400 }
      );
    }
    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, erro: "E-mail inválido." },
        { status: 400 }
      );
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, erro: "A senha deve ter no mínimo 8 caracteres." },
        { status: 400 }
      );
    }
    if (!aceitarTermos) {
      return NextResponse.json(
        { ok: false, erro: "Você precisa aceitar os termos." },
        { status: 400 }
      );
    }
    if (cnpj && !validarCNPJ(cnpj)) {
      return NextResponse.json(
        {
          ok: false,
          erro: "CNPJ inválido. Verifique os dígitos ou deixe em branco.",
        },
        { status: 400 }
      );
    }
    if (telefone && (telefone.length < 10 || telefone.length > 11)) {
      return NextResponse.json(
        { ok: false, erro: "Telefone inválido. Informe 10 ou 11 dígitos." },
        { status: 400 }
      );
    }

    const senhaHash = await bcrypt.hash(password, 10);

    // ✅ Trial de 14 dias + 1ª fatura vence 1 dia após o fim do trial (15 dias após criação)
    const agora = new Date();
    const trialAte = addDays(agora, 14);
    const primeiraFaturaVenceEm = addDays(trialAte, 1);

    const result = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: {
          nome: empresaNome,
          cnpj: cnpj || null,
          status: "ATIVO",
          configuracoes: {
            bloquearForaDoRaio: true,
            exigirFoto: true,
            permitirEdicaoFunc: false,
            ocultarSaldoHoras: false,
          },
          intervaloPago: false,
          fluxoEstrito: true,

          // ✅ plano escolhido no signup
          plano,

          // ✅ cobrança
          cobrancaAtiva: true,
          trialAte,
          pagoAte: null,

          // ✅ novo fluxo: vencimento real controlado por anchor
          billingAnchorAt: primeiraFaturaVenceEm,

          // mantém default, mas não vamos depender dele para o primeiro ciclo
          diaVencimento: 15,
          cobrancaWhatsapp: telefone || null,
        } as any,
      });

      const usuario = await tx.usuario.create({
        data: {
          nome: adminNome,
          email,
          senha: senhaHash,
          cargo: "ADMIN",
          empresaId: empresa.id,
          deveTrocarSenha: false,
          telefone: telefone || null,
        } as any,
      });

      return { empresaId: empresa.id, usuarioId: usuario.id };
    });

    // Analytics: rastrear signup completo
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    prisma.analitico.upsert({
      where: { data: hoje },
      create: { data: hoje, signups: 1 },
      update: { signups: { increment: 1 } },
    }).catch(() => {});

    // Persiste em Lead também (para CRM/funil único)
    prisma.lead.create({
      data: {
        origem: 'SIGNUP',
        nome: adminNome,
        email,
        whatsapp: telefone || null,
        empresa: empresaNome,
        status: 'CONVERTIDO', // signup já é conversão
        dadosExtras: { plano, empresaId: result.empresaId, usuarioId: result.usuarioId },
      },
    }).catch(err => console.error('[signup] lead.create falhou:', err));

    // Alerta admin em tempo real
    notificarLead({
      origem: 'SIGNUP',
      nome: adminNome,
      email,
      whatsapp: telefone || null,
      empresa: empresaNome,
      detalhes: { Plano: plano },
    }).catch(err => console.error('[signup] notificarLead falhou:', err));

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const target = Array.isArray(e?.meta?.target)
        ? e.meta.target.join(",")
        : String(e?.meta?.target || "");

      const msg = target.includes("email")
        ? "Este e-mail já está em uso."
        : target.includes("cnpj")
          ? "Este CNPJ já está cadastrado."
          : "Já existe cadastro com esses dados.";

      return NextResponse.json({ ok: false, erro: msg }, { status: 409 });
    }

    console.error("signup error:", e);
    return NextResponse.json(
      { ok: false, erro: "Erro interno ao cadastrar." },
      { status: 500 }
    );
  }
}
