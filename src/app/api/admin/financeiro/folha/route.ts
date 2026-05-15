import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';
import { enviarPushSeguro } from '@/lib/push';

export const runtime = 'nodejs';

const ADMIN_CARGOS = ['ADMIN', 'SUPER_ADMIN', 'DONO'] as const;

type Ctx = { empresaId: string; userId: string; userNome: string };

async function assertAdmin(): Promise<Ctx | null> {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const cargo = session?.user?.cargo;
  // @ts-ignore
  const empresaId = session?.user?.empresaId as string | undefined;
  // @ts-ignore
  const userId = session?.user?.id as string | undefined;
  // @ts-ignore
  const userNome = session?.user?.name as string | undefined;
  if (!session || !empresaId || !userId || !(ADMIN_CARGOS as readonly string[]).includes(String(cargo))) {
    return null;
  }
  return { empresaId, userId, userNome: userNome || 'Admin' };
}

function toNum(d: any): number {
  return d == null ? 0 : Number(d);
}

type Provento = {
  id: string; tipo: string; descricao: string; valor: number;
  parcelaAtual: number; parcelaTotal: number;
};
type Desconto = {
  id: string; tipo: string; descricao: string;
  valorOriginal: number; percentualDesconto: number | null; valorFinal: number;
  parcelaAtual: number; parcelaTotal: number;
};

type LinhaFolha = {
  funcionario: { id: string; nome: string; fotoPerfilUrl: string | null };
  salarioBase: number; // referência fixa do funcionário
  proventos: Provento[];
  descontos: Desconto[];
  totalProventos: number;
  totalDescontos: number;
  /** Bruto = soma dos proventos do mês (NÃO usa mais salarioBase auto) */
  salarioBruto: number;
  valorLiquido: number;
  folha: {
    id: string;
    status: string;
    fechadaEm: string | null;
    pagaEm: string | null;
    comprovanteUrl: string | null;
    observacao: string | null;
    assinadoEm: string | null;
    assinaturaUrl: string | null;
    recusadoEm: string | null;
    recusadoMotivo: string | null;
  } | null;
};

/**
 * GET ?mes=&ano= — calcula a folha do mês (proventos − descontos).
 */
export async function GET(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const url = new URL(req.url);
  const mes = parseInt(url.searchParams.get('mes') || '0', 10);
  const ano = parseInt(url.searchParams.get('ano') || '0', 10);
  if (!(mes >= 1 && mes <= 12) || !(ano > 2000 && ano < 3000)) {
    return NextResponse.json({ erro: 'mes/ano obrigatórios' }, { status: 400 });
  }

  const funcionarios = await prisma.usuario.findMany({
    where: { empresaId: ctx.empresaId, cargo: 'FUNCIONARIO' },
    select: { id: true, nome: true, fotoPerfilUrl: true, salarioBase: true },
    orderBy: { nome: 'asc' },
  });

  const [proventos, descontos, folhas] = await Promise.all([
    prisma.provento.findMany({
      where: { empresaId: ctx.empresaId, mesReferencia: mes, anoReferencia: ano },
    }),
    prisma.desconto.findMany({
      where: { empresaId: ctx.empresaId, mesReferencia: mes, anoReferencia: ano },
    }),
    prisma.folhaPagamento.findMany({
      where: { empresaId: ctx.empresaId, mes, ano },
    }),
  ]);

  const proventosPorFunc = new Map<string, typeof proventos>();
  for (const p of proventos) {
    const arr = proventosPorFunc.get(p.funcionarioId) || [];
    arr.push(p);
    proventosPorFunc.set(p.funcionarioId, arr);
  }
  const descontosPorFunc = new Map<string, typeof descontos>();
  for (const d of descontos) {
    const arr = descontosPorFunc.get(d.funcionarioId) || [];
    arr.push(d);
    descontosPorFunc.set(d.funcionarioId, arr);
  }
  const folhaPorFunc = new Map(folhas.map(f => [f.funcionarioId, f]));

  let totBruto = 0, totDescontos = 0, totLiquido = 0;

  const linhas: LinhaFolha[] = funcionarios.map(f => {
    const provs = proventosPorFunc.get(f.id) || [];
    const descs = descontosPorFunc.get(f.id) || [];
    const totalProventos = provs.reduce((acc, p) => acc + toNum(p.valor), 0);
    const totalDescontos = descs.reduce((acc, d) => acc + toNum(d.valorFinal), 0);
    const salarioBruto = totalProventos; // bruto = soma proventos do mês
    const valorLiquido = Math.max(0, salarioBruto - totalDescontos);
    const folha = folhaPorFunc.get(f.id);

    totBruto += salarioBruto;
    totDescontos += totalDescontos;
    totLiquido += valorLiquido;

    return {
      funcionario: { id: f.id, nome: f.nome, fotoPerfilUrl: f.fotoPerfilUrl },
      salarioBase: toNum(f.salarioBase),
      proventos: provs.map(p => ({
        id: p.id, tipo: p.tipo, descricao: p.descricao,
        valor: toNum(p.valor),
        parcelaAtual: p.parcelaAtual, parcelaTotal: p.parcelaTotal,
      })),
      descontos: descs.map(d => ({
        id: d.id, tipo: d.tipo, descricao: d.descricao,
        valorOriginal: toNum(d.valorOriginal),
        percentualDesconto: d.percentualDesconto != null ? toNum(d.percentualDesconto) : null,
        valorFinal: toNum(d.valorFinal),
        parcelaAtual: d.parcelaAtual, parcelaTotal: d.parcelaTotal,
      })),
      totalProventos: Math.round(totalProventos * 100) / 100,
      totalDescontos: Math.round(totalDescontos * 100) / 100,
      salarioBruto: Math.round(salarioBruto * 100) / 100,
      valorLiquido: Math.round(valorLiquido * 100) / 100,
      folha: folha ? {
        id: folha.id,
        status: folha.status,
        fechadaEm: folha.fechadaEm?.toISOString() || null,
        pagaEm: folha.pagaEm?.toISOString() || null,
        comprovanteUrl: folha.comprovanteUrl,
        observacao: folha.observacao,
        assinadoEm: folha.assinadoEm?.toISOString() || null,
        assinaturaUrl: folha.assinaturaUrl,
        recusadoEm: folha.recusadoEm?.toISOString() || null,
        recusadoMotivo: folha.recusadoMotivo,
      } : null,
    };
  });

  return NextResponse.json({
    mes, ano,
    linhas,
    totais: {
      bruto: Math.round(totBruto * 100) / 100,
      descontos: Math.round(totDescontos * 100) / 100,
      liquido: Math.round(totLiquido * 100) / 100,
    },
  });
}

