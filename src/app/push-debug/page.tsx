'use client';

import { useState, useEffect } from 'react';

export default function PushDebugPage() {
  const [info, setInfo] = useState<Record<string, any>>({});
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

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
          setInfo(prev => ({ ...prev, subscriptionError: e.message }));
        }
      }).catch((e: any) => {
        setInfo(prev => ({ ...prev, swReadyError: e.message }));
      });
    }
  }, []);

  const testarPermissao = async () => {
    try {
      addLog('Pedindo permissão...');
      const perm = await Notification.requestPermission();
      setInfo(prev => ({ ...prev, permissionResult: perm }));
      addLog(`Permissão: ${perm}`);
    } catch (e: any) {
      setInfo(prev => ({ ...prev, permissionError: e.message }));
      addLog(`Erro: ${e.message}`);
    }
  };

  const testarSubscribe = async () => {
    try {
      addLog('Criando subscription...');
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
      addLog('Subscription criada! Enviando ao servidor...');

      const subJson = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      });
      const data = await res.json();
      setInfo(prev => ({ ...prev, serverResponse: data }));
      addLog(data.ok ? 'Salva no servidor!' : `Erro servidor: ${JSON.stringify(data)}`);
    } catch (e: any) {
      setInfo(prev => ({ ...prev, subscribeError: e.message }));
      addLog(`Erro: ${e.message}`);
    }
  };

  const testarPush = async () => {
    try {
      addLog('Enviando push teste...');
      const res = await fetch('/api/cron/lembretes/teste');
      const data = await res.json();
      setInfo(prev => ({ ...prev, pushTestResult: data }));
      if (data.error) {
        addLog(`Erro: ${data.error} (precisa estar logado)`);
      } else {
        addLog(`Push enviado! ${JSON.stringify(data.resultados)}`);
      }
    } catch (e: any) {
      setInfo(prev => ({ ...prev, pushTestError: e.message }));
      addLog(`Erro: ${e.message}`);
    }
  };

  const testarPushDireto = async () => {
    try {
      addLog('Enviando push via diagnóstico...');
      const res = await fetch('/api/push/diagnostico', { method: 'POST' });
      const data = await res.json();
      setInfo(prev => ({ ...prev, pushDiretoResult: data }));
      if (data.error) {
        addLog(`Erro: ${data.error}`);
      } else {
        addLog(`Push enviado! Sucessos: ${data.enviados?.length ?? 0}`);
      }
    } catch (e: any) {
      addLog(`Erro: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 13, background: '#111', color: '#eee', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Push Debug</h1>
        <button
          onClick={() => window.history.back()}
          style={{ padding: '8px 16px', background: '#333', color: '#eee', border: 'none', borderRadius: 8, fontSize: 12 }}
        >
          ← Voltar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        <button onClick={testarPermissao} style={{ padding: '12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
          1. Pedir Permissão
        </button>
        <button onClick={testarSubscribe} style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
          2. Criar Subscription
        </button>
        <button onClick={testarPush} style={{ padding: '12px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
          3. Push Teste (precisa login)
        </button>
        <button onClick={testarPushDireto} style={{ padding: '12px', background: '#d97706', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}>
          4. Push Diagnóstico (precisa login)
        </button>
      </div>

      {log.length > 0 && (
        <div style={{ background: '#0a2a0a', padding: 12, borderRadius: 8, marginBottom: 16, maxHeight: 150, overflowY: 'auto' }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: '#4ade80', fontSize: 11, marginBottom: 2 }}>{l}</div>
          ))}
        </div>
      )}

      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#1a1a2e', padding: 16, borderRadius: 8, lineHeight: 1.6 }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
