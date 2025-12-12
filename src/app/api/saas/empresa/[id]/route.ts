import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

async function isSuperAdmin() {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    return session?.user?.cargo === 'SUPER_ADMIN';
}

export async function GET(
  request: Request, 
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params; 
  if (!(await isSuperAdmin())) return NextResponse.json({ erro: '403' }, { status: 403 });

  const empresa = await prisma.empresa.findUnique({
    where: { id: params.id },
    include: { _count: { select: { usuarios: true } } }
  });

  if (!empresa) return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });

  const configs = empresa.configuracoes ? JSON.parse(JSON.stringify(empresa.configuracoes)) : {};
  return NextResponse.json({ ...empresa, configuracoes: configs });
}

export async function PUT(
  request: Request, 
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params; 
  if (!(await isSuperAdmin())) return NextResponse.json({ erro: '403' }, { status: 403 });
  
  try {
    const { novasConfigs } = await request.json();
    await prisma.empresa.update({
      where: { id: params.id },
      data: { configuracoes: novasConfigs }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao salvar' }, { status: 500 });
  }
}