import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { gerarSnapshotFechamento } from '@/lib/admin/snapshotFechamento';
import { enviarPushSeguro } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron diário: gera fechamento mensal automático pras empresas que ligaram
 * `fechamentoAutomatico` e hoje (SP) é o dia configurado.
 *
 *   GET /api/cron/fechamento-mensal
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Pra cada empresa elegível:
 *   - Período = mês anterior (do dia 1 ao último dia do mês anterior, em SP)
 *   - Pra cada funcionário ativo (não SUPER_ADMIN/REVENDEDOR):
 *     - Pula se já existe Fechamento desse período (qualquer status)
 *     - Gera snapshot + cria Fechamento PENDENTE
 *     - Dispara push pro funcionário
 *
 * Recomendado rodar 1x por dia (ex.: 06:00 SP).
 */

function getDiaSP(date = new Date()): { ano: number; mes: number; dia: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return {
    ano: parseInt(parts.find(p => p.type === 'year')?.value || '0', 10),
    mes: parseInt(parts.find(p => p.type === 'month')?.value || '0', 10),
    dia: parseInt(parts.find(p => p.type === 'day')?.value || '0', 10),
  };
}

function fmtIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  // mes 1-12. Day 0 do mês+1 retorna o último dia do mês.
  return new Date(ano, mes, 0).getDate();
}

function formatBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export async function GET(req: NextRequest) {
  // Auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }

  const { ano, mes, dia } = getDiaSP();

  // Mês anterior
  const mesAnt = mes === 1 ? 12 : mes - 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;
  const ultimoDia = ultimoDiaDoMes(anoAnt, mesAnt);
  const periodoInicio = fmtIso(anoAnt, mesAnt, 1);
  const periodoFim = fmtIso(anoAnt, mesAnt, ultimoDia);
  const periodoIniDt = new Date(periodoInicio + 'T00:00:00');
  const periodoFimDt = new Date(periodoFim + 'T23:59:59.999');

  const empresas = await prisma.empresa.findMany({
    where: { status: 'ATIVO' },
    select: { id: true, nome: true, configuracoes: true },
  });

  const resultados: { empresaId: string; nome: string; criados: number; pulados: number; erros: number }[] = [];

  for (const emp of empresas) {
    const cfg = (emp.configuracoes as any) || {};
    if (cfg.fechamentoAutomatico !== true) continue;

    const diaCfg = typeof cfg.fechamentoDiaMes === 'number' ? cfg.fechamentoDiaMes : 1;
    if (diaCfg !== dia) continue;

    // Pega um admin pra usar como adminCriador (req do schema). Prefere o primeiro ADMIN ativo.
    const adminCriador = await prisma.usuario.findFirst({
      where: { empresaId: emp.id, cargo: 'ADMIN' },
      select: { id: true },
    });
    if (!adminCriador) continue;

    const funcionarios = await prisma.usuario.findMany({
      where: { empresaId: emp.id, cargo: 'FUNCIONARIO' },
      select: { id: true, nome: true },
    });

    let criados = 0, pulados = 0, erros = 0;

    for (const f of funcionarios) {
      try {
        const existente = await prisma.fechamento.findFirst({
          where: {
            funcionarioId: f.id,
            periodoInicio: periodoIniDt,
            periodoFim: periodoFimDt,
          },
        });
        if (existente) { pulados++; continue; }

        const snapshot = await gerarSnapshotFechamento(emp.id, f.id, periodoInicio, periodoFim);

        const fechamento = await prisma.fechamento.create({
          data: {
            empresaId: emp.id,
            funcionarioId: f.id,
            adminCriadorId: adminCriador.id,
            periodoInicio: periodoIniDt,
            periodoFim: periodoFimDt,
            status: 'PENDENTE',
            snapshot: snapshot as any,
          },
        });

        enviarPushSeguro(f.id, {
          title: 'Fechamento de ponto pra assinar',
          body: `Período de ${formatBR(periodoInicio)} a ${formatBR(periodoFim)} aguardando sua confirmação.`,
          url: '/funcionario/fechamentos',
          tag: `fechamento-${fechamento.id}`,
        }).catch(() => {});

        criados++;
      } catch (err) {
        console.error(`[fechamento-mensal] erro empresa=${emp.id} funcionario=${f.id}`, err);
        erros++;
      }
    }

    resultados.push({ empresaId: emp.id, nome: emp.nome, criados, pulados, erros });
  }

  return NextResponse.json({
    ok: true,
    diaSP: dia,
    periodoFechado: { inicio: periodoInicio, fim: periodoFim },
    resultados,
  });
}
