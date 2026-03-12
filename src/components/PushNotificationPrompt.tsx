'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, Shield, Zap, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationPrompt() {
  const { isSupported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dispensado, setDispensado] = useState(true);

  useEffect(() => {
    if (isSupported && !isSubscribed && permission !== 'denied') {
      const jaDispensou = sessionStorage.getItem('push_prompt_dispensado');
      if (!jaDispensou) {
        const timer = setTimeout(() => setDispensado(false), 2000);
        return () => clearTimeout(timer);
      }
    }

    // Se não vai mostrar o prompt, avisa que já resolveu
    if (!isSupported || isSubscribed || permission === 'denied' || sessionStorage.getItem('push_prompt_dispensado')) {
      window.dispatchEvent(new Event('push-prompt-done'));
    }
  }, [isSupported, isSubscribed, permission]);

  const dispensar = () => {
    sessionStorage.setItem('push_prompt_dispensado', 'true');
    setDispensado(true);
    window.dispatchEvent(new Event('push-prompt-done'));
  };

  const ativar = async () => {
    const ok = await subscribe();
    if (ok) {
      setDispensado(true);
      window.dispatchEvent(new Event('push-prompt-done'));
    }
  };

  if (dispensado || !isSupported || isSubscribed || permission === 'denied') return null;

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={dispensar} />

      <div className="relative z-10 w-full max-w-sm bg-page border border-border-default shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 text-center relative">
          <button onClick={dispensar} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <BellRing size={32} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-lg">Ative as Notificações</h2>
          <p className="text-white/70 text-sm mt-1">Fique por dentro de tudo em tempo real</p>
        </div>

        {/* Benefícios */}
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-xl shrink-0">
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Saiba na hora</p>
              <p className="text-xs text-text-muted">Receba aviso quando sua solicitação for aprovada ou rejeitada.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-amber-500/10 p-2 rounded-xl shrink-0">
              <Bell size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Mesmo com o app fechado</p>
              <p className="text-xs text-text-muted">A notificação aparece na tela do celular igual WhatsApp e Instagram.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-blue-500/10 p-2 rounded-xl shrink-0">
              <Shield size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">Seguro e sem spam</p>
              <p className="text-xs text-text-muted">Apenas avisos importantes do sistema. Sem propagandas.</p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="px-6 pb-6 space-y-2">
          <button
            onClick={ativar}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <BellRing size={18} />
                Ativar Notificações
              </>
            )}
          </button>
          <button
            onClick={dispensar}
            className="w-full py-2.5 text-text-muted hover:text-text-primary text-xs font-medium transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
