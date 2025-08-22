// src/services/videoService.js
import supabase from "../lib/supabaseClient";

const videoService = {
  /**
   * Upload une vidéo vers Supabase Storage et enregistre son chemin en DB
   * @param {string} eventId - UUID de l'événement
   * @param {string} userId - UUID de l'utilisateur
   * @param {File|Blob|string} file - Fichier vidéo à uploader
   */
  async uploadVideo(eventId, userId, file) {
    try {
      if (!file) {
        throw new Error("Aucun fichier reçu pour l'upload.");
      }

      // Génération d'un nom de fichier unique
      let fileName;
      if (file.name) {
        // Cas d'un File ou Blob avec propriété name
        fileName = `${eventId}/${Date.now()}-${file.name}`;
      } else if (typeof file === "string") {
        // Cas d'une URL ou d'un chemin
        fileName = `${eventId}/${Date.now()}-${file.split("/").pop()}`;
      } else {
        throw new Error("Format de fichier non supporté pour l'upload.");
      }

      // Upload dans Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insertion en base de données
      const { data: inserted, error: insertError } = await supabase
        .from("videos")
        .insert([
          {
            event_id: eventId,
            user_id: userId, // ✅ on stocke bien l'UUID
            storage_path: fileName,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      return inserted;
    } catch (err) {
      console.error("Erreur uploadVideo:", err);
      throw err;
    }
  },

  /**
   * Récupère toutes les vidéos d'un événement
   * @param {string} eventId - UUID de l'événement
   */
  async getVideosByEvent(eventId) {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("id, event_id, user_id, storage_path, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Erreur getVideosByEvent:", err);
      throw err;
    }
  },

  /**
   * Supprime une vidéo (storage + DB)
   * @param {string} videoId - UUID de la vidéo
   * @param {string} storagePath - chemin du fichier dans Supabase Storage
   */
  async deleteVideo(videoId, storagePath) {
    try {
      // Supprime du storage
      const { error: storageError } = await supabase.storage
        .from("videos")
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Supprime de la DB
      const { error: dbError } = await supabase
        .from("videos")
        .delete()
        .eq("id", videoId);

      if (dbError) throw dbError;

      return true;
    } catch (err) {
      console.error("Erreur deleteVideo:", err);
      throw err;
    }
  },

  /**
   * Déclenche la génération de la vidéo finale via ton backend
   * @param {string} eventId - UUID de l'événement
   */
  async generateFinalVideo(eventId) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/videos/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error("Erreur generateFinalVideo:", err);
      throw err;
    }
  },
};

export default videoService;
