// src/pages/FinalVideoPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Button from "../components/ui/Button";
import Loading from "../components/ui/Loading";
import eventService from "../services/eventService";
import videoService from "../services/videoService";
import { useAuth } from "../context/AuthContext";
import activityService from "../services/activityService";
import supabase from "../lib/supabaseClient";
import { toast } from "react-toastify";

const getPublicVideoUrl = (storagePath) => {
  if (!storagePath) return null;
  const { data } = supabase.storage.from("videos").getPublicUrl(storagePath);
  return data?.publicUrl || null;
};

const extractFinalUrl = (final_video_url) => {
  if (!final_video_url) return null;
  if (typeof final_video_url === "string") return final_video_url;
  if (typeof final_video_url === "object" && final_video_url.videoUrl) return final_video_url.videoUrl;
  return null;
};

const TRANSITIONS = [
  { id: "modern_1", name: "Modern 1", detail: "Fondu fluide" },
  { id: "modern_2", name: "Modern 2", detail: "Glissement dynamique" },
  { id: "modern_3", name: "Modern 3", detail: "Zoom léger" },
  { id: "modern_4", name: "Modern 4", detail: "Transition ciné" },
  { id: "modern_5", name: "Modern 5", detail: "Flash rapide" },
];

const MODE_CHIPS = [
  { value: "none", label: "Aucune" },
  { value: "intro_outro", label: "Intro/Outro" },
  { value: "full", label: "Toute la vidéo" },
];

