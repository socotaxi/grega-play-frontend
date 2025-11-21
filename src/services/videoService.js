// src/services/videoService.js
import supabase from "../lib/supabaseClient";

// Règles de sécurité côté frontend pour les vidéos
const MAX_VIDEO_SIZE_MB = 100; // taille max autorisée (à ajuster si besoin)
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"]; // MP4, MOV

// Normalise le nom de fichier pour éviter les caractères problématiques
function sanitizeFileName(originalName) {
  if (!originalName || typeof originalName !== "string") {
    return "video.mp4";
  }

  // Sépare nom et extension
  const lastDotIndex = originalName.lastIndexOf(".");
  const baseName =
    lastDotIndex > -1 ? originalName.slice(0, lastDotIndex) : originalName;
  const extension =
    lastDotIndex > -1 ? originalName.slice(lastDotIndex) : ".mp4";

  // Nettoyage : enlève les accents, remplace les caractères spéciaux par "-"
  const safeBase = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .replace(/[^a-zA-Z0-9]+/g, "-") // tout ce qui n’est pas lettre/chiffre → "-"
    .replace(/^-+|-+$/g, "") // trim des "-"
    .substring(0, 50) || "video";

  return `${safeBase}${extension}`;
}

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
      if (!eventId || !userId) {
        throw new Error("Événement ou utilisateur manquant pour l'upload.");
      }

      if (!file) {
        throw new Error("Aucun fichier reçu pour l'upload.");
      }

      // Détection "File-like" (cas normal depuis un input de fichier)
      const isFileLike =
        typeof file === "object" &&
        file !== null &&
        "size" in file &&
        "type" in file;

      if (isFileLike) {
        // 1) Contrôle de taille
        if (file.size > MAX_VIDEO_SIZE_BYTES) {
          throw new Error(
            `La vidéo est trop lourde. Taille maximale autorisée : ${MAX_VIDEO_SIZE_MB} Mo.`
          );
        }

        // 2) Contrôle de type MIME
        if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
          throw new Error(
            "Format vidéo non supporté. Formats acceptés : MP4 et MOV."
          );
        }
      } else if (typeof file === "string") {
        // Cas particulier : upload via URL/chemin string (si tu l'utilises)
        console.warn(
          "[videoService.uploadVideo] Fichier reçu sous forme de string. Pense à sécuriser aussi ce flux côté backend."
        );
      } else {
        throw new Error("Format de fichier non supporté pour l'upload.");
      }

      // Génération d'un nom de fichier unique et sécurisé
      let originalName = "video.mp4";

      if (isFileLike && "name" in file && file.name) {
        originalName = file.name;
      } else if (typeof file === "string") {
        originalName = file.split("/").pop() || "video.mp4";
      }

      const safeName = sanitizeFileName(originalName);
      const fileName = `${eventId}/${Date.now()}-${safeName}`;

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
        .select(
          "id, event_id, user_id, storage_path, created_at, participant_name"
        )
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
