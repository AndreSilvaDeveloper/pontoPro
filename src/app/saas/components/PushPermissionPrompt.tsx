'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const STORAGE_KEY = 'saas_push_prompt_dismissed_v1';

/**
 * Prompt discreto que aparece no topo do painel SaaS pedindo permissão de notificações
 * caso ainda não tenha sido concedida e o usuário não tenha dispensado.
 */
export default function PushPermissionPrompt() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setDispensado(v === '1');
    } catch { /* ignora */ }
  }, []);

  const dispensar = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignora */ }
    setDispensado(true);
  };

  if (!isSupported) return null;
  if (permission === 'granted' && isSubscribed) return null;
  if (permission === 'denied') return null;
  if (dispensado) return null;

  return (
    <div className="bg-purple-500/10 border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
          <Bell size={16} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">Ativar notificações deste navegador</p>
          <p className="text-[11px] text-text-muted">Receba alertas instantâneos de leads, pagamentos e novos cadastros.</p>
        </div>
        <button
          onClick={subscribe}
          disabled={loading}
          className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Ativando...' : 'Ativar'}
        </button>
        <button
          onClick={dispensar}
          className="shrink-0 text-text-faint hover:text-text-primary p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
          aria-label="Dispensar"
          title="Dispensar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
