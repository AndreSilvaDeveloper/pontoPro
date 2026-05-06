import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { PLANOS } from '@/config/planos';
import { invalidateConfig } from '@/lib/configs';

export const runtime = 'nodejs';

const CONFIGS_PADRAO = [
  // Operacional
  { chave: 'trial.dias_padrao', valor: '14', tipo: 'numero', categoria: 'operacional', descricao: 'Quantos dias dura o trial gratuito de novas empresas' },
  { chave: 'cobranca.dia_vencimento_padrao', valor: '15', tipo: 'numero', categoria: 'operacional', descricao: 'Dia do mês usado como padrão para novas empresas' },
  { chave: 'cobranca.tolerancia_dias', valor: '10', tipo: 'numero', categoria: 'operacional', descricao: 'Dias de tolerância antes de bloquear acesso por inadimplência' },
  { chave: 'revendedor.comissao_padrao', valor: '20', tipo: 'numero', categoria: 'operacional', descricao: 'Percentual de comissão padrão (%) para novos revendedores' },

  // Mensagens (templates)
  { chave: 'mensagem.cobranca_atraso', valor: 'Olá! Vi que sua mensalidade do WorkID está em atraso. Posso te ajudar com o pagamento?', tipo: 'texto', categoria: 'mensagens', descricao: 'WhatsApp enviado para empresas em atraso' },
  { chave: 'mensagem.trial_expirando', valor: 'Olá! Seu trial termina em {dias} dias. Quer continuar usando o WorkID?', tipo: 'texto', categoria: 'mensagens', descricao: 'Mensagem 3 dias antes do trial expirar' },
  { chave: 'mensagem.boas_vindas_admin', valor: 'Bem-vindo ao WorkID! Seu acesso foi criado. Em caso de dúvida, fale conosco.', tipo: 'texto', categoria: 'mensagens', descricao: 'Email enviado quando admin é criado' },
];

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return {
    ok: (session?.user as any)?.cargo === 'SUPER_ADMIN',
    userId: (session?.user as any)?.id as string | undefined,
    userName: (session?.user as any)?.name as string | undefined,
  };
}

export async function GET() {
  const auth = await isSuperAdmin();
  if (!auth.ok) return NextResponse.json({ erro: 'forbidden' }, { status: 403 });

  // Garante que as configs padrão existam (só insere se não existirem)
  await Promise.all(
    CONFIGS_PADRAO.map(c =>
      (prisma as any).configSistema.upsert({
        where: { chave: c.chave },
        update: {},
        create: c,
      })
    )
  );

  const configs = await (prisma as any).configSistema.findMany({
    orderBy: [{ categoria: 'asc' }, { chave: 'asc' }],
  });

  const empresasNegociadas = await prisma.empresa.findMany({
    where: { precoNegociado: { not: null } },
    select: {
      id: true,
      nome: true,
      plano: true,
      precoNegociado: true,
      precoNegociadoMotivo: true,
      precoNegociadoExpiraEm: true,
    },
    orderBy: { nome: 'asc' },
  });

  return NextResponse.json({
    configs,
    planos: Object.values(PLANOS),
    empresasNegociadas: empresasNegociadas.map(e => ({
      ...e,
      precoNegociado: e.precoNegociado ? Number(e.precoNegociado) : null,
    })),
  });
}

export async function PUT(req: Request) {
  const auth = await isSuperAdmin();
  if (!auth.ok) return NextResponse.json({ erro: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.chave || body.valor == null) {
    return NextResponse.json({ erro: 'chave_e_valor_obrigatorios' }, { status: 400 });
  }

  const existente = await (prisma as any).configSistema.findUnique({
    where: { chave: String(body.chave) },
  });

  const atualizado = await (prisma as any).configSistema.upsert({
    where: { chave: String(body.chave) },
    update: { valor: String(body.valor) },
    create: {
      chave: String(body.chave),
      valor: String(body.valor),
      tipo: body.tipo || 'texto',
      categoria: body.categoria || 'geral',
      descricao: body.descricao || null,
    },
  });

  invalidateConfig(String(body.chave));

  if (existente && existente.valor !== String(body.valor)) {
    await prisma.logAuditoria.create({
      data: {
        acao: 'CONFIG_ALTERADA',
        detalhes: `Config "${body.chave}": ${existente.valor} → ${body.valor}`,
        adminNome: auth.userName || 'Super Admin',
        adminId: auth.userId || 'desconhecido',
        empresaId: 'SEM_EMPRESA',
      },
    });
  }

  return NextResponse.json({ ok: true, config: atualizado });
}
