// src/app/api/public/signup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { PLANOS, PLANO_DEFAULT, type PlanoId } from "@/config/planos";
import { validarCNPJ } from "@/utils/cnpj";
import { notificarLead } from "@/lib/leadAlert";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

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
  // Rate-limit: máx 3 signups por IP em 15 minutos (signup é mais caro)
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `signup:${ip}`, max: 3, windowMs: 15 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, erro: 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } }
    );
  }

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
    if (!telefone || telefone.length < 10 || telefone.length > 11) {
      return NextResponse.json(
        { ok: false, erro: "Informe um WhatsApp válido (DDD + número)." },
        { status: 400 }
      );
    }

    // Verificação de WhatsApp (se ligada no painel /saas/configuracoes)
    {
      const { getConfigBoolean, CONFIGS } = await import('@/lib/configs');
      const exigirVerif = await getConfigBoolean(CONFIGS.SIGNUP_VERIFICAR_WHATSAPP, false);
      if (exigirVerif) {
        const { isTelefoneValidado, consumirValidacao } = await import('@/lib/whatsappVerification');
        if (!isTelefoneValidado(telefone)) {
          return NextResponse.json(
            { ok: false, erro: 'Confirme seu WhatsApp pelo código antes de finalizar o cadastro.' },
            { status: 400 }
          );
        }
        consumirValidacao(telefone);
      }
    }

    const senhaHash = await bcrypt.hash(password, 10);

    // ✅ Cupom (opcional) — valida antes de criar a empresa
    const codigoCupomRaw = String(body?.cupom || '').trim().toUpperCase();
    let cupomValido: any = null;
    let trialBonusDias = 0;
    if (codigoCupomRaw) {
      const { validarCupom } = await import('@/lib/cupons');
      const r = await validarCupom(codigoCupomRaw, { plano, ciclo: 'MONTHLY' });
      if (r.ok) {
        cupomValido = r.cupom;
        if (r.cupom.tipo === 'TRIAL_ESTENDIDO') trialBonusDias = r.cupom.valor;
      }
      // Cupom inválido: ignora silenciosamente em vez de bloquear o signup
    }

    // ✅ Trial — lê das configs (default 14) + bonus se cupom TRIAL_ESTENDIDO
    const { getConfigNumber, CONFIGS } = await import('@/lib/configs');
    const trialDiasPadrao = await getConfigNumber(CONFIGS.TRIAL_DIAS_PADRAO, 14);
    const diaVencimentoPadrao = await getConfigNumber(CONFIGS.COBRANCA_DIA_VENCIMENTO, 15);
    const agora = new Date();
    const trialAte = addDays(agora, trialDiasPadrao + trialBonusDias);
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
          diaVencimento: diaVencimentoPadrao,
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

      // Aplica cupom (se válido) registrando CupomUso. Não falha se der erro.
      if (cupomValido) {
        try {
          const parcelasMax = cupomValido.duracaoMeses === -1 ? 9999 : cupomValido.duracaoMeses;
          await tx.cupomUso.create({
            data: {
              cupomId: cupomValido.id,
              empresaId: empresa.id,
              parcelasAplicadas: 0,
              parcelasMax,
            },
          });
          await tx.cupom.update({
            where: { id: cupomValido.id },
            data: { usos: { increment: 1 } },
          });
        } catch {}
      }

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
      {
        ok: false,
        erro: 'Não foi possível concluir o cadastro agora. Verifique os dados ou tente novamente em alguns minutos. Se persistir, fale com o suporte.',
      },
      { status: 500 }
    );
  }
}
