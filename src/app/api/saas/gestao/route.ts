import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// Validação Centralizada
async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    return session?.user?.cargo === 'SUPER_ADMIN';
}

// LISTAR TODAS AS EMPRESAS (HIERARQUIA MATRIZ > FILIAIS)
export async function POST(request: Request) { 
  if (!(await isSuperAdmin())) return NextResponse.json({ erro: '403' }, { status: 403 });

  try {
    const empresas = await prisma.empresa.findMany({
        where: {
            // Apenas Matrizes (quem não tem pai)
            matrizId: null
        },
        orderBy: { criadoEm: 'desc' },
        include: { 
            // 1. Mantém a contagem total de usuários da matriz
            _count: { select: { usuarios: true } },

            // 2. Traz a lista dos donos/admins da Matriz
            usuarios: {
                where: { cargo: { in: ['ADMIN', 'SUPER_ADMIN'] } }, // Só traz chefes
                select: { id: true, nome: true, email: true, cargo: true }, // Dados essenciais
                orderBy: { nome: 'asc' }
            },

            // 3. NOVO: Traz as Filiais aninhadas
            filiais: {
                orderBy: { criadoEm: 'desc' },
                include: {
                    // Traz admins das filiais também (para o modal de equipe funcionar na filial)
                    usuarios: {
                        where: { cargo: { in: ['ADMIN', 'SUPER_ADMIN'] } },
                        select: { id: true, nome: true, email: true, cargo: true }
                    },
                    // Contagem de usuários da filial
                    _count: { select: { usuarios: true } }
                }
            }
        }
    });
    return NextResponse.json(empresas);
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return NextResponse.json({ erro: 'Erro ao buscar' }, { status: 500 });
  }
}

// BLOQUEAR / DESBLOQUEAR / CONFIGURAR (Mantido igual ao seu original)
export async function PUT(request: Request) {
    if (!(await isSuperAdmin())) return NextResponse.json({ erro: '403' }, { status: 403 });

    try {
      // Adicionei "matrizId" na desestruturação
      const { empresaId, acao, novasConfigs, matrizId } = await request.json();
  
      if (acao === 'ALTERAR_STATUS') {
          const emp = await prisma.empresa.findUnique({ where: { id: empresaId } });
          const novoStatus = emp?.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO';
          
          await prisma.empresa.update({
              where: { id: empresaId },
              data: { status: novoStatus }
          });
          return NextResponse.json({ success: true, novoStatus });
      }

      if (acao === 'FORCAR_CONFIG') {
          await prisma.empresa.update({
              where: { id: empresaId },
              data: { configuracoes: novasConfigs }
          });
          return NextResponse.json({ success: true });
      }

      // === NOVA AÇÃO: VINCULAR MATRIZ ===
      if (acao === 'VINCULAR_MATRIZ') {
          if (empresaId === matrizId) {
              return NextResponse.json({ erro: 'Uma empresa não pode ser matriz dela mesma.' }, { status: 400 });
          }

          await prisma.empresa.update({
              where: { id: empresaId },
              data: { matrizId: matrizId } // matrizId pode ser um ID string ou null (para desvincular)
          });
          return NextResponse.json({ success: true });
      }
  
      return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 });
    }
  }