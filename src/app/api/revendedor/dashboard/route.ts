import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'REVENDEDOR') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const revendedorId = session.user.revendedorId;
  if (!revendedorId) {
    return NextResponse.json({ erro: 'Revendedor não vinculado' }, { status: 400 });
  }

  const revendedor = await prisma.revendedor.findUnique({
    where: { id: revendedorId },
    include: {
      empresas: {
        include: {
          _count: { select: { usuarios: true } },
        },
      },
    },
  });

  if (!revendedor) {
    return NextResponse.json({ erro: 'Revendedor não encontrado' }, { status: 404 });
  }

  const totalEmpresas = revendedor.empresas.length;
  const empresasAtivas = revendedor.empresas.filter(e => e.status === 'ATIVO').length;
  const totalUsuarios = revendedor.empresas.reduce((s, e) => s + e._count.usuarios, 0);

  return NextResponse.json({
    revendedor: {
      id: revendedor.id,
      nome: revendedor.nome,
      nomeExibicao: revendedor.nomeExibicao,
      logoUrl: revendedor.logoUrl,
      corPrimaria: revendedor.corPrimaria,
      corSecundaria: revendedor.corSecundaria,
      dominio: revendedor.dominio,
    },
    stats: {
      totalEmpresas,
      empresasAtivas,
      totalUsuarios,
    },
    empresas: revendedor.empresas.map(e => ({
      id: e.id,
      nome: e.nome,
      status: e.status,
      plano: e.plano,
      totalUsuarios: e._count.usuarios,
      criadoEm: e.criadoEm,
    })),
  });
}
