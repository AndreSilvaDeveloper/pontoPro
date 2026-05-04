'use client';

import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Eye, UserPlus, CreditCard, TrendingUp, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'saas_analytics_aberto';

type AnalyticsData = {
  data: string;
  visitasLanding: number;
  visitasSignup: number;
  signups: number;
  conversoes: number;
};

type Props = {
  analitico: AnalyticsData[] | undefined;
  loading: boolean;
};

type Periodo = '7d' | '30d';

export default function AnalyticsChart({ analitico, loading }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [aberto, setAberto] = useState(false);

  // Recupera preferência salva (default: fechado)
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setAberto(true);
    } catch { /* ignora */ }
  }, []);

  const toggleAberto = () => {
    setAberto(v => {
      const nv = !v;
      try { localStorage.setItem(STORAGE_KEY, nv ? '1' : '0'); } catch { /* ignora */ }
      return nv;
    });
  };

  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  const dadosFiltrados = useMemo(() => {
    if (!analitico) return [];
    const dias = periodo === '7d' ? 7 : 30;
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    const limiteStr = limite.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    return analitico.filter(d => d.data >= limiteStr);
  }, [analitico, periodo]);

  const dadosHoje = analitico?.find(d => d.data === hoje);

  const totais = useMemo(() => {
    return dadosFiltrados.reduce(
      (acc, d) => ({
        visitas: acc.visitas + d.visitasLanding,
        signupVisitas: acc.signupVisitas + d.visitasSignup,
        signups: acc.signups + d.signups,
        conversoes: acc.conversoes + d.conversoes,
      }),
      { visitas: 0, signupVisitas: 0, signups: 0, conversoes: 0 }
    );
  }, [dadosFiltrados]);

  const taxaConversao = totais.visitas > 0 ? ((totais.signups / totais.visitas) * 100).toFixed(1) : '0';

  const chartData = dadosFiltrados.map(d => ({
    ...d,
    label: `${d.data.split('-')[2]}/${d.data.split('-')[1]}`,
  }));

  if (loading) {
    return (
      <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-6">
        <div className="h-6 w-40 bg-hover-bg rounded animate-pulse mb-4" />
        <div className="h-[200px] bg-hover-bg rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
      <button
        onClick={toggleAberto}
        className="w-full flex items-center justify-between bg-surface hover:bg-hover-bg border border-border-subtle rounded-2xl p-4 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/20 p-2 rounded-xl group-hover:bg-purple-500/30 transition-colors">
            <BarChart3 size={20} className="text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-text-primary">Analytics de marketing</p>
            <p className="text-[11px] text-text-faint">
              {dadosHoje ? `Hoje: ${dadosHoje.visitasLanding} visitas · ${dadosHoje.signups} signups` : 'Visitas, signups e taxa de conversão dos últimos 30 dias'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-text-muted">{aberto ? 'Recolher' : 'Expandir'}</span>
          {aberto ? <ChevronUp size={18} className="text-text-faint" /> : <ChevronDown size={18} className="text-text-faint" />}
        </div>
      </button>

      {aberto && (
        <div className="mt-2 space-y-4">
          {/* Cards resumo */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MiniCard icon={<Eye size={16} />} cor="text-purple-400" bg="bg-purple-500/10" label="Visitas" valor={totais.visitas} sub={dadosHoje ? `${dadosHoje.visitasLanding} hoje` : undefined} />
            <MiniCard icon={<Eye size={16} />} cor="text-blue-400" bg="bg-blue-500/10" label="Pag. Signup" valor={totais.signupVisitas} sub={dadosHoje ? `${dadosHoje.visitasSignup} hoje` : undefined} />
            <MiniCard icon={<UserPlus size={16} />} cor="text-emerald-400" bg="bg-emerald-500/10" label="Signups" valor={totais.signups} sub={dadosHoje ? `${dadosHoje.signups} hoje` : undefined} />
            <MiniCard icon={<CreditCard size={16} />} cor="text-amber-400" bg="bg-amber-500/10" label="Conversoes" valor={totais.conversoes} />
            <MiniCard icon={<TrendingUp size={16} />} cor="text-rose-400" bg="bg-rose-500/10" label="Taxa" valor={`${taxaConversao}%`} sub="visita → signup" />
          </div>

          {/* Tabs de periodo */}
          <div className="flex items-center gap-2">
            {(['7d', '30d'] as Periodo[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periodo === p ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-text-muted hover:text-text-primary hover:bg-hover-bg border border-transparent'
                }`}
              >
                {p === '7d' ? '7 dias' : '30 dias'}
              </button>
            ))}
          </div>

          {/* Grafico */}
          <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-4 md:p-6">
            {chartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-text-faint text-sm">
                Sem dados no periodo
              </div>
            ) : (
              <div className="w-full h-[220px] md:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradVisitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradConversoes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,.3)' }}
                      labelFormatter={(label: string) => `Dia ${label}`}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = { visitasLanding: 'Visitas', visitasSignup: 'Pag. Signup', signups: 'Signups', conversoes: 'Conversoes' };
                        return [value, labels[name] || name];
                      }}
                    />
                    <Area type="monotone" dataKey="visitasLanding" stroke="#a855f7" strokeWidth={2.5} fill="url(#gradVisitas)" name="visitasLanding" activeDot={{ r: 5, strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="signups" stroke="#10b981" strokeWidth={2.5} fill="url(#gradSignups)" name="signups" activeDot={{ r: 5, strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="conversoes" stroke="#f59e0b" strokeWidth={2} fill="url(#gradConversoes)" name="conversoes" activeDot={{ r: 5, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-text-muted">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500" /><span>Visitas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span>Signups</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>Conversoes</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ icon, cor, bg, label, valor, sub }: { icon: React.ReactNode; cor: string; bg: string; label: string; valor: number | string; sub?: string }) {
  return (
    <div className="bg-surface backdrop-blur-sm rounded-2xl border border-border-subtle p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${cor} ${bg} p-1.5 rounded-lg`}>{icon}</div>
        <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${cor}`}>{valor}</p>
      {sub && <p className="text-[10px] text-text-dim mt-0.5">{sub}</p>}
    </div>
  );
}
