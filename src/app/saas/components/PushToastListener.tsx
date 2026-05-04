'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import Link from 'next/link';

type Toast = {
  id: number;
  title: string;
  body: string;
  url: string;
};

let nextId = 1;

/**
 * Mostra um toast no canto da tela quando uma push chega com a aba aberta.
 * Conversa com o sw.js via BroadcastChannel('workid-push').
 */
export default function PushToastListener() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('workid-push');

    const handler = (ev: MessageEvent) => {
      const payload = ev.data?.payload;
      if (!payload?.title) return;

      const t: Toast = {
        id: nextId++,
        title: payload.title,
        body: payload.body || '',
        url: payload.url || '/saas',
      };
      setToasts(prev => [...prev, t]);

      // Auto-remove em 6s
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, 6000);

      // Som curto (best-effort, ignora se autoplay bloqueado)
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.42);
      } catch { /* ignora */ }
    };

    bc.addEventListener('message', handler);
    return () => { bc.removeEventListener('message', handler); bc.close(); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto bg-page border-2 border-purple-500/40 shadow-2xl shadow-purple-500/10 rounded-2xl p-4 w-[min(360px,calc(100vw-2rem))] animate-in slide-in-from-right fade-in duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 bg-purple-500/15 rounded-lg flex items-center justify-center">
              <Bell size={16} className="text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{t.title}</p>
              <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{t.body}</p>
              <Link
                href={t.url}
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="inline-block text-[11px] font-medium text-purple-400 hover:text-purple-300 mt-2"
              >
                Ver detalhes →
              </Link>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="shrink-0 text-text-faint hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
