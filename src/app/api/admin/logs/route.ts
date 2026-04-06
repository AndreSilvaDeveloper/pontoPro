import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 });
  }

  // Pegar filtros da URL
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get('inicio'); 
  const fim = searchParams.get('fim');
  const tipo = searchParams.get('tipo'); // Ex: APROVACAO, EDICAO
  const busca = searchParams.get('busca'); // Nome do funcionário ou detalhe


  // Construir o filtro dinâmico
  const whereClause: any = {
    // @ts-ignore
    empresaId: session.user.empresaId,
    // Não exibe logs de acesso remoto do suporte para o admin
    NOT: { acao: { in: ['IMPERSONATE_START', 'IMPERSONATE_STOP'] } },
  };

  if (inicio && fim) {
    const fimDate = new Date(`${fim}T23:59:59`);
    fimDate.setHours(fimDate.getHours() + 3); // Ajuste para fuso horário SP
    whereClause.dataHora = {
      gte: new Date(`${inicio}T00:00:00`),
      lte: fimDate,
    };
  }

  if (tipo && tipo !== 'TODOS') {
    whereClause.acao = { contains: tipo };
  }

  if (busca) {
    whereClause.OR = [
      { detalhes: { contains: busca, mode: 'insensitive' } }, // Procura no texto do detalhe
      { adminNome: { contains: busca, mode: 'insensitive' } } // Procura quem fez
    ];
  }

  try {
    const logs = await prisma.logAuditoria.findMany({
      where: whereClause,
      orderBy: { dataHora: 'desc' },
      take: 200 // Aumentei para 200
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar logs' }, { status: 500 });
  }
}