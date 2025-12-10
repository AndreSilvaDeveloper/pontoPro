import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// LISTAR
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  const feriados = await prisma.feriado.findMany({
    where: { empresaId: session.user.empresaId },
    orderBy: { data: 'asc' }
  });

  return NextResponse.json(feriados);
}

// CRIAR
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { data, nome } = await request.json();
    
    // Ajuste de fuso horário simples (String YYYY-MM-DD para Date)
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia); // Mês começa em 0 no JS

    await prisma.feriado.create({
      data: {
        data: dataObj,
        nome,
        empresaId: session.user.empresaId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao criar' }, { status: 500 });
  }
}

// DELETAR
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if(!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    await prisma.feriado.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao deletar' }, { status: 500 });
  }
}