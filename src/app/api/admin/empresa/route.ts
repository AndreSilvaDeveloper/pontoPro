import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // Confirme se o caminho é @/lib/db ou @/lib/prisma no seu projeto
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// GET: Busca dados da empresa, configurações E dados financeiros/contagem
export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Verifica se existe sessão e empresaId
  if (!session || !session.user?.empresaId) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Agora usamos 'include' para trazer relações e campos necessários para o financeiro
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      include: {
        // Traz automaticamente campos escalares: nome, cnpj, diaVencimento, chavePix, configuracoes
        
        // Contagem de funcionários (vidas)
        _count: {
            select: { usuarios: true }
        },
        // Lista de admins (para contar quantos têm acesso)
        usuarios: {
            select: { id: true, email: true, cargo: true }
        },
        // Filiais e suas contagens (para somar na fatura matriz)
        filiais: {
            include: {
                _count: { select: { usuarios: true } },
                usuarios: { select: { id: true, email: true, cargo: true } }
            }
        }
      }
    });

    if (!empresa) {
        return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
    }

    // Define valores padrão para configurações operacionais
    const configsPadrao = {
        bloquearForaDoRaio: true, 
        exigirFoto: true,         
        permitirEdicaoFunc: false,
        ocultar_menu_atestados: false,
        ocultarSaldoHoras: false
    };

    // Mescla o que está no banco com o padrão
    const configuracoes = { ...configsPadrao, ...(empresa.configuracoes as object || {}) };

    // Retorna tudo unificado
    return NextResponse.json({ 
        ...empresa, 
        configuracoes 
    });

  } catch (error) {
    console.error("Erro API Empresa:", error);
    return NextResponse.json({ erro: 'Erro ao buscar dados' }, { status: 500 });
  }
}

// PUT: Atualiza configurações operacionais (Mantido igual)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    
    // Apenas ADMIN ou SUPER_ADMIN pode alterar configurações
    if (!session || !session.user?.empresaId || session.user.cargo !== 'ADMIN') {
        return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
    }

    try {
        const body = await request.json();
        
        // Atualiza apenas o JSON de configurações
        await prisma.empresa.update({
            where: { id: session.user.empresaId },
            data: {
                configuracoes: body 
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ erro: 'Erro ao salvar configs' }, { status: 500 });
    }
}