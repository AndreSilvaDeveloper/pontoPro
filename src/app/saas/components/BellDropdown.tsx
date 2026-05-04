'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, CheckCheck, Inbox, UserPlus, Building2, CreditCard, AlertTriangle, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

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

const POLL_MS = 30_000;

const TIPO_ICON: Record<string, { icon: any; cls: string; bg: string }> = {
  LEAD_NOVO:           { icon: UserPlus,       cls: 'text-purple-400',  bg: 'bg-purple-500/10' },
  NOVA_EMPRESA:        { icon: Building2,      cls: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  NOVA_VENDA:          { icon: Sparkles,       cls: 'text-amber-400',   bg: 'bg-amber-500/10' },
  PAGAMENTO_RECEBIDO:  { icon: CreditCard,     cls: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  PAGAMENTO_VENCIDO:   { icon: AlertTriangle,  cls: 'text-amber-400',   bg: 'bg-amber-500/10' },
  PAGAMENTO_ESTORNADO: { icon: AlertTriangle,  cls: 'text-red-400',     bg: 'bg-red-500/10' },
  SISTEMA:             { icon: Inbox,          cls: 'text-blue-400',    bg: 'bg-blue-500/10' },
};

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function BellDropdown() {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Notif[]>([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await axios.get('/api/saas/notificacoes?limit=8');
      setItens(res.data?.itens || []);
      setTotalNaoLidas(res.data?.totalNaoLidas || 0);
    } catch {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    pollRef.current = window.setInterval(carregar, POLL_MS) as unknown as number;
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [carregar]);

  // Recebe notificação push em tempo real (via BroadcastChannel do sw.js)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('workid-push');
    const handler = () => carregar();
    bc.addEventListener('message', handler);
    return () => { bc.removeEventListener('message', handler); bc.close(); };
  }, [carregar]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [aberto]);

  const marcarLida = useCallback(async (n: Notif) => {
    if (!n.lida) {
      try {
        await axios.patch(`/api/saas/notificacoes/${n.id}/lida`, { lida: true });
        setItens(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x));
        setTotalNaoLidas(c => Math.max(0, c - 1));
      } catch { /* ignora */ }
    }
  }, []);

  const onClickItem = useCallback(async (n: Notif) => {
    setAberto(false);
    marcarLida(n);
    if (n.url) router.push(n.url);
  }, [marcarLida, router]);

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
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto(v => !v)}
        className="relative flex items-center gap-2 bg-elevated hover:bg-elevated-solid/50 text-text-secondary px-3 py-2 rounded-xl border border-border-subtle text-sm transition-colors"
        aria-label="Notificações"
      >
        <Bell size={16} className={totalNaoLidas > 0 ? 'text-purple-400' : ''} />
        <span className="hidden sm:inline">Notificações</span>
        {totalNaoLidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[min(380px,calc(100vw-2rem))] bg-page border border-border-default rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-text-primary">Notificações</p>
              <p className="text-[11px] text-text-muted">
                {totalNaoLidas > 0 ? `${totalNaoLidas} não lida${totalNaoLidas === 1 ? '' : 's'}` : 'Tudo em dia'}
              </p>
            </div>
            {totalNaoLidas > 0 && (
              <button
                onClick={marcarTodas}
                disabled={marcandoTodas}
                className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
              >
                <CheckCheck size={13} /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {carregando && itens.length === 0 ? (
              <div className="px-4 py-10 text-center text-text-faint text-sm">Carregando...</div>
            ) : itens.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox size={28} className="mx-auto text-text-faint mb-2" />
                <p className="text-sm text-text-muted">Nenhuma notificação ainda.</p>
                <p className="text-[11px] text-text-faint mt-1">Avisaremos quando algo importante acontecer.</p>
              </div>
            ) : (
              itens.map(n => {
                const cfg = TIPO_ICON[n.tipo] || TIPO_ICON.SISTEMA;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => onClickItem(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-hover-bg transition-colors border-b border-border-subtle last:border-0 ${!n.lida ? 'bg-purple-500/5' : ''}`}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                      <Icon size={16} className={cfg.cls} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight truncate ${n.lida ? 'text-text-secondary font-normal' : 'text-text-primary font-bold'}`}>
                          {n.titulo}
                        </p>
                        {!n.lida && <span className="shrink-0 w-2 h-2 mt-1.5 bg-purple-500 rounded-full" />}
                      </div>
                      <p className="text-xs text-text-muted truncate mt-0.5">{n.mensagem}</p>
                      <p className="text-[10px] text-text-faint mt-1">{tempoRelativo(n.criadoEm)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-border-subtle bg-elevated/30">
            <Link
              href="/saas/notificacoes"
              onClick={() => setAberto(false)}
              className="block w-full text-center text-xs font-medium text-purple-400 hover:text-purple-300 py-1"
            >
              Ver todas as notificações →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
