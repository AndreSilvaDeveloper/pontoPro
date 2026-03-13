import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enviarEmailSeguro } from '@/lib/email';

export const dynamic = 'force-dynamic';

const parseHM = (h: string) => {
  if (!h || !/^\d{2}:\d{2}$/.test(h)) return 0;
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

function getMetaMinutos(jornada: any, diaSemana: number): number {
  const dia = diasMap[diaSemana];
  const config = jornada?.[dia];
  if (!config || !config.ativo) return 0;

  const hasS1 = config.s1 && /^\d{2}:\d{2}$/.test(config.s1);
  const hasE2 = config.e2 && /^\d{2}:\d{2}$/.test(config.e2);

  // Jornada contínua (sem almoço)
  if (!hasS1 && !hasE2) {
    const e1 = parseHM(config.e1);
    const s2 = parseHM(config.s2);
    return Math.max(0, s2 - e1);
  }

  // Jornada com dois blocos
  const bloco1 = Math.max(0, parseHM(config.s1) - parseHM(config.e1));
  const bloco2 = Math.max(0, parseHM(config.s2) - parseHM(config.e2));
  return bloco1 + bloco2;
}

function calcularMinutosTrabalhados(pontos: any[]): number {
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

      if (pSaida && ['SAIDA', 'SAIDA_ALMOCO', 'SAIDA_INTERVALO'].includes(tipoSaida!)) {
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

function formatMinToHM(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    // --- Autenticação ---
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    // --- Data de ontem ---
    const agora = new Date();
    const ontem = new Date(agora);
    ontem.setDate(ontem.getDate() - 1);
    const ano = ontem.getFullYear();
    const mes = ontem.getMonth();
    const dia = ontem.getDate();
    const diaSemana = ontem.getDay(); // 0=dom ... 6=sab

    const inicioOntem = new Date(ano, mes, dia, 0, 0, 0, 0);
    const fimOntem = new Date(ano, mes, dia, 23, 59, 59, 999);
    const ontemStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const ontemFormatado = `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}`;

    // --- Buscar empresas ativas ---
    const empresas = await prisma.empresa.findMany({
      where: { status: 'ATIVO' },
      include: {
        usuarios: {
          select: {
            id: true,
            nome: true,
            email: true,
            cargo: true,
            jornada: true,
          },
        },
        feriados: {
          where: {
            data: {
              gte: inicioOntem,
              lte: fimOntem,
            },
          },
        },
      },
    });

    let emailsEnviados = 0;
    let empresasProcessadas = 0;

    for (const empresa of empresas) {
      const admins = empresa.usuarios.filter((u) => u.cargo === 'ADMIN');
      const funcionarios = empresa.usuarios.filter((u) => u.cargo !== 'ADMIN');

      if (funcionarios.length === 0 || admins.length === 0) continue;

      const feriadoOntem = empresa.feriados.length > 0;

      // Buscar pontos de ontem para todos os funcionários da empresa
      const funcionarioIds = funcionarios.map((f) => f.id);

      const pontosOntem = await prisma.ponto.findMany({
        where: {
          usuarioId: { in: funcionarioIds },
          tipo: 'PONTO',
          dataHora: {
            gte: inicioOntem,
            lte: fimOntem,
          },
        },
        orderBy: { dataHora: 'asc' },
      });

      // Buscar ausências aprovadas que cobrem o dia de ontem
      const ausenciasOntem = await prisma.ausencia.findMany({
        where: {
          usuarioId: { in: funcionarioIds },
          status: 'APROVADA',
          dataInicio: { lte: fimOntem },
          dataFim: { gte: inicioOntem },
        },
      });

      const ausenciaPorUsuario = new Set<string>();
      for (const aus of ausenciasOntem) {
        ausenciaPorUsuario.add(aus.usuarioId);
      }

      // Agrupar pontos por usuário
      const pontosPorUsuario: Record<string, any[]> = {};
      for (const p of pontosOntem) {
        if (!pontosPorUsuario[p.usuarioId]) pontosPorUsuario[p.usuarioId] = [];
        pontosPorUsuario[p.usuarioId].push(p);
      }

      const ausenciasSemJustificativa: string[] = [];
      const atrasados: string[] = [];
      const horaExtra: string[] = [];
      const sairamCedo: string[] = [];
      let presentes = 0;
      let ausentes = 0;

      for (const func of funcionarios) {
        const jornada = (func.jornada as any) || {};
        const meta = getMetaMinutos(jornada, diaSemana);
        const pontos = pontosPorUsuario[func.id] || [];
        const trabalhou = pontos.length > 0;
        const temAusencia = ausenciaPorUsuario.has(func.id);

        if (trabalhou) {
          presentes++;
          const minTrabalhados = calcularMinutosTrabalhados(pontos);

          // Verificar atraso (primeiro ponto ENTRADA)
          const diaKey = diasMap[diaSemana];
          const configDia = jornada[diaKey];
          if (configDia && configDia.ativo && configDia.e1) {
            const metaEntrada = parseHM(configDia.e1);
            const primeiroPonto = pontos[0];
            const horaPrimeiro = new Date(primeiroPonto.dataHora);
            const minPrimeiro = horaPrimeiro.getHours() * 60 + horaPrimeiro.getMinutes();

            if (minPrimeiro > metaEntrada + 10) {
              const atrasoMin = minPrimeiro - metaEntrada;
              const horaChegou = `${String(horaPrimeiro.getHours()).padStart(2, '0')}:${String(horaPrimeiro.getMinutes()).padStart(2, '0')}`;
              atrasados.push(`${func.nome} - chegou ${horaChegou} (atraso de ${atrasoMin}min)`);
            }
          }

          // Hora extra (trabalhou > meta + 30min)
          if (meta > 0 && minTrabalhados > meta + 30) {
            const extra = minTrabalhados - meta;
            horaExtra.push(
              `${func.nome} - trabalhou ${formatMinToHM(minTrabalhados)}, meta ${formatMinToHM(meta)} (+${extra}min)`,
            );
          }

          // Saiu cedo (trabalhou < meta - 30min)
          if (meta > 0 && minTrabalhados < meta - 30) {
            const falta = meta - minTrabalhados;
            sairamCedo.push(
              `${func.nome} - trabalhou ${formatMinToHM(minTrabalhados)}, meta ${formatMinToHM(meta)} (-${falta}min)`,
            );
          }
        } else {
          // Não trabalhou
          if (meta > 0 && !temAusencia && !feriadoOntem) {
            // Dia ativo na jornada, sem justificativa, sem feriado
            ausentes++;
            ausenciasSemJustificativa.push(func.nome);
          } else {
            // Folga, feriado, ou ausência justificada - não conta como ausente
          }
        }
      }

      const totalFuncionarios = funcionarios.length;
      const percentPresenca =
        totalFuncionarios > 0 ? Math.round((presentes / totalFuncionarios) * 100) : 0;

      // --- Montar HTML do e-mail ---
      let secoes = '';

      if (ausenciasSemJustificativa.length > 0) {
        secoes += `
        <h3 style="color: #92400e; margin-top: 24px; margin-bottom: 8px; font-size: 16px;">&#9888;&#65039; Ausências sem justificativa</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${ausenciasSemJustificativa.map((n) => `<li style="margin-bottom: 4px;">${n}</li>`).join('')}
        </ul>`;
      }

      if (atrasados.length > 0) {
        secoes += `
        <h3 style="color: #1e40af; margin-top: 24px; margin-bottom: 8px; font-size: 16px;">&#128336; Chegaram atrasados</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${atrasados.map((n) => `<li style="margin-bottom: 4px;">${n}</li>`).join('')}
        </ul>`;
      }

      if (horaExtra.length > 0) {
        secoes += `
        <h3 style="color: #065f46; margin-top: 24px; margin-bottom: 8px; font-size: 16px;">&#9200; Fizeram hora extra</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${horaExtra.map((n) => `<li style="margin-bottom: 4px;">${n}</li>`).join('')}
        </ul>`;
      }

      if (sairamCedo.length > 0) {
        secoes += `
        <h3 style="color: #7c2d12; margin-top: 24px; margin-bottom: 8px; font-size: 16px;">&#128682; Saíram mais cedo</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151;">
          ${sairamCedo.map((n) => `<li style="margin-bottom: 4px;">${n}</li>`).join('')}
        </ul>`;
      }

      const html = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
  <div style="background-color: #5b21b6; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">WorkID</h1>
    <p style="color: #ddd6fe; margin: 8px 0 0 0; font-size: 14px;">Relatório Diário</p>
  </div>
  <div style="padding: 30px;">
    <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
      Resumo do dia <strong>${ontemFormatado}</strong> - <strong>${empresa.nome}</strong>
    </p>

    <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 8px; font-size: 16px;">Presença</h3>
    <p style="color: #374151; font-size: 15px; background-color: #f3f4f6; padding: 12px 16px; border-radius: 8px; margin-bottom: 0;">
      <strong>${presentes}</strong> de <strong>${totalFuncionarios}</strong> funcionários presentes (<strong>${percentPresenca}%</strong>)
    </p>

    ${secoes}

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 32px;" />
    <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">
      Este relatório foi gerado automaticamente pelo WorkID.
    </p>
  </div>
</div>`;

      const assunto = `Relatório Diário - ${empresa.nome} - ${ontemFormatado}`;

      // Enviar para todos os admins da empresa
      for (const admin of admins) {
        await enviarEmailSeguro(admin.email, assunto, html);
        emailsEnviados++;
      }

      empresasProcessadas++;
    }

    // Limpar lembretes push com mais de 7 dias
    await prisma.lembretePush.deleteMany({
      where: { criadoEm: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }).catch(() => {});

    return NextResponse.json({ empresasProcessadas, emailsEnviados });
  } catch (error) {
    console.error('Erro no relatório diário:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar relatório diário' },
      { status: 500 },
    );
  }
}
