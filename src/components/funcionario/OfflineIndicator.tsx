'use client';

import { useEffect } from 'react';
import { CloudOff, RefreshCw, WifiOff, CheckCircle2 } from 'lucide-react';
import { usePontoQueue } from '@/lib/offline/usePontoQueue';

export default function OfflineIndicator() {
  const { online, qtd, sincronizando, sincronizar, recarregar } = usePontoQueue();

  // Atualiza quando outra tela adiciona item na fila
  useEffect(() => {
    const handler = () => { recarregar(); };
    window.addEventListener('offline-queue-updated', handler);
    return () => window.removeEventListener('offline-queue-updated', handler);
  }, [recarregar]);

  // Nada a mostrar
  if (online && qtd === 0) return null;

  return (
    <div
      className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        !online
          ? 'bg-amber-500/15 border-amber-500/30'
          : 'bg-blue-500/15 border-blue-500/30'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-md mx-auto px-4 py-2 flex items-center gap-2">
        {!online ? (
          <WifiOff size={14} className="text-amber-400 shrink-0" />
        ) : qtd > 0 ? (
          <CloudOff size={14} className="text-blue-400 shrink-0" />
        ) : (
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {!online && qtd === 0 && (
            <p className="text-xs font-bold text-amber-300">Sem internet — pontos serão salvos offline</p>
          )}
          {!online && qtd > 0 && (
            <p className="text-xs font-bold text-amber-300">
              Sem internet · {qtd} ponto(s) aguardando envio
            </p>
          )}
          {online && qtd > 0 && (
            <p className="text-xs font-bold text-blue-300">
              {qtd} ponto(s) aguardando sincronizar
            </p>
          )}
        </div>

        {online && qtd > 0 && (
          <button
            onClick={() => sincronizar(false)}
            disabled={sincronizando}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 rounded-lg text-blue-300 text-[11px] font-bold transition-colors"
          >
            <RefreshCw size={11} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Enviando...' : 'Enviar agora'}
          </button>
        )}
      </div>
    </div>
  );
}
