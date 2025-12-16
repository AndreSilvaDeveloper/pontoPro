import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Apenas Admin pode criar novas lojas
  if (!session || session.user.cargo !== 'ADMIN') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { nome, cnpj } = await request.json();

    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 });

    // 1. Cria a Empresa
    const novaEmpresa = await prisma.empresa.create({
        data: {
            nome,
            cnpj: cnpj || '',
            status: 'ATIVO',
            configuracoes: {
                exigirFoto: true,
                bloquearForaDoRaio: true,
                ocultarSaldoHoras: false
            }
        }
    });

    // 2. Vincula o Admin atual a esta nova empresa
    await prisma.adminLoja.create({
        data: {
            usuarioId: session.user.id,
            empresaId: novaEmpresa.id
        }
    });

    // 3. Já troca o contexto para a nova loja
    await prisma.usuario.update({
        where: { id: session.user.id },
        data: { empresaId: novaEmpresa.id }
    });

    return NextResponse.json({ success: true, empresa: novaEmpresa });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao criar loja.' }, { status: 500 });
  }
}