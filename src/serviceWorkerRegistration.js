// src/serviceWorkerRegistration.js

// Permet d’enregistrer le service worker pour activer le mode PWA offline
export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("✅ Service Worker enregistré avec succès:", registration.scope);
        })
        .catch((error) => {
          console.error("❌ Échec de l'enregistrement du Service Worker:", error);
        });
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
