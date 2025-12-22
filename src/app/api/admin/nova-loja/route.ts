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

    // Busca onde o usuário está logado agora
    const usuarioAtual = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { empresaId: true }
    });

    // Se ele não estiver em loja nenhuma, retorna erro
    if (!usuarioAtual?.empresaId) {
        return NextResponse.json({ erro: 'Você precisa estar logado em uma empresa principal para criar filiais.' }, { status: 400 });
    }

    // === CORREÇÃO DO ERRO DE TYPESCRIPT ===
    // Criamos uma constante local garantindo que é string.
    // O TypeScript agora sabe que "idEmpresaAtual" nunca será null.
    const idEmpresaAtual = usuarioAtual.empresaId;

    const novaEmpresa = await prisma.$transaction(async (tx) => {
        
        // === AUTO-CORREÇÃO (Mantida) ===
        // Usamos idEmpresaAtual em vez de usuarioAtual.empresaId
        const permissaoExistente = await tx.adminLoja.findUnique({
            where: {
                usuarioId_empresaId: {
                    usuarioId: session.user.id,
                    empresaId: idEmpresaAtual // <--- Aqui (Variável segura)
                }
            }
        });

        if (!permissaoExistente) {
            await tx.adminLoja.create({
                data: { 
                    usuarioId: session.user.id, 
                    empresaId: idEmpresaAtual // <--- Aqui
                }
            });
        }

        // === O PULO DO GATO: BUSCAR OS SÓCIOS ===
        const sociosAtuais = await tx.adminLoja.findMany({
            where: { empresaId: idEmpresaAtual }, // <--- Aqui
            select: { usuarioId: true }
        });

        // 1. Cria a NOVA Empresa
        const emp = await tx.empresa.create({
            data: {
                nome,
                cnpj: cnpj || null,
                status: 'ATIVO',
                configuracoes: {
                    exigirFoto: true,
                    bloquearForaDoRaio: true,
                    ocultarSaldoHoras: false
                }
            }
        });

        // 2. CRIA O VÍNCULO PARA TODO MUNDO (Você + Sócios)
        const novosVinculos = sociosAtuais.map(socio => ({
            usuarioId: socio.usuarioId,
            empresaId: emp.id
        }));

        // Fallback de segurança
        if (novosVinculos.length === 0) {
            novosVinculos.push({ usuarioId: session.user.id, empresaId: emp.id });
        }

        await tx.adminLoja.createMany({
            data: novosVinculos,
            skipDuplicates: true 
        });

        // 3. Move APENAS VOCÊ para a nova empresa
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