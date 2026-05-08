'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Inbox,
  CheckCheck,
  UserPlus,
  Building2,
  CreditCard,
  AlertTriangle,
  Sparkles,
  Loader2,
} from 'lucide-react';

type Notif = {
  id: string;
  tipo: string;
  prioridade: string;
  titulo: string;
  mensagem: string;
  url: string | null;
  metadata: any;
  lida: boolean;
  criadoEm: string;
};

const TIPO_LABEL: Record<string, string> = {
  LEAD_NOVO: 'Novos leads',
  NOVA_EMPRESA: 'Novos cadastros',
  NOVA_VENDA: 'Vendas',
  PAGAMENTO_RECEBIDO: 'Pagamentos recebidos',
  PAGAMENTO_VENCIDO: 'Vencimentos',
  PAGAMENTO_ESTORNADO: 'Estornos/cancelamentos',
  SISTEMA: 'Sistema',
};

const TIPO_ICON: Record<string, { icon: any; cls: string; bg: string }> = {
  LEAD_NOVO: { icon: UserPlus, cls: 'text-purple-400', bg: 'bg-purple-500/10' },
  NOVA_EMPRESA: { icon: Building2, cls: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  NOVA_VENDA: { icon: Sparkles, cls: 'text-amber-400', bg: 'bg-amber-500/10' },
  PAGAMENTO_RECEBIDO: { icon: CreditCard, cls: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  PAGAMENTO_VENCIDO: { icon: AlertTriangle, cls: 'text-amber-400', bg: 'bg-amber-500/10' },
  PAGAMENTO_ESTORNADO: { icon: AlertTriangle, cls: 'text-red-400', bg: 'bg-red-500/10' },
  SISTEMA: { icon: Inbox, cls: 'text-blue-400', bg: 'bg-blue-500/10' },
};

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function NotificacoesPage() {
  const router = useRouter();
  const [itens, setItens] = useState<Notif[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'naolidas' | 'lidas'>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [proximoCursor, setProximoCursor] = useState<string | null>(null);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [porTipo, setPorTipo] = useState<Record<string, number>>({});

  const carregar = useCallback(async (reset = false) => {
    setCarregando(true);
    try {
      const params: any = { status: filtroStatus, limit: 30 };
      if (filtroTipo) params.tipo = filtroTipo;
      if (!reset && cursor) params.cursor = cursor;

      const res = await axios.get('/api/saas/notificacoes', { params });
      setItens(prev => reset ? res.data.itens : [...prev, ...res.data.itens]);
      setProximoCursor(res.data.proximoCursor);
      setTotalNaoLidas(res.data.totalNaoLidas);
      setPorTipo(res.data.porTipo || {});
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, [cursor, filtroStatus, filtroTipo]);

  useEffect(() => {
    setCursor(null);
    carregar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus, filtroTipo]);

  const onClickItem = useCallback(async (n: Notif) => {
    if (!n.lida) {
      try {
        await axios.patch(`/api/saas/notificacoes/${n.id}/lida`, { lida: true });
        setItens(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x));
        setTotalNaoLidas(c => Math.max(0, c - 1));
      } catch { /* ignora */ }
    }
    if (n.url) router.push(n.url);
  }, [router]);

  const marcarTodas = useCallback(async () => {
    setMarcandoTodas(true);
    try {
      await axios.post('/api/saas/notificacoes/marcar-todas-lidas');
      setItens(prev => prev.map(x => ({ ...x, lida: true })));
      setTotalNaoLidas(0);
    } catch { /* ignora */ }
    finally { setMarcandoTodas(false); }
  }, []);

  return (
    <>
      <header className="sticky top-14 lg:top-0 z-30 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/saas" className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-hover-bg transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text-primary truncate">Notificações</h1>
              <p className="text-[11px] text-text-muted">
                {totalNaoLidas > 0 ? `${totalNaoLidas} não lida${totalNaoLidas === 1 ? '' : 's'}` : 'Tudo em dia'}
              </p>
            </div>
          </div>

          {totalNaoLidas > 0 && (
            <button
              onClick={marcarTodas}
              disabled={marcandoTodas}
              className="flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-xs sm:text-sm transition-colors disabled:opacity-50"
            >
              <CheckCheck size={14} /> <span className="hidden sm:inline">Marcar todas</span><span className="sm:hidden">Tudo lido</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 relative z-10 space-y-4">
        <div className="bg-surface border border-border-subtle rounded-2xl p-4 backdrop-blur space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['todas', 'naolidas', 'lidas'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                  filtroStatus === s
                    ? 'text-purple-400 bg-hover-bg border-purple-400'
                    : 'text-text-faint border-border-subtle hover:text-text-secondary hover:border-border-default'
                }`}
              >
                {s === 'todas' ? 'Todas' : s === 'naolidas' ? `Não lidas${totalNaoLidas ? ` (${totalNaoLidas})` : ''}` : 'Lidas'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroTipo('')}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                filtroTipo === ''
                  ? 'text-text-primary bg-hover-bg border-border-default'
                  : 'text-text-faint border-border-subtle hover:text-text-secondary'
              }`}
            >
              Todos os tipos
            </button>
            {Object.entries(TIPO_LABEL).map(([key, label]) => {
              const count = porTipo[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setFiltroTipo(filtroTipo === key ? '' : key)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    filtroTipo === key
                      ? 'text-text-primary bg-hover-bg border-border-default'
                      : 'text-text-faint border-border-subtle hover:text-text-secondary'
                  }`}
                >
                  {label}{count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-surface border border-border-subtle rounded-2xl backdrop-blur overflow-hidden">
          {carregando && itens.length === 0 ? (
            <div className="px-4 py-20 text-center text-text-faint">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : itens.length === 0 ? (
            <div className="px-4 py-20 text-center">
              <Inbox size={32} className="mx-auto text-text-faint mb-3" />
              <p className="text-text-muted">Nada por aqui.</p>
              <p className="text-xs text-text-faint mt-1">Quando algo importante acontecer no sistema, aparecerá nesta lista.</p>
            </div>
          ) : (
            itens.map(n => {
              const cfg = TIPO_ICON[n.tipo] || TIPO_ICON.SISTEMA;
              const Icon = cfg.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => onClickItem(n)}
                  className={`w-full text-left px-4 py-4 flex gap-3 hover:bg-hover-bg transition-colors border-b border-border-subtle last:border-0 ${!n.lida ? 'bg-purple-500/5' : ''}`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                    <Icon size={18} className={cfg.cls} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${n.lida ? 'text-text-secondary' : 'text-text-primary font-bold'}`}>
                        {n.titulo}
                      </p>
                      {!n.lida && <span className="shrink-0 w-2 h-2 mt-1.5 bg-purple-500 rounded-full" />}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{n.mensagem}</p>
                    <p className="text-[10px] text-text-faint mt-1">{tempoRelativo(n.criadoEm)}</p>
                  </div>
                </button>
              );
            })
          )}

          {proximoCursor && !carregando && (
            <div className="p-4 text-center border-t border-border-subtle">
              <button
                onClick={() => { setCursor(proximoCursor); carregar(false); }}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium"
              >
                Carregar mais
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
