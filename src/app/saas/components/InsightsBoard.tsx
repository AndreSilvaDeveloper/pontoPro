'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Clock,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import type { DashboardStats } from './StatsStrip';

type Insight = {
  id: string;
  prioridade: 'urgente' | 'atencao' | 'positivo';
  icon: any;
  titulo: string;
  descricao?: string;
  cta?: { label: string; action: () => void };
};

type Props = {
  stats: DashboardStats | null;
  empresas: any[];
  loading: boolean;
};

const PRIO_CFG: Record<Insight['prioridade'], { ring: string; iconCls: string; iconBg: string; ctaCls: string }> = {
  urgente:  { ring: 'border-l-red-500',     iconCls: 'text-red-400',     iconBg: 'bg-red-500/10',     ctaCls: 'text-red-400 hover:text-red-300' },
  atencao:  { ring: 'border-l-amber-500',   iconCls: 'text-amber-400',   iconBg: 'bg-amber-500/10',   ctaCls: 'text-amber-400 hover:text-amber-300' },
  positivo: { ring: 'border-l-emerald-500', iconCls: 'text-emerald-400', iconBg: 'bg-emerald-500/10', ctaCls: 'text-emerald-400 hover:text-emerald-300' },
};

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function classificarStatus(emp: any): string {
  const now = new Date();
  if (emp.status === 'BLOQUEADO') return 'BLOQUEADO';
  if (emp.trialAte && new Date(emp.trialAte) > now) return 'TRIAL';
  const pagoAte = emp.pagoAte ? new Date(emp.pagoAte) : null;
  const anchor = emp.billingAnchorAt ? new Date(emp.billingAnchorAt) : null;
  if ((!pagoAte || pagoAte < now) && (!anchor || anchor < now) && emp.status === 'ATIVO') return 'INADIMPLENTE';
  return 'ATIVO';
}

export default function InsightsBoard({ stats, empresas, loading }: Props) {
  const router = useRouter();

  const aplicarFiltro = (status: string) => {
    // Sinaliza pro ClientTable via URL hash + dispara evento global pra setar filter
    window.dispatchEvent(new CustomEvent('saas:filter', { detail: { status } }));
    // Scrolla até a tabela
    setTimeout(() => {
      const el = document.getElementById('client-table');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const insights = useMemo<Insight[]>(() => {
    if (!stats) return [];
    const out: Insight[] = [];
    const now = new Date();

    // 🚨 Inadimplentes (urgente)
    if (stats.inadimplentes > 0) {
      out.push({
        id: 'inadimplentes',
        prioridade: 'urgente',
        icon: AlertTriangle,
        titulo: `${stats.inadimplentes} ${plural(stats.inadimplentes, 'cliente inadimplente', 'clientes inadimplentes')}`,
        descricao: 'Pagamento atrasado. Considere acionar antes do bloqueio automático.',
        cta: { label: 'Ver clientes', action: () => aplicarFiltro('INADIMPLENTE') },
      });
    }

    // ⏰ Trials vencendo em ≤ 3 dias (atenção)
    const trialsVencendo = empresas.filter(e => {
      const status = classificarStatus(e);
      if (status !== 'TRIAL' || !e.trialAte) return false;
      const dias = Math.ceil((new Date(e.trialAte).getTime() - now.getTime()) / 86_400_000);
      return dias >= 0 && dias <= 3;
    });
    if (trialsVencendo.length > 0) {
      out.push({
        id: 'trials',
        prioridade: 'atencao',
        icon: Clock,
        titulo: `${trialsVencendo.length} ${plural(trialsVencendo.length, 'trial vencendo', 'trials vencendo')} em até 3 dias`,
        descricao: 'Hora ideal pra confirmar conversão antes de virar inadimplência.',
        cta: { label: 'Ver clientes', action: () => aplicarFiltro('TRIAL') },
      });
    }

    // 🔒 Bloqueadas (atenção, só se tiver alguma)
    if (stats.bloqueados > 0) {
      out.push({
        id: 'bloqueadas',
        prioridade: 'atencao',
        icon: AlertTriangle,
        titulo: `${stats.bloqueados} ${plural(stats.bloqueados, 'empresa bloqueada', 'empresas bloqueadas')}`,
        descricao: 'Aguardando regularização ou decisão sua.',
        cta: { label: 'Ver clientes', action: () => aplicarFiltro('BLOQUEADO') },
      });
    }

    // 🎉 Signups recentes (positivo)
    if (stats.signupsRecentes > 0) {
      out.push({
        id: 'signups',
        prioridade: 'positivo',
        icon: Sparkles,
        titulo: `${stats.signupsRecentes} ${plural(stats.signupsRecentes, 'novo cadastro', 'novos cadastros')} nos últimos 7 dias`,
        descricao: 'Acompanhe o onboarding pra garantir conversão.',
        cta: { label: 'Ver lista', action: () => router.push('/saas/notificacoes?tipo=NOVA_EMPRESA') },
      });
    }

    // 💵 Pagamentos recentes (positivo)
    const pagsRecentes = stats.pagamentosRecentes?.length || 0;
    if (pagsRecentes > 0) {
      out.push({
        id: 'pagamentos',
        prioridade: 'positivo',
        icon: CreditCard,
        titulo: `${pagsRecentes} ${plural(pagsRecentes, 'pagamento recebido', 'pagamentos recebidos')} essa semana`,
        descricao: 'Receita atualizada no MRR.',
        cta: { label: 'Ver notificações', action: () => router.push('/saas/notificacoes?tipo=PAGAMENTO_RECEBIDO') },
      });
    }

    // Ordena: urgente → atenção → positivo
    const ordem = { urgente: 0, atencao: 1, positivo: 2 };
    out.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);

    return out;
  }, [stats, empresas, router]);

  if (loading) {
    return (
      <div className="bg-surface border border-border-subtle rounded-2xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-elevated-solid/60 rounded" />
          <div className="h-3 w-3/4 bg-elevated-solid/40 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-5 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-amber-500/10">
          <Lightbulb size={14} className="text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-text-primary">Pra você acompanhar agora</h3>
        {insights.length > 0 && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-text-muted bg-elevated px-2 py-0.5 rounded-full">
            {insights.length} {plural(insights.length, 'item', 'itens')}
          </span>
        )}
      </div>

      {insights.length === 0 ? (
        <div className="flex items-center gap-3 py-2">
          <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm text-text-primary font-medium">Tudo em ordem 🌿</p>
            <p className="text-[11px] text-text-muted">Nada precisa de atenção imediata.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {insights.map(ins => {
            const cfg = PRIO_CFG[ins.prioridade];
            const Icon = ins.icon;
            return (
              <div
                key={ins.id}
                className={`flex items-start gap-3 p-3 bg-elevated/40 rounded-xl border-l-2 ${cfg.ring} hover:bg-elevated/70 transition-colors`}
              >
                <div className={`shrink-0 w-9 h-9 rounded-lg ${cfg.iconBg} flex items-center justify-center`}>
                  <Icon size={16} className={cfg.iconCls} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary leading-tight">{ins.titulo}</p>
                  {ins.descricao && (
                    <p className="text-[11px] text-text-muted mt-0.5">{ins.descricao}</p>
                  )}
                  {ins.cta && (
                    <button
                      onClick={ins.cta.action}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold mt-2 ${cfg.ctaCls} transition-colors`}
                    >
                      {ins.cta.label} <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