/**
 * POST — fecha a folha do mês. Body: {
 *   mes, ano,
 *   overrides?: { funcionarioId: string, salarioBruto: number }[]
 *     // permite admin sobrescrever o bruto final por funcionário antes de fechar
 *   funcionarioIds?: string[]   // se omitido, fecha pra todos
 * }
 */
export async function POST(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const mes = parseInt(String(body?.mes), 10);
  const ano = parseInt(String(body?.ano), 10);
  if (!(mes >= 1 && mes <= 12) || !(ano > 2000 && ano < 3000)) {
    return NextResponse.json({ erro: 'mes/ano obrigatórios' }, { status: 400 });
  }
  const idsFiltro: string[] | undefined = Array.isArray(body?.funcionarioIds) ? body.funcionarioIds : undefined;
  const overridesMap = new Map<string, number>();
  if (Array.isArray(body?.overrides)) {
    for (const o of body.overrides) {
      if (o?.funcionarioId && Number.isFinite(Number(o.salarioBruto))) {
        overridesMap.set(String(o.funcionarioId), Math.max(0, Number(o.salarioBruto)));
      }
    }
  }

  const funcionarios = await prisma.usuario.findMany({
    where: {
      empresaId: ctx.empresaId,
      cargo: 'FUNCIONARIO',
      ...(idsFiltro && idsFiltro.length > 0 ? { id: { in: idsFiltro } } : {}),
    },
    select: { id: true, nome: true, salarioBase: true },
  });

  const [proventos, descontos] = await Promise.all([
    prisma.provento.findMany({
      where: { empresaId: ctx.empresaId, mesReferencia: mes, anoReferencia: ano },
    }),
    prisma.desconto.findMany({
      where: { empresaId: ctx.empresaId, mesReferencia: mes, anoReferencia: ano },
    }),
  ]);
  const provPorFunc = new Map<string, typeof proventos>();
  for (const p of proventos) {
    const arr = provPorFunc.get(p.funcionarioId) || [];
    arr.push(p);
    provPorFunc.set(p.funcionarioId, arr);
  }
  const descPorFunc = new Map<string, typeof descontos>();
  for (const d of descontos) {
    const arr = descPorFunc.get(d.funcionarioId) || [];
    arr.push(d);
    descPorFunc.set(d.funcionarioId, arr);
  }

  let criadas = 0, atualizadas = 0, ignoradas = 0;
  const ids: string[] = [];

  for (const f of funcionarios) {
    const provs = provPorFunc.get(f.id) || [];
    const descs = descPorFunc.get(f.id) || [];
    const totalProventos = provs.reduce((acc, p) => acc + toNum(p.valor), 0);
    const totalDescontos = descs.reduce((acc, d) => acc + toNum(d.valorFinal), 0);

    const brutoCalculado = totalProventos;
    const brutoFinal = overridesMap.has(f.id)
      ? overridesMap.get(f.id)!
      : brutoCalculado;
    const valorLiquido = Math.max(0, brutoFinal - totalDescontos);

    if (brutoFinal <= 0 && totalDescontos <= 0) { ignoradas++; continue; }

    const detalhamento = {
      salarioBaseReferencia: toNum(f.salarioBase),
      brutoCalculado,
      brutoFinal,
      brutoFoiAjustado: brutoFinal !== brutoCalculado,
      proventos: provs.map(p => ({
        id: p.id, tipo: p.tipo, descricao: p.descricao,
        valor: toNum(p.valor),
        parcelaAtual: p.parcelaAtual, parcelaTotal: p.parcelaTotal,
      })),
      descontos: descs.map(d => ({
        id: d.id, tipo: d.tipo, descricao: d.descricao,
        valorOriginal: toNum(d.valorOriginal),
        percentualDesconto: d.percentualDesconto != null ? toNum(d.percentualDesconto) : null,
        valorFinal: toNum(d.valorFinal),
        parcelaAtual: d.parcelaAtual, parcelaTotal: d.parcelaTotal,
      })),
      geradaEm: new Date().toISOString(),
      versao: 2,
    };

    const existente = await prisma.folhaPagamento.findUnique({
      where: { funcionarioId_ano_mes: { funcionarioId: f.id, ano, mes } },
    });
    // Já paga ou já assinada pelo funcionário: não sobrescreve (evita invalidar a assinatura sem aviso)
    if (existente && (existente.status === 'PAGA' || existente.status === 'ASSINADA')) { ignoradas++; continue; }

    const dados = {
      salarioBruto: Math.round(brutoFinal * 100) / 100,
      totalProventos: Math.round(totalProventos * 100) / 100,
      totalDescontos: Math.round(totalDescontos * 100) / 100,
      valorLiquido: Math.round(valorLiquido * 100) / 100,
      status: 'FECHADA',
      fechadaEm: new Date(),
      detalhamento: detalhamento as any,
      // Refechar limpa qualquer contestação/assinatura anterior (ex.: após corrigir uma RECUSADA)
      assinadoEm: null,
      assinaturaUrl: null,
      ipAssinatura: null,
      userAgentAssinatura: null,
      recusadoEm: null,
      recusadoMotivo: null,
    };

    if (existente) {
      const upd = await prisma.folhaPagamento.update({
        where: { id: existente.id },
        data: dados,
      });
      ids.push(upd.id);
      atualizadas++;
    } else {
      const novo = await prisma.folhaPagamento.create({
        data: {
          empresaId: ctx.empresaId,
          funcionarioId: f.id,
          mes, ano,
          adminCriadorId: ctx.userId,
          ...dados,
        },
      });
      ids.push(novo.id);
      criadas++;
    }

    enviarPushSeguro(f.id, {
      title: 'Folha de pagamento disponível',
      body: `Sua folha de ${String(mes).padStart(2, '0')}/${ano} foi fechada. Líquido: R$ ${valorLiquido.toFixed(2)}`,
      url: '/funcionario/folha',
      tag: `folha-${f.id}-${ano}-${mes}`,
    }).catch(() => {});
  }

  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'FOLHA_FECHADA',
    detalhes: `Fechou folha de ${String(mes).padStart(2, '0')}/${ano}: ${criadas} criadas, ${atualizadas} atualizadas, ${ignoradas} ignoradas`,
  });

  return NextResponse.json({ ok: true, criadas, atualizadas, ignoradas, ids });
}

