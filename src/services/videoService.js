// src/services/videoService.js
import supabase from "../lib/supabaseClient";

const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"]; // MP4, MOV

const ADMIN_EMAIL = "edhemrombhot@gmail.com";
const isAdminEmail = (email) => String(email || "").toLowerCase() === ADMIN_EMAIL;

async function getAccessTokenOrThrow() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Impossible de récupérer la session utilisateur.");
  const token = data?.session?.access_token;
  if (!token) throw new Error("Utilisateur non connecté.");
  return token;
}

async function getUserIdOrThrow() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Impossible de récupérer l'utilisateur connecté.");
  const uid = data?.user?.id;
  if (!uid) throw new Error("Utilisateur non connecté.");
  return uid;
}

async function getUserEmailOrNull() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.email || null;
  } catch {
    return null;
  }
}

function sanitizeFileName(originalName) {
  if (!originalName || typeof originalName !== "string") return "video.mp4";

  const lastDotIndex = originalName.lastIndexOf(".");
  const baseName =
    lastDotIndex > -1 ? originalName.slice(0, lastDotIndex) : originalName;
  const extension =
    lastDotIndex > -1 ? originalName.slice(lastDotIndex) : ".mp4";

  const safeBase = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return (safeBase || "video") + extension.toLowerCase();
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractErrorMessage(responseStatus, result) {
  return (
    (result &&
      (typeof result.error === "string"
        ? result.error
        : result.error?.message || result.error?.code)) ||
    (result && result.message) ||
    `Erreur (code ${responseStatus}).`
  );
}

function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} o`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} Ko`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} Mo`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} Go`;
}

/**
 * Upload via XHR pour progress (fetch ne donne pas de progress upload)
 * onProgress(pct, meta)
 *  - pct: 0..100, ou -1 si indéterminé
 *  - meta: { loaded, total, speedBps, etaSeconds, loadedLabel, totalLabel }
 */
function xhrUpload({ url, headers, formData, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    Object.entries(headers || {}).forEach(([k, v]) => {
      xhr.setRequestHeader(k, v);
    });

    const startTs = Date.now();
    let lastTs = startTs;
    let lastLoaded = 0;

    xhr.upload.onprogress = (evt) => {
      if (!onProgress) return;

      const nowTs = Date.now();
      const dtMs = Math.max(1, nowTs - lastTs);
      const dLoaded = Math.max(0, (evt.loaded || 0) - lastLoaded);
      const speedBps = (dLoaded * 1000) / dtMs;

      lastTs = nowTs;
      lastLoaded = evt.loaded || 0;

      if (evt.lengthComputable && evt.total > 0) {
        const pct = Math.round((evt.loaded / evt.total) * 100);

        const remaining = Math.max(0, evt.total - evt.loaded);
        const etaSeconds =
          speedBps > 0 ? Math.round(remaining / speedBps) : null;

        const meta = {
          loaded: evt.loaded,
          total: evt.total,
          speedBps,
          etaSeconds,
          loadedLabel: formatBytes(evt.loaded),
          totalLabel: formatBytes(evt.total),
        };

        onProgress(pct, meta);
      } else {
        const meta = {
          loaded: evt.loaded,
          total: null,
          speedBps,
          etaSeconds: null,
          loadedLabel: formatBytes(evt.loaded),
          totalLabel: null,
        };
        onProgress(-1, meta);
      }
    };

    xhr.onerror = () => reject(new Error("Erreur réseau pendant l’upload."));
    xhr.onabort = () => reject(new Error("Upload annulé."));

    xhr.onload = () => {
      const status = xhr.status;
      let json = null;
      try {
        json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        json = null;
      }

      if (status >= 200 && status < 300) {
        resolve(json);
      } else {
        reject(new Error(extractErrorMessage(status, json)));
      }
    };

    xhr.send(formData);
  });
}

