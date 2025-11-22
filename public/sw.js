// public/sw.js

// Réception d'une notif push
self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Notification", body: event.data.text(), url: "/" };
  }

  const title = data.title || "Grega Play";
  const options = {
    body: data.body || "",
    icon: "/logo192.png", // adapte si besoin
    badge: "/logo192.png",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification → ouvrir l’URL
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data && event.notification.data.url;

  if (url) {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then(
        (clientList) => {
          for (const client of clientList) {
            if (client.url === url && "focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        }
      )
    );
  }
});
