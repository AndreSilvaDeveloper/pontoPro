import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { PLANOS } from '@/config/planos';
import { invalidateConfig } from '@/lib/configs';

export const runtime = 'nodejs';

// Janela padrão de atendimento (usada como fallback se a config ainda não existir no banco).
// Formato: { "0": null | { "inicio": 9, "fim": 18 }, ... }
const JANELAS_PADRAO = {
  '0': null,
  '1': { inicio: 9, fim: 21 },
  '2': { inicio: 9, fim: 21 },
  '3': { inicio: 9, fim: 21 },
  '4': { inicio: 9, fim: 21 },
  '5': { inicio: 9, fim: 21 },
  '6': { inicio: 9, fim: 15 },
};

const CONFIGS_PADRAO = [
  // ─── Geral ───
  { chave: 'trial.dias_padrao', valor: '14', tipo: 'numero', categoria: 'geral', descricao: 'Quantos dias dura o trial gratuito de novas empresas' },
  { chave: 'revendedor.comissao_padrao', valor: '20', tipo: 'numero', categoria: 'geral', descricao: 'Percentual de comissão padrão (%) para novos revendedores' },
  { chave: 'signup.verificar_whatsapp', valor: 'false', tipo: 'booleano', categoria: 'geral', descricao: 'Exige confirmação por código (SMS/WhatsApp) do número informado no cadastro de novos clientes' },
  { chave: 'signup.canal_whatsapp_disponivel', valor: 'false', tipo: 'booleano', categoria: 'geral', descricao: 'Permite escolher WhatsApp como canal pra receber o código no cadastro (mantenha desligado até o sender estar aprovado pela Meta)' },

  // ─── Cobrança ───
  { chave: 'cobranca.dia_vencimento_padrao', valor: '15', tipo: 'numero', categoria: 'cobranca', descricao: 'Dia do mês usado como padrão para novas empresas' },
  { chave: 'cobranca.tolerancia_dias', valor: '10', tipo: 'numero', categoria: 'cobranca', descricao: 'Dias de tolerância antes de bloquear acesso por inadimplência' },

  // ─── Agendamento ───
  { chave: 'agendamento.confirmar_automatico', valor: 'true', tipo: 'booleano', categoria: 'agendamento', descricao: 'Manda mensagem de confirmação automática quando alguém agenda uma demo' },
  { chave: 'agendamento.lembrete_1h', valor: 'true', tipo: 'booleano', categoria: 'agendamento', descricao: 'Manda lembrete 1h antes do horário marcado da demo' },
  { chave: 'agendamento.canal_default', valor: 'sms', tipo: 'texto', categoria: 'agendamento', descricao: 'Canal preferido pra confirmação/lembrete de agendamento (sms ou whatsapp)' },
  { chave: 'agendamento.antecedencia_min_min', valor: '60', tipo: 'numero', categoria: 'agendamento', descricao: 'Quantos minutos no mínimo antes do horário um lead pode agendar (evita marcação pra "daqui 5 min")' },
  { chave: 'agendamento.antecedencia_max_dias', valor: '30', tipo: 'numero', categoria: 'agendamento', descricao: 'Até quantos dias no futuro o lead pode agendar (limita "daqui 6 meses")' },
  { chave: 'agendamento.slot_duracao_min', valor: '30', tipo: 'numero', categoria: 'agendamento', descricao: 'Duração de cada slot (em minutos). Ex.: 30 gera 09:00, 09:30, 10:00…' },
  { chave: 'agendamento.feriados_bloqueados', valor: '', tipo: 'texto', categoria: 'agendamento', descricao: 'Datas (YYYY-MM-DD) bloqueadas para agendamento, separadas por vírgula. Ex.: 2026-12-25,2027-01-01' },
  { chave: 'agendamento.janelas', valor: JSON.stringify(JANELAS_PADRAO), tipo: 'json', categoria: 'agendamento', descricao: 'Dias da semana e horários em que o lead pode agendar demo (editado pela grade visual abaixo)' },

  // ─── Mensagens (templates) ───
  { chave: 'mensagem.cobranca_atraso', valor: 'Olá! Vi que sua mensalidade do WorkID está em atraso. Posso te ajudar com o pagamento?', tipo: 'texto', categoria: 'mensagens', descricao: 'WhatsApp enviado para empresas em atraso' },
  { chave: 'mensagem.trial_expirando', valor: 'Olá! Seu trial termina em {dias} dias. Quer continuar usando o WorkID?', tipo: 'texto', categoria: 'mensagens', descricao: 'Mensagem 3 dias antes do trial expirar' },
  { chave: 'mensagem.boas_vindas_admin', valor: 'Bem-vindo ao WorkID! Seu acesso foi criado. Em caso de dúvida, fale conosco.', tipo: 'texto', categoria: 'mensagens', descricao: 'Email enviado quando admin é criado' },

  // ─── Contato ───
  { chave: 'contato.telefone_principal', valor: '+5532935005492', tipo: 'texto', categoria: 'contato', descricao: 'Telefone principal exibido em landing/emails/WhatsApp (formato +55DDDNNNNNNNN)' },
  { chave: 'contato.email_suporte', valor: 'contato@workid.com.br', tipo: 'texto', categoria: 'contato', descricao: 'E-mail de suporte exibido publicamente' },
  { chave: 'contato.whatsapp_link', valor: 'https://wa.me/5532935005492', tipo: 'texto', categoria: 'contato', descricao: 'Link completo do WhatsApp Business (usado em botões "Falar conosco")' },
  { chave: 'site.url_publica', valor: 'https://workid.com.br', tipo: 'texto', categoria: 'contato', descricao: 'URL pública do site (sem barra no final)' },
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

  // Sincroniza metadados (categoria/tipo/descricao) sem sobrescrever o valor que a super admin já editou.
  // Necessário pra reagir a reclassificações (ex.: 'operacional' → 'geral') sem perder customizações.
  await Promise.all(
    CONFIGS_PADRAO.map(c =>
      (prisma as any).configSistema.upsert({
        where: { chave: c.chave },
        update: { categoria: c.categoria, tipo: c.tipo, descricao: c.descricao },
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

  // Se a config existente for do tipo json, valida o payload antes de persistir.
  if (existente?.tipo === 'json' || body.tipo === 'json') {
    try {
      JSON.parse(String(body.valor));
    } catch {
      return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });
    }
  }

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
