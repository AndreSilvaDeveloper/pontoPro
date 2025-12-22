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

    // Busca dados atuais do usuário para saber onde ele está AGORA
    const usuarioAtual = await prisma.usuario.findUnique({
        where: { id: session.user.id },
        select: { empresaId: true }
    });

    // Transação Atômica: Ou faz tudo, ou não faz nada (Evita dados órfãos)
    const novaEmpresa = await prisma.$transaction(async (tx) => {
        
        // === AUTO-CORREÇÃO: Garante a loja ANTERIOR ===
        // Antes de mudar o usuário de loja, verificamos se ele tem a permissão da loja atual gravada.
        // Se não tiver, gravamos agora. Isso impede que a loja suma da lista.
        if (usuarioAtual?.empresaId) {
            const permissaoExistente = await tx.adminLoja.findUnique({
                where: {
                    usuarioId_empresaId: {
                        usuarioId: session.user.id,
                        empresaId: usuarioAtual.empresaId
                    }
                }
            });

            if (!permissaoExistente) {
                console.log(`Corrigindo permissão faltante para a empresa ${usuarioAtual.empresaId}...`);
                await tx.adminLoja.create({
                    data: {
                        usuarioId: session.user.id,
                        empresaId: usuarioAtual.empresaId
                    }
                });
            }
        }

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

        // 2. Cria o Vínculo Permanente (AdminLoja) para a NOVA empresa
        await tx.adminLoja.create({
            data: {
                usuarioId: session.user.id,
                empresaId: emp.id
            }
        });

        // 3. Move o usuário para a NOVA empresa (Contexto Atual)
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