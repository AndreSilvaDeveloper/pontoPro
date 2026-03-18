import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

async function checkSuperAdmin() {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'SUPER_ADMIN') return null;
  return session;
}

// GET: Listar revendedores com detalhes
export async function GET() {
  if (!await checkSuperAdmin()) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const revendedores = await prisma.revendedor.findMany({
    include: {
      _count: { select: { empresas: true } },
      usuarios: { select: { id: true, nome: true, email: true } },
      empresas: {
        select: {
          id: true,
          nome: true,
          status: true,
          plano: true,
          criadoEm: true,
          _count: { select: { usuarios: true } },
        },
        orderBy: { criadoEm: 'desc' },
      },
    },
    orderBy: { criadoEm: 'desc' },
  });

  return NextResponse.json(revendedores.map(r => ({
    id: r.id,
    nome: r.nome,
    nomeExibicao: r.nomeExibicao,
    logoUrl: r.logoUrl,
    corPrimaria: r.corPrimaria,
    corSecundaria: r.corSecundaria,
    dominio: r.dominio,
    ativo: r.ativo,
    criadoEm: r.criadoEm,
    totalEmpresas: r._count.empresas,
    usuarios: r.usuarios,
    empresas: r.empresas.map(e => ({
      id: e.id,
      nome: e.nome,
      status: e.status,
      plano: e.plano,
      totalUsuarios: e._count.usuarios,
      criadoEm: e.criadoEm,
    })),
  })));
}

// POST: Criar revendedor + usuario de acesso
export async function POST(request: Request) {
  if (!await checkSuperAdmin()) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const body = await request.json();
  const { nome, nomeExibicao, dominio, emailUsuario, senhaUsuario, nomeUsuario } = body;

  if (!nome || !emailUsuario || !senhaUsuario || !nomeUsuario) {
    return NextResponse.json({ erro: 'Campos obrigatorios: nome, emailUsuario, senhaUsuario, nomeUsuario' }, { status: 400 });
  }

  const emailExiste = await prisma.usuario.findUnique({ where: { email: emailUsuario.toLowerCase().trim() } });
  if (emailExiste) return NextResponse.json({ erro: 'Email ja cadastrado' }, { status: 400 });

  if (dominio) {
    const dominioExiste = await prisma.revendedor.findFirst({ where: { dominio: dominio.trim() } });
    if (dominioExiste) return NextResponse.json({ erro: 'Dominio ja em uso' }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(senhaUsuario, 10);

  const revendedor = await prisma.revendedor.create({
    data: {
      nome: nome.trim(),
      nomeExibicao: nomeExibicao?.trim() || nome.trim(),
      dominio: dominio?.trim() || null,
      usuarios: {
        create: {
          nome: nomeUsuario.trim(),
          email: emailUsuario.toLowerCase().trim(),
          senha: senhaHash,
          cargo: 'REVENDEDOR',
        },
      },
    },
    include: { usuarios: { select: { id: true, email: true } } },
  });

  return NextResponse.json({ success: true, revendedor: { id: revendedor.id, nome: revendedor.nome }, usuario: revendedor.usuarios[0] });
}

// PUT: Editar revendedor (ativar/desativar, editar dados)
export async function PUT(request: Request) {
  if (!await checkSuperAdmin()) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const body = await request.json();
  const { id, nome, nomeExibicao, dominio, ativo } = body;

  if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });

  const updateData: any = {};
  if (nome !== undefined) updateData.nome = nome.trim();
  if (nomeExibicao !== undefined) updateData.nomeExibicao = nomeExibicao.trim() || null;
  if (dominio !== undefined) updateData.dominio = dominio.trim() || null;
  if (ativo !== undefined) updateData.ativo = ativo;

  if (dominio) {
    const dominioExiste = await prisma.revendedor.findFirst({ where: { dominio: dominio.trim(), NOT: { id } } });
    if (dominioExiste) return NextResponse.json({ erro: 'Dominio ja em uso' }, { status: 400 });
  }

  await prisma.revendedor.update({ where: { id }, data: updateData });
  return NextResponse.json({ success: true });
}

// DELETE: Excluir revendedor (desvincula empresas e remove usuarios REVENDEDOR)
export async function DELETE(request: Request) {
  if (!await checkSuperAdmin()) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });

  const rev = await prisma.revendedor.findUnique({
    where: { id },
    include: { _count: { select: { empresas: true } } },
  });

  if (!rev) return NextResponse.json({ erro: 'Revendedor nao encontrado' }, { status: 404 });

  // Desvincular empresas (não exclui, só remove o revendedorId)
  await prisma.empresa.updateMany({ where: { revendedorId: id }, data: { revendedorId: null } });

  // Excluir usuarios REVENDEDOR vinculados
  await prisma.usuario.deleteMany({ where: { revendedorId: id, cargo: 'REVENDEDOR' } });

  // Excluir o revendedor
  await prisma.revendedor.delete({ where: { id } });

  return NextResponse.json({ success: true, empresasDesvinculadas: rev._count.empresas });
}
