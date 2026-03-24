import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Workbox injecte ici la liste des assets à précacher lors du build
precacheAndRoute(self.__WB_MANIFEST);

// ── Cache des images uniquement (CacheFirst) ──────────────────────────────────
// Les appels API (Supabase, backend) ne sont PAS mis en cache :
// ils contiennent des tokens d'auth et des données en temps réel.
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }), // 7 jours
    ],
  })
);

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
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
