import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  // Pega a data de hoje (00:00:00)
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);

  try {
    // Busca funcionários e seus pontos DE HOJE
    const funcionarios = await prisma.usuario.findMany({
      where: {
        empresaId: session.user.empresaId,
        cargo: { not: 'ADMIN' } // Apenas funcionários
      },
      select: {
        id: true,
        nome: true,
        tituloCargo: true,
        fotoPerfilUrl: true,
        pontos: {
          where: {
            dataHora: {
              gte: inicioDoDia,
              lte: fimDoDia
            }
          },
          orderBy: { dataHora: 'desc' }, // O mais recente primeiro
          take: 1 // Só precisamos do último movimento
        }
      }
    });

    // Processa os dados para entregar o status pronto pro front
    const dadosProcessados = funcionarios.map(f => {
      const ultimoPonto = f.pontos[0];
      
      let status = 'OFFLINE'; // Padrão: Não começou
      let ultimaAcao = null;

      if (ultimoPonto) {
        if (ultimoPonto.tipo === 'ENTRADA') {
          status = 'TRABALHANDO';
        } else if (ultimoPonto.tipo === 'SAIDA') {
          status = 'PAUSA_OU_SAIU';
        }
        ultimaAcao = ultimoPonto.dataHora;
      }

      return {
        id: f.id,
        nome: f.nome,
        cargo: f.tituloCargo || 'Colaborador',
        foto: f.fotoPerfilUrl,
        status, // TRABALHANDO | PAUSA_OU_SAIU | OFFLINE
        horarioUltimaAcao: ultimaAcao
      };
    });

    // Resumo para os Cards do topo
    const resumo = {
      total: dadosProcessados.length,
      trabalhando: dadosProcessados.filter(d => d.status === 'TRABALHANDO').length,
      pausa: dadosProcessados.filter(d => d.status === 'PAUSA_OU_SAIU').length,
      offline: dadosProcessados.filter(d => d.status === 'OFFLINE').length
    };

    return NextResponse.json({ lista: dadosProcessados, resumo });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao buscar dashboard' }, { status: 500 });
  }
}