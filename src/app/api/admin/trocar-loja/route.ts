import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// LISTAR LOJAS (GET)
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 401 });
  }

  try {
    // 1. Busca o usuário e inclui a relação 'lojasPermitidas' -> 'empresa'
    const usuario = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            empresaId: true,
            empresa: { select: { id: true, nome: true } }, // A loja atual (contexto)
            lojasPermitidas: {
                select: {
                    empresa: { select: { id: true, nome: true } }
                }
            }
        }
    });

    if (!usuario) return NextResponse.json([]);

    // 2. Monta a lista de lojas
    // Começa com as lojas da tabela de permissão (AdminLoja)
    let listaLojas = usuario.lojasPermitidas.map(reg => reg.empresa);

    // Se a lista estiver vazia (caso o usuário não tenha sido adicionado no AdminLoja ainda),
    // adicionamos a empresa atual dele como fallback para não ficar sem nada.
    if (listaLojas.length === 0 && usuario.empresa) {
        listaLojas.push(usuario.empresa);
    }

    // Remove duplicados (caso a loja atual já esteja na lista de permitidas)
    const lojasUnicas = Array.from(new Map(listaLojas.map(item => [item.id, item])).values());

    return NextResponse.json(lojasUnicas);

  } catch (error) {
    console.error("ERRO GET LOJAS:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// TROCAR LOJA (POST)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    // Aceita variações de nome para garantir
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