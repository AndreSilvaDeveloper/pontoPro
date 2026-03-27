import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { confirmacao, senha } = body;

    if (confirmacao !== 'EXCLUIR MINHA CONTA') {
      return NextResponse.json({ erro: 'Confirmação inválida' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId as string;
    // @ts-ignore
    const adminId = session.user.id as string;

    // Verificar senha do admin
    const admin = await prisma.usuario.findUnique({ where: { id: adminId } });
    if (!admin) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });

    const bcrypt = require('bcryptjs');
    const senhaCorreta = await bcrypt.compare(senha, admin.senha);
    if (!senhaCorreta) {
      return NextResponse.json({ erro: 'Senha incorreta' }, { status: 401 });
    }

    // Buscar empresa e verificar que é o admin principal
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: { usuarios: { select: { id: true } } },
    });

    if (!empresa) return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });

    // Deletar tudo da empresa em cascata
    const usuarioIds = empresa.usuarios.map(u => u.id);

    await prisma.$transaction(async (tx) => {
      // Deletar dados dos funcionários
      await tx.pushSubscription.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
      await tx.solicitacaoAjuste.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
      await tx.ausencia.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
      await tx.ponto.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
      await tx.horaExtra.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
      await tx.ajusteBancoHoras.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
      await tx.lembretePush.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
      await tx.adminLoja.deleteMany({ where: { empresaId } });
      await tx.logAuditoria.deleteMany({ where: { empresaId } });
      await tx.feriado.deleteMany({ where: { empresaId } });

      // Deletar usuários
      await tx.usuario.deleteMany({ where: { empresaId } });

      // Deletar filiais
      await tx.empresa.deleteMany({ where: { matrizId: empresaId } });

      // Deletar empresa
      await tx.empresa.delete({ where: { id: empresaId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    return NextResponse.json({ erro: 'Erro ao excluir conta' }, { status: 500 });
  }
}