const videoService = {
  async getEventCapabilities(eventId) {
    if (!eventId) throw new Error("eventId manquant pour capabilities.");

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

    if (!backendUrl) throw new Error("VITE_BACKEND_URL manquant dans le .env.");

    const token = await getAccessTokenOrThrow();

    const response = await fetch(
      `${backendUrl}/api/events/${eventId}/capabilities`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(backendApiKey ? { "x-api-key": backendApiKey } : {}),
        },
      }
    );

    const result = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(extractErrorMessage(response.status, result));
    }

    return result;
  },

  async adminKillFinalVideoJob({ jobId } = {}) {
    if (!jobId) throw new Error("jobId manquant.");

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

    if (!backendUrl || !backendApiKey) {
      throw new Error("Configuration backend manquante. Impossible de kill le job.");
    }

    const response = await fetch(`${backendUrl}/api/videos/admin/jobs/${jobId}/kill`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": backendApiKey,
      },
      body: JSON.stringify({}),
    });

    const result = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(extractErrorMessage(response.status, result));
    }

    return result;
  },

  async uploadPremiumAsset(file, payload = {}) {
    if (!file) throw new Error("Aucun fichier à uploader.");

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

    if (!backendUrl || !backendApiKey) {
      throw new Error(
        "Configuration backend manquante. Impossible d'uploader l'asset Premium."
      );
    }

    const token = await getAccessTokenOrThrow();

    const { userId, eventId, kind } = payload || {};
    if (!userId) throw new Error("userId manquant pour uploadPremiumAsset.");
    if (!kind)
      throw new Error('kind manquant (ex: "intro" | "outro" | "music").');

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("kind", kind);
    if (eventId) formData.append("eventId", eventId);

    const response = await fetch(`${backendUrl}/api/assets/upload`, {
      method: "POST",
      headers: {
        ...(backendApiKey ? { "x-api-key": backendApiKey } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(extractErrorMessage(response.status, result));
    }

    if (!result?.storagePath) {
      throw new Error(
        "Upload asset OK, mais storagePath manquant dans la réponse."
      );
    }

    return result;
  },

  /**
   * ✅ Supporte 2 signatures :
   *  A) uploadVideo(file, payload, onProgress)
   *  B) uploadVideo(eventId, userId, file, participantEmail)
   */
  async uploadVideo(arg1, arg2, arg3, arg4, arg5) {
    const isFileFirst =
      typeof arg1 === "object" &&
      arg1 !== null &&
      "size" in arg1 &&
      "type" in arg1;

    let file;
    let payload;
    let onProgress;

    if (isFileFirst) {
      file = arg1;
      payload = arg2 || {};
      onProgress = typeof arg3 === "function" ? arg3 : null;
    } else {
      const eventId = arg1;
      const userId = arg2;
      file = arg3;
      const participantEmail = arg4 || "";
      payload = {
        eventId,
        userId,
        participantEmail,
        participantName:
          participantEmail && participantEmail.includes("@")
            ? participantEmail.split("@")[0]
            : participantEmail || "Participant",
      };
      onProgress = typeof arg5 === "function" ? arg5 : null;
    }

    if (!payload?.eventId) throw new Error("eventId manquant pour l'upload.");
    if (!file) throw new Error("Aucun fichier reçu pour l'upload.");

    const isFileLike =
      typeof file === "object" &&
      file !== null &&
      "size" in file &&
      "type" in file;

    if (!isFileLike) {
      throw new Error(
        "Format de fichier non supporté pour l'upload (attendu : File depuis un input)."
      );
    }

    const uploaderEmail = await getUserEmailOrNull();
    const isAdmin = isAdminEmail(uploaderEmail);

    // ✅ Bypass taille pour l'admin
    if (!isAdmin && file.size > MAX_VIDEO_SIZE_BYTES) {
      throw new Error(
        `La vidéo est trop lourde. Taille maximale autorisée : ${MAX_VIDEO_SIZE_MB} Mo.`
      );
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      throw new Error("Format vidéo non supporté. Formats acceptés : MP4 et MOV.");
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

    if (!backendUrl || !backendApiKey) {
      throw new Error("Configuration backend manquante. Impossible d'envoyer la vidéo.");
    }

    const effectiveUserId = payload.userId || (await getUserIdOrThrow());

    const safeEmail = payload.participantEmail || "";
    const participantName =
      payload.participantName ||
      (safeEmail && safeEmail.includes("@")
        ? safeEmail.split("@")[0]
        : "Participant");

    const safeFileName = sanitizeFileName(file.name);

    const formData = new FormData();
    formData.append("video", file, safeFileName);
    formData.append("eventId", payload.eventId);
    formData.append("userId", effectiveUserId);
    formData.append("participantEmail", safeEmail);
    formData.append("participantName", participantName);

    let token = null;
    try {
      token = await getAccessTokenOrThrow();
    } catch {
      token = null;
    }

    const headers = {
      "x-api-key": backendApiKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const result = await xhrUpload({
      url: `${backendUrl}/api/videos/upload`,
      headers,
      formData,
      onProgress: onProgress || null,
    });

    return result;
  },

  async getVideosByEvent(eventId) {
    try {
      if (!eventId) {
        throw new Error("eventId manquant pour la récupération des vidéos.");
      }

      const { data, error } = await supabase
        .from("videos")
        .select(
          "id, event_id, user_id, storage_path, video_url, created_at, participant_name, participant_email, status"
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Erreur getVideosByEvent:", err);
      throw err;
    }
  },

  async deleteVideo(videoId) {
    try {
      if (!videoId) {
        throw new Error("ID de vidéo manquant pour la suppression.");
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

      if (!backendUrl || !backendApiKey) {
        throw new Error(
          "Configuration backend manquante. Impossible de supprimer la vidéo."
        );
      }

      const response = await fetch(`${backendUrl}/api/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          "x-api-key": backendApiKey,
        },
      });

      const result = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(response.status, result));
      }

      return { success: true };
    } catch (err) {
      console.error("Erreur deleteVideo:", err);
      return { success: false, error: err };
    }
  },

  async generateFinalVideo(eventId, selectedVideoIds, requestedOptions = null) {
    try {
      if (!eventId) {
        throw new Error("eventId manquant pour la génération de la vidéo finale.");
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

      if (!backendUrl || !backendApiKey) {
        throw new Error("Configuration backend manquante. Impossible de générer la vidéo finale.");
      }

      const userId = await getUserIdOrThrow();

      const payload = { eventId, userId };
      if (Array.isArray(selectedVideoIds) && selectedVideoIds.length > 0) {
        payload.selectedVideoIds = selectedVideoIds;
      }
      if (requestedOptions && typeof requestedOptions === "object") {
        payload.options = requestedOptions;
        payload.requestedOptions = requestedOptions;
      }

      const response = await fetch(`${backendUrl}/api/videos/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": backendApiKey,
        },
        body: JSON.stringify(payload),
      });

      const result = await safeReadJson(response);

      if (!response.ok) {
        throw new Error(extractErrorMessage(response.status, result));
      }

      const finalVideoUrl =
        result?.finalVideoUrl ||
        result?.videoUrl ||
        result?.data?.finalVideoUrl ||
        result?.data?.videoUrl ||
        null;

      if (!finalVideoUrl || typeof finalVideoUrl !== "string") {
        throw new Error("Le backend a répondu, mais sans URL de vidéo finale.");
      }

      return { finalVideoUrl };
    } catch (err) {
      console.error("Erreur generateFinalVideo:", err);
      throw err;
    }
  },

  async startFinalVideoJob({ eventId, userId, selectedVideoIds, options } = {}) {
    if (!eventId)
      throw new Error("eventId manquant pour lancer le montage (async).");

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

    if (!backendUrl || !backendApiKey) {
      throw new Error(
        "Configuration backend manquante. Impossible de lancer le montage (async)."
      );
    }

    const effectiveUserId = userId || (await getUserIdOrThrow());

    const payload = {
      eventId,
      userId: effectiveUserId,
      options: options || {},
      requestedOptions: options || {},
    };

    if (Array.isArray(selectedVideoIds) && selectedVideoIds.length > 0) {
      payload.selectedVideoIds = selectedVideoIds;
    }

    const response = await fetch(`${backendUrl}/api/videos/process-async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": backendApiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(extractErrorMessage(response.status, result));
    }

    if (!result?.jobId) {
      throw new Error("Le backend a répondu, mais sans jobId.");
    }

    return result;
  },

  async getFinalVideoJob({ jobId, userId } = {}) {
    if (!jobId) throw new Error("jobId manquant pour récupérer le job.");

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;

    if (!backendUrl || !backendApiKey) {
      throw new Error("Configuration backend manquante. Impossible de lire le job.");
    }

    const effectiveUserId = userId || (await getUserIdOrThrow());

    const response = await fetch(
      `${backendUrl}/api/videos/jobs/${jobId}?userId=${encodeURIComponent(
        effectiveUserId
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": backendApiKey,
        },
      }
    );

    const result = await safeReadJson(response);

    if (!response.ok) {
      throw new Error(extractErrorMessage(response.status, result));
    }

    return result;
  },
};

export default videoService;
