// src/services/billingService.js
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API_SECRET = import.meta.env.VITE_API_SECRET;

if (!BACKEND_URL) {
  console.warn("VITE_BACKEND_URL manquant dans .env");
}
if (!API_SECRET) {
  console.warn("VITE_API_SECRET manquant dans .env");
}

async function createCheckoutSession(url, body) {
  const response = await fetch(`${BACKEND_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_SECRET,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Erreur API Checkout (${response.status})`
    );
  }

  const data = await response.json();
  if (!data.url) {
    throw new Error("Réponse API Checkout sans URL de session Stripe.");
  }

  return data.url;
}

/**
 * Checkout Premium par compte
 */
export async function startAccountPremiumCheckout(userId) {
  if (!userId) {
    throw new Error("userId manquant pour le checkout compte premium");
  }

  return createCheckoutSession("/api/billing/checkout-account", {
    userId,
  });
}

/**
 * Checkout Premium par événement
 */
export async function startEventPremiumCheckout(userId, eventId) {
  if (!userId) {
    throw new Error("userId manquant pour le checkout event premium");
  }
  if (!eventId) {
    throw new Error("eventId manquant pour le checkout event premium");
  }

  return createCheckoutSession("/api/billing/checkout-event", {
    userId,
    eventId,
  });
}
