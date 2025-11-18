// src/services/videoService.js
import supabase from "../lib/supabaseClient";

const videoService = {
  /**
   * Upload une vidéo vers Supabase Storage et enregistre son chemin en DB
   * @param {string} eventId - UUID de l'événement
   * @param {string} userId - UUID de l'utilisateur
   * @param {File|Blob|string} file - Fichier vidéo à uploader
   * @param {string|null} participantName - Nom de l'auteur de la vidéo (optionnel)
   */
  async uploadVideo(eventId, userId, file, participantName = null) {
    try {
      if (!file) {
        throw new Error("Aucun fichier reçu pour l'upload.");
      }

      // Génération d'un nom de fichier unique
      let fileName;
      if (file.name) {
        fileName = `${eventId}/${Date.now()}-${file.name}`;
      } else if (typeof file === "string") {
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
            user_id: userId,
            storage_path: fileName,
            // ✅ On enregistre le nom de l'auteur ici
            participant_name: participantName,
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
        // ✅ On ajoute participant_name dans le SELECT
        .select("id, event_id, user_id, storage_path, created_at, participant_name")
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
   * @param {string} [storagePath] - chemin du fichier dans Supabase Storage (optionnel)
   */
  async deleteVideo(videoId, storagePath = null) {
    try {
      // Si pas de storagePath fourni → le chercher en DB
      if (!storagePath) {
        const { data, error } = await supabase
          .from("videos")
          .select("storage_path")
          .eq("id", videoId)
          .single();

        if (error) throw error;
        storagePath = data?.storage_path;
      }

      // Supprime de la DB
      const { error: dbError } = await supabase
        .from("videos")
        .delete()
        .eq("id", videoId);

      if (dbError) throw dbError;

      // Supprime du storage (si on a bien le chemin)
      if (storagePath) {
        const { error: storageError } = await supabase.storage
          .from("videos")
          .remove([storagePath]);
        if (storageError) throw storageError;
      }

      return { success: true };
    } catch (err) {
      console.error("Erreur deleteVideo:", err);
      return { success: false, error: err };
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
