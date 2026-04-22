import { prisma } from '@/lib/db';

const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;

function parseHM(h?: string): number {
  if (!h || !/^\d{2}:\d{2}$/.test(h)) return 0;
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
}

function getMetaMinutos(jornada: any, diaSemana: number): number {
  const dia = diasMap[diaSemana];
  const config = jornada?.[dia];
  if (!config || !config.ativo) return 0;

  const hasS1 = config.s1 && /^\d{2}:\d{2}$/.test(config.s1);
  const hasE2 = config.e2 && /^\d{2}:\d{2}$/.test(config.e2);

  if (!hasS1 && !hasE2) {
    const e1 = parseHM(config.e1);
    const s2 = parseHM(config.s2);
    return Math.max(0, s2 - e1);
  }

  const bloco1 = Math.max(0, parseHM(config.s1) - parseHM(config.e1));
  const bloco2 = Math.max(0, parseHM(config.s2) - parseHM(config.e2));
  return bloco1 + bloco2;
}

function calcularMinutosTrabalhados(pontos: { dataHora: Date; subTipo?: string | null }[]): number {
  const ordenados = [...pontos].sort(
    (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime(),
  );

  let total = 0;
  for (let i = 0; i < ordenados.length; i++) {
    const pEntrada = ordenados[i];
    const tipoEntrada = pEntrada.subTipo || 'PONTO';

    if (['ENTRADA', 'VOLTA_ALMOCO', 'VOLTA_INTERVALO', 'PONTO'].includes(tipoEntrada)) {
      const pSaida = ordenados[i + 1];
      const tipoSaida = pSaida ? pSaida.subTipo || 'PONTO' : null;

      if (pSaida && tipoSaida && ['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida)) {
        const diff = Math.round(
          (new Date(pSaida.dataHora).getTime() - new Date(pEntrada.dataHora).getTime()) / 60000,
        );
        if (diff > 0 && diff < 1440) {
          total += diff;
        }
        i++;
      }
    }
  }
  return total;
}

interface AtualizarOptions {
  usuarioId: string;
  data: Date;
  adminId?: string;
  adminNome?: string;
}

/**
 * Recalcula a hora extra de um dia específico para um usuário.
 * Usado quando admin cria/edita/exclui um ponto: a aprovação é implícita,
 * então o registro HoraExtra é criado/atualizado diretamente como APROVADO.
 *
 * Se o recálculo não resulta mais em hora extra, remove o registro existente.
 */
export async function atualizarHoraExtraDia({
  usuarioId,
  data,
  adminId,
  adminNome,
}: AtualizarOptions): Promise<void> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, jornada: true, empresaId: true },
  });
  if (!usuario || !usuario.empresaId) return;

  const empresa = await prisma.empresa.findUnique({
    where: { id: usuario.empresaId },
    select: { configuracoes: true },
  });
  const cfg = (empresa?.configuracoes as any) || {};
  const tolerancia = typeof cfg.toleranciaMinutos === 'number' ? cfg.toleranciaMinutos : 10;
  const limiteHE = typeof cfg.limiteDiarioHoraExtraMin === 'number' ? cfg.limiteDiarioHoraExtraMin : 120;

  const ano = data.getFullYear();
  const mes = data.getMonth();
  const dia = data.getDate();
  const diaSemana = data.getDay();

  const inicioDia = new Date(ano, mes, dia, 0, 0, 0, 0);
  const fimDia = new Date(ano, mes, dia, 23, 59, 59, 999);
  const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  const pontos = await prisma.ponto.findMany({
    where: {
      usuarioId,
      dataHora: { gte: inicioDia, lte: fimDia },
    },
    select: { dataHora: true, subTipo: true },
    orderBy: { dataHora: 'asc' },
  });

  const jornada = (usuario.jornada as any) || {};
  const meta = getMetaMinutos(jornada, diaSemana);
  const minTrabalhados = calcularMinutosTrabalhados(pontos);

  const ehHoraExtra = meta > 0
    ? minTrabalhados > meta + tolerancia
    : minTrabalhados > tolerancia;

  if (ehHoraExtra) {
    const minutosExtraBruto = meta > 0 ? minTrabalhados - meta : minTrabalhados;
    const minutosExtra = limiteHE > 0 ? Math.min(minutosExtraBruto, limiteHE) : minutosExtraBruto;

    await prisma.horaExtra.upsert({
      where: { usuarioId_data: { usuarioId, data: dataStr } },
      create: {
        usuarioId,
        data: dataStr,
        minutosExtra,
        status: 'APROVADO',
        aprovadoPorId: adminId,
        aprovadoPorNome: adminNome,
        aprovadoEm: new Date(),
      },
      update: {
        minutosExtra,
        status: 'APROVADO',
        aprovadoPorId: adminId,
        aprovadoPorNome: adminNome,
        aprovadoEm: new Date(),
      },
    });
  } else {
    await prisma.horaExtra.deleteMany({
      where: { usuarioId, data: dataStr },
    });
  }
}
