import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { put, del } from '@vercel/blob';

// === HELPER PARA CORRIGIR DATA (FUSO HORÁRIO) ===
// Adiciona T12:00:00 para garantir que a data caia no meio do dia,
// evitando que o fuso horário (UTC-3) jogue para o dia anterior.
const criarDataAjustada = (dataString: string) => {
  if (!dataString) return new Date();
  return new Date(`${dataString}T12:00:00`);
};

// === GET: LISTAR HISTÓRICO ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const ausencias = await prisma.ausencia.findMany({
      where: { usuarioId: session.user.id },
      orderBy: { criadoEm: 'desc' }
    });

    return NextResponse.json(ausencias);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar histórico' }, { status: 500 });
  }
}

// === POST: CRIAR NOVA SOLICITAÇÃO ===
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const formData = await request.formData();
    const dataInicio = formData.get('dataInicio') as string;
    const dataFim = formData.get('dataFim') as string;
    const tipo = formData.get('tipo') as string;
    const motivo = formData.get('motivo') as string;
    const arquivo = formData.get('comprovante') as File | null;

    let comprovanteUrl = null;

    if (arquivo && arquivo.size > 0) {
      const extensao = arquivo.name.split('.').pop() || 'jpg';
      const filename = `atestado-${session.user.id}-${Date.now()}.${extensao}`;
      const blob = await put(filename, arquivo, { access: 'public' });
      comprovanteUrl = blob.url;
    }

    // AQUI ESTÁ A CORREÇÃO: Usamos a função criarDataAjustada
    const inicio = criarDataAjustada(dataInicio);
    const fim = dataFim ? criarDataAjustada(dataFim) : inicio;

    await prisma.ausencia.create({
      data: {
        usuarioId: session.user.id,
        dataInicio: inicio,
        dataFim: fim,
        tipo,
        motivo,
        comprovanteUrl,
        status: 'PENDENTE'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao solicitar ausência' }, { status: 500 });
  }
}

// === PUT: EDITAR SOLICITAÇÃO ===
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const dataInicio = formData.get('dataInicio') as string;
    const dataFim = formData.get('dataFim') as string;
    const tipo = formData.get('tipo') as string;
    const motivo = formData.get('motivo') as string;
    const arquivo = formData.get('comprovante') as File | null;

    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    const ausenciaAtual = await prisma.ausencia.findUnique({ where: { id } });

    if (!ausenciaAtual || ausenciaAtual.usuarioId !== session.user.id) {
        return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
    }
    if (ausenciaAtual.status !== 'PENDENTE') {
        return NextResponse.json({ erro: 'Só é possível editar solicitações pendentes.' }, { status: 400 });
    }

    let comprovanteUrl = undefined;

    if (arquivo && arquivo.size > 0) {
        if (ausenciaAtual.comprovanteUrl) {
            try { await del(ausenciaAtual.comprovanteUrl); } catch(e) {}
        }
        const extensao = arquivo.name.split('.').pop() || 'jpg';
        const filename = `atestado-${session.user.id}-${Date.now()}.${extensao}`;
        const blob = await put(filename, arquivo, { access: 'public' });
        comprovanteUrl = blob.url;
    }

    // AQUI ESTÁ A CORREÇÃO NO EDITAR TAMBÉM
    const inicio = criarDataAjustada(dataInicio);
    const fim = dataFim ? criarDataAjustada(dataFim) : inicio;

    await prisma.ausencia.update({
      where: { id },
      data: {
        dataInicio: inicio,
        dataFim: fim,
        tipo,
        motivo,
        ...(comprovanteUrl && { comprovanteUrl }) 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao editar' }, { status: 500 });
  }
}

// === DELETE: CANCELAR SOLICITAÇÃO ===
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

        const ausencia = await prisma.ausencia.findUnique({ where: { id } });

        if (!ausencia || ausencia.usuarioId !== session.user.id) {
            return NextResponse.json({ erro: 'Não encontrado' }, { status: 404 });
        }

        if (ausencia.status !== 'PENDENTE') {
            return NextResponse.json({ erro: 'Não é possível excluir solicitações já processadas.' }, { status: 400 });
        }

        if (ausencia.comprovanteUrl) {
            try { await del(ausencia.comprovanteUrl); } catch(e) {}
        }

        await prisma.ausencia.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ erro: 'Erro ao excluir' }, { status: 500 });
    }
}