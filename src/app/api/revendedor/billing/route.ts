import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { calcularFaturaRevendedor } from '@/lib/revendedor-billing';

// GET: Retorna fatura calculada do revendedor logado
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const cargo = session?.user?.cargo;

  // @ts-ignore
  const revendedorId = session?.user?.revendedorId;

  if (!session || (cargo !== 'REVENDEDOR' && cargo !== 'SUPER_ADMIN')) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  if (!revendedorId && cargo === 'REVENDEDOR') {
    return NextResponse.json({ erro: 'Revendedor não vinculado' }, { status: 400 });
  }

  const revId = revendedorId;

  const rev = await prisma.revendedor.findUnique({
    where: { id: revId },
    include: {
      empresas: {
        where: { status: 'ATIVO' },
        include: {
          _count: { select: { usuarios: true } },
        },
      },
    },
  });

  if (!rev) {
    return NextResponse.json({ erro: 'Revendedor não encontrado' }, { status: 404 });
  }

  // Total de usuários em todas as empresas ativas
  const totalUsuarios = rev.empresas.reduce((s, e) => s + e._count.usuarios, 0);

  const fatura = calcularFaturaRevendedor(totalUsuarios, {
    faixa1Limite: rev.faixa1Limite,
    faixa1Valor: rev.faixa1Valor,
    faixa2Limite: rev.faixa2Limite,
    faixa2Valor: rev.faixa2Valor,
    faixa3Valor: rev.faixa3Valor,
    minimoMensal: rev.minimoMensal,
  });

  const empresasDetalhe = rev.empresas.map(e => ({
    id: e.id,
    nome: e.nome,
    totalUsuarios: e._count.usuarios,
  }));

  return NextResponse.json({
    revendedorId: rev.id,
    revendedorNome: rev.nome,
    totalEmpresas: rev.empresas.length,
    totalUsuarios,
    fatura,
    empresas: empresasDetalhe,
    config: {
      minimoMensal: rev.minimoMensal,
      faixa1Limite: rev.faixa1Limite,
      faixa1Valor: rev.faixa1Valor,
      faixa2Limite: rev.faixa2Limite,
      faixa2Valor: rev.faixa2Valor,
      faixa3Valor: rev.faixa3Valor,
    },
  });
}
