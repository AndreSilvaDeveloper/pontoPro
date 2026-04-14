import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { gerarAFD } from '@/lib/afd';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const empresaId = session.user.empresaId as string;

  try {
    const { searchParams } = new URL(request.url);
    const inicioParam = searchParams.get('inicio');
    const fimParam = searchParams.get('fim');

    if (!inicioParam || !fimParam) {
      return NextResponse.json({ erro: 'Informe inicio e fim (YYYY-MM-DD)' }, { status: 400 });
    }

    const dataInicio = new Date(`${inicioParam}T00:00:00-03:00`);
    const dataFim = new Date(`${fimParam}T23:59:59-03:00`);

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true, nome: true, cnpj: true },
    });
    if (!empresa) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
    }

    const [pontos, usuarios] = await Promise.all([
      prisma.ponto.findMany({
        where: {
          usuario: { empresaId },
          dataHora: { gte: dataInicio, lte: dataFim },
        },
        select: { dataHora: true, usuarioId: true },
        orderBy: { dataHora: 'asc' },
      }),
      prisma.usuario.findMany({
        where: { empresaId },
        select: { id: true, nome: true, cpf: true, pis: true },
      }),
    ]);

    const usuariosPorId: Record<string, any> = {};
    usuarios.forEach(u => { usuariosPorId[u.id] = u; });

    const conteudo = gerarAFD({
      empresa: { nome: empresa.nome, cnpj: empresa.cnpj },
      numeroREP: empresa.id.slice(0, 17),
      dataInicio,
      dataFim,
      pontos,
      usuariosPorId,
    });

    const nomeArquivo = `AFD_${empresa.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${inicioParam}_${fimParam}.txt`;

    return new NextResponse(conteudo, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar AFD:', error);
    return NextResponse.json({ erro: 'Erro ao gerar AFD' }, { status: 500 });
  }
}
