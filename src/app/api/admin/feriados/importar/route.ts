import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.cargo !== 'ADMIN') return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  try {
    const { ano } = await request.json();
    
    // 1. Busca na Brasil API
    const resp = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    if (!resp.ok) throw new Error('Falha ao buscar na Brasil API');
    
    const feriadosNacionais = await resp.json();

    // 2. Salva no Banco (Verificando duplicidade)
    let contagem = 0;

    for (const feriado of feriadosNacionais) {
      // Converte "2025-12-25" para Date correto
      const [y, m, d] = feriado.date.split('-').map(Number);
      const dataFeriado = new Date(y, m - 1, d);

      // Verifica se já existe esse feriado nessa data para essa empresa
      const existe = await prisma.feriado.findFirst({
        where: {
          empresaId: session.user.empresaId,
          data: dataFeriado
        }
      });

      if (!existe) {
        await prisma.feriado.create({
          data: {
            data: dataFeriado,
            nome: feriado.name,
            empresaId: session.user.empresaId
          }
        });
        contagem++;
      }
    }

    return NextResponse.json({ success: true, message: `${contagem} feriados importados!` });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao importar' }, { status: 500 });
  }
}