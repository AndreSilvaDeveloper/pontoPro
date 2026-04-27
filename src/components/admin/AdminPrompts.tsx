'use client';

import { useEffect, useState } from 'react';
import InstallPrompt from '@/components/InstallPrompt';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminPrompts({ empresaNome, addonTotemEfetivo }: { empresaNome?: string; addonTotemEfetivo?: boolean }) {
  const [pendAjuste, setPendAjuste] = useState(0);
  const [pendAusencia, setPendAusencia] = useState(0);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch('/api/admin/solicitacoes?status=PENDENTE', { cache: 'no-store' }),
          fetch('/api/admin/ausencias?status=PENDENTE', { cache: 'no-store' }),
        ]);
        if (cancel) return;
        if (r1.ok) {
          const d = await r1.json();
          setPendAjuste(Array.isArray(d) ? d.length : (d?.items?.length ?? d?.total ?? 0));
        }
        if (r2.ok) {
          const d = await r2.json();
          setPendAusencia(Array.isArray(d) ? d.length : (d?.items?.length ?? d?.total ?? 0));
        }
      } catch {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => { cancel = true; clearInterval(id); };
  }, []);

  return (
    <>
      <PushNotificationPrompt />
      <InstallPrompt />
      <AdminSidebar
        empresaNome={empresaNome}
        pendenciasAjuste={pendAjuste}
        pendenciasAusencia={pendAusencia}
        addonTotemEfetivo={addonTotemEfetivo === true}
      />
    </>
  );
}
