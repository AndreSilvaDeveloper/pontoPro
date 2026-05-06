import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';
import { getPlanoConfig, calcularValorEmpresa } from '@/config/planos';

export const runtime = 'nodejs';

async function isSuperAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.cargo === 'SUPER_ADMIN';
}

export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ erro: 'forbidden' }, { status: 403 });
  }

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioMesPassado = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const fimMesPassado = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const empresas = await prisma.empresa.findMany({
    where: { matrizId: null },
    select: {
      id: true,
      nome: true,
      cnpj: true,
      status: true,
      plano: true,
      billingCycle: true,
      addonTotem: true,
      precoNegociado: true,
      precoNegociadoExpiraEm: true,
      trialAte: true,
      pagoAte: true,
      cobrancaAtiva: true,
      cobrancaWhatsapp: true,
      billingAnchorAt: true,
      criadoEm: true,
      dataUltimoPagamento: true,
      _count: { select: { usuarios: true } },
      filiais: {
        select: { _count: { select: { usuarios: true } } },
      },
      usuarios: {
        where: { cargo: { in: ['ADMIN'] } },
        select: { id: true },
      },
    },
  });

  let mrr = 0;
  let recebidoNoMes = 0;
  let recebidoMesPassado = 0;
  let totalAtivos = 0;
  let totalEmAtraso = 0;
  let valorEmAtraso = 0;
  let trialsExpirandoEm7 = 0;
  let valorTrialsConvertendo = 0;
  let churnUltimos90 = 0;

  const emAtraso: any[] = [];
  const trialsVencendo: any[] = [];
  const recentesPagos: any[] = [];

  for (const emp of empresas) {
    const funcCount = emp._count.usuarios + emp.filiais.reduce((acc, f) => acc + f._count.usuarios, 0);
    const totalAdmins = emp.usuarios.length;
    const totalFiliais = emp.filiais.length;

    const calc = calcularValorEmpresa(
      {
        plano: emp.plano,
        billingCycle: emp.billingCycle,
        addonTotem: (emp as any).addonTotem ?? false,
        precoNegociado: emp.precoNegociado,
        precoNegociadoExpiraEm: emp.precoNegociadoExpiraEm,
      },
      funcCount,
      totalAdmins,
      totalFiliais,
    );
    const valorMensal = calc.totalMensal;

    const trialAtivo = emp.trialAte && new Date(emp.trialAte) > now;
    const pagoAteDate = emp.pagoAte ? new Date(emp.pagoAte) : null;
    const estaPago = pagoAteDate && pagoAteDate >= now;
    const ehAtivoStatus = emp.status === 'ATIVO';

    // Recebido no mês (todas as empresas que tiveram dataUltimoPagamento dentro do mês)
    if (emp.dataUltimoPagamento) {
      const pago = new Date(emp.dataUltimoPagamento);
      if (pago >= inicioMes) {
        recebidoNoMes += valorMensal;
        recentesPagos.push({
          id: emp.id,
          nome: emp.nome,
          plano: emp.plano,
          valor: valorMensal,
          pagoEm: emp.dataUltimoPagamento,
        });
      } else if (pago >= inicioMesPassado && pago <= fimMesPassado) {
        recebidoMesPassado += valorMensal;
      }
    }

    if (emp.status === 'BLOQUEADO') continue;

    if (trialAtivo) {
      const diasRestantes = Math.ceil((new Date(emp.trialAte!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diasRestantes <= 7) {
        trialsExpirandoEm7++;
        valorTrialsConvertendo += valorMensal;
        trialsVencendo.push({
          id: emp.id,
          nome: emp.nome,
          plano: emp.plano,
          diasRestantes,
          trialAte: emp.trialAte,
          valorMensal,
        });
      }
      continue;
    }

    if (ehAtivoStatus) {
      mrr += valorMensal;
      totalAtivos++;

      if (!estaPago) {
        const diasAtraso = pagoAteDate
          ? Math.floor((now.getTime() - pagoAteDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        totalEmAtraso++;
        valorEmAtraso += valorMensal;
        emAtraso.push({
          id: emp.id,
          nome: emp.nome,
          plano: emp.plano,
          diasAtraso,
          pagoAte: emp.pagoAte,
          cobrancaWhatsapp: emp.cobrancaWhatsapp,
          valorMensal,
        });
      }
    }
  }

  // Churn: empresas BLOQUEADO atualizadas nos últimos 90 dias (proxy — não tem coluna de data de cancelamento)
  const noventaDiasAtras = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  churnUltimos90 = empresas.filter(e => e.status === 'BLOQUEADO' && e.criadoEm >= noventaDiasAtras).length;

  // Histórico mensal de signups + pagamentos (últimos 6 meses)
  const meses: { label: string; mes: number; ano: number; signups: number; pagamentos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({
      label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      mes: d.getMonth(),
      ano: d.getFullYear(),
      signups: 0,
      pagamentos: 0,
    });
  }

  for (const emp of empresas) {
    const cm = new Date(emp.criadoEm);
    const sig = meses.find(m => m.mes === cm.getMonth() && m.ano === cm.getFullYear());
    if (sig) sig.signups++;

    if (emp.dataUltimoPagamento) {
      const pm = new Date(emp.dataUltimoPagamento);
      const pag = meses.find(m => m.mes === pm.getMonth() && m.ano === pm.getFullYear());
      if (pag) pag.pagamentos++;
    }
  }

  // Ordenações
  emAtraso.sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0));
  trialsVencendo.sort((a, b) => a.diasRestantes - b.diasRestantes);
  recentesPagos.sort((a, b) => new Date(b.pagoEm).getTime() - new Date(a.pagoEm).getTime());

  const variacao = recebidoMesPassado > 0
    ? Number((((recebidoNoMes - recebidoMesPassado) / recebidoMesPassado) * 100).toFixed(1))
    : null;

  return NextResponse.json({
    mrr: Number(mrr.toFixed(2)),
    recebidoNoMes: Number(recebidoNoMes.toFixed(2)),
    recebidoMesPassado: Number(recebidoMesPassado.toFixed(2)),
    variacaoMensal: variacao,
    totalAtivos,
    totalEmAtraso,
    valorEmAtraso: Number(valorEmAtraso.toFixed(2)),
    trialsExpirandoEm7,
    valorTrialsConvertendo: Number(valorTrialsConvertendo.toFixed(2)),
    churnUltimos90,
    emAtraso,
    trialsVencendo,
    recentesPagos: recentesPagos.slice(0, 8),
    historicoMensal: meses,
  });
}
