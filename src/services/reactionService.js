// src/services/reactionService.js
import supabase from "../lib/supabaseClient";

const SESSION_KEY_STORAGE = "gp_session_key";
export const ALLOWED_EMOJIS = ["❤️", "😂", "🔥", "👏", "😭"];

/**
 * Retourne un identifiant de session persistant (localStorage).
 * Utilisé pour identifier les visiteurs non-connectés.
 */
export function getSessionKey() {
  let key = localStorage.getItem(SESSION_KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY_STORAGE, key);
  }
  return key;
}

const reactionService = {
  /**
   * Récupère les compteurs agrégés par emoji pour un montage.
   * Retourne : { '❤️': 12, '🔥': 3, ... }
   */
  async getCounts(publicCode) {
    if (!publicCode) return {};
    const { data, error } = await supabase
      .from("final_video_reactions")
      .select("emoji")
      .eq("public_code", publicCode);

    if (error) throw error;

    return (data || []).reduce((acc, row) => {
      acc[row.emoji] = (acc[row.emoji] || 0) + 1;
      return acc;
    }, {});
  },

  /**
   * Récupère la réaction de la session courante sur ce montage.
   * Retourne : '❤️' | null
   */
  async getMyReaction(publicCode) {
    if (!publicCode) return null;
    const sessionKey = getSessionKey();
    const { data } = await supabase
      .from("final_video_reactions")
      .select("emoji")
      .eq("public_code", publicCode)
      .eq("session_key", sessionKey)
      .maybeSingle();

    return data?.emoji || null;
  },

  /**
   * Ajoute, change ou retire la réaction (toggle si même emoji).
   * Retourne : l'emoji actif après l'action, ou null si retiré.
   */
  async toggleReaction(publicCode, emoji) {
    if (!ALLOWED_EMOJIS.includes(emoji)) throw new Error("Emoji non autorisé");
    const sessionKey = getSessionKey();

    const { data: existing } = await supabase
      .from("final_video_reactions")
      .select("id, emoji")
      .eq("public_code", publicCode)
      .eq("session_key", sessionKey)
      .maybeSingle();

    // Même emoji → suppression (toggle off)
    if (existing?.emoji === emoji) {
      await supabase.from("final_video_reactions").delete().eq("id", existing.id);
      return null;
    }

    // Emoji différent → update
    if (existing) {
      await supabase
        .from("final_video_reactions")
        .update({ emoji })
        .eq("id", existing.id);
      return emoji;
    }

    // Pas de réaction → insertion
    await supabase.from("final_video_reactions").insert({
      public_code: publicCode,
      session_key: sessionKey,
      emoji,
    });
    return emoji;
  },
};

export default reactionService;
