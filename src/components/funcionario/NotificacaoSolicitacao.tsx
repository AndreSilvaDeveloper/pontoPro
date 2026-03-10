'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, X, History } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

const STORAGE_KEY = 'func_solicit_vistas_v1';
const POLL_INTERVAL = 30_000; // 30 segundos

/** Som sutil via Web Audio API */
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1.0, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.2);
    playTone(1175, now + 0.12, 0.25);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch { /* silent */ }
}

function getVistas(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function marcarVistas(ids: string[]) {
  try {
    const atuais = getVistas();
    const merged = [...new Set([...atuais, ...ids])].slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('func-notif-update'));
  } catch { /* ignore */ }
}

/** Retorna total de notificações não vistas (para uso externo) */
export function getNotifCount(): number {
  try {
    const raw = localStorage.getItem('func_notif_count');
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

type Notificacao = {
  id: string;
  status: 'APROVADO' | 'REJEITADO';
  motivo: string;
  decididoPorNome?: string;
  novoHorario?: string;
};

export default function NotificacaoSolicitacao() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [visible, setVisible] = useState(false);
  const somTocadoRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verificar = useCallback(async () => {
    try {
      const res = await axios.get('/api/funcionario/minhas-solicitacoes');
      const todas: any[] = res.data;

      // Filtrar solicitações decididas (não PENDENTE)
      const decididas = todas.filter(
        (s: any) => s.status === 'APROVADO' || s.status === 'REJEITADO'
      );

      const vistas = getVistas();
      const novas = decididas.filter((s: any) => !vistas.includes(s.id));

      // Atualizar contador global (para o badge do BottomNav)
      localStorage.setItem('func_notif_count', String(novas.length));
      window.dispatchEvent(new Event('func-notif-update'));

      if (novas.length > 0 && !visible) {
        setNotificacoes(
          novas.slice(0, 5).map((s: any) => ({
            id: s.id,
            status: s.status,
            motivo: s.motivo,
            decididoPorNome: s.decididoPorNome,
            novoHorario: s.novoHorario,
          }))
        );
        setVisible(true);

        if (!somTocadoRef.current) {
          somTocadoRef.current = true;
          setTimeout(() => playNotifSound(), 2000);
        }
      }
    } catch {
      /* silencioso */
    }
  }, [visible]);

  useEffect(() => {
    // Primeira verificação após 2s (para não bloquear o carregamento)
    const initial = setTimeout(verificar, 2000);

    // Polling periódico
    intervalRef.current = setInterval(verificar, POLL_INTERVAL);

    return () => {
      clearTimeout(initial);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [verificar]);

  const dismiss = () => {
    marcarVistas(notificacoes.map((n) => n.id));
    setVisible(false);
    somTocadoRef.current = false;
    localStorage.setItem('func_notif_count', '0');
    window.dispatchEvent(new Event('func-notif-update'));
  };

  if (!visible || notificacoes.length === 0) return null;

  const aprovadas = notificacoes.filter((n) => n.status === 'APROVADO').length;
  const rejeitadas = notificacoes.filter((n) => n.status === 'REJEITADO').length;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex justify-center animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="w-full max-w-sm bg-surface-solid/95 backdrop-blur-xl border border-border-default rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Barra de progresso */}
        <div className="h-0.5 bg-elevated-solid overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-purple-500 animate-[shrink_10s_linear_forwards]" />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 shrink-0">
              <History size={16} className="text-purple-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Atualização de Solicitação
              </p>

              <div className="flex flex-col gap-1 mt-2">
                {aprovadas > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">
                      {aprovadas} solicitação(ões) aprovada(s)
                    </span>
                  </div>
                )}
                {rejeitadas > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <XCircle size={14} className="text-red-400 shrink-0" />
                    <span className="text-red-300">
                      {rejeitadas} solicitação(ões) rejeitada(s)
                    </span>
                  </div>
                )}
              </div>

              <Link
                href="/funcionario/historico"
                onClick={dismiss}
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium mt-2 transition-colors"
              >
                Ver detalhes →
              </Link>
            </div>

            <button
              onClick={dismiss}
              className="p-1 text-text-dim hover:text-text-secondary rounded-lg hover:bg-hover-bg transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
