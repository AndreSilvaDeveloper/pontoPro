// src/app/api/admin/trocar-loja/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';


export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const userId = session?.user?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    // 1) Usuário atual e empresa atual
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, empresaId: true },
    });

    if (!usuario?.empresaId) {
      return NextResponse.json([], { status: 200 });
    }

    // 2) Empresa atual para descobrir matrizId (se estiver numa filial)
    const empresaAtual = await prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: { id: true, matrizId: true },
    });

    // 3) Vínculos diretos em AdminLoja
    const vinculos = await prisma.adminLoja.findMany({
      where: { usuarioId: userId },
      select: { empresaId: true },
    });

    // 4) IDs base acessíveis
    const idsBase = new Set<string>();

    // A) AdminLoja direto
    vinculos.forEach(v => idsBase.add(v.empresaId));

    // B) empresa atual sempre entra
    idsBase.add(usuario.empresaId);

    // C) se a empresa atual é filial, inclui a matriz
    if (empresaAtual?.matrizId) {
      idsBase.add(empresaAtual.matrizId);
    }

    // 5) Lista lojas (bases + filiais das bases)
    const lojas = await prisma.empresa.findMany({
      where: {
        OR: [
          { id: { in: Array.from(idsBase) } },          // acesso direto / atual / matriz
          { matrizId: { in: Array.from(idsBase) } },     // filiais das matrizes acessíveis
        ],
        status: { not: 'BLOQUEADO' },
      },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        matrizId: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: 'asc' }, // matriz (mais antiga) tende a aparecer primeiro
    });

    return NextResponse.json(lojas);
  } catch (error) {
    console.error('Erro ao listar lojas:', error);
    return NextResponse.json({ erro: 'Erro ao buscar lojas' }, { status: 500 });
  }
}


export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const userId = session?.user?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Aceita variações pra compatibilidade
    const empresaId = body.empresaId || body.novaEmpresaId || body.id;

    if (!empresaId) {
      return NextResponse.json({ erro: 'ID da loja não informado' }, { status: 400 });
    }

    // 1) Busca empresa atual do usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, empresaId: true },
    });

    if (!usuario?.empresaId) {
      return NextResponse.json({ erro: 'Usuário sem empresa atual.' }, { status: 400 });
    }

    // 2) Descobre matriz da empresa atual
    const empresaAtual = await prisma.empresa.findUnique({
      where: { id: usuario.empresaId },
      select: { matrizId: true },
    });

    // 3) Vínculos AdminLoja
    const vinculos = await prisma.adminLoja.findMany({
      where: { usuarioId: userId },
      select: { empresaId: true },
    });

    const idsBase = new Set<string>();
    vinculos.forEach(v => idsBase.add(v.empresaId));
    idsBase.add(usuario.empresaId);
    if (empresaAtual?.matrizId) idsBase.add(empresaAtual.matrizId);

    // 4) Confirma acesso:
    // - pode ser uma loja base
    // - ou uma filial de uma base
    const temAcesso = await prisma.empresa.findFirst({
      where: {
        id: empresaId,
        status: { not: 'BLOQUEADO' },
        OR: [
          { id: { in: Array.from(idsBase) } },
          { matrizId: { in: Array.from(idsBase) } },
        ],
      },
      select: { id: true },
    });

    if (!temAcesso) {
      return NextResponse.json({ erro: 'Acesso negado a esta unidade.' }, { status: 403 });
    }

    // 5) Atualiza contexto (empresa atual do usuário)
    await prisma.usuario.update({
      where: { id: userId },
      data: { empresaId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('ERRO AO TROCAR LOJA:', error);
    return NextResponse.json(
      { erro: 'Erro interno', detalhe: error?.message || 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
