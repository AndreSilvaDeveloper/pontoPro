import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return {
    ok: (session?.user as any)?.cargo === 'SUPER_ADMIN',
    userId: (session?.user as any)?.id as string | undefined,
    userName: (session?.user as any)?.name as string | undefined,
  };
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await isSuperAdmin();
  if (!auth.ok) return NextResponse.json({ erro: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: 'body_invalido' }, { status: 400 });

  const existente = await (prisma as any).cupom.findUnique({ where: { id } });
  if (!existente) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  // Não permite trocar código (usado em links externos) — só os outros campos
  const camposAtualizaveis = [
    'nome', 'descricao', 'valor', 'duracaoMeses', 'ativo', 'visivelLanding',
    'destaque', 'validoDe', 'validoAte', 'maxUsos',
    'apenasNovos', 'apenasPlanos', 'apenasCiclo',
  ];

  const data: Record<string, any> = {};
  for (const c of camposAtualizaveis) {
    if (c in body) {
      if ((c === 'validoDe' || c === 'validoAte') && body[c]) data[c] = new Date(body[c]);
      else if ((c === 'validoDe' || c === 'validoAte') && !body[c]) data[c] = null;
      else if (c === 'maxUsos') data[c] = body[c] ? Number(body[c]) : null;
      else data[c] = body[c];
    }
  }

  const cupom = await (prisma as any).cupom.update({ where: { id }, data });

  // Loga só mudança de status (ligar/desligar) ou alteração de valor
  if (existente.ativo !== cupom.ativo) {
    await prisma.logAuditoria.create({
      data: {
        acao: cupom.ativo ? 'CUPOM_ATIVADO' : 'CUPOM_DESATIVADO',
        detalhes: `Cupom ${cupom.codigo}`,
        adminNome: auth.userName || 'Super Admin',
        adminId: auth.userId || 'desconhecido',
        empresaId: 'SEM_EMPRESA',
      },
    });
  } else if (Number(existente.valor) !== Number(cupom.valor)) {
    await prisma.logAuditoria.create({
      data: {
        acao: 'CUPOM_ALTERADO',
        detalhes: `Cupom ${cupom.codigo}: valor ${existente.valor} → ${cupom.valor}`,
        adminNome: auth.userName || 'Super Admin',
        adminId: auth.userId || 'desconhecido',
        empresaId: 'SEM_EMPRESA',
      },
    });
  }

  try { revalidatePath('/landing'); revalidatePath('/'); } catch {}

  return NextResponse.json({ ok: true, cupom });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await isSuperAdmin();
  if (!auth.ok) return NextResponse.json({ erro: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const existente = await (prisma as any).cupom.findUnique({ where: { id } });
  if (!existente) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 });

  // Soft-delete: se já tem usos, só desativa. Se não, deleta de fato.
  const temUsos = (existente.usos ?? 0) > 0;

  if (temUsos) {
    await (prisma as any).cupom.update({
      where: { id },
      data: { ativo: false, visivelLanding: false },
    });
  } else {
    await (prisma as any).cupom.delete({ where: { id } });
  }

  await prisma.logAuditoria.create({
    data: {
      acao: 'CUPOM_REMOVIDO',
      detalhes: `Cupom ${existente.codigo} ${temUsos ? 'desativado (tinha usos)' : 'excluído'}`,
      adminNome: auth.userName || 'Super Admin',
      adminId: auth.userId || 'desconhecido',
      empresaId: 'SEM_EMPRESA',
    },
  });

  try { revalidatePath('/landing'); revalidatePath('/'); } catch {}

  return NextResponse.json({ ok: true, softDelete: temUsos });
}
