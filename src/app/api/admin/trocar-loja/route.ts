import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// === GET: LISTAR AS LOJAS DISPONÍVEIS ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (!session?.user?.id) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // 1. Busca os IDs das lojas que o usuário tem permissão DIRETA (tabela AdminLoja)
    const vinculos = await prisma.adminLoja.findMany({
        // @ts-ignore
        where: { usuarioId: session.user.id },
        select: { empresaId: true }
    });

    const idsDiretos = vinculos.map(v => v.empresaId);

    // 2. BUSCA INTELIGENTE (MATRIZ + FILIAIS)
    const lojas = await prisma.empresa.findMany({
        where: {
            OR: [
                { id: { in: idsDiretos } },          // Acesso direto (Sou dono)
                { matrizId: { in: idsDiretos } }     // Acesso herdado (Sou dono da Matriz)
            ],
            status: { not: 'BLOQUEADO' } 
        },
        select: {
            id: true,
            nome: true,
            cnpj: true,
            matrizId: true
        },
        // === AQUI ESTÁ A CORREÇÃO DA ORDEM ===
        orderBy: {
            criadoEm: 'asc' // A mais antiga (Matriz) aparece primeiro
        }
        // =====================================
    });

    return NextResponse.json(lojas);

  } catch (error) {
    console.error("Erro ao listar lojas:", error);
    return NextResponse.json({ erro: 'Erro ao buscar lojas' }, { status: 500 });
  }
}

// === POST: TROCAR A SESSÃO ===
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    
    // @ts-ignore
    if (!session?.user?.id) {
        return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }

    try {
        const body = await request.json();
        // Aceita variações para garantir compatibilidade com o frontend
        const empresaId = body.empresaId || body.novaEmpresaId || body.id;

        if (!empresaId) {
            return NextResponse.json({ erro: 'ID da loja não informado' }, { status: 400 });
        }

        // === SEGURANÇA EXTRA ===
        // Verifica se o usuário tem acesso antes de trocar
        const vinculos = await prisma.adminLoja.findMany({
            // @ts-ignore
            where: { usuarioId: session.user.id },
            select: { empresaId: true }
        });
        const idsDiretos = vinculos.map(v => v.empresaId);

        const temAcesso = await prisma.empresa.findFirst({
            where: {
                id: empresaId,
                OR: [
                    { id: { in: idsDiretos } },
                    { matrizId: { in: idsDiretos } }
                ]
            }
        });

        if (!temAcesso) {
            return NextResponse.json({ erro: 'Acesso negado a esta unidade.' }, { status: 403 });
        }

        // Atualiza a empresa atual do usuário no banco
        await prisma.usuario.update({
            // @ts-ignore
            where: { id: session.user.id },
            data: { empresaId: empresaId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("ERRO AO TROCAR LOJA:", error);
        return NextResponse.json(
            { erro: 'Erro interno', detalhe: error.message }, 
            { status: 500 }
        );
    }
}