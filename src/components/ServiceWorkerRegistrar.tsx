'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then(reg => {
          // Força buscar versão nova do SW a cada abertura
          reg.update().catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
