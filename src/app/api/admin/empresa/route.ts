import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET: Busca dados e configurações
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { nome: true, cnpj: true, configuracoes: true } // Traz o JSON
    });

    // Define valores padrão se for a primeira vez
    const configsPadrao = {
        bloquearForaDoRaio: true, // Se false, apenas avisa mas deixa bater
        exigirFoto: true,         // Se false, não pede câmera
        permitirEdicaoFunc: false // Se true, funcionário pode editar o próprio ponto
    };

    const configsFinais = { ...configsPadrao, ...(empresa?.configuracoes as object || {}) };

    return NextResponse.json({ ...empresa, configuracoes: configsFinais });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar' }, { status: 500 });
  }
}

// PUT: Atualiza configurações
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

    try {
        const body = await request.json();
        
        // Atualiza apenas o campo configuracoes
        await prisma.empresa.update({
            where: { id: session.user.empresaId },
            data: {
                configuracoes: body // Salva o JSON direto
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ erro: 'Erro ao salvar configs' }, { status: 500 });
    }
}