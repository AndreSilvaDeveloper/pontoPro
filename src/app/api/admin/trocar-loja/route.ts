import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  const { novaEmpresaId } = await request.json();

  try {
    // 1. Verifica se o usuário realmente tem permissão nessa loja
    const permissao = await prisma.adminLoja.findUnique({
        where: {
            usuarioId_empresaId: {
                usuarioId: session.user.id,
                empresaId: novaEmpresaId
            }
        }
    });

    // Se não for super admin e não tiver permissão explícita
    // (A lógica abaixo permite que o dono da conta troque)
    if (!permissao) {
         return NextResponse.json({ erro: 'Você não tem acesso a esta loja.' }, { status: 403 });
    }

    // 2. Atualiza a "Loja Ativa" do usuário
    await prisma.usuario.update({
        where: { id: session.user.id },
        data: { empresaId: novaEmpresaId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao trocar loja' }, { status: 500 });
  }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: '401' }, { status: 401 });

    // 1. Busca os vínculos oficiais na tabela AdminLoja
    const vinculos = await prisma.adminLoja.findMany({
        where: { usuarioId: session.user.id },
        include: { empresa: { select: { id: true, nome: true } } }
    });

    let listaLojas = vinculos.map(l => l.empresa);

    // 2. PROTEÇÃO: Verifica qual é a loja que está ATIVA no usuário agora
    const usuarioAtual = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { empresaId: true }
    });

    // Se o usuário tem uma empresa ativa, mas ela não veio na lista acima (falta de vínculo), vamos buscar ela e adicionar
    if (usuarioAtual?.empresaId) {
        const jaEstaNaLista = listaLojas.some(l => l.id === usuarioAtual.empresaId);
        
        if (!jaEstaNaLista) {
            const empresaAtiva = await prisma.empresa.findUnique({
                where: { id: usuarioAtual.empresaId },
                select: { id: true, nome: true }
            });
            
            if (empresaAtiva) {
                // Adiciona a loja atual na lista para ele não ficar "preso"
                listaLojas.push(empresaAtiva);
                
                // Opcional: Criar o vínculo automaticamente agora para corrigir o banco
                await prisma.adminLoja.create({
                    data: {
                        usuarioId: session.user.id,
                        empresaId: empresaAtiva.id
                    }
                }).catch(() => null); // Ignora erro se já existir (race condition)
            }
        }
    }

    return NextResponse.json(listaLojas);
}