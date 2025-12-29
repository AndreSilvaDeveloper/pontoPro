import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  const cargosPermitidos = ['ADMIN', 'SUPER_ADMIN'];
  // @ts-ignore
  if (!session || !cargosPermitidos.includes(session.user.cargo)) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { nome, cnpj } = await request.json();

    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 });

    const usuarioAtual = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { empresaId: true }
    });

    if (!usuarioAtual?.empresaId) {
        return NextResponse.json({ erro: 'Você precisa estar logado em uma empresa principal para criar filiais.' }, { status: 400 });
    }

    const idEmpresaAtual = usuarioAtual.empresaId;

    const novaEmpresa = await prisma.$transaction(async (tx) => {
        
        // 1. Busca IDs dos Admins para replicar acesso (Lógica que já fizemos antes)
        const adminsNativos = await tx.usuario.findMany({
            where: { empresaId: idEmpresaAtual, cargo: 'ADMIN' },
            select: { id: true }
        });

        const adminsVinculados = await tx.adminLoja.findMany({
            where: { empresaId: idEmpresaAtual },
            select: { usuarioId: true }
        });

        const listaDeIds = new Set<string>();
        adminsNativos.forEach(user => listaDeIds.add(user.id));
        adminsVinculados.forEach(registro => listaDeIds.add(registro.usuarioId));
        // @ts-ignore
        listaDeIds.add(session.user.id);

        // 2. Cria a NOVA Empresa JÁ VINCULADA À ATUAL
        const emp = await tx.empresa.create({
            data: {
                nome,
                cnpj: cnpj || null,
                status: 'ATIVO',
                
                // === AQUI ESTÁ A MUDANÇA ===
                // Define que a mãe desta nova loja é a loja atual
                matrizId: idEmpresaAtual, 
                // ===========================

                configuracoes: {
                    exigirFoto: true,
                    bloquearForaDoRaio: true,
                    ocultarSaldoHoras: false
                }
            }
        });

        // 3. Cria permissões de AdminLoja
        const novosVinculos = Array.from(listaDeIds).map(usuarioId => ({
            usuarioId: usuarioId,
            empresaId: emp.id
        }));

        if (novosVinculos.length > 0) {
            await tx.adminLoja.createMany({
                data: novosVinculos,
                skipDuplicates: true 
            });
        }

        // 4. Move VOCÊ para a nova empresa
        await tx.usuario.update({
            where: { id: session.user.id },
            data: { empresaId: emp.id }
        });

        return emp;
    });

    return NextResponse.json({ success: true, empresa: novaEmpresa });

  } catch (error) {
    console.error("Erro ao criar loja:", error);
    return NextResponse.json({ erro: 'Erro ao criar loja.' }, { status: 500 });
  }
}