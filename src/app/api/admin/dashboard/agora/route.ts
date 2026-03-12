import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);

  try {
    const funcionarios = await prisma.usuario.findMany({
      where: {
        empresaId: session.user.empresaId,
        cargo: { not: 'ADMIN' },
      },
      select: {
        id: true,
        nome: true,
        tituloCargo: true,
        fotoPerfilUrl: true,
        pontos: {
          where: {
            dataHora: { gte: inicioDoDia, lte: fimDoDia },
          },
          orderBy: { dataHora: 'asc' },
        },
      },
    });

    const agora = new Date();

    const dadosProcessados = funcionarios.map((f) => {
      const pontos = f.pontos;
      const primeiroPonto = pontos[0];
      const ultimoPonto = pontos[pontos.length - 1];

      let status: 'TRABALHANDO' | 'ALMOCO' | 'CAFE' | 'CAFE_EXCEDIDO' | 'ENCERROU' | 'OFFLINE' = 'OFFLINE';
      let statusLabel = 'Offline';
      let tempoNoStatus = 0; // minutos
      let horaEntrada: Date | null = null;
      let minutosTrabalhadosHoje = 0;

      if (primeiroPonto) {
        const priTipo = primeiroPonto.subTipo || primeiroPonto.tipo;
        if (['ENTRADA', 'PONTO'].includes(priTipo)) {
          horaEntrada = new Date(primeiroPonto.dataHora);
        }
      }

      // Calcula minutos trabalhados hoje (pares entrada/saída)
      for (let i = 0; i < pontos.length; i++) {
        const p = pontos[i];
        const tipo = p.subTipo || p.tipo;
        if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipo)) {
          const entrada = new Date(p.dataHora);
          const pSaida = pontos[i + 1];
          if (pSaida) {
            const tipoSaida = pSaida.subTipo || pSaida.tipo;
            if (['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
              const saida = new Date(pSaida.dataHora);
              const diff = Math.floor((saida.getTime() - entrada.getTime()) / 60000);
              if (diff > 0 && diff < 1440) minutosTrabalhadosHoje += diff;
              i++;
            } else {
              // Entrada sem saída = está trabalhando agora
              const diff = Math.floor((agora.getTime() - entrada.getTime()) / 60000);
              if (diff > 0) minutosTrabalhadosHoje += diff;
            }
          } else {
            // Último ponto é entrada = está trabalhando agora
            const diff = Math.floor((agora.getTime() - entrada.getTime()) / 60000);
            if (diff > 0) minutosTrabalhadosHoje += diff;
          }
        }
      }

      if (ultimoPonto) {
        const tipo = ultimoPonto.subTipo || ultimoPonto.tipo;
        const dataUltimo = new Date(ultimoPonto.dataHora);
        tempoNoStatus = Math.floor((agora.getTime() - dataUltimo.getTime()) / 60000);

        if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipo)) {
          status = 'TRABALHANDO';
          statusLabel = 'Trabalhando';
        } else if (tipo === 'SAIDA_ALMOCO') {
          status = 'ALMOCO';
          statusLabel = 'Almoço';
        } else if (tipo === 'SAIDA_INTERVALO') {
          if (tempoNoStatus <= 15) {
            status = 'CAFE';
            statusLabel = 'Pausa Café';
          } else {
            status = 'CAFE_EXCEDIDO';
            statusLabel = 'Café Excedido';
          }
        } else if (tipo === 'SAIDA') {
          status = 'ENCERROU';
          statusLabel = 'Encerrou';
        }
      }

      return {
        id: f.id,
        nome: f.nome,
        cargo: f.tituloCargo || 'Colaborador',
        foto: f.fotoPerfilUrl,
        status,
        statusLabel,
        tempoNoStatus,
        horaEntrada: horaEntrada?.toISOString() || null,
        horarioUltimaAcao: ultimoPonto?.dataHora?.toISOString() || null,
        minutosTrabalhadosHoje,
        totalPontos: pontos.length,
      };
    });

    const resumo = {
      total: dadosProcessados.length,
      trabalhando: dadosProcessados.filter((d) => d.status === 'TRABALHANDO').length,
      almoco: dadosProcessados.filter((d) => d.status === 'ALMOCO').length,
      cafe: dadosProcessados.filter((d) => d.status === 'CAFE' || d.status === 'CAFE_EXCEDIDO').length,
      encerrou: dadosProcessados.filter((d) => d.status === 'ENCERROU').length,
      offline: dadosProcessados.filter((d) => d.status === 'OFFLINE').length,
    };

    return NextResponse.json({ lista: dadosProcessados, resumo });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ erro: 'Erro ao buscar dashboard' }, { status: 500 });
  }
}
