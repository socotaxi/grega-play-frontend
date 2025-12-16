import supabase from "../lib/supabaseClient";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY;

const eventService = {
  // ---------------------------------------------------------
  // 🔵 Méthode simple : récupère l'événement complet (*)
  // ---------------------------------------------------------
  async getEvent(eventId) {
    const { data, error, status } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error("Erreur Supabase getEvent:", {
        status,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error("Erreur lors du chargement de l'événement");
    }

    if (!data) {
      throw new Error("Événement introuvable");
    }

    return data;
  },

  // ---------------------------------------------------------
  // 🔵 Méthode principale détaillée (NOW: sécurisée)
  // ---------------------------------------------------------
  async getEventById(eventId) {
    const { data, error, status } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error("Erreur Supabase getEventById:", {
        status,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error("Impossible de charger l'événement");
    }

    if (!data) {
      throw new Error("Événement introuvable");
    }

    return data;
  },

  // ---------------------------------------------------------
  // 🔵 Méthode utilisée par EventDetailsPage.jsx
  // ---------------------------------------------------------
  async getEventDetails(eventId) {
    try {
      return await this.getEventById(eventId);
    } catch (err) {
      console.warn("getEventById a échoué, fallback sur getEvent :", err?.message || err);
      return this.getEvent(eventId);
    }
  },

  // ---------------------------------------------------------
  // 🔵 Participants d’un événement
  // ---------------------------------------------------------
  async getEventParticipants(eventId) {
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("event_id", eventId);

    if (error) {
      console.error("Erreur getEventParticipants:", error);
      throw new Error("Erreur chargement participants");
    }
    return data;
  },

  // ---------------------------------------------------------
  // 🔵 Création événement
  // ---------------------------------------------------------
  async createEvent({
    title,
    description,
    theme,
    endDate,
    videoDuration,
    maxClipDuration,
    userId,
    public_code,
    media_url,
    enable_notifications,
    isPublic = false,
  }) {
    const payload = {
      title,
      description,
      theme,
      deadline: endDate,
      user_id: userId,
      public_code,
      media_url,
      is_public: isPublic,
    };

    if (typeof videoDuration !== "undefined") {
      payload.video_duration = videoDuration;
    }
    if (typeof maxClipDuration !== "undefined") {
      payload.max_clip_duration = maxClipDuration;
    }
    if (typeof enable_notifications !== "undefined") {
      payload.enable_notifications = enable_notifications;
    }

    const { data, error } = await supabase
      .from("events")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Erreur Supabase createEvent:", error);
      throw new Error("Erreur lors de la création de l’événement");
    }

    return data;
  },

  // ---------------------------------------------------------
  // 🔵 Suppression event via backend sécurisé (Node)
  // ---------------------------------------------------------
  async deleteEvent(eventId, userId) {
    if (!API_BASE_URL || !API_KEY) {
      console.error("Config backend manquante pour deleteEvent.");
      throw new Error("Configuration backend manquante.");
    }

    const res = await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify({ userId }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (_) {}

    if (!res.ok) {
      console.error("❌ Erreur API deleteEvent:", data);
      throw new Error(data.error || "Erreur lors de la suppression de l'événement");
    }

    return true;
  },

  // ---------------------------------------------------------
  // 🔵 Événements du Dashboard (RPC get_user_events)
  // ---------------------------------------------------------
  async getDashboardEvents(userId, userEmail) {
    const { data, error } = await supabase.rpc("get_user_events", {
      p_user_id: userId,
      p_user_email: userEmail,
    });

    if (error) {
      console.error("Erreur RPC get_user_events:", error);
      throw new Error("Erreur chargement tableau de bord");
    }

    return data;
  },

  // ---------------------------------------------------------
  // 🔵 Récupération vidéos d’un event (si utilisé)
  // ---------------------------------------------------------
  async getEventVideos(eventId) {
    const { data, error } = await supabase
      .from("videos")
      .select("id, event_id, user_id, storage_path, created_at")
      .eq("event_id", eventId);

    if (error) {
      console.error("Erreur getEventVideos:", error);
      throw new Error("Erreur récupération vidéos");
    }

    return data;
  },

  // ---------------------------------------------------------
  // 🔵 Stats événement (backend Node /api/events/:id/stats)
  // Objectif: NE JAMAIS casser le Dashboard si la route manque.
  // ---------------------------------------------------------
  async getEventStats(eventId) {
    const fallback = {
      event_id: eventId,
      totalInvitations: 0,
      totalWithVideo: 0,
      totalPending: 0,

      // champs optionnels (si ton backend les renvoie)
      videos_count: 0,
      invites_count: 0,
      max_videos: 0,
      hasReachedUploadLimit: false,
      is_premium_event: false,
      status: "open",
    };

    // Si backend pas configuré -> fallback silencieux
    if (!API_BASE_URL || !API_KEY) {
      console.warn("Config backend manquante pour stats -> fallback.");
      return fallback;
    }

    let res;
    try {
      res = await fetch(`${API_BASE_URL}/api/events/${eventId}/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
      });
    } catch (e) {
      console.warn("getEventStats fetch failed -> fallback:", e?.message || e);
      return fallback;
    }

    // Route absente / event introuvable -> fallback
    if (res.status === 404) {
      return fallback;
    }

    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }

    // Toute autre erreur -> fallback (pour ne pas casser Promise.all)
    if (!res.ok) {
      console.warn("❌ getEventStats non-ok -> fallback:", {
        status: res.status,
        data,
      });
      return fallback;
    }

    // Normaliser: on merge avec fallback pour garantir les clés
    return { ...fallback, ...data };
  },

  // ---------------------------------------------------------
  // 🔵 Mise à jour deadline (utilisée dans EventDetailsPage)
  // ---------------------------------------------------------
  async updateEventDeadline(eventId, newDeadline) {
    const { data, error } = await supabase
      .from("events")
      .update({ deadline: newDeadline })
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      console.error("Erreur updateEventDeadline:", error);
      throw new Error("Impossible de mettre à jour la date limite");
    }

    return data;
  },

  // (ancien nom conservé si utilisé ailleurs)
  async updateDeadline(eventId, newDeadline) {
    return this.updateEventDeadline(eventId, newDeadline);
  },
};

export default eventService;
