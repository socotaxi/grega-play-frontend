import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import eventService from '../services/eventService';
import videoService from '../services/videoService';
import { toast } from 'react-toastify';
import supabase from '../lib/supabaseClient';
import activityService from "../services/activityService";
import { useAuth } from "../context/AuthContext";

const MAX_VIDEO_DURATION_SECONDS = 30;
const MAX_VIDEO_SIZE_MB = 50;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const clampPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const formatSpeed = (bps) => {
  const n = Number(bps);
  if (!Number.isFinite(n) || n <= 0) return null;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} Ko/s`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} Mo/s`;
};

const formatEta = (sec) => {
  const s = Number(sec);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m ${String(r).padStart(2, "0")}s`;
};

const SubmitVideoPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const { user, profile } = useAuth();

  const [event, setEvent] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isIndeterminateUpload, setIsIndeterminateUpload] = useState(false);

  // ✅ NEW: infos “réelles” (bytes/vitesse/ETA)
  const [uploadMeta, setUploadMeta] = useState({
    loadedLabel: null,
    totalLabel: null,
    speedBps: null,
    etaSeconds: null,
  });

  const [capabilities, setCapabilities] = useState(null);
  const [capLoading, setCapLoading] = useState(true);
  const [capError, setCapError] = useState(null);

  const displayName =
    profile?.full_name && profile.full_name !== "User"
      ? profile.full_name
      : user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email ||
        "Participant";

  const now = new Date();
  const isEventExpired = event?.deadline ? new Date(event.deadline) < now : false;
  const isEventClosed = event?.status && event.status !== "open";
  const isPublicEvent = event?.is_public === true;

  const isCreator = Boolean(user?.id && event?.user_id && user.id === event.user_id);

  const latestVideo = capabilities?.state?.latestVideo || null;
  const hasReachedUploadLimit = Boolean(capabilities?.state?.hasReachedUploadLimit);
  const canUploadMultipleVideos = Boolean(capabilities?.actions?.canUploadMultipleVideos);

  const canUpload = Boolean(
    !isEventExpired &&
    !isEventClosed &&
    capabilities?.actions?.canUploadVideo
  );

  const isBlockedByCapabilities = Boolean(
    capabilities && (!capabilities?.actions?.canUploadVideo || hasReachedUploadLimit)
  );

  const latestVideoUrl = useMemo(() => {
    if (!latestVideo?.storage_path) return null;
    const { data } = supabase.storage.from('videos').getPublicUrl(latestVideo.storage_path);
    return data?.publicUrl || null;
  }, [latestVideo?.storage_path]);

  const showProgressBar = submitting || (uploadProgress > 0 && uploadProgress < 100);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        if (eventData.status !== 'open') {
          setError("Cet événement n'accepte plus de vidéos.");
        }

        const endDate = new Date(eventData.deadline);
        if (endDate < new Date()) {
          setError('La date limite de cet événement est dépassée.');
        }
      } catch (err) {
        console.error('Erreur chargement événement:', err);
        setError("Impossible de charger l’événement.");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;

    const loadCaps = async () => {
      try {
        setCapLoading(true);
        setCapError(null);
        setCapabilities(null);

        if (!eventId || !user?.id) {
          return;
        }

        const caps = await videoService.getEventCapabilities(eventId);

        if (!cancelled) {
          setCapabilities(caps);
        }
      } catch (e) {
        console.warn("Capabilities load failed:", e);
        if (!cancelled) {
          setCapabilities(null);
          setCapError(
            e?.message ||
            "Impossible de charger les droits (capabilities). Rafraîchis la page."
          );
        }
      } finally {
        if (!cancelled) setCapLoading(false);
      }
    };

    loadCaps();
    return () => { cancelled = true; };
  }, [eventId, user?.id]);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate(`/events/${eventId}/final`), 2000);
    return () => clearTimeout(timer);
  }, [success, navigate, eventId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setIsIndeterminateUpload(false);
    setUploadMeta({ loadedLabel: null, totalLabel: null, speedBps: null, etaSeconds: null });
    setSuccess(false);

    if (!canUpload) {
      setError("Cet événement n'accepte plus de vidéos.");
      e.target.value = null;
      return;
    }

    if (isBlockedByCapabilities) {
      setError("Vous ne pouvez plus envoyer de vidéo pour cet événement (limite atteinte ou envois fermés).");
      e.target.value = null;
      return;
    }

    if (!file.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo.');
      e.target.value = null;
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`⛔ La vidéo est trop lourde. Taille maximale : ${MAX_VIDEO_SIZE_MB} Mo.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      e.target.value = null;
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);

      if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
        setError(`⛔ La vidéo dépasse ${MAX_VIDEO_DURATION_SECONDS} secondes.`);
        setSelectedFile(null);
        setPreviewUrl(null);
        e.target.value = null;
        return;
      }

      setError(null);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    };

    video.onerror = () => {
      setError("Impossible de lire la vidéo. Merci d’essayer un autre fichier.");
      setSelectedFile(null);
      setPreviewUrl(null);
      e.target.value = null;
    };

    video.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError("Vous devez être connecté pour envoyer une vidéo.");
      return;
    }

    if (!event) {
      setError("Impossible de charger l’événement.");
      return;
    }

    if (!capabilities) {
      setError("Impossible de charger les droits (capabilities). Rafraîchis la page.");
      return;
    }

    const nowLocal = new Date();
    const endDate = event.deadline ? new Date(event.deadline) : null;

    if (!endDate || endDate < nowLocal || event.status !== "open") {
      setError("Cet événement est terminé ou expiré. Vous ne pouvez plus envoyer de vidéo.");
      return;
    }

    if (!capabilities?.role?.isCreator && !capabilities?.role?.isInvited && !isPublicEvent) {
      setError("Vous n'êtes pas autorisé à envoyer une vidéo pour cet événement.");
      return;
    }

    if (isBlockedByCapabilities) {
      if (capabilities?.limits?.maxUploadsPerEvent === 1 && hasReachedUploadLimit) {
        setError("Vous avez déjà envoyé votre vidéo pour cet événement. En compte gratuit, c’est 1 vidéo par événement.");
      } else {
        setError("Vous ne pouvez plus envoyer de vidéo pour cet événement (limite atteinte ou envois fermés).");
      }
      return;
    }

    if (!selectedFile || !(selectedFile instanceof File)) {
      setError("Veuillez sélectionner un fichier vidéo valide.");
      return;
    }

    if (selectedFile.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`⛔ La vidéo est trop lourde. Taille maximale : ${MAX_VIDEO_SIZE_MB} Mo.`);
      return;
    }

    setSubmitting(true);
    setSuccess(false);

    setIsIndeterminateUpload(false);
    setUploadMeta({ loadedLabel: null, totalLabel: null, speedBps: null, etaSeconds: null });

    // barre visible immédiatement
    setUploadProgress(1);

    try {
      const payload = {
        eventId,
        userId: user.id,
        participantName: displayName,
        participantEmail: user.email,
      };

      await videoService.uploadVideo(selectedFile, payload, (pctRaw, meta) => {
        // indéterminé
        if (pctRaw === -1) {
          setIsIndeterminateUpload(true);
          if (meta) {
            setUploadMeta({
              loadedLabel: meta.loadedLabel ?? null,
              totalLabel: meta.totalLabel ?? null,
              speedBps: meta.speedBps ?? null,
              etaSeconds: meta.etaSeconds ?? null,
            });
          }
          setUploadProgress((prev) => (prev > 0 ? prev : 10));
          return;
        }

        setIsIndeterminateUpload(false);

        if (meta) {
          setUploadMeta({
            loadedLabel: meta.loadedLabel ?? null,
            totalLabel: meta.totalLabel ?? null,
            speedBps: meta.speedBps ?? null,
            etaSeconds: meta.etaSeconds ?? null,
          });
        }

        const pct = clampPct(pctRaw);
        if (pct === null) return;

        if (pct >= 100) {
          setUploadProgress(99);
          return;
        }

        setUploadProgress(Math.max(1, pct));
      });

      try {
        await activityService.addActivity({
          event_id: eventId,
          user_id: user.id,
          type: "video_uploaded",
          message: `${displayName} a envoyé une vidéo`,
        });
      } catch (activityErr) {
        console.warn("⚠️ Activity feed error (non bloquant):", activityErr);
      }

      toast.success("Merci pour ta vidéo !");
      setSuccess(true);
      setSelectedFile(null);
      setPreviewUrl(null);

      setIsIndeterminateUpload(false);
      setUploadProgress(100);

      try {
        const caps = await videoService.getEventCapabilities(eventId);
        setCapabilities(caps);
      } catch {
        // no-op
      }
    } catch (err) {
      console.error("Erreur envoi vidéo:", err);
      setError(err?.message || "Une erreur s'est produite lors de l'envoi de la vidéo.");
      toast.error(err?.message || "Erreur lors de l’envoi de la vidéo.");

      setIsIndeterminateUpload(false);
      setUploadMeta({ loadedLabel: null, totalLabel: null, speedBps: null, etaSeconds: null });
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || capLoading) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Loading />
        </div>
      </MainLayout>
    );
  }

  if (!capabilities) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{event?.title}</h1>

          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {capError || "Impossible de charger les droits (capabilities)."}
          </div>

          <Button type="button" variant="secondary" onClick={() => navigate(`/events/${eventId}/final`)}>
            Voir la vidéo finale
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isNotAuthorized =
    !capabilities?.role?.isCreator &&
    !capabilities?.role?.isInvited &&
    !isPublicEvent;

  const speedLabel = formatSpeed(uploadMeta?.speedBps);
  const etaLabel = formatEta(uploadMeta?.etaSeconds);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{event?.title}</h1>
        {event?.theme && <p className="text-sm text-gray-500 mb-2">Thème : {event.theme}</p>}

        {(isEventExpired || isEventClosed) && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            Cet événement est terminé. Vous ne pouvez plus envoyer de nouvelle vidéo.
          </div>
        )}

        {isNotAuthorized && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            Vous n'êtes pas autorisé à cet événement. Vous ne pouvez pas envoyer de vidéo.
          </div>
        )}

        {!isNotAuthorized && canUpload && isBlockedByCapabilities && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            {capabilities?.limits?.maxUploadsPerEvent === 1 && hasReachedUploadLimit
              ? "Vous avez déjà envoyé votre vidéo pour cet événement. En compte gratuit, c’est 1 vidéo par événement."
              : "Vous ne pouvez plus envoyer de vidéo pour cet événement."}
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {latestVideo && (
          <div className="mb-6 bg-white p-4 border rounded shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-2">🎬 Vidéo déjà envoyée</h3>

            {!canUploadMultipleVideos && !capabilities?.role?.isCreator && (
              <p className="text-sm text-gray-600 mb-2">
                Avec la version gratuite, vous pouvez envoyer une seule vidéo pour cet événement.
              </p>
            )}

            {canUploadMultipleVideos && (
              <p className="text-sm text-gray-600 mb-2">
                Vous pouvez envoyer plusieurs vidéos pour cet événement.
              </p>
            )}

            {latestVideoUrl ? (
              <div className="w-full aspect-w-9 aspect-h-16 mb-3 rounded-md shadow-sm overflow-hidden">
                <video controls src={latestVideoUrl} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Vidéo envoyée (URL indisponible pour le moment).
              </div>
            )}
          </div>
        )}

        {!isNotAuthorized && canUpload && !isBlockedByCapabilities && (
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-4 border rounded shadow">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vidéo</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={submitting || !canUpload}
              />
              <p className="mt-1 text-xs text-gray-500">
                Durée max : {MAX_VIDEO_DURATION_SECONDS} secondes · Taille max : {MAX_VIDEO_SIZE_MB} Mo.
              </p>

              {previewUrl && (
                <div className="mt-3 rounded-md overflow-hidden border">
                  <video controls src={previewUrl} className="w-full" />
                </div>
              )}
            </div>

            {showProgressBar && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-1 text-xs text-gray-600">
                  <span>Envoi en cours...</span>
                  <span>{isIndeterminateUpload ? "…" : `${uploadProgress}%`}</span>
                </div>

                <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2" style={{ width: `${uploadProgress}%` }} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  {uploadMeta?.loadedLabel && uploadMeta?.totalLabel && (
                    <span>
                      {uploadMeta.loadedLabel} / {uploadMeta.totalLabel}
                    </span>
                  )}
                  {uploadMeta?.loadedLabel && !uploadMeta?.totalLabel && (
                    <span>{uploadMeta.loadedLabel} envoyés</span>
                  )}
                  {speedLabel && <span>Vitesse : {speedLabel}</span>}
                  {etaLabel && <span>Restant : {etaLabel}</span>}
                </div>

                {uploadProgress >= 99 && submitting && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Finalisation…
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting || !selectedFile}>
                {submitting ? "Envoi..." : "Envoyer ma vidéo"}
              </Button>

              <Button type="button" variant="secondary" onClick={() => navigate(`/events/${eventId}/final`)}>
                Voir la vidéo finale
              </Button>
            </div>
          </form>
        )}

        {success && (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
            Vidéo envoyée avec succès. Redirection...
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SubmitVideoPage;
