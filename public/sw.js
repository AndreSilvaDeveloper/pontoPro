// Ativa o SW imediatamente, sem esperar navegação
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Assume controle de todas as abas/clientes imediatamente
self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  // iOS EXIGE que toda push mostre notificação — nunca retornar sem mostrar
  var data = { title: 'WorkID', body: 'Nova notificação' };

  try {
    if (event.data) {
      var parsed = event.data.json();
      data = {
        title: parsed.title || 'WorkID',
        body: parsed.body || 'Nova notificação',
        url: parsed.url || '/',
        tag: parsed.tag || 'default',
      };
    }
  } catch (e) {
    try {
      if (event.data) {
        data.body = event.data.text() || 'Nova notificação';
      }
    } catch (e2) {
      // usa o fallback já definido
    }
  }

  var options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
