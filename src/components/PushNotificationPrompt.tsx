'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationPrompt() {
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    // Só mostra se suporta, não está inscrito e não foi dispensado nesta sessão
    if (isSupported && !isSubscribed && permission !== 'denied') {
      const jaDispensou = sessionStorage.getItem('push_prompt_dispensado');
      if (!jaDispensou) {
        const timer = setTimeout(() => setDispensado(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSupported, isSubscribed, permission]);

  const dispensar = () => {
    sessionStorage.setItem('push_prompt_dispensado', 'true');
    setDispensado(true);
  };

  const ativar = async () => {
    const ok = await subscribe();
    if (ok) setDispensado(true);
  };

  // Já inscrito ou não suporta ou foi dispensado ou negado
  if (dispensado || !isSupported || isSubscribed || permission === 'denied') return null;

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3">
      <div className="bg-purple-500/20 p-2 rounded-xl shrink-0">
        <Bell size={20} className="text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary">Ativar notificações</p>
        <p className="text-xs text-text-muted mt-0.5">Receba alertas mesmo quando o app estiver em segundo plano.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={ativar}
          disabled={loading}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
        >
          {loading ? 'Ativando...' : 'Ativar'}
        </button>
        <button
          onClick={dispensar}
          className="p-1.5 text-text-faint hover:text-text-muted transition-colors rounded-lg"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
