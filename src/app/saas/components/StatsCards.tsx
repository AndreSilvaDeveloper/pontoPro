'use client';

import { Building2, DollarSign, Clock, AlertTriangle, Users, Ban } from "lucide-react";

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

const cards = [
  {
    label: "Clientes Ativos",
    key: "totalAtivos" as const,
    icon: Building2,
    color: "emerald",
    format: (v: number) => String(v),
  },
  {
    label: "MRR",
    key: "mrr" as const,
    icon: DollarSign,
    color: "purple",
    format: (v: number) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  },
  {
    label: "Em Teste",
    key: "emTrial" as const,
    icon: Clock,
    color: "blue",
    format: (v: number) => String(v),
  },
  {
    label: "Inadimplentes",
    key: "inadimplentes" as const,
    icon: AlertTriangle,
    color: "yellow",
    format: (v: number) => String(v),
  },
  {
    label: "Funcionarios",
    key: "totalFuncionarios" as const,
    icon: Users,
    color: "indigo",
    format: (v: number) => String(v),
  },
  {
    label: "Bloqueadas",
    key: "bloqueados" as const,
    icon: Ban,
    color: "red",
    format: (v: number) => String(v),
  },
];

const colorMap: Record<string, { icon: string; text: string; bg: string }> = {
  emerald: { icon: "text-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  purple: { icon: "text-purple-400", text: "text-purple-400", bg: "bg-purple-500/10" },
  blue: { icon: "text-blue-400", text: "text-blue-400", bg: "bg-blue-500/10" },
  yellow: { icon: "text-amber-400", text: "text-amber-400", bg: "bg-amber-500/10" },
  indigo: { icon: "text-indigo-400", text: "text-indigo-400", bg: "bg-indigo-500/10" },
  red: { icon: "text-red-400", text: "text-red-400", bg: "bg-red-500/10" },
};

export default function StatsCards({ stats, loading }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const colors = colorMap[card.color];
        const Icon = card.icon;
        const isLoading = loading || !stats;

        return (
          <div
            key={card.key}
            className="bg-surface border border-border-subtle rounded-2xl p-5 backdrop-blur transition-all hover:border-border-default"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg ${colors.bg} ${isLoading ? 'opacity-60' : ''}`}>
                <Icon size={16} className={colors.icon} />
              </div>
            </div>

            {isLoading ? (
              <>
                <div className="animate-pulse bg-elevated-solid/70 rounded-md h-7 w-24" />
                <div className="animate-pulse bg-elevated-solid/40 rounded h-3 w-16 mt-2.5" />
              </>
            ) : (
              <>
                <p className={`text-2xl font-bold ${colors.text}`}>
                  {card.format(stats[card.key])}
                </p>
                <p className="text-xs text-text-muted mt-1">{card.label}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
