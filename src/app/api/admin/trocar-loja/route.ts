import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// === GET: LISTAR LOJAS (COM AUTO-CURA) ===
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 401 });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { 
            cargo: true, 
            empresaId: true, 
            empresa: { select: { id: true, nome: true } } 
        }
    });

    if (!usuario) return NextResponse.json([]);

    // 1. Busca permissões explícitas
    let permissoes = await prisma.adminLoja.findMany({
        where: { usuarioId: session.user.id },
        include: { empresa: { select: { id: true, nome: true } } }
    });

    // === AUTO-CURA (SELF-HEALING) ===
    // Se o usuário está numa empresa mas não tem permissão explícita nela, cria agora.
    if (usuario.empresaId && !permissoes.find(p => p.empresaId === usuario.empresaId)) {
        console.log("Detectada inconsistência. Criando vínculo automático...");
        
        await prisma.adminLoja.create({
            data: {
                usuarioId: session.user.id,
                empresaId: usuario.empresaId
            }
        });

        if (usuario.empresa) {
            // @ts-ignore
            permissoes.push({ empresa: usuario.empresa }); 
        }
    }

    // Se for SUPER_ADMIN, vê todas (opcional, mas mantive a lógica de permissão acima como prioritária)
    // @ts-ignore
    if (usuario.cargo === 'SUPER_ADMIN') {
        const todasEmpresas = await prisma.empresa.findMany({
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' }
        });
        // Retorna todas, mas garante que a atual esteja selecionada na interface
        return NextResponse.json(todasEmpresas);
    }

    const listaLojas = permissoes.map(p => p.empresa);
    // Remove duplicatas
    const lojasUnicas = Array.from(new Map(listaLojas.map(item => [item.id, item])).values());

    return NextResponse.json(lojasUnicas);

  } catch (error) {
    console.error("ERRO GET LOJAS:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// === POST: REALIZAR A TROCA ===
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    // Aceita variações de nome para garantir compatibilidade
    const empresaId = body.empresaId || body.novaEmpresaId || body.id;

    if (!empresaId) {
        return NextResponse.json({ erro: 'ID da loja não informado' }, { status: 400 });
    }

    console.log(`Trocando usuário ${session.user.id} para loja ${empresaId}...`);

    // Atualiza o contexto (empresaId) no usuário
    await prisma.usuario.update({
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