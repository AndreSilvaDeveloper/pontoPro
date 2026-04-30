import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { gerarSnapshotFechamento } from '@/lib/admin/snapshotFechamento';
import { enviarPushSeguro } from '@/lib/push';

export const runtime = 'nodejs';

// GET — lista fechamentos da empresa do admin
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string;

  const { searchParams } = new URL(req.url);
  const funcionarioId = searchParams.get('funcionarioId');
  const status = searchParams.get('status');

  const where: any = { empresaId };
  if (funcionarioId) where.funcionarioId = funcionarioId;
  if (status) where.status = status;

  const fechamentos = await prisma.fechamento.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      status: true,
      periodoInicio: true,
      periodoFim: true,
      criadoEm: true,
      assinadoEm: true,
      recusadoEm: true,
      recusadoMotivo: true,
      funcionario: { select: { id: true, nome: true, tituloCargo: true } },
      adminCriador: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json(fechamentos);
}

// POST — cria fechamento + dispara push pro funcionário
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }
  // @ts-ignore
  const empresaId = session.user.empresaId as string;
  // @ts-ignore
  const adminId = session.user.id as string;

  try {
    const body = await req.json();
    const { funcionarioId, periodoInicio, periodoFim } = body;

    if (!funcionarioId || !periodoInicio || !periodoFim) {
      return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodoInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(periodoFim)) {
      return NextResponse.json({ erro: 'Datas em formato inválido' }, { status: 400 });
    }
    if (periodoFim < periodoInicio) {
      return NextResponse.json({ erro: 'Data final anterior ao início' }, { status: 400 });
    }

    // garante que funcionário pertence à empresa do admin
    const funcionario = await prisma.usuario.findFirst({
      where: { id: funcionarioId, empresaId },
      select: { id: true, nome: true },
    });
    if (!funcionario) {
      return NextResponse.json({ erro: 'Funcionário não encontrado nesta empresa' }, { status: 404 });
    }

    // bloqueia duplicação: já existe fechamento PENDENTE pra esse funcionário no mesmo período?
    const periodoIni = new Date(periodoInicio + 'T00:00:00');
    const periodoFimDt = new Date(periodoFim + 'T23:59:59.999');
    const existente = await prisma.fechamento.findFirst({
      where: {
        funcionarioId,
        status: 'PENDENTE',
        periodoInicio: periodoIni,
        periodoFim: periodoFimDt,
      },
    });
    if (existente) {
      return NextResponse.json({ erro: 'Já existe fechamento pendente para esse funcionário neste período' }, { status: 409 });
    }

    const snapshot = await gerarSnapshotFechamento(empresaId, funcionarioId, periodoInicio, periodoFim);

    const fechamento = await prisma.fechamento.create({
      data: {
        empresaId,
        funcionarioId,
        adminCriadorId: adminId,
        periodoInicio: periodoIni,
        periodoFim: periodoFimDt,
        status: 'PENDENTE',
        snapshot: snapshot as any,
      },
    });

    // push fire-and-forget
    enviarPushSeguro(funcionarioId, {
      title: 'Fechamento de ponto pra assinar',
      body: `Período de ${formatBR(periodoInicio)} a ${formatBR(periodoFim)} aguardando sua confirmação.`,
      url: '/funcionario/fechamentos',
      tag: `fechamento-${fechamento.id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, id: fechamento.id });
  } catch (err: any) {
    console.error('[fechamentos POST]', err);
    return NextResponse.json({ erro: err?.message || 'Erro ao criar fechamento' }, { status: 500 });
  }
}

function formatBR(s: string): string {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
