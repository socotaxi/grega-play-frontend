// src/services/notificationService.js
import supabase from "../lib/supabaseClient";

/* -------------------------------------------------------------------------- */
/*  URL du backend (même logique que dans videoService.js)                    */
/* -------------------------------------------------------------------------- */
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

/* -------------------------------------------------------------------------- */
/*               PARTIE 1 – Notifications PUSH (Web Push API)                 */
/* -------------------------------------------------------------------------- */

// Vérifie si le navigateur supporte les notifications push
function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

// Enregistre le service worker (fichier public/sw.js)
async function registerServiceWorker() {
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (err) {
    console.error("Erreur registration service worker:", err);
    throw err;
  }
}

// Récupère la clé publique VAPID depuis le backend
async function getPublicKey() {
  const res = await fetch(`${API_BASE_URL}/api/notifications/public-key`);
  if (!res.ok) {
    throw new Error("Impossible de récupérer la VAPID_PUBLIC_KEY");
  }
  const data = await res.json();
  return data.publicKey;
}

// Convertit la clé Base64 URL-Safe en Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Abonne un utilisateur aux notifications push
 * Utilisé dans CreateEventPage.jsx : subscribeToPush(user.id)
 */
export async function subscribeToPush(userId) {
  if (!userId) {
    console.warn("subscribeToPush appelé sans userId");
    return;
  }

  if (!isPushSupported()) {
    console.warn("Notifications push non supportées par ce navigateur.");
    return;
  }

  // 1) Enregistrer le service worker
  const registration = await registerServiceWorker();

  // 2) Récupérer la clé publique VAPID
  const publicKey = await getPublicKey();

  // 3) Créer / récupérer la subscription
  const existingSubscription = await registration.pushManager.getSubscription();
  let subscription = existingSubscription;

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  // 4) Envoyer la subscription au backend (URL corrigée)
  await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      subscription,
    }),
  });

  console.log("📬 Utilisateur abonné aux notifications push avec succès.");
}

/* -------------------------------------------------------------------------- */
/*           PARTIE 2 – Centre de notifications (table `notifications`)       */
/* -------------------------------------------------------------------------- */

const notificationService = {
  /**
   * Create a new notification
   * @param {Object} notification - The notification data
   * @returns {Promise<Object>} - The created notification
   */
  async createNotification(notification) {
    const { data, error } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type || "info",
          read: false,
          link: notification.link || null,
        },
      ])
      .select();

    if (error) {
      console.error("Error creating notification:", error);
      throw new Error(error.message);
    }

    return data[0];
  },

  /**
   * Get notifications for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - The user's notifications
   */
  async getUserNotifications(userId) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Mark a notification as read
   * @param {string} notificationId - The notification ID
   * @returns {Promise<Object>} - The updated notification
   */
  async markAsRead(notificationId) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select();

    if (error) {
      console.error("Error marking notification as read:", error);
      throw new Error(error.message);
    }

    return data[0];
  },

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async markAllAsRead(userId) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      throw new Error(error.message);
    }
  },

  /**
   * Notify participants about an event
   * @param {string} eventId - The event ID
   * @param {string} message - The notification message
   * @returns {Promise<void>}
   */
  async notifyEventParticipants(eventId, message) {
    // 1. Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("user_id")
      .eq("event_id", eventId);

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      throw new Error(participantsError.message);
    }

    // 2. Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single();

    if (eventError) {
      console.error("Error fetching event:", eventError);
      throw new Error(eventError.message);
    }

    // 3. Create notifications for each participant
    const notifications = participants.map((participant) => ({
      user_id: participant.user_id,
      title: `Événement: ${event.title}`,
      message,
      type: "event",
      link: `/events/${eventId}`,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);

    if (error) {
      console.error("Error creating notifications:", error);
      throw new Error(error.message);
    }
  },
};

export default notificationService;
