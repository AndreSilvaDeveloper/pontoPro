'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  RefreshCcw,
  ChevronDown,
  Loader2,
  User as UserIcon,
  Building2,
} from 'lucide-react';

type LogItem = {
  id: string;
  dataHora: string;
  acao: string;
  detalhes: string;
  adminNome: string;
  adminId: string;
  empresaId: string;
  empresaNome: string | null;
};

const DAYS_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '1 ano' },
];

function formatarDataHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function corDaAcao(acao: string): string {
  const a = acao.toUpperCase();
  if (a.includes('DELETE') || a.includes('EXCLUIR') || a.includes('REMOV')) return 'text-red-300 bg-red-500/10 border-red-500/30';
  if (a.includes('IMPERSON')) return 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30';
  if (a.includes('CRIAR') || a.includes('CREATE') || a.includes('NOVO')) return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
  if (a.includes('PAGAMENTO') || a.includes('PAGOU')) return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
  if (a.includes('BLOQUEAR') || a.includes('SUSPEND')) return 'text-orange-300 bg-orange-500/10 border-orange-500/30';
  return 'text-text-secondary bg-elevated border-border-subtle';
}

export default function LogsPage() {
  const [itens, setItens] = useState<LogItem[]>([]);
  const [acoes, setAcoes] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [acaoFiltro, setAcaoFiltro] = useState('');
  const [days, setDays] = useState(30);

  const carregar = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { days: String(days) };
      if (q.trim()) params.q = q.trim();
      if (acaoFiltro) params.acao = acaoFiltro;
      const res = await axios.get('/api/saas/logs', { params });
      setItens(res.data.itens || []);
      setAcoes(res.data.acoes || []);
      setTotal(res.data.total || 0);
    } catch {
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [days, acaoFiltro]);

  const debouncedSearch = useMemo(() => {
    let t: any;
    return (val: string) => {
      clearTimeout(t);
      t = setTimeout(() => carregar(), 350);
    };
  }, [days, acaoFiltro]);

  return (
    <>
      <header className="sticky top-14 lg:top-0 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <ScrollText size={18} className="text-purple-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">Logs de auditoria</h1>
              <p className="text-[11px] text-text-muted">
                {loading ? 'Carregando...' : `${total} registro${total === 1 ? '' : 's'} nos últimos ${days} dias`}
              </p>
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 backdrop-blur space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                value={q}
                onChange={e => { setQ(e.target.value); debouncedSearch(e.target.value); }}
                placeholder="Buscar por detalhes, admin ou ação..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm placeholder:text-text-faint outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
              <select
                value={acaoFiltro}
                onChange={e => setAcaoFiltro(e.target.value)}
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm appearance-none outline-none focus:border-purple-500/50"
              >
                <option value="">Todas as ações</option>
                {acoes.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
            </div>

            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
              <select
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-page/50 border border-border-subtle text-sm appearance-none outline-none focus:border-purple-500/50"
              >
                {DAYS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>Últimos {o.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-purple-400" />
          </div>
        ) : itens.length === 0 ? (
          <div className="text-center py-20 text-text-muted text-sm">
            Nenhum log encontrado com esses filtros.
          </div>
        ) : (
          <div className="space-y-2">
            {itens.map(log => (
              <div
                key={log.id}
                className="bg-surface border border-border-subtle rounded-xl p-3 sm:p-4 backdrop-blur hover:border-border-default transition-colors"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${corDaAcao(log.acao)}`}>
                      {log.acao}
                    </span>
                    <span className="text-[11px] text-text-faint">{formatarDataHora(log.dataHora)}</span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-text-primary break-words">{log.detalhes}</p>

                <div className="mt-2 flex items-center gap-4 flex-wrap text-[11px] text-text-muted">
                  <span className="flex items-center gap-1">
                    <UserIcon size={11} /> {log.adminNome}
                  </span>
                  {log.empresaNome ? (
                    <Link
                      href={`/saas/${log.empresaId}`}
                      className="flex items-center gap-1 hover:text-purple-300 transition-colors"
                    >
                      <Building2 size={11} /> {log.empresaNome}
                    </Link>
                  ) : log.empresaId && log.empresaId !== 'SEM_EMPRESA' ? (
                    <span className="flex items-center gap-1">
                      <Building2 size={11} /> {log.empresaId.slice(0, 8)}…
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
