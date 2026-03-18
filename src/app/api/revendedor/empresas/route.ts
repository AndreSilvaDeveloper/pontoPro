import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

// GET: Listar empresas do revendedor
export async function GET() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'REVENDEDOR') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const revendedorId = session.user.revendedorId;

  const empresas = await prisma.empresa.findMany({
    where: { revendedorId },
    include: {
      _count: { select: { usuarios: true } },
      usuarios: { where: { cargo: 'ADMIN' }, select: { id: true, nome: true, email: true } },
    },
    orderBy: { criadoEm: 'desc' },
  });

  return NextResponse.json(empresas.map(e => ({
    id: e.id,
    nome: e.nome,
    cnpj: e.cnpj,
    status: e.status,
    plano: e.plano,
    totalUsuarios: e._count.usuarios,
    admins: e.usuarios,
    criadoEm: e.criadoEm,
    trialAte: e.trialAte,
    pagoAte: e.pagoAte,
  })));
}

// POST: Criar nova empresa vinculada ao revendedor
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'REVENDEDOR') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  // @ts-ignore
  const revendedorId = session.user.revendedorId;

  const body = await request.json();
  const { nomeEmpresa, nomeAdmin, emailAdmin, senhaAdmin, plano, cnpj } = body;

  if (!nomeEmpresa || !nomeAdmin || !emailAdmin || !senhaAdmin) {
    return NextResponse.json({ erro: 'Campos obrigatórios: nomeEmpresa, nomeAdmin, emailAdmin, senhaAdmin' }, { status: 400 });
  }

  // Verificar email duplicado
  const emailExiste = await prisma.usuario.findUnique({ where: { email: emailAdmin.toLowerCase().trim() } });
  if (emailExiste) {
    return NextResponse.json({ erro: 'Email já cadastrado no sistema' }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(senhaAdmin, 10);
  const trialAte = new Date();
  trialAte.setDate(trialAte.getDate() + 14);

  const empresa = await prisma.empresa.create({
    data: {
      nome: nomeEmpresa.trim(),
      cnpj: cnpj?.trim() || null,
      plano: plano || 'PROFESSIONAL',
      revendedorId,
      trialAte,
      cobrancaAtiva: false,
      status: 'ATIVO',
      usuarios: {
        create: {
          nome: nomeAdmin.trim(),
          email: emailAdmin.toLowerCase().trim(),
          senha: senhaHash,
          cargo: 'ADMIN',
          deveTrocarSenha: true,
        },
      },
    },
    include: { usuarios: { select: { id: true, nome: true, email: true } } },
  });

  return NextResponse.json({
    success: true,
    empresa: { id: empresa.id, nome: empresa.nome },
    admin: empresa.usuarios[0],
  });
}