// ✅ Section isolée + memo: ne re-render plus pendant que generationProgress bouge
const SubmittedVideosSection = memo(function SubmittedVideosSection({
  submittedVideosWithUrl,
  isOwner,
  canStartProcessingNow,
  selectedVideoIds,
  onToggleSelect,
  onDelete,
  userId,
  maxSelectableForFinal,
}) {
  if (!submittedVideosWithUrl?.length) return null;

  const overLimit = Number.isFinite(maxSelectableForFinal) && selectedVideoIds.length > maxSelectableForFinal;

  const SelectionHint = () => (
    <div className="text-xs text-gray-500">
      Sélection : <span className="font-medium">{selectedVideoIds.length}</span> (min 2
      {Number.isFinite(maxSelectableForFinal) ? `, max ${maxSelectableForFinal}` : ""})
      {overLimit ? <span className="ml-2 text-red-600">Sélection trop grande</span> : null}
    </div>
  );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg px-4 py-4 sm:px-6 sm:py-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {isOwner ? "Vidéos soumises (sélectionne pour le montage)" : "Vidéos soumises"}
          </h3>
        </div>
        {isOwner && canStartProcessingNow ? <SelectionHint /> : null}
      </div>

      {isOwner && canStartProcessingNow ? (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          Sélectionne au moins <span className="font-semibold">2</span> vidéos.{" "}
          {Number.isFinite(maxSelectableForFinal) ? (
            <>
              Limite : <span className="font-semibold">{maxSelectableForFinal}</span>.
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {submittedVideosWithUrl.map((video) => {
          const isSelected = selectedVideoIds.includes(video.id);

          return (
            <div key={video.id} className="border rounded-lg shadow-sm p-2 bg-white">
              {isOwner && canStartProcessingNow && (
                <label className="flex items-center gap-2 mb-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    checked={isSelected}
                    onChange={() => onToggleSelect(video.id)}
                  />
                  <span>Inclure dans le montage</span>
                </label>
              )}

              <div className="relative w-full aspect-w-9 aspect-h-16 overflow-hidden rounded-md shadow-sm">
                <video src={video.publicUrl} controls className="w-full h-full object-cover" />
              </div>

              <p className="mt-2 text-sm font-semibold text-gray-900 text-center truncate">
                {video.participant_name || "Auteur inconnu"}
              </p>

              <p className="mt-1 text-xs text-gray-500 text-center">
                Partagée le{" "}
                {video.created_at
                  ? new Date(video.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "date inconnue"}
              </p>

              {(isOwner || video.user_id === userId) && (
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onDelete(video.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

const FinalVideoPage = () => {
  const { eventId } = useParams();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState(null);
  const [finalVideo, setFinalVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLabel, setGenerationLabel] = useState("");

  const [error, setError] = useState(null);
  const [submittedVideos, setSubmittedVideos] = useState([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);

  const [capabilities, setCapabilities] = useState(null);
  const [capLoading, setCapLoading] = useState(true);
  const [capError, setCapError] = useState(null);

  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobError, setJobError] = useState(null);

  const pollTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ✅ backoff + bascule en "progress réel"
  const pollDelayRef = useRef(2000);
  const hasRealProgressRef = useRef(false);

  const [transitionChoice, setTransitionChoice] = useState("modern_1");
  const [transitionDuration] = useState(0.3);

  const [musicMode, setMusicMode] = useState("none");
  const [musicVolume, setMusicVolume] = useState(0.6);
  const [musicFile, setMusicFile] = useState(null);

  const [introMode, setIntroMode] = useState("image");
  const [outroMode, setOutroMode] = useState("image");

  const [introFile, setIntroFile] = useState(null);
  const [outroFile, setOutroFile] = useState(null);

  const [introText, setIntroText] = useState("");
  const [outroText, setOutroText] = useState("");

  useEffect(() => {
    if (musicFile && musicMode === "none") setMusicMode("full");
  }, [musicFile, musicMode]);

  useEffect(() => {
    if (introMode === "text") setIntroFile(null);
  }, [introMode]);

  useEffect(() => {
    if (outroMode === "text") setOutroFile(null);
  }, [outroMode]);

  const [assetPaths, setAssetPaths] = useState({ intro: null, outro: null, music: null });
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetUploadError, setAssetUploadError] = useState(null);

  const isOwner = user && event && (user.id === event.user_id || user.role === "admin");

  const caps = capabilities || null;
  const capsActions = caps?.actions || {};
  const capsLimits = caps?.limits || {};
  const capsState = caps?.state || {};
  const capsPremium = caps?.premium || {};

  const latestVideo = capsState?.latestVideo || null;
  const hasReachedUploadLimit = Boolean(capsState?.hasReachedUploadLimit);

  const canUploadVideo = Boolean(capsActions?.canUploadVideo);
  const canGenerateFinalVideo = Boolean(capsActions?.canGenerateFinalVideo);
  const canRegenerateFinalVideo = Boolean(capsActions?.canRegenerateFinalVideo);

  const maxSelectableForFinal = Number.isFinite(capsLimits?.maxClipsSelectableForFinal)
    ? capsLimits.maxClipsSelectableForFinal
    : 5;

  const canUsePremiumEditing = Boolean(
    capsPremium?.isEffectivePremium ||
      capsPremium?.isPremium ||
      capsPremium?.isPremiumAccount ||
      capsPremium?.isPremiumEvent ||
      canRegenerateFinalVideo
  );

  const assetStorageKey = useMemo(() => {
    if (!eventId) return null;
    return `gp:premiumAssets:${eventId}`;
  }, [eventId]);

  useEffect(() => {
    if (!assetStorageKey) return;
    try {
      const raw = localStorage.getItem(assetStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setAssetPaths({
          intro: parsed.intro || null,
          outro: parsed.outro || null,
          music: parsed.music || null,
        });
      }
    } catch {
      // no-op
    }
  }, [assetStorageKey]);

  useEffect(() => {
    if (!assetStorageKey) return;
    try {
      localStorage.setItem(
        assetStorageKey,
        JSON.stringify(assetPaths || { intro: null, outro: null, music: null })
      );
    } catch {
      // no-op
    }
  }, [assetStorageKey, assetPaths]);

  const uploadAssetNow = useCallback(
    async (file, kind) => {
      if (!file) return null;

      if (!canUsePremiumEditing) {
        toast.error("Options Premium requises pour ajouter une image ou une musique.");
        return null;
      }
      if (!user?.id) {
        toast.error("Tu dois être connecté.");
        return null;
      }
      if (!eventId) {
        toast.error("Événement introuvable.");
        return null;
      }

      setAssetUploadError(null);
      setAssetUploading(true);
      try {
        const r = await videoService.uploadPremiumAsset(file, { userId: user.id, eventId, kind });
        if (!r?.storagePath) throw new Error("Upload réussi mais storagePath manquant.");
        return r.storagePath;
      } catch (e) {
        const msg = e?.message || "Erreur upload des assets premium.";
        setAssetUploadError(msg);
        toast.error(msg);
        return null;
      } finally {
        setAssetUploading(false);
      }
    },
    [canUsePremiumEditing, user?.id, eventId]
  );

  const handleIntroFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0] || null;
      setIntroFile(file);
      if (e?.target) e.target.value = "";
      if (!file) return;

      setAssetPaths((p) => ({ ...p, intro: null }));
      const storagePath = await uploadAssetNow(file, "intro");
      if (storagePath) {
        setAssetPaths((p) => ({ ...p, intro: storagePath }));
        toast.success("Intro enregistrée.");
      }
    },
    [uploadAssetNow]
  );

  const handleOutroFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0] || null;
      setOutroFile(file);
      if (e?.target) e.target.value = "";
      if (!file) return;

      setAssetPaths((p) => ({ ...p, outro: null }));
      const storagePath = await uploadAssetNow(file, "outro");
      if (storagePath) {
        setAssetPaths((p) => ({ ...p, outro: storagePath }));
        toast.success("Outro enregistrée.");
      }
    },
    [uploadAssetNow]
  );

  const handleMusicFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0] || null;
      setMusicFile(file);
      if (e?.target) e.target.value = "";
      if (!file) return;

      setAssetPaths((p) => ({ ...p, music: null }));
      const storagePath = await uploadAssetNow(file, "music");
      if (storagePath) {
        setAssetPaths((p) => ({ ...p, music: storagePath }));
        if (musicMode === "none") setMusicMode("full");
        toast.success("Musique enregistrée.");
      }
    },
    [uploadAssetNow, musicMode]
  );

  const handleClearIntro = useCallback(() => {
    setIntroFile(null);
    setAssetPaths((p) => ({ ...p, intro: null }));
  }, []);

  const handleClearOutro = useCallback(() => {
    setOutroFile(null);
    setAssetPaths((p) => ({ ...p, outro: null }));
  }, []);

  const handleClearMusic = useCallback(() => {
    setMusicFile(null);
    setAssetPaths((p) => ({ ...p, music: null }));
    setMusicMode("none");
  }, []);

  const latestVideoUrl = useMemo(() => {
    if (!latestVideo?.storage_path) return null;
    return getPublicVideoUrl(latestVideo.storage_path);
  }, [latestVideo?.storage_path]);

  const hasNotifiedProcessingRef = useRef(false);
  const hasNotifiedDoneRef = useRef(false);
  const hasAppliedDoneStateRef = useRef(false);

  const baselineFinalUrlRef = useRef(null);

  const jobIdRef = useRef(null);
  const processingRef = useRef(false);
  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);
  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  const resetRunGuards = () => {
    hasNotifiedProcessingRef.current = false;
    hasNotifiedDoneRef.current = false;
    hasAppliedDoneStateRef.current = false;

    // ✅ reset polling
    pollDelayRef.current = 2000;
    hasRealProgressRef.current = false;
  };

  const acceptDoneOnlyIfNewFinalUrl = (updatedEvent) => {
    const updatedUrl = extractFinalUrl(updatedEvent?.final_video_url);
    if (!updatedUrl) return false;
    const baseline = baselineFinalUrlRef.current;
    if (baseline && updatedUrl === baseline) return false;
    return true;
  };

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const stopPollTimer = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const stopProcessingUi = useCallback(
    (opts = {}) => {
      const { toastMessage = null } = opts;

      stopProgressTimer();
      stopPollTimer();

      try {
        if (abortControllerRef.current) abortControllerRef.current.abort();
      } catch {
        // no-op
      } finally {
        abortControllerRef.current = null;
      }

      setProcessing(false);
      setGenerationProgress(0);
      setGenerationLabel("");

      setJobId(null);
      setJobStatus(null);
      setJobError(null);

      // reset backoff + progress réel
      pollDelayRef.current = 2000;
      hasRealProgressRef.current = false;

      if (toastMessage) toast.info(toastMessage);
    },
    []
  );

  useEffect(() => {
    return () => {
      stopProcessingUi();
    };
  }, [stopProcessingUi]);

  useEffect(() => {
    let cancelled = false;

    const loadCaps = async () => {
      try {
        setCapLoading(true);
        setCapError(null);
        setCapabilities(null);

        if (!eventId || !user?.id) return;

        const c = await videoService.getEventCapabilities(eventId);
        if (!cancelled) setCapabilities(c);
      } catch (e) {
        console.warn("Capabilities load failed:", e);
        if (!cancelled) {
          setCapabilities(null);
          setCapError(e?.message || "Impossible de charger les droits (capabilities).");
        }
      } finally {
        if (!cancelled) setCapLoading(false);
      }
    };

    loadCaps();
    return () => {
      cancelled = true;
    };
  }, [eventId, user?.id]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const eventData = await eventService.getEvent(eventId);
        setEvent(eventData);

        baselineFinalUrlRef.current = extractFinalUrl(eventData?.final_video_url) || null;

        if (eventData?.status === "processing") {
          setProcessing(true);
          setGenerationProgress((p) => (p > 0 ? p : 5));
          setGenerationLabel((l) => (l ? l : "Montage en cours…"));
        }

        if (eventData.status === "done" && eventData.final_video_url) {
          const baseUrl = extractFinalUrl(eventData.final_video_url);
          if (baseUrl) setFinalVideo(`${baseUrl}?t=${Date.now()}`);
        }
      } catch (err) {
        console.error("Error fetching event details:", err);
        setError("Impossible de charger les détails de l'événement.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    const fetchSubmittedVideos = async () => {
      try {
        const videos = await videoService.getVideosByEvent(eventId);

        if (!isOwner && user) {
          const userVideos = videos.filter((v) => v.user_id === user.id);
          setSubmittedVideos(userVideos);
        } else {
          setSubmittedVideos(videos);
        }
      } catch (err) {
        console.error("Erreur chargement des vidéos soumises:", err);
      }
    };

    if (user && eventId) fetchSubmittedVideos();
  }, [eventId, user?.id, isOwner]);

  const submittedVideosWithUrl = useMemo(() => {
    return (submittedVideos || [])
      .map((v) => ({
        ...v,
        publicUrl: getPublicVideoUrl(v.storage_path),
      }))
      .filter((v) => Boolean(v.publicUrl));
  }, [submittedVideos]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-changes-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new;
          setEvent(updated);

          const isFollowingJob = Boolean(jobIdRef.current);

          if (updated.status === "processing") {
            setProcessing(true);
            setGenerationProgress((p) => (p > 0 ? p : 5));
            setGenerationLabel((l) => (l ? l : "Montage en cours…"));

            if (!hasNotifiedProcessingRef.current) {
              hasNotifiedProcessingRef.current = true;
              toast.info("Génération de la vidéo en cours...");
            }
          }

          if (!isFollowingJob && updated.status === "done" && updated.final_video_url) {
            if (!acceptDoneOnlyIfNewFinalUrl(updated)) return;

            const baseUrl = extractFinalUrl(updated.final_video_url);
            if (!baseUrl) return;

            if (!hasAppliedDoneStateRef.current) {
              hasAppliedDoneStateRef.current = true;
              setFinalVideo(`${baseUrl}?t=${Date.now()}`);
              setGenerationProgress(100);
              setGenerationLabel("Montage terminé");
              setProcessing(false);
              baselineFinalUrlRef.current = baseUrl;
            }

            if (!hasNotifiedDoneRef.current) {
              hasNotifiedDoneRef.current = true;
              toast.success("Vidéo finale générée !");
            }
          }

          if (updated.status && ["failed", "canceled", "open", "ready"].includes(updated.status)) {
            if (processingRef.current || jobIdRef.current) stopProcessingUi();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, stopProcessingUi]);

  // ✅ POLLING avec backoff exponentiel + progression backend (stop fake timer)
  useEffect(() => {
    if (!jobId || !user?.id) return;

    let cancelled = false;

    const scheduleNext = () => {
      const delay = Math.min(15000, Math.max(1500, pollDelayRef.current));
      pollTimerRef.current = setTimeout(poll, delay);
      pollDelayRef.current = Math.min(15000, Math.round(pollDelayRef.current * 1.5));
    };

    const poll = async () => {
      if (cancelled) return;

      try {
        const job = await videoService.getFinalVideoJob({ jobId, userId: user.id });
        if (cancelled) return;

        setJobStatus(job.status);

        // ✅ si le backend renvoie progress, on arrête la fausse barre
        if (typeof job.progress === "number") {
          const safeProgress = Math.max(0, Math.min(100, job.progress));
          if (!hasRealProgressRef.current) {
            hasRealProgressRef.current = true;
            stopProgressTimer();
          }
          setGenerationProgress((p) => Math.max(p, safeProgress));
        }

        if (job.stage && typeof job.stage === "string") {
          setGenerationLabel(job.stage);
        }

        if (job.status === "done") {
          stopPollTimer();
          stopProgressTimer();

          const finalUrl = job.finalVideoUrl || job.final_video_url || job.final_video_url?.videoUrl || null;

          if (finalUrl && typeof finalUrl === "string") {
            const baseUrl = finalUrl.split("?")[0];
            setFinalVideo(`${baseUrl}?t=${Date.now()}`);
            baselineFinalUrlRef.current = baseUrl;
          }

          setGenerationProgress(100);
          setGenerationLabel("Montage terminé");
          setProcessing(false);

          setJobId(null);
          setJobStatus(null);

          if (!hasNotifiedDoneRef.current) {
            hasNotifiedDoneRef.current = true;
            toast.success("Vidéo finale générée !");
          }
          return;
        }

        if (job.status === "failed") {
          stopPollTimer();
          stopProgressTimer();

          setProcessing(false);
          setGenerationProgress(0);
          setGenerationLabel("");
          setJobError(job.error || "Erreur pendant le montage.");
          setError(job.error || "Une erreur s'est produite lors de la génération de la vidéo.");
          toast.error(job.error || "Erreur pendant le montage.");

          setJobId(null);
          setJobStatus(null);
          return;
        }

        // ✅ succès => on ralentit moins vite : on reset partiel du backoff
        pollDelayRef.current = Math.max(2000, Math.round(pollDelayRef.current * 0.85));
        scheduleNext();
      } catch (e) {
        // erreur réseau => backoff normal
        scheduleNext();
      }
    };

    poll();

    return () => {
      cancelled = true;
      stopPollTimer();
    };
  }, [jobId, user?.id]);

  const handleDeleteVideo = useCallback(async (videoId) => {
    if (!window.confirm("Supprimer cette vidéo ?")) return;
    try {
      await videoService.deleteVideo(videoId);
      setSubmittedVideos((prev) => prev.filter((v) => v.id !== videoId));
      setSelectedVideoIds((prev) => prev.filter((id) => id !== videoId));
    } catch (err) {
      console.error("Erreur suppression vidéo :", err);
      alert("Erreur lors de la suppression de la vidéo.");
    }
  }, []);

  const toggleSelectVideo = useCallback(
    (videoId) => {
      if (!isOwner) return;
      setSelectedVideoIds((prev) => {
        if (prev.includes(videoId)) return prev.filter((id) => id !== videoId);
        return [...prev, videoId];
      });
    },
    [isOwner]
  );

  const handleCancelGeneration = useCallback(async () => {
    stopProcessingUi({ toastMessage: "Montage annulé." });
  }, [stopProcessingUi]);

  const publicShareUrl = event?.public_code ? `${window.location.origin}/player/${event.public_code}` : finalVideo || "";

  const capsUnavailable = !caps;
  const canStartProcessing = event && ["ready", "open", "done", "processing"].includes(event.status) && isOwner;

  const overLimit = Number.isFinite(maxSelectableForFinal) && selectedVideoIds.length > maxSelectableForFinal;
  const generateDisabled = processing || Boolean(jobId) || assetUploading;

  const isFirstGeneration = !finalVideo;

  const buildRequestedOptions = useCallback(() => {
    if (!canUsePremiumEditing) {
      return {
        transition: "modern_1",
        transitionDuration: 0.3,
        music: { mode: "none", volume: 0.6 },
        intro: { enabled: true, type: "default" },
        outro: { enabled: true, type: "default" },
      };
    }

    const resolvedMusicMode = musicMode === "none" && (musicFile || assetPaths.music) ? "full" : musicMode;

    const intro =
      introMode === "text"
        ? {
            enabled: true,
            type: "custom_text",
            text: (introText || "").trim() || null,
          }
        : {
            enabled: true,
            type: assetPaths.intro ? "custom_image" : "default",
            storagePath: assetPaths.intro || null,
          };

    const outro =
      outroMode === "text"
        ? {
            enabled: true,
            type: "custom_text",
            text: (outroText || "").trim() || null,
          }
        : {
            enabled: true,
            type: assetPaths.outro ? "custom_image" : "default",
            storagePath: assetPaths.outro || null,
          };

    return {
      transition: transitionChoice,
      transitionDuration: Number(transitionDuration || 0.3),
      music: {
        mode: resolvedMusicMode,
        volume: Number(musicVolume || 0.6),
        storagePath: assetPaths.music || null,
      },
      intro,
      outro,
    };
  }, [
    canUsePremiumEditing,
    transitionChoice,
    transitionDuration,
    musicMode,
    musicVolume,
    musicFile,
    assetPaths,
    introMode,
    outroMode,
    introText,
    outroText,
  ]);

  const handleGenerateVideo = useCallback(async () => {
    if (!user) return toast.error("Tu dois être connecté.");
    if (!event) return toast.info("Chargement de l’événement… réessaie dans 1 seconde.");
    if (!isOwner) return toast.error("Seul le créateur peut générer la vidéo finale.");
    if (!caps) {
      setError("Impossible de charger les droits (capabilities).");
      return toast.error("Impossible de charger les droits. Recharge la page.");
    }
    if (!canGenerateFinalVideo) return toast.error("Tu n’as pas le droit de lancer le montage pour cet événement.");

    if (!isFirstGeneration && !canRegenerateFinalVideo) {
      setError("La régénération de la vidéo finale est réservée au mode Premium.");
      return toast.error("Fonction réservée au mode Premium.");
    }

    if (!Array.isArray(selectedVideoIds) || selectedVideoIds.length < 2) {
      setError("Sélectionne au moins 2 vidéos pour générer la vidéo finale.");
      return toast.error("Sélectionne au moins 2 vidéos.");
    }

    if (Number.isFinite(maxSelectableForFinal) && selectedVideoIds.length > maxSelectableForFinal) {
      setError(`La sélection est limitée à ${maxSelectableForFinal} vidéos. Passe en Premium pour en utiliser davantage.`);
      return toast.error(`Maximum ${maxSelectableForFinal} vidéos.`);
    }

    if (processing || jobId) return;

    try {
      setError(null);
      setJobError(null);
      setAssetUploadError(null);

      const currentEventFinal = extractFinalUrl(event?.final_video_url);
      const currentFinalFromState = finalVideo ? finalVideo.split("?")[0] : null;
      baselineFinalUrlRef.current = currentEventFinal || currentFinalFromState || null;

      resetRunGuards();

      abortControllerRef.current = new AbortController();

      setProcessing(true);
      setGenerationProgress(5);
      setGenerationLabel("Préparation des vidéos…");

      toast.info("Montage lancé. La vidéo apparaîtra dès qu’elle sera prête.");

      // ✅ faux progress UNIQUEMENT tant que le backend n’envoie pas job.progress
      stopProgressTimer();
      progressTimerRef.current = setInterval(() => {
        if (hasRealProgressRef.current) return;

        setGenerationProgress((prev) => {
          if (prev >= 90) return 90;
          const next = prev + 0.5;
          if (next < 30) setGenerationLabel("Préparation des vidéos…");
          else if (next < 60) setGenerationLabel("Montage en cours…");
          else if (next < 90) setGenerationLabel("Finalisation de la vidéo…");
          return next;
        });
      }, 600);

      let requestedOptions = buildRequestedOptions();

      if (
        canUsePremiumEditing &&
        (musicFile || (introMode === "image" && introFile) || (outroMode === "image" && outroFile))
      ) {
        setAssetUploading(true);
        try {
          if (introMode === "image" && introFile && !assetPaths.intro) {
            const r = await videoService.uploadPremiumAsset(introFile, { userId: user.id, eventId, kind: "intro" });
            setAssetPaths((p) => ({ ...p, intro: r.storagePath }));
            requestedOptions = {
              ...requestedOptions,
              intro: { enabled: true, type: "custom_image", storagePath: r.storagePath },
            };
          }

          if (outroMode === "image" && outroFile && !assetPaths.outro) {
            const r = await videoService.uploadPremiumAsset(outroFile, { userId: user.id, eventId, kind: "outro" });
            setAssetPaths((p) => ({ ...p, outro: r.storagePath }));
            requestedOptions = {
              ...requestedOptions,
              outro: { enabled: true, type: "custom_image", storagePath: r.storagePath },
            };
          }

          if (musicFile && !assetPaths.music) {
            const r = await videoService.uploadPremiumAsset(musicFile, { userId: user.id, eventId, kind: "music" });
            setAssetPaths((p) => ({ ...p, music: r.storagePath }));
            requestedOptions = {
              ...requestedOptions,
              music: {
                ...(requestedOptions.music || {}),
                storagePath: r.storagePath,
                mode: requestedOptions.music?.mode || "full",
              },
            };
            if (requestedOptions.music?.mode === "none") requestedOptions.music.mode = "full";
          }
        } catch (e) {
          const msg = e?.message || "Erreur upload des assets premium.";
          setAssetUploadError(msg);
          toast.error(msg);
          setAssetUploading(false);
          stopProcessingUi();
          return;
        } finally {
          setAssetUploading(false);
        }
      }

      const started = await videoService.startFinalVideoJob({
        eventId,
        userId: user.id,
        selectedVideoIds,
        options: requestedOptions,
      });

      setJobId(started.jobId);
      setJobStatus(started.status || "queued");

      try {
        const creatorName =
          profile?.full_name && profile.full_name !== "User" ? profile.full_name : user?.email || "Un utilisateur";

        await activityService.logActivity({
          event_id: eventId,
          user_id: user.id,
          type: "started_final_video_job",
          message: `${creatorName} a lancé le montage de la vidéo finale de l'événement "${event.title}"`,
        });
      } catch {
        // no-op
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        stopProcessingUi({ toastMessage: "Montage annulé." });
        return;
      }

      console.error("Error starting async job:", err);

      try {
        const fallbackOptions = buildRequestedOptions();
        const { finalVideoUrl } = await videoService.generateFinalVideo(eventId, selectedVideoIds, fallbackOptions);

        stopProgressTimer();

        const baseUrl = finalVideoUrl.split("?")[0];
        setFinalVideo(`${baseUrl}?t=${Date.now()}`);

        setGenerationProgress(100);
        setGenerationLabel("Montage terminé");
        setProcessing(false);

        baselineFinalUrlRef.current = baseUrl;

        toast.success("Vidéo finale générée !");
      } catch (fallbackErr) {
        stopProcessingUi();
        setError("Une erreur s'est produite lors de la génération de la vidéo.");
        toast.error(fallbackErr?.message || "Erreur lors de la génération.");
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    user,
    event,
    isOwner,
    caps,
    canGenerateFinalVideo,
    canRegenerateFinalVideo,
    isFirstGeneration,
    selectedVideoIds,
    maxSelectableForFinal,
    eventId,
    profile,
    processing,
    jobId,
    canUsePremiumEditing,
    buildRequestedOptions,
    musicFile,
    introMode,
    outroMode,
    introFile,
    outroFile,
    assetPaths,
    stopProcessingUi,
  ]);

  if (loading || capLoading) return <Loading fullPage />;

  const showSubmitButtonForParticipant =
    !isOwner && !capsUnavailable && canUploadVideo && hasReachedUploadLimit === false && !latestVideo;

  const SelectionHint = () => (
    <div className="text-xs text-gray-500">
      Sélection : <span className="font-medium">{selectedVideoIds.length}</span> (min 2
      {Number.isFinite(maxSelectableForFinal) ? `, max ${maxSelectableForFinal}` : ""})
      {overLimit ? <span className="ml-2 text-red-600">Sélection trop grande</span> : null}
    </div>
  );

  const PremiumBadge = () => (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200">
      Premium
    </span>
  );

  const SectionCard = ({ title, right, children }) => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg px-4 py-4 sm:px-6 sm:py-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );

  const Chip = ({ active, children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-lg border text-sm font-medium transition",
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const canStartProcessingNow = Boolean(canStartProcessing && isOwner && !capsUnavailable);

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
              {event ? event.title : "Vidéo finale"}
            </h1>
            {event?.theme && <p className="mt-1 text-sm text-gray-500">Thème: {event.theme}</p>}
            {jobStatus && (
              <p className="mt-1 text-xs text-gray-500">
                Montage (job): <span className="font-medium">{jobStatus}</span>
              </p>
            )}
          </div>

          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
            {showSubmitButtonForParticipant && (
              <Link to={`/submit-video/${event.id}`}>
                <Button type="button">Soumettre une vidéo</Button>
              </Link>
            )}

            {!isOwner && !capsUnavailable && (latestVideo || hasReachedUploadLimit) && (
              <div className="inline-flex items-center px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                {latestVideo ? "Vidéo déjà envoyée" : "Limite atteinte"}
              </div>
            )}

            {isOwner && (
              <Link to={`/events/${event.id}/manage-participants`}>
                <Button type="button" variant="secondary">
                  Inviter des participants
                </Button>
              </Link>
            )}

            <Link to="/dashboard">
              <Button type="button" variant="secondary">
                Retour au tableau de bord
              </Button>
            </Link>
          </div>
        </div>

        {(error || capError || jobError) && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error || capError || jobError}
          </div>
        )}

        {!isOwner && !capsUnavailable && latestVideo && (
          <SectionCard title="Vidéo déjà envoyée">
            <p className="text-sm text-gray-600 mb-3">En version gratuite, c’est 1 vidéo par événement (sauf Premium).</p>
            {latestVideoUrl ? (
              <div className="aspect-w-9 aspect-h-16">
                <video controls className="w-full h-full object-cover rounded-md shadow" src={latestVideoUrl} />
              </div>
            ) : (
              <p className="text-sm text-gray-600">Vidéo envoyée (URL indisponible).</p>
            )}
          </SectionCard>
        )}

        {isOwner && canStartProcessingNow && (
          <SectionCard
            title={
              <span className="inline-flex items-center">
                Options de montage {canUsePremiumEditing ? <PremiumBadge /> : null}
              </span>
            }
            right={<SelectionHint />}
          >
            {!canUsePremiumEditing ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                Les options de montage avancées sont disponibles en Premium. Tu peux quand même sélectionner tes vidéos et
                générer la vidéo finale.
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-800">Transitions</label>
                    <span className="text-xs text-gray-500">Choisis un style</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TRANSITIONS.map((t) => {
                      const active = transitionChoice === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTransitionChoice(t.id)}
                          className={[
                            "text-left rounded-xl border p-3 transition",
                            active
                              ? "border-indigo-600 bg-indigo-50"
                              : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                              <div className="mt-1 text-xs text-gray-600">{t.detail}</div>
                            </div>
                            <div
                              className={[
                                "h-5 w-5 rounded-full border flex items-center justify-center",
                                active ? "border-indigo-600 bg-indigo-600" : "border-gray-300 bg-white",
                              ].join(" ")}
                            >
                              {active ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-gray-900">Intro</div>
                      <div className="inline-flex gap-2">
                        <Chip active={introMode === "image"} onClick={() => setIntroMode("image")}>
                          Image
                        </Chip>
                        <Chip active={introMode === "text"} onClick={() => setIntroMode("text")}>
                          Texte
                        </Chip>
                      </div>
                    </div>

                    {introMode === "image" ? (
                      <>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Image (PNG/JPG/WebP)</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleIntroFileChange}
                          className="block w-full text-sm"
                        />
                        {assetPaths.intro && <p className="mt-2 text-xs text-gray-500">Intro uploadée.</p>}
                        {introFile && <p className="mt-1 text-xs text-gray-500">Fichier: {introFile.name}</p>}
                        {(assetPaths.intro || introFile) && (
                          <button
                            type="button"
                            onClick={handleClearIntro}
                            className="mt-2 text-xs text-red-600 hover:underline"
                          >
                            Retirer
                          </button>
                        )}

                        <p className="mt-2 text-xs text-gray-500">
                          Conseil : image en portrait (9:16) ou logo/illustration centrée.
                        </p>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Texte d’intro</label>
                        <textarea
                          value={introText}
                          onChange={(e) => setIntroText(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder='Ex: "Joyeux anniversaire !"'
                        />
                        <p className="mt-2 text-xs text-gray-500">Court, lisible, 1–2 lignes.</p>
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-gray-900">Outro</div>
                      <div className="inline-flex gap-2">
                        <Chip active={outroMode === "image"} onClick={() => setOutroMode("image")}>
                          Image
                        </Chip>
                        <Chip active={outroMode === "text"} onClick={() => setOutroMode("text")}>
                          Texte
                        </Chip>
                      </div>
                    </div>

                    {outroMode === "image" ? (
                      <>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Image (PNG/JPG/WebP)</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleOutroFileChange}
                          className="block w-full text-sm"
                        />
                        {assetPaths.outro && <p className="mt-2 text-xs text-gray-500">Outro uploadée.</p>}
                        {outroFile && <p className="mt-1 text-xs text-gray-500">Fichier: {outroFile.name}</p>}
                        {(assetPaths.outro || outroFile) && (
                          <button
                            type="button"
                            onClick={handleClearOutro}
                            className="mt-2 text-xs text-red-600 hover:underline"
                          >
                            Retirer
                          </button>
                        )}

                        <p className="mt-2 text-xs text-gray-500">
                          Exemple : remerciements, signature, logo, message final.
                        </p>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Texte d’outro</label>
                        <textarea
                          value={outroText}
                          onChange={(e) => setOutroText(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder='Ex: "Avec amour, de la part de toute l’équipe."'
                        />
                        <p className="mt-2 text-xs text-gray-500">Court, lisible, 1–2 lignes.</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Musique</div>
                      <div className="text-xs text-gray-500">Ajoute une ambiance (optionnel)</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {MODE_CHIPS.map((m) => (
                        <Chip key={m.value} active={musicMode === m.value} onClick={() => setMusicMode(m.value)}>
                          {m.label}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fichier audio</label>
                      <input
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav"
                        onChange={handleMusicFileChange}
                        className="block w-full text-sm"
                      />
                      {assetPaths.music && <p className="mt-2 text-xs text-gray-500">Musique uploadée.</p>}
                      {musicFile && <p className="mt-1 text-xs text-gray-500">Fichier: {musicFile.name}</p>}
                      {(assetPaths.music || musicFile) && (
                        <button
                          type="button"
                          onClick={handleClearMusic}
                          className="mt-2 text-xs text-red-600 hover:underline"
                        >
                          Retirer
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Volume</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        max="1"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={musicVolume}
                        onChange={(e) => setMusicVolume(e.target.value)}
                      />
                      <p className="mt-2 text-xs text-gray-500">0.6 est un bon point de départ.</p>
                    </div>
                  </div>
                </div>

                {assetUploading && <p className="mt-3 text-xs text-gray-600">Upload des assets Premium…</p>}
                {assetUploadError && <p className="mt-2 text-xs text-red-600">{assetUploadError}</p>}
              </>
            )}
          </SectionCard>
        )}

        <SubmittedVideosSection
          submittedVideosWithUrl={submittedVideosWithUrl}
          isOwner={isOwner}
          canStartProcessingNow={canStartProcessingNow}
          selectedVideoIds={selectedVideoIds}
          onToggleSelect={toggleSelectVideo}
          onDelete={handleDeleteVideo}
          userId={user?.id}
          maxSelectableForFinal={maxSelectableForFinal}
        />

        {isOwner && canStartProcessingNow && (
          <SectionCard
            title={finalVideo ? "Régénérer la vidéo finale" : "Générer la vidéo finale"}
            right={<SelectionHint />}
          >
            {!capsUnavailable && !canGenerateFinalVideo ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Tu n’as pas le droit de lancer le montage pour cet événement.
              </div>
            ) : (
              <>
                {finalVideo ? (
                  <p className="text-sm text-gray-600 mb-3">
                    Tu peux régénérer la vidéo en changeant la sélection et/ou les options de montage.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mb-3">
                    Sélectionne au moins 2 vidéos ci-dessus pour créer la vidéo finale.
                  </p>
                )}

                {overLimit && (
                  <p className="mb-3 text-xs text-red-600">
                    Sélection trop grande : maximum {maxSelectableForFinal} vidéos.
                  </p>
                )}

                {!finalVideo && selectedVideoIds.length < 2 ? (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Sélection insuffisante : choisis au moins 2 vidéos.
                  </div>
                ) : null}

                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button
                    type="button"
                    onClick={handleGenerateVideo}
                    loading={processing || assetUploading}
                    disabled={generateDisabled}
                  >
                    {finalVideo ? "Régénérer la vidéo avec la sélection" : "Générer la vidéo finale"}
                  </Button>

                  {(processing || jobId) && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelGeneration}
                      disabled={assetUploading}
                    >
                      Annuler
                    </Button>
                  )}
                </div>

                {!capsUnavailable && finalVideo && !canRegenerateFinalVideo && (
                  <p className="mt-2 text-xs text-gray-500 text-center">La régénération est réservée au mode Premium.</p>
                )}

                {processing && generationProgress > 0 && (
                  <div className="mt-4">
                    {generationLabel && <p className="mb-1 text-sm text-gray-600 text-left">{generationLabel}</p>}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-indigo-600 h-3 rounded-full transition-all duration-200 ease-out"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 text-right">{Math.round(generationProgress)}%</p>
                  </div>
                )}
              </>
            )}
          </SectionCard>
        )}

        {finalVideo && isOwner && (
          <SectionCard title="Vidéo finale" right={<span className="text-xs text-gray-500">Aperçu</span>}>
            <div className="flex justify-center">
              <div className="w-full sm:w-1/2">
                <div className="aspect-w-9 aspect-h-16">
                  <video controls className="w-full h-full object-cover rounded-md shadow-lg" src={finalVideo}>
                    Votre navigateur ne prend pas en charge la lecture de vidéos.
                  </video>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row justify-center gap-4">
              <a
                href={finalVideo}
                download={`${(event?.title || "video").replace(/\s+/g, "_")}_final.mp4`}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Télécharger la vidéo
              </a>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Voici notre vidéo finale de l'événement "${event?.title || ""}"\n\n${publicShareUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600"
              >
                Partager sur WhatsApp
              </a>
            </div>

            {publicShareUrl && (
              <div className="mt-4 max-w-xl mx-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">Lien de partage public</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicShareUrl}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(publicShareUrl);
                      toast.success("Lien copié dans le presse-papiers");
                    }}
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Copier le lien
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {event?.status === "done" && finalVideo && !isOwner && (
          <div className="text-center text-gray-600 mt-6 italic">
            La vidéo finale de <strong>{event.title}</strong> est disponible.
            <br />
            Le créateur de l’événement va bientôt la partager avec vous.
          </div>
        )}

        {!finalVideo && submittedVideosWithUrl.length === 0 && (
          <div className="text-center text-gray-500 mt-6">Aucune vidéo soumise pour le moment.</div>
        )}
      </div>
    </MainLayout>
  );
};

export default FinalVideoPage;
