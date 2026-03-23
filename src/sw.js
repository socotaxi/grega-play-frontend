import { precacheAndRoute } from 'workbox-precaching';

// Workbox injecte ici la liste des assets à précacher lors du build
precacheAndRoute(self.__WB_MANIFEST);

// ── Push : affiche la notification ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Grega Play', body: event.data.text() };
  }

  const title = payload.title || 'Grega Play';
  const options = {
    body: payload.body || '',
    icon: '/logo192x192.png',
    badge: '/logo192x192.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Clic sur notification : ouvre / focus l'URL ───────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Si une fenêtre de l'app est déjà ouverte, on la focus et on navigue
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        // Sinon on ouvre une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
