import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

const TZ = 'America/Sao_Paulo';

/**
 * Converte "YYYY-MM-DD" (data do input type="date") para Date (UTC),
 * assumindo que a data é do calendário de São Paulo (meia-noite em SP).
 */
function parseDateISOToUTC(dateISO: string) {
  // dateISO esperado: "2026-02-17"
  // Cria "2026-02-17 00:00:00" no fuso de SP e converte para UTC
  return fromZonedTime(`${dateISO} 00:00:00`, TZ);
}

/**
 * Converte um Date (armazenado como UTC no DB) para "YYYY-MM-DD"
 * no fuso de São Paulo, para não quebrar no front.
 */
function toDateISOInSP(date: Date) {
  return formatInTimeZone(date, TZ, 'yyyy-MM-dd');
}

// LISTAR
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  const feriados = await prisma.feriado.findMany({
    where: { empresaId: session.user.empresaId },
    orderBy: { data: 'asc' },
  });

  // Normaliza para o front não sofrer com timezone:
  // adiciona dataISO: "YYYY-MM-DD"
  const payload = feriados.map((f) => ({
    ...f,
    dataISO: toDateISOInSP(f.data),
  }));

  return NextResponse.json(payload);
}

// CRIAR
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = String(body?.data || '').trim(); // "YYYY-MM-DD"
    const nome = String(body?.nome || '').trim();

    if (!data || !nome) {
      return NextResponse.json({ erro: 'Dados inválidos' }, { status: 400 });
    }

    const dataObj = parseDateISOToUTC(data);

    await prisma.feriado.create({
      data: {
        data: dataObj,
        nome,
        empresaId: session.user.empresaId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao criar' }, { status: 500 });
  }
}

// DELETAR
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ erro: 'ID necessário' }, { status: 400 });

    await prisma.feriado.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao deletar' }, { status: 500 });
  }
}
