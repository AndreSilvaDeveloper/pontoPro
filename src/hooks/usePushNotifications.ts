'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

async function enviarSubscriptionAoServidor(sub: PushSubscription) {
  const subJson = sub.toJSON();
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: subJson.keys,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Erro ao salvar subscription: ${res.status} ${body}`);
  }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (!supported) return;

    const perm = Notification.permission;
    setPermission(perm);

    // Se o usuário já deu permissão, garante que a subscription está fresca
    // iOS mata a subscription quando fecha o PWA — precisa recriar
    if (perm === 'granted') {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          let sub = await reg.pushManager.getSubscription();

          // Se não existe (iOS expirou), recria automaticamente
          if (!sub) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as any,
            });
          }

          if (sub) {
            setIsSubscribed(true);
            // Envia ao servidor — limpa as antigas e salva a nova
            await enviarSubscriptionAoServidor(sub).catch(() => {});
          }
        } catch (e) {
          console.error('Erro ao renovar subscription:', e);
        }
      });
    } else {
      // Verifica se tem subscription mesmo sem permissão granted
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setLoading(true);

    try {
      if (!VAPID_KEY) {
        console.error('VAPID_KEY vazia — NEXT_PUBLIC_VAPID_PUBLIC_KEY não foi incluída no build');
        setLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        console.warn('Permissão de notificação negada:', perm);
        setLoading(false);
        return false;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as any,
      });

      await enviarSubscriptionAoServidor(subscription);

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      setLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error('Erro ao desativar notificações:', error);
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe };
}
