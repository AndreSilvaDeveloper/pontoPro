// src/app/api/admin/nova-loja/route.ts
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

    if (!nome?.trim()) {
      return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 });
    }

    // @ts-ignore
    const userId = session.user.id as string;

    // Usuário precisa estar em uma empresa (matriz ou qualquer contexto)
    const usuarioAtual = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { empresaId: true }
    });

    if (!usuarioAtual?.empresaId) {
      return NextResponse.json(
        { erro: 'Você precisa estar logado em uma empresa principal para criar filiais.' },
        { status: 400 }
      );
    }

    const idEmpresaAtual = usuarioAtual.empresaId;

    const novaEmpresa = await prisma.$transaction(async (tx) => {
      // 1) Lista de admins que terão acesso à nova filial
      const adminsNativos = await tx.usuario.findMany({
        where: { empresaId: idEmpresaAtual, cargo: 'ADMIN' },
        select: { id: true }
      });

      const adminsVinculados = await tx.adminLoja.findMany({
        where: { empresaId: idEmpresaAtual },
        select: { usuarioId: true }
      });

      const listaDeIds = new Set<string>();
      adminsNativos.forEach(u => listaDeIds.add(u.id));
      adminsVinculados.forEach(v => listaDeIds.add(v.usuarioId));
      listaDeIds.add(userId);

      // 2) (Robustez) garante vínculo AdminLoja na MATRIZ para todos da lista
      // Isso evita casos onde um admin era "nativo" mas não tinha registro em AdminLoja.
      const vinculosMatriz = Array.from(listaDeIds).map(usuarioId => ({
        usuarioId,
        empresaId: idEmpresaAtual
      }));

      if (vinculosMatriz.length > 0) {
        await tx.adminLoja.createMany({
          data: vinculosMatriz,
          skipDuplicates: true
        });
      }

      // 3) Cria a filial vinculada à empresa atual como matriz
      const emp = await tx.empresa.create({
        data: {
          nome: nome.trim(),
          cnpj: cnpj || null,
          status: 'ATIVO',
          matrizId: idEmpresaAtual, // filial -> matriz

          configuracoes: {
            exigirFoto: true,
            bloquearForaDoRaio: true,
            ocultarSaldoHoras: false
          }
        }
      });

      // 4) Cria permissões AdminLoja para a NOVA filial
      const vinculosFilial = Array.from(listaDeIds).map(usuarioId => ({
        usuarioId,
        empresaId: emp.id
      }));

      if (vinculosFilial.length > 0) {
        await tx.adminLoja.createMany({
          data: vinculosFilial,
          skipDuplicates: true
        });
      }
      return emp;
    });

    return NextResponse.json({ success: true, empresa: novaEmpresa });
  } catch (error) {
    console.error('Erro ao criar loja:', error);
    return NextResponse.json({ erro: 'Erro ao criar loja.' }, { status: 500 });
  }
}
