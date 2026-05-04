'use client';

import { Building2, Sparkles, Clock, AlertTriangle, Users, Ban } from 'lucide-react';

export type DashboardStats = {
  totalEmpresas: number;
  totalAtivos: number;
  emTrial: number;
  inadimplentes: number;
  bloqueados: number;
  totalFuncionarios: number;
  mrr: number;
  signupsRecentes: number;
  empresasRecentes?: any[];
  pagamentosRecentes?: any[];
  analitico?: Array<{
    data: string;
    visitasLanding: number;
    visitasSignup: number;
    signups: number;
    conversoes: number;
  }>;
};

type Props = {
  stats: DashboardStats | null;
  loading: boolean;
};

type PillCfg = {
  key: keyof DashboardStats;
  label: string;
  icon: any;
  color: string;
};

const pills: PillCfg[] = [
  { key: 'totalEmpresas',     label: 'Total',         icon: Building2,    color: 'purple'  },
  { key: 'totalAtivos',       label: 'Ativos',        icon: Sparkles,     color: 'emerald' },
  { key: 'emTrial',           label: 'Em trial',      icon: Clock,        color: 'blue'    },
  { key: 'inadimplentes',     label: 'Inadimplentes', icon: AlertTriangle, color: 'amber'   },
  { key: 'bloqueados',        label: 'Bloqueadas',    icon: Ban,          color: 'red'     },
  { key: 'totalFuncionarios', label: 'Funcionários',  icon: Users,        color: 'indigo'  },
];

const colorMap: Record<string, { icon: string; value: string; bg: string }> = {
  emerald: { icon: 'text-emerald-400', value: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  purple:  { icon: 'text-purple-400',  value: 'text-purple-300',  bg: 'bg-purple-500/10' },
  blue:    { icon: 'text-blue-400',    value: 'text-blue-300',    bg: 'bg-blue-500/10' },
  amber:   { icon: 'text-amber-400',   value: 'text-amber-300',   bg: 'bg-amber-500/10' },
  indigo:  { icon: 'text-indigo-400',  value: 'text-indigo-300',  bg: 'bg-indigo-500/10' },
  red:     { icon: 'text-red-400',     value: 'text-red-300',     bg: 'bg-red-500/10' },
};

export default function StatsStrip({ stats, loading }: Props) {
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 divide-x divide-border-subtle">
        {pills.map((p, i) => {
          const cfg = colorMap[p.color];
          const Icon = p.icon;
          const v = stats?.[p.key];
          const valor = typeof v === 'number' ? v : 0;
          return (
            <div
              key={p.key}
              className={`flex items-center gap-2 px-3 ${i === 0 ? 'pl-2' : ''}`}
            >
              <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                <Icon size={13} className={cfg.icon} />
              </div>
              <div className="leading-tight">
                {loading ? (
                  <div className="h-5 w-8 bg-elevated-solid/60 rounded animate-pulse" />
                ) : (
                  <p className={`text-base font-bold tabular-nums ${cfg.value}`}>{valor}</p>
                )}
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-medium">{p.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
