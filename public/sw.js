var CACHE_VERSION = 'workid-v2';

// Ativa o SW imediatamente, sem esperar navegação
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Assume controle de todas as abas/clientes imediatamente + limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(function(names) {
        return Promise.all(
          names.filter(function(n) { return n !== CACHE_VERSION; }).map(function(n) { return caches.delete(n); })
        );
      }),
    ])
  );
});

/**
 * Estratégia:
 * - Navegações HTML (GET documents): network-first, fallback para cache.
 *   Permite que o app do funcionário abra mesmo sem internet.
 * - Assets estáticos (_next/static): cache-first.
 * - API: sempre rede (nunca cachear respostas de API autenticadas).
 */
self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca intercepta APIs ou uploads — precisa de rede real
  if (url.pathname.startsWith('/api/')) return;

  var isNavigate = req.mode === 'navigate' || (req.destination === 'document');
  var isStatic = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');

  if (isNavigate) {
    event.respondWith(
      fetch(req)
        .then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function(cache) { cache.put(req, clone); });
          return response;
        })
        .catch(function() {
          return caches.match(req).then(function(cached) {
            return cached || caches.match('/funcionario');
          });
        })
    );
    return;
  }

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(function(cached) {
        return cached || fetch(req).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function(cache) { cache.put(req, clone); });
          return response;
        });
      })
    );
    return;
  }
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
