import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { calcularFaturaRevendedor } from '@/lib/revendedor-billing';

// GET: Super admin consulta billing de um revendedor ?id=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'SUPER_ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });

  const rev = await prisma.revendedor.findUnique({
    where: { id },
    include: {
      empresas: {
        where: { status: 'ATIVO' },
        include: { _count: { select: { usuarios: true } } },
      },
    },
  });

  if (!rev) return NextResponse.json({ erro: 'Nao encontrado' }, { status: 404 });

  const totalUsuarios = rev.empresas.reduce((s, e) => s + e._count.usuarios, 0);

  const fatura = calcularFaturaRevendedor(totalUsuarios, {
    faixa1Limite: rev.faixa1Limite,
    faixa1Valor: rev.faixa1Valor,
    faixa2Limite: rev.faixa2Limite,
    faixa2Valor: rev.faixa2Valor,
    faixa3Valor: rev.faixa3Valor,
    minimoMensal: rev.minimoMensal,
  });

  return NextResponse.json({
    revendedorId: rev.id,
    nome: rev.nome,
    totalEmpresas: rev.empresas.length,
    totalUsuarios,
    fatura,
    config: {
      minimoMensal: rev.minimoMensal,
      faixa1Limite: rev.faixa1Limite,
      faixa1Valor: rev.faixa1Valor,
      faixa2Limite: rev.faixa2Limite,
      faixa2Valor: rev.faixa2Valor,
      faixa3Valor: rev.faixa3Valor,
    },
    empresas: rev.empresas.map(e => ({
      id: e.id,
      nome: e.nome,
      totalUsuarios: e._count.usuarios,
    })),
  });
}

// PUT: Super admin edita faixas de preço de um revendedor
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'SUPER_ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json();
  const { id, minimoMensal, faixa1Limite, faixa1Valor, faixa2Limite, faixa2Valor, faixa3Valor } = body;

  if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });

  const updateData: any = {};
  if (minimoMensal !== undefined) updateData.minimoMensal = Number(minimoMensal);
  if (faixa1Limite !== undefined) updateData.faixa1Limite = Number(faixa1Limite);
  if (faixa1Valor !== undefined) updateData.faixa1Valor = Number(faixa1Valor);
  if (faixa2Limite !== undefined) updateData.faixa2Limite = Number(faixa2Limite);
  if (faixa2Valor !== undefined) updateData.faixa2Valor = Number(faixa2Valor);
  if (faixa3Valor !== undefined) updateData.faixa3Valor = Number(faixa3Valor);

  await prisma.revendedor.update({ where: { id }, data: updateData });
  return NextResponse.json({ success: true });
}
