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

// LISTAR TODAS AS EMPRESAS
export async function POST(request: Request) { 
  if (!(await isSuperAdmin())) return NextResponse.json({ erro: '403' }, { status: 403 });

  try {
    const empresas = await prisma.empresa.findMany({
        orderBy: { criadoEm: 'desc' },
        include: { 
            // 1. Mantém a contagem total
            _count: { select: { usuarios: true } },

            // 2. ADICIONA ISTO AQUI: Traz a lista dos donos/admins
            usuarios: {
                where: { cargo: { in: ['ADMIN', 'SUPER_ADMIN'] } }, // Só traz chefes
                select: { id: true, nome: true, email: true, cargo: true }, // Dados essenciais
                orderBy: { nome: 'asc' }
            }
        }
    });
    return NextResponse.json(empresas);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar' }, { status: 500 });
  }
}

// BLOQUEAR / DESBLOQUEAR / CONFIGURAR
export async function PUT(request: Request) {
    if (!(await isSuperAdmin())) return NextResponse.json({ erro: '403' }, { status: 403 });

    try {
      const { empresaId, acao, novasConfigs } = await request.json();
  
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
  
      return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 });
    } catch (error) {
      return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 });
    }
  }