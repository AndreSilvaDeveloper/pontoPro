'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  RefreshCcw,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  MessageCircle,
} from 'lucide-react';

type FinanceiroData = {
  mrr: number;
  recebidoNoMes: number;
  recebidoMesPassado: number;
  variacaoMensal: number | null;
  totalAtivos: number;
  totalEmAtraso: number;
  valorEmAtraso: number;
  trialsExpirandoEm7: number;
  valorTrialsConvertendo: number;
  churnUltimos90: number;
  emAtraso: Array<{
    id: string; nome: string; plano: string;
    diasAtraso: number | null; pagoAte: string | null;
    cobrancaWhatsapp: string | null; valorMensal: number;
  }>;
  trialsVencendo: Array<{
    id: string; nome: string; plano: string;
    diasRestantes: number; trialAte: string; valorMensal: number;
  }>;
  recentesPagos: Array<{
    id: string; nome: string; plano: string;
    valor: number; pagoEm: string;
  }>;
  historicoMensal: Array<{
    label: string; signups: number; pagamentos: number;
  }>;
};

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/saas/financeiro');
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const maxBarras = data
    ? Math.max(...data.historicoMensal.flatMap(m => [m.signups, m.pagamentos]), 1)
    : 1;

  return (
    <>
      <header className="sticky top-14 lg:top-0 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <DollarSign size={18} className="text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">Financeiro</h1>
              <p className="text-[11px] text-text-muted">Visão consolidada de receita e cobranças</p>
            </div>
          </div>
          <button
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-xs sm:text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-purple-400" />
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-text-muted text-sm">Erro ao carregar dados financeiros.</div>
        ) : (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <CardMetric
                label="MRR"
                valor={formatBRL(data.mrr)}
                hint={`${data.totalAtivos} ativo${data.totalAtivos === 1 ? '' : 's'}`}
                icon={TrendingUp}
                cor="emerald"
              />
              <CardMetric
                label="Recebido no mês"
                valor={formatBRL(data.recebidoNoMes)}
                hint={data.variacaoMensal != null
                  ? `${data.variacaoMensal > 0 ? '+' : ''}${data.variacaoMensal}% vs. mês passado`
                  : 'sem comparação'}
                hintColor={data.variacaoMensal != null && data.variacaoMensal >= 0 ? 'emerald' : 'red'}
                icon={data.variacaoMensal != null && data.variacaoMensal >= 0 ? ArrowUpRight : ArrowDownRight}
                cor="blue"
              />
              <CardMetric
                label="Em atraso"
                valor={formatBRL(data.valorEmAtraso)}
                hint={`${data.totalEmAtraso} cliente${data.totalEmAtraso === 1 ? '' : 's'}`}
                icon={AlertCircle}
                cor="red"
              />
              <CardMetric
                label="Trials expirando"
                valor={`${data.trialsExpirandoEm7}`}
                hint={`${formatBRL(data.valorTrialsConvertendo)} potencial`}
                icon={Clock}
                cor="amber"
              />
            </div>

            {/* Histórico mensal — gráfico de barras simples */}
            <div className="bg-surface border border-border-subtle rounded-2xl p-5 backdrop-blur">
              <h2 className="text-sm font-bold text-text-primary mb-4">Últimos 6 meses</h2>
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end" style={{ minHeight: 140 }}>
                {data.historicoMensal.map(m => (
                  <div key={m.label} className="flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end gap-1 h-28">
                      <div
                        className="flex-1 bg-purple-500/30 border-t border-purple-400 rounded-t"
                        style={{ height: `${(m.signups / maxBarras) * 100}%` }}
                        title={`${m.signups} signups`}
                      />
                      <div
                        className="flex-1 bg-emerald-500/30 border-t border-emerald-400 rounded-t"
                        style={{ height: `${(m.pagamentos / maxBarras) * 100}%` }}
                        title={`${m.pagamentos} pagamentos`}
                      />
                    </div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">{m.label}</div>
                    <div className="flex gap-2 text-[10px] text-text-faint">
                      <span className="text-purple-300">{m.signups}</span>
                      <span className="text-emerald-300">{m.pagamentos}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-[11px] text-text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500/60" /> Signups
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/60" /> Pagamentos
                </span>
              </div>
            </div>

            {/* Em atraso */}
            {data.emAtraso.length > 0 && (
              <Section title="Empresas em atraso" badge={data.totalEmAtraso} cor="red">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-text-faint uppercase tracking-wider border-b border-border-subtle">
                      <th className="text-left font-medium px-3 py-2">Empresa</th>
                      <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Plano</th>
                      <th className="text-left font-medium px-3 py-2">Atraso</th>
                      <th className="text-right font-medium px-3 py-2">Valor</th>
                      <th className="text-right font-medium px-3 py-2 hidden sm:table-cell">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.emAtraso.map(e => (
                      <tr key={e.id} className="border-b border-border-subtle hover:bg-hover-bg transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/saas/${e.id}`} className="font-medium text-text-primary hover:text-purple-300">
                            {e.nome}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-text-muted hidden sm:table-cell">{e.plano}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-bold ${(e.diasAtraso ?? 0) > 7 ? 'text-red-300' : 'text-amber-300'}`}>
                            {e.diasAtraso != null ? `${e.diasAtraso}d` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-text-secondary">{formatBRL(e.valorMensal)}</td>
                        <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                          {e.cobrancaWhatsapp ? (
                            <a
                              href={`https://wa.me/${e.cobrancaWhatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200"
                            >
                              <MessageCircle size={12} /> Cobrar
                            </a>
                          ) : (
                            <span className="text-text-faint text-xs">sem zap</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Trials vencendo */}
            {data.trialsVencendo.length > 0 && (
              <Section title="Trials vencendo nos próximos 7 dias" badge={data.trialsExpirandoEm7} cor="amber">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-text-faint uppercase tracking-wider border-b border-border-subtle">
                      <th className="text-left font-medium px-3 py-2">Empresa</th>
                      <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Plano</th>
                      <th className="text-left font-medium px-3 py-2">Termina em</th>
                      <th className="text-right font-medium px-3 py-2">Valor potencial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trialsVencendo.map(t => (
                      <tr key={t.id} className="border-b border-border-subtle hover:bg-hover-bg transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/saas/${t.id}`} className="font-medium text-text-primary hover:text-purple-300">
                            {t.nome}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-text-muted hidden sm:table-cell">{t.plano}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-bold ${t.diasRestantes <= 2 ? 'text-red-300' : 'text-amber-300'}`}>
                            {t.diasRestantes}d
                          </span>
                          <span className="text-[10px] text-text-faint ml-2">({formatData(t.trialAte)})</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-text-secondary">{formatBRL(t.valorMensal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Recentes */}
            {data.recentesPagos.length > 0 && (
              <Section title="Pagamentos recentes" badge={data.recentesPagos.length} cor="emerald">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-text-faint uppercase tracking-wider border-b border-border-subtle">
                      <th className="text-left font-medium px-3 py-2">Empresa</th>
                      <th className="text-left font-medium px-3 py-2 hidden sm:table-cell">Plano</th>
                      <th className="text-left font-medium px-3 py-2">Pago em</th>
                      <th className="text-right font-medium px-3 py-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentesPagos.map(p => (
                      <tr key={p.id} className="border-b border-border-subtle hover:bg-hover-bg transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/saas/${p.id}`} className="font-medium text-text-primary hover:text-purple-300">
                            {p.nome}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-text-muted hidden sm:table-cell">{p.plano}</td>
                        <td className="px-3 py-2.5 text-text-muted">{formatData(p.pagoEm)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-300 font-medium">{formatBRL(p.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {data.churnUltimos90 > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-sm text-red-200">
                <strong>{data.churnUltimos90}</strong> empresa{data.churnUltimos90 === 1 ? '' : 's'} bloqueada{data.churnUltimos90 === 1 ? '' : 's'} nos últimos 90 dias.
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function CardMetric({ label, valor, hint, hintColor = 'muted', icon: Icon, cor }: {
  label: string;
  valor: string;
  hint?: string;
  hintColor?: 'muted' | 'emerald' | 'red';
  icon: any;
  cor: 'emerald' | 'blue' | 'red' | 'amber' | 'purple';
}) {
  const corMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    red: 'bg-red-500/10 border-red-500/30 text-red-300',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  };
  const hintMap: Record<string, string> = {
    muted: 'text-text-faint',
    emerald: 'text-emerald-300',
    red: 'text-red-300',
  };
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl p-4 backdrop-blur">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] text-text-muted uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${corMap[cor]}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="text-xl font-bold text-text-primary">{valor}</div>
      {hint && <div className={`text-[11px] mt-1 ${hintMap[hintColor]}`}>{hint}</div>}
    </div>
  );
}

function Section({ title, badge, cor, children }: {
  title: string;
  badge: number;
  cor: 'red' | 'amber' | 'emerald';
  children: React.ReactNode;
}) {
  const corMap: Record<string, string> = {
    red: 'bg-red-500/15 text-red-300 border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl backdrop-blur overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${corMap[cor]}`}>{badge}</span>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
