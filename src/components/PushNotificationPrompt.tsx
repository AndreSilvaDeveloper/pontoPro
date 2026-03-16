'use client';

import { useState, useEffect } from 'react';
import { BellRing, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

const STORAGE_KEY = 'push_prompt_ativado_v1';

export default function PushNotificationPrompt() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    // Já ativou ou já dispensou permanentemente
    if (isSubscribed && permission === 'granted') {
      (window as any).__pushDone = true;
      window.dispatchEvent(new Event('push-prompt-done'));
      return;
    }

    // Navegador não suporta ou bloqueou
    if (!isSupported || permission === 'denied') {
      (window as any).__pushDone = true;
      window.dispatchEvent(new Event('push-prompt-done'));
      return;
    }

    // Já ativou antes (localStorage persistente)
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        (window as any).__pushDone = true;
        window.dispatchEvent(new Event('push-prompt-done'));
        return;
      }
    } catch {}

    // Espera tour + billing + ciência terminarem
    const show = () => setTimeout(() => setMostrar(true), 500);

    const w = window as any;
    if (w.__promptsReady) {
      show();
      return;
    }

    const onReady = () => show();
    window.addEventListener('prompts-ready', onReady);
    return () => window.removeEventListener('prompts-ready', onReady);
  }, [isSupported, permission, isSubscribed]);

  const dispensar = () => {
    setMostrar(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    (window as any).__pushDone = true;
    window.dispatchEvent(new Event('push-prompt-done'));
  };

  const ativar = async () => {
    const ok = await subscribe();
    if (ok) {
      toast.success('Notificações ativadas!');
      dispensar();
    } else {
      toast.error('Não foi possível ativar. Verifique as permissões do navegador.');
    }
  };

  if (!mostrar) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[190] flex justify-center animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="w-full max-w-sm bg-surface-solid/95 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 shrink-0">
              <BellRing size={18} className="text-purple-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Ative as notificações
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                Receba avisos de horários e atualizações em tempo real.
              </p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={ativar}
                  disabled={loading}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <BellRing size={14} />
                      Ativar
                    </>
                  )}
                </button>
                <button
                  onClick={dispensar}
                  className="px-3 py-2 text-text-muted hover:text-text-primary text-xs transition-colors"
                >
                  Agora não
                </button>
              </div>
            </div>

            <button
              onClick={dispensar}
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
