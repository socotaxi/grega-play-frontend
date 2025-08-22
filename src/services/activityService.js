// frontend/src/services/activityService.js
import supabase from "../lib/supabaseClient";

const activityService = {
  /**
   * Log une activité dans la table activity_feed
   */
  async logActivity({ event_id, user_id, type, message }) {
    if (!event_id || !user_id) {
      console.error("❌ logActivity appelé sans event_id ou user_id", {
        event_id,
        user_id,
        type,
        message,
      });
      return null; // on évite de faire un insert invalide
    }

    const { data, error } = await supabase.from("activity_feed").insert([
      {
        event_id,
        user_id,
        type,
        message,
      },
    ]);

    if (error) {
      console.error("❌ Erreur logActivity:", error);
      throw error;
    }

    console.log("✅ Activity logged:", data);
    return data;
  },

  /**
   * Récupère toutes les activités d’un événement
   */
  async getEventFeed(event_id) {
    if (!event_id) {
      console.error("❌ getEventFeed appelé sans event_id");
      return [];
    }

    const { data, error } = await supabase
      .from("activity_feed_with_user")
      .select("*")
      .eq("event_id", event_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Erreur getEventFeed:", error);
      throw error;
    }

    console.log("✅ Feed récupéré:", data);
    return data;
  },

  /**
   * Récupère toutes les activités liées à un utilisateur
   */
  async getUserFeed(user_id) {
    if (!user_id) {
      console.error("❌ getUserFeed appelé sans user_id");
      return [];
    }

    const { data, error } = await supabase
      .from("activity_feed_with_user")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Erreur getUserFeed:", error);
      throw error;
    }

    return data;
  },
};

export default activityService;
