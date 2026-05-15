import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { registrarLog } from '@/lib/logger';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const ADMIN_CARGOS = ['ADMIN', 'SUPER_ADMIN', 'DONO'] as const;
const TIPOS_VALIDOS = new Set([
  'SALARIO', 'PERICULOSIDADE', 'ADICIONAL_NOTURNO', 'HORA_EXTRA',
  'COMISSAO', 'BONUS', 'OUTROS',
]);

async function assertAdmin() {
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

function avancarMes(mes: number, ano: number): { mes: number; ano: number } {
  if (mes >= 12) return { mes: 1, ano: ano + 1 };
  return { mes: mes + 1, ano };
}

/** GET ?mes=&ano=&funcionarioId= → lista proventos no escopo */
export async function GET(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const url = new URL(req.url);
  const mes = parseInt(url.searchParams.get('mes') || '0', 10);
  const ano = parseInt(url.searchParams.get('ano') || '0', 10);
  const funcionarioId = url.searchParams.get('funcionarioId') || undefined;

  const where: any = { empresaId: ctx.empresaId };
  if (mes >= 1 && mes <= 12) where.mesReferencia = mes;
  if (ano > 0) where.anoReferencia = ano;
  if (funcionarioId) where.funcionarioId = funcionarioId;

  const proventos = await prisma.provento.findMany({
    where,
    orderBy: [{ anoReferencia: 'desc' }, { mesReferencia: 'desc' }, { criadoEm: 'desc' }],
    include: { funcionario: { select: { id: true, nome: true, fotoPerfilUrl: true } } },
  });

  return NextResponse.json({
    proventos: proventos.map(p => ({ ...p, valor: Number(p.valor) })),
  });
}

/**
 * POST cria provento(s). Body: {
 *   funcionarioId, tipo, descricao,
 *   valor: number (total entre todas as parcelas),
 *   mesReferencia, anoReferencia,
 *   parcelas?: number (>=1),
 *   observacao?: string
 * }
 */
export async function POST(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'json_invalido' }, { status: 400 });

  const funcionarioId = String(body.funcionarioId || '').trim();
  const tipo = String(body.tipo || 'OUTROS').toUpperCase();
  const descricao = String(body.descricao || '').trim();
  const valorTotal = Number(body.valor);
  const mesRefIni = parseInt(String(body.mesReferencia), 10);
  const anoRefIni = parseInt(String(body.anoReferencia), 10);
  const parcelas = Math.max(1, Math.min(60, parseInt(String(body.parcelas || 1), 10)));
  const observacao = body.observacao ? String(body.observacao).slice(0, 500) : null;

  if (!funcionarioId) return NextResponse.json({ erro: 'funcionarioId obrigatório' }, { status: 400 });
  if (!descricao) return NextResponse.json({ erro: 'descricao obrigatória' }, { status: 400 });
  if (!Number.isFinite(valorTotal) || valorTotal <= 0) return NextResponse.json({ erro: 'valor inválido' }, { status: 400 });
  if (!TIPOS_VALIDOS.has(tipo)) return NextResponse.json({ erro: 'tipo inválido' }, { status: 400 });
  if (!(mesRefIni >= 1 && mesRefIni <= 12)) return NextResponse.json({ erro: 'mesReferencia inválido' }, { status: 400 });
  if (!(anoRefIni > 2000 && anoRefIni < 3000)) return NextResponse.json({ erro: 'anoReferencia inválido' }, { status: 400 });

  const func = await prisma.usuario.findFirst({
    where: { id: funcionarioId, empresaId: ctx.empresaId },
    select: { id: true, nome: true },
  });
  if (!func) return NextResponse.json({ erro: 'Funcionário não encontrado nesta empresa' }, { status: 404 });

  const valorPorParcela = Math.round((valorTotal / parcelas) * 100) / 100;
  const loteId = parcelas > 1 ? randomUUID() : null;

  let mesAtual = mesRefIni;
  let anoAtual = anoRefIni;
  const ids: string[] = [];

  for (let i = 1; i <= parcelas; i++) {
    const novo = await prisma.provento.create({
      data: {
        empresaId: ctx.empresaId,
        funcionarioId,
        tipo,
        descricao: parcelas > 1 ? `${descricao} (${i}/${parcelas})` : descricao,
        valor: valorPorParcela,
        mesReferencia: mesAtual,
        anoReferencia: anoAtual,
        parcelaAtual: i,
        parcelaTotal: parcelas,
        loteId,
        observacao,
        criadoPorId: ctx.userId,
        criadoPorNome: ctx.userNome,
      },
    });
    ids.push(novo.id);
    const next = avancarMes(mesAtual, anoAtual);
    mesAtual = next.mes; anoAtual = next.ano;
  }

  await registrarLog({
    empresaId: ctx.empresaId,
    usuarioId: ctx.userId,
    autor: ctx.userNome,
    acao: 'PROVENTO_LANCADO',
    detalhes: `Lançou ${parcelas > 1 ? `${parcelas} parcelas de ` : ''}R$ ${valorPorParcela.toFixed(2)} (${tipo}) pra ${func.nome}: "${descricao}"`,
  });

  return NextResponse.json({ ok: true, criados: ids.length, ids, loteId });
}