/** PATCH — marca folha como paga. Body: { folhaId, comprovanteUrl?, observacao? } */
export async function PATCH(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const folhaId = String(body?.folhaId || '');
  if (!folhaId) return NextResponse.json({ erro: 'folhaId obrigatório' }, { status: 400 });

  const folha = await prisma.folhaPagamento.findFirst({
    where: { id: folhaId, empresaId: ctx.empresaId },
    include: { funcionario: { select: { nome: true } } },
  });
  if (!folha) return NextResponse.json({ erro: 'Folha não encontrada' }, { status: 404 });

  const atualizada = await prisma.folhaPagamento.update({
    where: { id: folhaId },
    data: {
      status: 'PAGA',
      pagaEm: new Date(),
      comprovanteUrl: body?.comprovanteUrl ? String(body.comprovanteUrl).slice(0, 500) : folha.comprovanteUrl,
      observacao: body?.observacao !== undefined ? (body.observacao ? String(body.observacao).slice(0, 500) : null) : folha.observacao,
    },
  });

  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'FOLHA_PAGA',
    detalhes: `Marcou como paga a folha de ${String(folha.mes).padStart(2, '0')}/${folha.ano} de ${folha.funcionario?.nome || 'funcionário'} — R$ ${Number(folha.valorLiquido).toFixed(2)}`,
  });

  return NextResponse.json({ ok: true, folha: { id: atualizada.id, status: atualizada.status, pagaEm: atualizada.pagaEm } });
}
