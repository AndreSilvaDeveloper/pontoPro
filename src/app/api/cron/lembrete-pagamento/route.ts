import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enviarPushSeguro } from '@/lib/push';
import { asaas } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

function dataSP(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const g = (t: string) => parts.find(p => p.type === t)!.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

function diffDiasISO(hojeISO: string, dueISO: string): number {
  const th = new Date(`${hojeISO}T00:00:00Z`).getTime();
  const td = new Date(`${dueISO}T00:00:00Z`).getTime();
  return Math.round((th - td) / 86_400_000);
}

type Gatilho = {
  dias: number;
  tipo: string;
  titulo: string;
  body: (dueBR: string) => string;
};

const GATILHOS: Gatilho[] = [
  {
    dias: -3,
    tipo: 'PAGAMENTO_D_MINUS_3',
    titulo: 'Seu boleto vence em 3 dias',
    body: (d) => `Boleto WorkID vence em ${d}. Evite atrasos e bloqueios pagando com antecedência.`,
  },
  {
    dias: 0,
    tipo: 'PAGAMENTO_VENCE_HOJE',
    titulo: 'Seu boleto vence hoje',
    body: () => 'Hoje é o último dia para pagar sem atraso. Abra o sistema e pague pelo PIX ou boleto.',
  },
  {
    dias: 3,
    tipo: 'PAGAMENTO_ATRASADO_3D',
    titulo: 'Boleto atrasado há 3 dias',
    body: () => 'Regularize o pagamento para evitar suspensão do acesso.',
  },
  {
    dias: 7,
    tipo: 'PAGAMENTO_QUASE_BLOQUEIO',
    titulo: 'Acesso será bloqueado em 3 dias',
    body: () => 'Seu boleto está 7 dias atrasado. O acesso da empresa será suspenso em 3 dias se o pagamento não for regularizado.',
  },
];

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    const hojeISO = dataSP();

    const empresas = await prisma.empresa.findMany({
      where: {
        status: 'ATIVO',
        matrizId: null,
        asaasCurrentPaymentId: { not: null },
        asaasCurrentDueDate: { not: null },
      },
      select: {
        id: true,
        nome: true,
        asaasCurrentPaymentId: true,
        asaasCurrentDueDate: true,
      },
    });

    let enviados = 0;
    let verificadas = 0;

    for (const emp of empresas) {
      if (!emp.asaasCurrentDueDate || !emp.asaasCurrentPaymentId) continue;

      const dueISO = emp.asaasCurrentDueDate.toISOString().slice(0, 10);
      const diff = diffDiasISO(hojeISO, dueISO);

      const gatilho = GATILHOS.find(g => g.dias === diff);
      if (!gatilho) continue;

      verificadas++;

      // Confirma no Asaas que o boleto ainda está em aberto (evita lembrete
      // após pagamento já feito mas webhook atrasado)
      let payment: any = null;
      try {
        payment = (await asaas.get(`/payments/${emp.asaasCurrentPaymentId}`)).data;
      } catch {
        continue;
      }
      if (!payment || !['PENDING', 'OVERDUE'].includes(payment.status)) continue;

      const admins = await prisma.usuario.findMany({
        where: {
          empresaId: emp.id,
          cargo: 'ADMIN',
          pushSubscriptions: { some: {} },
        },
        select: { id: true },
      });
      if (admins.length === 0) continue;

      const adminIds = admins.map(a => a.id);
      const jaEnviados = await prisma.lembretePush.findMany({
        where: { usuarioId: { in: adminIds }, tipo: gatilho.tipo, data: hojeISO },
        select: { usuarioId: true },
      });
      const enviadosSet = new Set(jaEnviados.map(e => e.usuarioId));

      const [y, m, d] = dueISO.split('-').map(Number);
      const dueBR = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

      const pushes: Promise<void>[] = [];
      const inserts: { usuarioId: string; tipo: string; data: string }[] = [];

      for (const admin of admins) {
        if (enviadosSet.has(admin.id)) continue;
        pushes.push(
          enviarPushSeguro(admin.id, {
            title: gatilho.titulo,
            body: gatilho.body(dueBR),
            tag: `pagamento-${gatilho.tipo.toLowerCase()}`,
            url: '/admin/perfil',
          })
        );
        inserts.push({ usuarioId: admin.id, tipo: gatilho.tipo, data: hojeISO });
      }

      await Promise.allSettled(pushes);

      if (inserts.length > 0) {
        await prisma.lembretePush.createMany({
          data: inserts,
          skipDuplicates: true,
        });
      }

      enviados += inserts.length;
    }

    console.log(`Lembrete pagamento: ${empresas.length} empresas, ${verificadas} no gatilho, ${enviados} pushes (${hojeISO})`);

    return NextResponse.json({
      empresas: empresas.length,
      verificadas,
      enviados,
    });
  } catch (error) {
    console.error('Erro no lembrete de pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao processar lembretes de pagamento' },
      { status: 500 }
    );
  }
}
