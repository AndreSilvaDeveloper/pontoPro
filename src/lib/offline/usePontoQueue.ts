'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { listPendentes, sincronizarTodos, PontoPendente } from './pontoQueue';

export function usePontoQueue() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendentes, setPendentes] = useState<PontoPendente[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizandoRef = useRef(false);

  const recarregar = useCallback(async () => {
    const lista = await listPendentes();
    setPendentes(lista);
  }, []);

  const sincronizar = useCallback(async (silencioso = false) => {
    if (sincronizandoRef.current) return;
    sincronizandoRef.current = true;
    setSincronizando(true);
    try {
      const res = await sincronizarTodos();
      await recarregar();
      if (!silencioso && res.ok > 0) {
        toast.success(`${res.ok} ponto(s) sincronizado(s)`);
      }
      if (!silencioso && res.falhou > 0) {
        toast.warning(`${res.falhou} ponto(s) com falha na sincronização`);
      }
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
    }
  }, [recarregar]);

  // Listener online/offline + sync automática ao voltar online
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      sincronizar(true);
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Carrega a fila no mount e tenta sincronizar se online
    recarregar();
    if (navigator.onLine) sincronizar(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [recarregar, sincronizar]);

  // Tenta sincronizar a cada 60s quando tem pendente
  useEffect(() => {
    if (pendentes.length === 0 || !online) return;
    const intervalo = setInterval(() => {
      sincronizar(true);
    }, 60000);
    return () => clearInterval(intervalo);
  }, [pendentes.length, online, sincronizar]);

  return {
    online,
    pendentes,
    qtd: pendentes.length,
    sincronizando,
    sincronizar,
    recarregar,
  };
}
