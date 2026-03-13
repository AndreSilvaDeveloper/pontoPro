'use client';

import { useState, useEffect } from 'react';

export default function PushDebugPage() {
  const [info, setInfo] = useState<Record<string, any>>({});

  useEffect(() => {
    const data: Record<string, any> = {};

    data.userAgent = navigator.userAgent;
    data.standalone = (navigator as any).standalone ?? '(undefined)';
    data.displayMode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
    data.serviceWorker = 'serviceWorker' in navigator;
    data.pushManager = 'PushManager' in window;
    data.notification = 'Notification' in window;
    data.permission = 'Notification' in window ? Notification.permission : '(sem suporte)';
    data.vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'configurada' : 'FALTANDO';

    setInfo(data);

    // Tenta checar subscription
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription();
          setInfo(prev => ({
            ...prev,
            swState: reg.active?.state ?? '(sem active)',
            subscriptionExists: !!sub,
            endpoint: sub?.endpoint?.substring(0, 80) ?? '(nenhuma)',
          }));
        } catch (e: any) {
          setInfo(prev => ({
            ...prev,
            subscriptionError: e.message,
          }));
        }
      }).catch((e: any) => {
        setInfo(prev => ({ ...prev, swReadyError: e.message }));
      });
    }
  }, []);

  const testarPermissao = async () => {
    try {
      const perm = await Notification.requestPermission();
      setInfo(prev => ({ ...prev, permissionResult: perm }));
    } catch (e: any) {
      setInfo(prev => ({ ...prev, permissionError: e.message }));
    }
  };

  const testarSubscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      setInfo(prev => ({
        ...prev,
        newSubscription: true,
        newEndpoint: sub.endpoint.substring(0, 80),
      }));

      // Envia ao servidor
      const subJson = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      });
      const data = await res.json();
      setInfo(prev => ({ ...prev, serverResponse: data }));
    } catch (e: any) {
      setInfo(prev => ({ ...prev, subscribeError: e.message }));
    }
  };

  const testarPush = async () => {
    try {
      const res = await fetch('/api/cron/lembretes/teste');
      const data = await res.json();
      setInfo(prev => ({ ...prev, pushTestResult: data }));
    } catch (e: any) {
      setInfo(prev => ({ ...prev, pushTestError: e.message }));
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 13, background: '#111', color: '#eee', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Push Debug</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <button onClick={testarPermissao} style={{ padding: '12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
          1. Pedir Permissao
        </button>
        <button onClick={testarSubscribe} style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
          2. Criar Subscription
        </button>
        <button onClick={testarPush} style={{ padding: '12px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
          3. Enviar Push Teste
        </button>
      </div>

      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#1a1a2e', padding: 16, borderRadius: 8, lineHeight: 1.6 }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
