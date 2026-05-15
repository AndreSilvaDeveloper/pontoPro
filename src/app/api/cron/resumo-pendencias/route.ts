import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enviarEmailSeguro } from '@/lib/email';
import { enviarPushAdmins } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cron que envia resumo diário de pendências (ajustes + atestados) pros admins
 * das empresas que têm a config `resumoDiarioAtivo` ligada.
 *
 * Deve ser chamado de hora em hora por um scheduler externo:
 *   GET /api/cron/resumo-pendencias
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * A cada invocação:
 * - Lê a hora atual em SP (0-23)
 * - Itera empresas ATIVAS com `resumoDiarioAtivo=true` e `resumoDiarioHora == hora atual`
 * - Conta ajustes e atestados pendentes
 * - Envia push e/ou email pros admins, conforme `resumoDiarioCanal`
 * - Pula empresa onde já enviou hoje (controle simples por dia em `resumoDiarioUltimoEnvio`)
 */

function getHoraSP(date = new Date()): number {
  const hh = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false,
  }).format(date);
  return parseInt(hh, 10);
}

function getDiaSP(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
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

  const horaAtual = getHoraSP();
  const diaAtual = getDiaSP();

  const empresas = await prisma.empresa.findMany({
    where: { status: 'ATIVO' },
    select: {
      id: true,
      nome: true,
      configuracoes: true,
      usuarios: {
        where: { cargo: 'ADMIN' },
        select: { id: true, email: true, nome: true },
      },
    },
  });

  const resultados: { empresaId: string; nome: string; ajustes: number; ausencias: number; canais: string[] }[] = [];

  for (const emp of empresas) {
    const cfg = (emp.configuracoes as any) || {};
    if (cfg.resumoDiarioAtivo !== true) continue;

    const horaCfg = typeof cfg.resumoDiarioHora === 'number' ? cfg.resumoDiarioHora : 8;
    if (horaCfg !== horaAtual) continue;

    // Evita enviar 2x no mesmo dia (caso o cron rode múltiplas vezes na hora)
    if (cfg.resumoDiarioUltimoEnvio === diaAtual) continue;

    const canalCfg = cfg.resumoDiarioCanal === 'push' ? 'push'
      : cfg.resumoDiarioCanal === 'email' ? 'email'
      : 'ambos';

    // Conta pendências
    const [ajustes, ausencias] = await Promise.all([
      prisma.solicitacaoAjuste.count({
        where: {
          status: 'PENDENTE',
          usuario: { empresaId: emp.id },
        },
      }),
      prisma.ausencia.count({
        where: {
          status: 'PENDENTE',
          usuario: { empresaId: emp.id },
        },
      }),
    ]);

    const totalPendencias = ajustes + ausencias;
    const canais: string[] = [];

    // Só envia se tem ao menos 1 pendência (senão é spam)
    if (totalPendencias === 0) {
      // marca como enviado pra não ficar checando a cada hora
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { configuracoes: { ...cfg, resumoDiarioUltimoEnvio: diaAtual } as any },
      });
      continue;
    }

    const tituloPush = `${totalPendencias} pendência${totalPendencias > 1 ? 's' : ''} pra você revisar`;
    const partesBody: string[] = [];
    if (ajustes > 0) partesBody.push(`${ajustes} ajuste${ajustes > 1 ? 's' : ''}`);
    if (ausencias > 0) partesBody.push(`${ausencias} atestado${ausencias > 1 ? 's' : ''}`);
    const bodyPush = partesBody.join(' · ');

    // Push
    if (canalCfg === 'push' || canalCfg === 'ambos') {
      try {
        await enviarPushAdmins(emp.id, {
          title: tituloPush,
          body: bodyPush,
          url: ajustes >= ausencias ? '/admin/solicitacoes' : '/admin/pendencias',
          tag: `resumo-diario-${diaAtual}`,
        });
        canais.push('push');
      } catch { /* falha de push de um admin não derruba a empresa toda */ }
    }

    // Email
    if (canalCfg === 'email' || canalCfg === 'ambos') {
      const linhas: string[] = [];
      if (ajustes > 0) linhas.push(`<li><b>${ajustes}</b> solicitação${ajustes > 1 ? 'ões' : ''} de ajuste pendente${ajustes > 1 ? 's' : ''}</li>`);
      if (ausencias > 0) linhas.push(`<li><b>${ausencias}</b> atestado${ausencias > 1 ? 's' : ''} pendente${ausencias > 1 ? 's' : ''} de análise</li>`);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #5b21b6; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Resumo de Pendências — WorkID</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 28px;">
            <p style="color: #111827; font-size: 15px; margin: 0 0 14px 0;">
              Bom dia! Você tem <b>${totalPendencias} item${totalPendencias > 1 ? 's' : ''}</b> pra revisar hoje em <b>${emp.nome}</b>:
            </p>
            <ul style="color: #111827; font-size: 15px; line-height: 1.7;">
              ${linhas.join('')}
            </ul>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              Resumo enviado automaticamente todo dia às ${String(horaAtual).padStart(2, '0')}:00.
              Você pode ajustar horário e canal em <b>Configurações → Notificações</b>.
            </p>
          </div>
        </div>
      `;

      for (const admin of emp.usuarios) {
        if (admin.email) {
          await enviarEmailSeguro(admin.email, `Resumo do dia — ${totalPendencias} pendência${totalPendencias > 1 ? 's' : ''}`, html);
        }
      }
      canais.push('email');
    }

    // Marca como enviado hoje
    await prisma.empresa.update({
      where: { id: emp.id },
      data: { configuracoes: { ...cfg, resumoDiarioUltimoEnvio: diaAtual } as any },
    });

    resultados.push({ empresaId: emp.id, nome: emp.nome, ajustes, ausencias, canais });
  }

  return NextResponse.json({
    ok: true,
    horaSP: horaAtual,
    diaSP: diaAtual,
    enviados: resultados,
  });
}
