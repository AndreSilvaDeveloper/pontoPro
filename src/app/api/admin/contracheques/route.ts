import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { storagePut, storageDel } from '@/lib/storage';
import { enviarPushSeguro } from '@/lib/push';

const MESES_PT: Record<string, string> = {
  '01': 'janeiro', '02': 'fevereiro', '03': 'março', '04': 'abril',
  '05': 'maio', '06': 'junho', '07': 'julho', '08': 'agosto',
  '09': 'setembro', '10': 'outubro', '11': 'novembro', '12': 'dezembro',
};

// === GET: Listar contracheques da empresa ===
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');

    // @ts-ignore
    const empresaId = session.user.empresaId as string;

    const where: any = { empresaId };
    if (mes) where.mes = mes;

    const contracheques = await prisma.contracheque.findMany({
      where,
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
      },
      orderBy: [{ mes: 'desc' }, { criadoEm: 'desc' }],
    });

    // Also return list of employees for the upload form
    const funcionarios = await prisma.usuario.findMany({
      where: { empresaId, cargo: { not: 'ADMIN' } },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json({ contracheques, funcionarios });
  } catch (error) {
    console.error('Erro GET contracheques:', error);
    return NextResponse.json({ erro: 'Erro ao buscar contracheques' }, { status: 500 });
  }
}

// === POST: Upload contracheque PDF ===
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const usuarioId = formData.get('usuarioId') as string;
    const mes = formData.get('mes') as string;
    const orientacao = (formData.get('orientacao') as string) || 'RETRATO';

    if (!file || !usuarioId || !mes) {
      return NextResponse.json({ erro: 'Campos obrigatórios: file, usuarioId, mes' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ erro: 'Apenas arquivos PDF são aceitos' }, { status: 400 });
    }

    // Validate mes format
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json({ erro: 'Formato do mês inválido. Use YYYY-MM' }, { status: 400 });
    }

    // @ts-ignore
    const empresaId = session.user.empresaId as string;

    // Verify employee belongs to the company
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
    });
    if (!usuario) {
      return NextResponse.json({ erro: 'Funcionário não encontrado' }, { status: 404 });
    }

    // Check for existing contracheque for the same month
    const existente = await prisma.contracheque.findUnique({
      where: { usuarioId_mes: { usuarioId, mes } },
    });
    if (existente) {
      // Delete old file and update
      await storageDel(existente.arquivoUrl).catch(() => {});

      const filename = `contracheques/${empresaId}/${usuarioId}-${mes}.pdf`;
      const blob = await storagePut(filename, file, { access: 'public', permanente: true, contentType: 'application/pdf' });

      const atualizado = await prisma.contracheque.update({
        where: { id: existente.id },
        data: {
          arquivoUrl: blob.url,
          nomeArquivo: file.name,
          // @ts-ignore
          enviadoPorId: session.user.id,
          // @ts-ignore
          enviadoPorNome: session.user.nome || session.user.name || 'Admin',
          visualizado: false,
          visualizadoEm: null,
          orientacao,
          assinado: false,
          assinadoEm: null,
          assinaturaUrl: null,
        },
      });

      // Push notification
      const mesNum = mes.split('-')[1];
      const mesNome = MESES_PT[mesNum] || mesNum;
      await enviarPushSeguro(usuarioId, {
        title: 'Contracheque disponível',
        body: `Seu contracheque de ${mesNome} foi atualizado`,
        url: '/funcionario/contracheques',
        tag: `contracheque-${mes}`,
      });

      return NextResponse.json(atualizado);
    }

    // Upload file
    const filename = `contracheques/${empresaId}/${usuarioId}-${mes}.pdf`;
    const blob = await storagePut(filename, file, { access: 'public', permanente: true, contentType: 'application/pdf' });

    const contracheque = await prisma.contracheque.create({
      data: {
        empresaId,
        usuarioId,
        mes,
        arquivoUrl: blob.url,
        nomeArquivo: file.name,
        // @ts-ignore
        enviadoPorId: session.user.id,
        // @ts-ignore
        enviadoPorNome: session.user.nome || session.user.name || 'Admin',
        orientacao,
      },
    });

    // Push notification
    const mesNum = mes.split('-')[1];
    const mesNome = MESES_PT[mesNum] || mesNum;
    await enviarPushSeguro(usuarioId, {
      title: 'Contracheque disponível',
      body: `Seu contracheque de ${mesNome} está disponível`,
      url: '/funcionario/contracheques',
      tag: `contracheque-${mes}`,
    });

    return NextResponse.json(contracheque);
  } catch (error) {
    console.error('Erro POST contracheque:', error);
    return NextResponse.json({ erro: 'Erro ao enviar contracheque' }, { status: 500 });
  }
}

// === DELETE: Remover contracheque ===
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    // @ts-ignore
    const empresaId = session.user.empresaId as string;

    const contracheque = await prisma.contracheque.findFirst({
      where: { id, empresaId },
    });
    if (!contracheque) {
      return NextResponse.json({ erro: 'Contracheque não encontrado' }, { status: 404 });
    }

    // Delete file from storage
    await storageDel(contracheque.arquivoUrl).catch(() => {});

    await prisma.contracheque.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro DELETE contracheque:', error);
    return NextResponse.json({ erro: 'Erro ao excluir contracheque' }, { status: 500 });
  }
}
